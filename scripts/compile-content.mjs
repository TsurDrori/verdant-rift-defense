import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  analyzeStrategicGeometry,
  compareSemanticMask,
  decodePng,
  encodePng,
  validateRouteTopology,
  validateStrategicMetadata,
  validateStrategicRequirements,
} from './lib/map-analysis.mjs';

const project = resolve(import.meta.dirname, '..');
const contentRoot = resolve(project, 'content/stages');
const targetPath = resolve(project, 'src/game/content/generated/stages.ts');
const check = process.argv.includes('--check');
const proof = process.argv.includes('--proof');
const proofRoot = resolve(project, 'artifacts/content-proof');
const enemyIds = new Set(['skitter', 'marauder', 'wisp', 'brute', 'bloomlord']);
const modifierIds = new Set(['alternating-approaches']);
const idPattern = /^[a-z][a-z0-9-]*$/;

const fail = (file, message) => { throw new Error(`${file}: ${message}`); };
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const segmentDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return pointDistance(point, { x: start.x + dx * ratio, y: start.y + dy * ratio });
};
const routeDistance = (point, route) => Math.min(...route.centerline.slice(0, -1).map((start, index) => segmentDistance(point, start, route.centerline[index + 1])));
const routeLength = (route) => route.centerline.slice(0, -1).reduce((total, point, index) => total + pointDistance(point, route.centerline[index + 1]), 0);
const routeProjection = (point, route) => {
  const total = routeLength(route);
  let traversed = 0;
  let best = { distance: Infinity, progress: 0 };
  for (let index = 0; index < route.centerline.length - 1; index += 1) {
    const start = route.centerline[index];
    const end = route.centerline[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const ratio = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)));
    const projected = { x: start.x + dx * ratio, y: start.y + dy * ratio };
    const distance = pointDistance(point, projected);
    if (distance < best.distance) best = { distance, progress: total > 0 ? (traversed + length * ratio) / total : 0 };
    traversed += length;
  }
  return best;
};
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));

function validateCampaign(stage, source) {
  const campaign = stage.campaign;
  if (stage.schemaVersion !== 1) fail(source, 'schemaVersion must be 1.');
  if (!campaign || !idPattern.test(campaign.id)) fail(source, 'campaign.id must be kebab-case.');
  for (const key of ['name', 'mission', 'description', 'objective', 'threat']) if (!campaign[key]?.trim()) fail(source, `campaign.${key} is required.`);
  for (const key of ['chapter', 'order', 'reward', 'waves']) if (!Number.isInteger(campaign[key]) || campaign[key] < 0) fail(source, `campaign.${key} must be a non-negative integer.`);
  if (!finite(campaign.mapPosition?.x) || !finite(campaign.mapPosition?.y)) fail(source, 'campaign.mapPosition must contain numeric x/y.');
  if (campaign.mapPosition.x < 0 || campaign.mapPosition.x > 100 || campaign.mapPosition.y < 0 || campaign.mapPosition.y > 100) fail(source, 'campaign.mapPosition must use 0..100 percentages.');
  if (!Array.isArray(campaign.enemies)) fail(source, 'campaign.enemies must be an array.');
}

async function validateMap(map, source) {
  if (!map || !idPattern.test(map.id)) fail(source, 'map.id must be kebab-case.');
  if (map.world?.width !== 1600 || map.world?.height !== 900) fail(source, 'campaign maps use the canonical 1600×900 world contract.');
  if (!Array.isArray(map.routes) || map.routes.length < 1) fail(source, 'map.routes requires at least one route.');
  const routeIds = new Set();
  for (const route of map.routes) {
    if (!idPattern.test(route.id) || routeIds.has(route.id)) fail(source, `route id '${route.id}' is invalid or duplicated.`);
    routeIds.add(route.id);
    if (!finite(route.halfWidth) || route.halfWidth < 20 || route.halfWidth > 90) fail(source, `route '${route.id}' halfWidth must be 20..90.`);
    if (!Array.isArray(route.centerline) || route.centerline.length < 4) fail(source, `route '${route.id}' requires at least four points.`);
    for (const [index, point] of route.centerline.entries()) {
      if (!finite(point.x) || !finite(point.y)) fail(source, `route '${route.id}' point ${index} is invalid.`);
      if (point.x < -map.world.width * .15 || point.x > map.world.width * 1.15 || point.y < -map.world.height * .15 || point.y > map.world.height * 1.15) fail(source, `route '${route.id}' point ${index} exceeds the authoring margin.`);
      if (index > 0 && pointDistance(point, route.centerline[index - 1]) < 8) fail(source, `route '${route.id}' has a zero-length or near-duplicate segment at point ${index}.`);
    }
    if (routeLength(route) < 700) fail(source, `route '${route.id}' is too short for a full battlefield.`);
  }
  const topology = validateRouteTopology(map);
  for (const message of topology.errors) fail(source, message);
  for (const message of topology.warnings) console.warn(`${source}: topology warning: ${message}.`);
  for (const message of validateStrategicMetadata(map)) fail(source, message);
  if (!routeIds.has(map.primaryRouteId)) fail(source, 'map.primaryRouteId must reference a route.');
  if (!Array.isArray(map.buildPads) || map.buildPads.length < 4) fail(source, 'map.buildPads requires at least four pads.');
  const padIds = new Set();
  for (const [index, pad] of map.buildPads.entries()) {
    if (!idPattern.test(pad.id) || padIds.has(pad.id)) fail(source, `pad '${pad.id}' is invalid or duplicated.`);
    padIds.add(pad.id);
    if (![pad.x, pad.y, pad.radius].every(finite) || pad.radius < 24 || pad.radius > 70) fail(source, `pad '${pad.id}' has invalid geometry.`);
    if (pad.x < pad.radius || pad.x > map.world.width - pad.radius || pad.y < pad.radius || pad.y > map.world.height - pad.radius) fail(source, `pad '${pad.id}' is outside the playable world.`);
    const routeClearances = map.routes.map((route) => ({ distance: routeDistance(pad, route), clearance: routeDistance(pad, route) - route.halfWidth }));
    const nearestRoute = Math.min(...routeClearances.map((item) => item.distance));
    if (Math.min(...routeClearances.map((item) => item.clearance)) < 8) fail(source, `pad '${pad.id}' overlaps a navigable lane; keep its center at least 8px beyond the lane edge.`);
    if (nearestRoute > 330) fail(source, `pad '${pad.id}' cannot cover any route.`);
    for (const other of map.buildPads.slice(index + 1)) if (pointDistance(pad, other) < Math.min(72, pad.radius + other.radius)) fail(source, `pads '${pad.id}' and '${other.id}' overlap.`);
  }
  const entrances = map.markers?.entrances ?? (map.markers?.entrance ? [{ ...map.markers.entrance, routeId: map.primaryRouteId }] : []);
  if (!Array.isArray(entrances) || entrances.length < 1) fail(source, 'map.markers requires at least one entrance.');
  for (const entrance of entrances) {
    if (!routeIds.has(entrance.routeId) || !finite(entrance.x) || !finite(entrance.y) || !entrance.label?.trim()) fail(source, 'map.markers.entrances contains an invalid marker.');
    const route = map.routes.find((candidate) => candidate.id === entrance.routeId);
    const projection = routeProjection(entrance, route);
    if (projection.distance > route.halfWidth + 12 || projection.progress > 0.2) fail(source, `entrance '${entrance.label}' must sit on the opening 20% of route '${route.id}'.`);
  }
  const gate = map.markers?.gate;
  if (!gate || !finite(gate.x) || !finite(gate.y) || !gate.label?.trim()) fail(source, 'map.markers.gate is invalid.');
  for (const route of map.routes) {
    const projection = routeProjection(gate, route);
    if (projection.distance > route.halfWidth + 18 || projection.progress < 0.8) fail(source, `gate must sit on the closing 20% of route '${route.id}'.`);
  }
  if (map.visual?.kind === 'painted') {
    if (!/^[a-z][a-z0-9.-]+$/.test(map.visual.assetKey ?? '') || !map.visual.assetPath) fail(source, 'painted visuals require a stable dotted assetKey and assetPath.');
    const assetPath = resolve(project, 'public', map.visual.assetPath);
    try {
      await access(assetPath);
      const image = await readFile(assetPath);
      if (image.subarray(1, 4).toString() === 'PNG') {
        const width = image.readUInt32BE(16);
        const height = image.readUInt32BE(20);
        if (width !== map.world.width || height !== map.world.height) fail(source, `painted asset is ${width}×${height}; expected ${map.world.width}×${map.world.height}.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(source)) throw error;
      fail(source, `painted asset '${map.visual.assetPath}' does not exist in public/.`);
    }
    if (map.visual.semanticMaskPath) {
      if (!/^assets\/[a-z0-9./-]+\.png$/i.test(map.visual.semanticMaskPath) || map.visual.semanticMaskPath.includes('..')) fail(source, 'visual.semanticMaskPath must be a PNG below public/assets/.');
      const maskPath = resolve(project, 'public', map.visual.semanticMaskPath);
      const config = map.visual.semanticMask ?? {};
      if (config.tolerancePx !== undefined && (!Number.isInteger(config.tolerancePx) || config.tolerancePx < 0 || config.tolerancePx > 32)) fail(source, 'visual.semanticMask.tolerancePx must be an integer from 0..32.');
      if (config.colorTolerance !== undefined && (!Number.isInteger(config.colorTolerance) || config.colorTolerance < 0 || config.colorTolerance > 64)) fail(source, 'visual.semanticMask.colorTolerance must be an integer from 0..64.');
      let comparison;
      try {
        const decoded = decodePng(await readFile(maskPath));
        comparison = compareSemanticMask(map, decoded, config);
      } catch (error) {
        fail(source, `semantic mask '${map.visual.semanticMaskPath}' is invalid: ${error instanceof Error ? error.message : String(error)}.`);
      }
      const thresholds = {
        minRoadRecall: config.minRoadRecall ?? 0.97,
        minRoadPrecision: config.minRoadPrecision ?? 0.9,
        minPadRecall: config.minPadRecall ?? 0.95,
        minPadPrecision: config.minPadPrecision ?? 0.9,
      };
      for (const [key, value] of Object.entries(thresholds)) if (!finite(value) || value < 0 || value > 1) fail(source, `visual.semanticMask.${key} must be 0..1.`);
      if (proof) {
        await mkdir(proofRoot, { recursive: true });
        await writeFile(resolve(proofRoot, `${map.id}-alignment.png`), encodePng(comparison.proof));
        await writeFile(resolve(proofRoot, `${map.id}-alignment.json`), `${JSON.stringify({ stageId: map.id, maskPath: map.visual.semanticMaskPath, thresholds, road: comparison.road, pads: comparison.pads }, null, 2)}\n`);
      }
      if (comparison.road.recall < thresholds.minRoadRecall) fail(source, `semantic road recall ${(comparison.road.recall * 100).toFixed(2)}% is below ${(thresholds.minRoadRecall * 100).toFixed(2)}%.`);
      if (comparison.road.precision < thresholds.minRoadPrecision) fail(source, `semantic road precision ${(comparison.road.precision * 100).toFixed(2)}% is below ${(thresholds.minRoadPrecision * 100).toFixed(2)}%.`);
      if (comparison.pads.recall < thresholds.minPadRecall) fail(source, `semantic pad recall ${(comparison.pads.recall * 100).toFixed(2)}% is below ${(thresholds.minPadRecall * 100).toFixed(2)}%.`);
      if (comparison.pads.precision < thresholds.minPadPrecision) fail(source, `semantic pad precision ${(comparison.pads.precision * 100).toFixed(2)}% is below ${(thresholds.minPadPrecision * 100).toFixed(2)}%.`);
    } else if (map.visual.semanticMask) fail(source, 'visual.semanticMask requires visual.semanticMaskPath.');
  } else if (map.visual?.kind === 'procedural') {
    const palette = map.visual.palette;
    if (!Number.isInteger(map.visual.seed) || !finite(map.visual.density) || map.visual.density < 0 || map.visual.density > 1) fail(source, 'procedural visual seed/density is invalid.');
    for (const key of ['ground', 'groundAlt', 'road', 'roadEdge', 'water', 'accent']) if (!/^#[0-9a-f]{6}$/i.test(palette?.[key] ?? '')) fail(source, `procedural palette.${key} must be a six-digit hex color.`);
    if (!Array.isArray(palette?.foliage) || palette.foliage.length < 2 || palette.foliage.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) fail(source, 'procedural palette.foliage requires at least two hex colors.');
    if (!Array.isArray(map.visual.waterBands) || !Array.isArray(map.visual.landmarks)) fail(source, 'procedural visuals require waterBands and landmarks arrays.');
  } else fail(source, "map.visual.kind must be 'painted' or 'procedural'.");
  return routeIds;
}

function validateWaves(waves, routes, source) {
  if (!Array.isArray(waves.waves) || waves.waves.length < 1) fail(source, 'waves requires at least one wave.');
  for (const [waveIndex, wave] of waves.waves.entries()) {
    if (!wave.label?.trim() || !wave.intel?.trim() || !Array.isArray(wave.groups) || wave.groups.length < 1) fail(source, `wave ${waveIndex + 1} is incomplete.`);
    for (const group of wave.groups) {
      if (!enemyIds.has(group.enemy)) fail(source, `wave ${waveIndex + 1} references unknown enemy '${group.enemy}'.`);
      if (!Number.isInteger(group.count) || group.count < 1 || !finite(group.interval) || group.interval < 0 || !finite(group.delay) || group.delay < 0) fail(source, `wave ${waveIndex + 1} has invalid group timing/count.`);
      if (group.route && !routes.has(group.route)) fail(source, `wave ${waveIndex + 1} references unknown route '${group.route}'.`);
    }
    const population = wave.groups.reduce((total, group) => total + group.count, 0);
    if (population > 300) fail(source, `wave ${waveIndex + 1} exceeds the 300-unit safety budget.`);
  }
  for (const [wave, groups] of Object.entries(waves.tacticalPressure ?? {})) {
    if (!Number.isInteger(Number(wave)) || Number(wave) < 1 || Number(wave) > waves.waves.length || !Array.isArray(groups)) fail(source, `tacticalPressure key '${wave}' is invalid.`);
    for (const group of groups) {
      if (!enemyIds.has(group.enemy) || (group.route && !routes.has(group.route))) fail(source, `tacticalPressure wave ${wave} has an invalid enemy or route.`);
    }
  }
}

function validateRun(stage, map, waves, source) {
  const run = stage.run;
  if (!run) fail(source, 'playable stages require a run block.');
  for (const hero of ['kael', 'lyra']) {
    const spawn = run.heroSpawns?.[hero];
    if (!spawn || !map.routes.some((route) => route.id === spawn.routeId) || !finite(spawn.progress) || spawn.progress < 0 || spawn.progress > 1) fail(source, `run.heroSpawns.${hero} is invalid.`);
  }
  for (const difficulty of ['wanderer', 'warden', 'mythic']) {
    const values = run.economy?.difficulties?.[difficulty];
    if (!values || ![values.startingGold, values.startingLives, values.enemyHp, values.enemySpeed].every(finite)) fail(source, `run.economy.difficulties.${difficulty} is invalid.`);
    if (values.startingGold < 0 || values.startingLives < 1 || values.enemyHp < .25 || values.enemyHp > 4 || values.enemySpeed < .4 || values.enemySpeed > 2) fail(source, `run.economy.difficulties.${difficulty} exceeds safe gameplay bounds.`);
  }
  const early = run.economy?.earlyCall;
  if (!early || ![early.goldPerSecond, early.maximumBonus, early.heroCooldownRefund].every(finite) || Object.values(early).some((value) => value < 0)) fail(source, 'run.economy.earlyCall is invalid.');
  if (!Array.isArray(run.economy?.intermissions) || run.economy.intermissions.length < 1) fail(source, 'run.economy.intermissions requires at least one band.');
  let previousBand = 0;
  for (const band of run.economy.intermissions) {
    if (!Number.isInteger(band.throughWave) || band.throughWave <= previousBand || !finite(band.seconds) || band.seconds < 0 || band.seconds > 120) fail(source, 'intermission bands must be sorted, unique, and bounded to 0..120 seconds.');
    previousBand = band.throughWave;
  }
  if (previousBand < waves.waves.length) fail(source, 'the final intermission band must cover every authored wave.');
  if (!Array.isArray(run.objectives) || run.objectives.length < 1) fail(source, 'run.objectives requires at least one objective.');
  for (const objective of run.objectives) {
    if (objective.type === 'protect-gate') continue;
    if (objective.type === 'survive-waves' && Number.isInteger(objective.count) && objective.count > 0 && objective.count <= waves.waves.length) continue;
    fail(source, `unknown or invalid objective '${objective.type}'.`);
  }
  if (!Array.isArray(run.modifiers) || run.modifiers.some((modifier) => !modifierIds.has(modifier))) fail(source, 'run.modifiers contains an unknown rule hook.');
  if (run.modifiers.includes('alternating-approaches')) {
    if (map.routes.length < 2) fail(source, "'alternating-approaches' requires multiple routes.");
    const usedRoutes = new Set(waves.waves.flatMap((wave) => wave.groups.map((group) => group.route ?? map.primaryRouteId)));
    for (const route of map.routes) if (!usedRoutes.has(route.id)) fail(source, `'alternating-approaches' never sends a wave group to route '${route.id}'.`);
  }
  if (stage.campaign.waves !== waves.waves.length) fail(source, `campaign.waves (${stage.campaign.waves}) does not match waves.json (${waves.waves.length}).`);
}

const directories = (await readdir(contentRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const entries = [];
for (const directory of directories) {
  const root = resolve(contentRoot, directory);
  const stagePath = resolve(root, 'stage.json');
  const stage = await json(stagePath);
  validateCampaign(stage, stagePath);
  if (stage.campaign.id !== directory) fail(stagePath, `directory must be named '${stage.campaign.id}'.`);
  if (!stage.campaign.playable) {
    if (stage.run) fail(stagePath, 'planned stages must not contain a run block.');
    entries.push({ ...stage.campaign });
    continue;
  }
  const mapPath = resolve(root, 'map.json');
  const wavesPath = resolve(root, 'waves.json');
  const map = await json(mapPath);
  const waves = await json(wavesPath);
  if (map.id !== stage.campaign.id) fail(mapPath, `map.id must match stage id '${stage.campaign.id}'.`);
  const routes = await validateMap(map, mapPath);
  const strategicReport = analyzeStrategicGeometry(map);
  if (proof) {
    await mkdir(proofRoot, { recursive: true });
    await writeFile(resolve(proofRoot, `${map.id}-strategy.json`), `${JSON.stringify(strategicReport, null, 2)}\n`);
  }
  for (const message of validateStrategicRequirements(map, strategicReport)) fail(mapPath, message);
  if (strategicReport.summary.dominatedPads.length > 0) console.warn(`${mapPath}: strategic warning: coverage-dominated pads: ${strategicReport.summary.dominatedPads.join(', ')}.`);
  validateWaves(waves, routes, wavesPath);
  validateRun(stage, map, waves, stagePath);
  const primary = map.routes.find((route) => route.id === map.primaryRouteId);
  const entrances = map.markers.entrances ?? [{ ...map.markers.entrance, routeId: map.primaryRouteId }];
  const { routeId: _primaryEntranceRoute, ...primaryEntrance } = entrances[0];
  const normalizedMap = { ...map, route: primary, markers: { ...map.markers, entrances, entrance: primaryEntrance } };
  const images = map.visual.kind === 'painted' ? [{ key: map.visual.assetKey, path: map.visual.assetPath }] : [];
  entries.push({
    ...stage.campaign,
    run: {
      stageId: stage.campaign.id,
      map: normalizedMap,
      waves: waves.waves,
      tacticalPressure: waves.tacticalPressure ?? {},
      economy: stage.run.economy,
      objectives: stage.run.objectives,
      modifiers: stage.run.modifiers ?? [],
      assets: { images },
      heroSpawns: stage.run.heroSpawns,
    },
  });
}

const ids = new Set();
const orders = new Set();
for (const entry of entries) {
  if (ids.has(entry.id)) fail('content/stages', `duplicate stage id '${entry.id}'.`);
  if (orders.has(`${entry.chapter}:${entry.order}`)) fail('content/stages', `duplicate chapter/order ${entry.chapter}:${entry.order}.`);
  ids.add(entry.id); orders.add(`${entry.chapter}:${entry.order}`);
}
for (const entry of entries) if (entry.unlockAfter && !ids.has(entry.unlockAfter)) fail('content/stages', `stage '${entry.id}' unlockAfter references '${entry.unlockAfter}', which does not exist.`);
const assetPathsByKey = new Map();
for (const entry of entries) for (const asset of entry.run?.assets.images ?? []) {
  const existing = assetPathsByKey.get(asset.key);
  if (existing && existing !== asset.path) fail('content/stages', `asset key '${asset.key}' resolves to both '${existing}' and '${asset.path}'.`);
  assetPathsByKey.set(asset.key, asset.path);
}

entries.sort((a, b) => a.chapter - b.chapter || a.order - b.order);
const output = `import type { RunDefinition, StageCatalogEntry } from '../stages/types';

// Generated from content/stages/** by \`pnpm content:sync\`. Do not hand-edit.
export const STAGE_CATALOG = ${JSON.stringify(entries, null, 2)} as const satisfies readonly StageCatalogEntry[];

export type GeneratedStageId = typeof STAGE_CATALOG[number]['id'];
export const RUN_DEFINITIONS: Readonly<Record<string, RunDefinition>> = Object.fromEntries(
  STAGE_CATALOG.flatMap((stage) => 'run' in stage && stage.run ? [[stage.id, stage.run] as const] : []),
);
`;

if (check) {
  const current = await readFile(targetPath, 'utf8');
  if (current !== output) throw new Error('Generated stage catalog is stale. Run `pnpm content:sync`.');
  console.log(`Validated ${entries.length} stages (${entries.filter((entry) => entry.run).length} playable).`);
} else {
  await writeFile(targetPath, output);
  console.log(`Compiled ${entries.length} stages to ${targetPath}.`);
}
