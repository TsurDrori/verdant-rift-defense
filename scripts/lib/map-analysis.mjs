import { inflateSync, deflateSync } from 'node:zlib';

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PRODUCTION_TOWER_RANGES = [126, 158, 170, 176];

function interpolateRoute(route, spacing = 4) {
  const samples = [];
  let arc = 0;
  for (let segment = 0; segment < route.centerline.length - 1; segment += 1) {
    const start = route.centerline[segment];
    const end = route.centerline[segment + 1];
    const length = distance(start, end);
    const count = Math.max(1, Math.ceil(length / spacing));
    for (let index = segment === 0 ? 0 : 1; index <= count; index += 1) {
      const ratio = index / count;
      samples.push({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
        arc: arc + length * ratio,
      });
    }
    arc += length;
  }
  return { samples, length: arc };
}

function pointAtProgress(route, progress) {
  const total = route.centerline.slice(0, -1).reduce((sum, point, index) => sum + distance(point, route.centerline[index + 1]), 0);
  const target = Math.max(0, Math.min(1, progress)) * total;
  let traversed = 0;
  for (let index = 0; index < route.centerline.length - 1; index += 1) {
    const start = route.centerline[index]; const end = route.centerline[index + 1]; const length = distance(start, end);
    if (traversed + length >= target || index === route.centerline.length - 2) {
      const ratio = length === 0 ? 0 : (target - traversed) / length;
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    traversed += length;
  }
  return route.centerline.at(-1);
}

function terrainSpeedAt(route, progress) {
  let multiplier = 1;
  for (const section of route.sections ?? []) if (section.speedMultiplier !== undefined && progress >= section.from && (progress < section.to || section.to === 1 && progress === 1)) {
    multiplier = Math.min(multiplier, section.speedMultiplier);
  }
  return multiplier;
}

function coverageForRoute(pad, route, range, sampleSpacing) {
  const { samples, length } = interpolateRoute(route, sampleSpacing);
  const covered = samples.map((point) => distance(pad, point) <= range);
  let windows = 0;
  let coveredSamples = 0;
  let exposureSeconds = 0;
  let inWindow = false;
  for (const [index, value] of covered.entries()) {
    if (value) {
      coveredSamples += 1;
      exposureSeconds += sampleSpacing / (100 * terrainSpeedAt(route, samples[index]?.arc / length ?? 0));
      if (!inWindow) windows += 1;
    }
    inWindow = value;
  }
  const coveredLength = Math.min(length, coveredSamples * sampleSpacing);
  return {
    routeId: route.id,
    coveredLength: Math.round(coveredLength * 10) / 10,
    exposureSeconds: Math.round(exposureSeconds * 100) / 100,
    coverageRatio: Math.round((coveredLength / length) * 1000) / 1000,
    windows,
    covered,
  };
}

function profileKey(pad, highestRange) {
  const bands = highestRange.routes
    .filter((route) => route.coveredLength > 0)
    .map((route) => `${route.routeId}:${route.windows}:${Math.round(route.coverageRatio * 10)}`)
    .sort();
  return bands.join('|') || `${pad.id}:none`;
}

/**
 * Scores build pads against route centerlines. Exposure seconds use a documented
 * reference enemy speed of 100 world units/second and authored terrain sections.
 */
export function analyzeStrategicGeometry(map, options = {}) {
  const towerRanges = [...(options.towerRanges ?? map.strategicRequirements?.baseTowerRanges ?? PRODUCTION_TOWER_RANGES)];
  const sampleSpacing = options.sampleSpacing ?? 4;
  const internals = new Map();
  const pads = map.buildPads.map((pad) => {
    const ranges = towerRanges.map((range) => {
      const routes = map.routes.map((route) => coverageForRoute(pad, route, range, sampleSpacing));
      const totalCoveredLength = routes.reduce((total, route) => total + route.coveredLength, 0);
      return {
        range,
        totalCoveredLength: Math.round(totalCoveredLength * 10) / 10,
        exposureSeconds: Math.round(routes.reduce((total, route) => total + route.exposureSeconds, 0) * 100) / 100,
        routesCovered: routes.filter((route) => route.coveredLength > 0).map((route) => route.routeId),
        windows: routes.reduce((total, route) => total + route.windows, 0),
        routes: routes.map(({ covered: _covered, ...route }) => route),
      };
    });
    internals.set(pad.id, towerRanges.map((range) => map.routes.map((route) => coverageForRoute(pad, route, range, sampleSpacing).covered)));
    return { id: pad.id, x: pad.x, y: pad.y, ranges };
  });

  const dominatedBy = new Map(pads.map((pad) => [pad.id, []]));
  for (const candidate of pads) {
    for (const other of pads) {
      if (candidate.id === other.id) continue;
      const candidateMasks = internals.get(candidate.id);
      const otherMasks = internals.get(other.id);
      let superset = true;
      let strictlyBetter = false;
      for (let rangeIndex = 0; rangeIndex < towerRanges.length && superset; rangeIndex += 1) {
        for (let routeIndex = 0; routeIndex < map.routes.length && superset; routeIndex += 1) {
          const candidateMask = candidateMasks[rangeIndex][routeIndex];
          const otherMask = otherMasks[rangeIndex][routeIndex];
          for (let index = 0; index < otherMask.length; index += 1) {
            if (otherMask[index] && !candidateMask[index]) { superset = false; break; }
            if (candidateMask[index] && !otherMask[index]) strictlyBetter = true;
          }
        }
      }
      if (superset && strictlyBetter) dominatedBy.get(other.id).push(candidate.id);
    }
  }

  for (const pad of pads) pad.dominatedBy = dominatedBy.get(pad.id);
  const highestRange = towerRanges.length - 1;
  const doublePassPads = pads.filter((pad) => pad.ranges[highestRange].routes.some((route) => route.windows >= 2)).map((pad) => pad.id);
  const multiRoutePads = pads.filter((pad) => pad.ranges[highestRange].routesCovered.length >= 2).map((pad) => pad.id);
  const dominatedPads = pads.filter((pad) => pad.dominatedBy.length > 0).map((pad) => pad.id);
  const distinctProfiles = new Set(pads.map((pad) => profileKey(pad, pad.ranges[highestRange]))).size;
  return {
    schemaVersion: 1,
    referenceEnemySpeed: 100,
    sampleSpacing,
    towerRanges,
    summary: { doublePassPads, multiRoutePads, dominatedPads, distinctProfiles },
    pads,
  };
}

export function validateStrategicRequirements(map, report) {
  const requirements = map.strategicRequirements;
  if (!requirements) return [];
  const errors = [];
  const checks = [
    ['minDoublePassPads', report.summary.doublePassPads.length, 'double-pass pads'],
    ['minMultiRoutePads', report.summary.multiRoutePads.length, 'multi-route pads'],
    ['minDistinctProfiles', report.summary.distinctProfiles, 'distinct pad profiles'],
  ];
  for (const [key, actual, label] of checks) {
    if (requirements[key] !== undefined && actual < requirements[key]) errors.push(`strategic benchmark requires ${requirements[key]} ${label}; found ${actual}`);
  }
  if (requirements.maxDominatedPads !== undefined && report.summary.dominatedPads.length > requirements.maxDominatedPads) {
    errors.push(`strategic benchmark permits at most ${requirements.maxDominatedPads} dominated pads; found ${report.summary.dominatedPads.length}`);
  }
  return errors;
}

export function validateStrategicMetadata(map) {
  const errors = [];
  const requirements = map.strategicRequirements;
  if (requirements) {
    for (const key of ['minDoublePassPads', 'minMultiRoutePads', 'minDistinctProfiles', 'maxDominatedPads']) {
      if (requirements[key] !== undefined && (!Number.isInteger(requirements[key]) || requirements[key] < 0)) errors.push(`strategicRequirements.${key} must be a non-negative integer`);
    }
    if (requirements.baseTowerRanges !== undefined && JSON.stringify(requirements.baseTowerRanges) !== JSON.stringify(PRODUCTION_TOWER_RANGES)) errors.push(`strategicRequirements.baseTowerRanges must match production tower ranges ${PRODUCTION_TOWER_RANGES.join(', ')}`);
  }
  return errors;
}

/** Validates that shared traffic sections describe genuinely identical physical corridors. */
export function validateRouteTopology(map) {
  const errors = []; const warnings = []; const groups = new Map();
  for (const route of map.routes) {
    const sectionIds = new Set(); const trafficOnRoute = new Set(); const trafficSections = [];
    if (route.sections !== undefined && !Array.isArray(route.sections)) { errors.push(`route '${route.id}' sections must be an array`); continue; }
    for (const section of route.sections ?? []) {
      if (!section || typeof section !== 'object') { errors.push(`route '${route.id}' sections must contain objects`); continue; }
      if (!idPattern(section.id) || sectionIds.has(section.id)) errors.push(`route '${route.id}' section id '${section.id}' is invalid or duplicated`);
      sectionIds.add(section.id);
      if (!finite(section.from) || !finite(section.to) || section.from < 0 || section.from >= section.to || section.to > 1) errors.push(`route '${route.id}' section '${section.id}' requires 0 <= from < to <= 1`);
      if (section.speedMultiplier !== undefined && (!finite(section.speedMultiplier) || section.speedMultiplier <= 0 || section.speedMultiplier > 1)) errors.push(`route '${route.id}' section '${section.id}' speedMultiplier must be > 0 and <= 1`);
      if (section.affectsFlying !== undefined && typeof section.affectsFlying !== 'boolean') errors.push(`route '${route.id}' section '${section.id}' affectsFlying must be boolean`);
      if (section.trafficGroup !== undefined) {
        if (!idPattern(section.trafficGroup)) errors.push(`route '${route.id}' section '${section.id}' trafficGroup must be kebab-case`);
        if (trafficOnRoute.has(section.trafficGroup)) errors.push(`route '${route.id}' declares trafficGroup '${section.trafficGroup}' more than once`);
        trafficOnRoute.add(section.trafficGroup); trafficSections.push(section);
        const list = groups.get(section.trafficGroup) ?? []; list.push({ route, section }); groups.set(section.trafficGroup, list);
      }
    }
    for (let left = 0; left < trafficSections.length; left += 1) for (let right = left + 1; right < trafficSections.length; right += 1) {
      const a = trafficSections[left]; const b = trafficSections[right];
      if (Math.max(a.from, b.from) < Math.min(a.to, b.to)) errors.push(`route '${route.id}' traffic sections '${a.id}' and '${b.id}' overlap`);
    }
  }

  for (const [groupId, members] of groups) {
    const routeIds = new Set(members.map(({ route }) => route.id));
    if (routeIds.size < 2) warnings.push(`trafficGroup '${groupId}' appears on only one route and creates no shared queue`);
    const baseline = members[0];
    for (const member of members.slice(1)) {
      if (member.route.id === baseline.route.id) continue;
      const baselineLength = interpolateRoute(baseline.route).length * (baseline.section.to - baseline.section.from);
      const memberLength = interpolateRoute(member.route).length * (member.section.to - member.section.from);
      if (Math.abs(baselineLength - memberLength) > 3) errors.push(`trafficGroup '${groupId}' sections differ in physical arc length by more than 3px`);
      if (Math.abs(baseline.route.halfWidth - member.route.halfWidth) > 0.1) errors.push(`trafficGroup '${groupId}' routes must have the same halfWidth`);
      if ((baseline.section.speedMultiplier ?? 1) !== (member.section.speedMultiplier ?? 1) || (baseline.section.affectsFlying ?? false) !== (member.section.affectsFlying ?? false)) errors.push(`trafficGroup '${groupId}' sections must use matching terrain properties; layer route-specific terrain in separate sections`);
      for (let sample = 0; sample <= 8; sample += 1) {
        const ratio = sample / 8;
        const baseProgress = baseline.section.from + (baseline.section.to - baseline.section.from) * ratio;
        const memberProgress = member.section.from + (member.section.to - member.section.from) * ratio;
        const basePoint = pointAtProgress(baseline.route, baseProgress); const memberPoint = pointAtProgress(member.route, memberProgress);
        if (distance(basePoint, memberPoint) > 3) { errors.push(`trafficGroup '${groupId}' centerlines diverge by more than 3px at ${(ratio * 100).toFixed(0)}%`); break; }
        const epsilon = 0.0005;
        const baseBefore = pointAtProgress(baseline.route, Math.max(baseline.section.from, baseProgress - epsilon));
        const baseAfter = pointAtProgress(baseline.route, Math.min(baseline.section.to, baseProgress + epsilon));
        const memberBefore = pointAtProgress(member.route, Math.max(member.section.from, memberProgress - epsilon));
        const memberAfter = pointAtProgress(member.route, Math.min(member.section.to, memberProgress + epsilon));
        const baseAngle = Math.atan2(baseAfter.y - baseBefore.y, baseAfter.x - baseBefore.x);
        const memberAngle = Math.atan2(memberAfter.y - memberBefore.y, memberAfter.x - memberBefore.x);
        const angleDelta = Math.abs(Math.atan2(Math.sin(baseAngle - memberAngle), Math.cos(baseAngle - memberAngle)));
        if (angleDelta > Math.PI / 36) { errors.push(`trafficGroup '${groupId}' tangents differ by more than 5 degrees at ${(ratio * 100).toFixed(0)}%`); break; }
      }
    }
  }
  return { errors, warnings };
}

const idPattern = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('semantic mask must be a PNG');
  let offset = 8;
  let width; let height; let colorType; let bitDepth; let interlace;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![0, 2, 4, 6].includes(colorType)) throw new Error('semantic mask PNG must be non-interlaced 8-bit grayscale, RGB, grayscale-alpha, or RGBA');
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 })[colorType];
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const scanlines = Buffer.alloc(height * stride);
  for (let y = 0, input = 0; y < height; y += 1) {
    const filter = raw[input++];
    const row = scanlines.subarray(y * stride, (y + 1) * stride);
    const previous = y === 0 ? null : scanlines.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const value = raw[input++];
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous ? previous[x] : 0;
      const upperLeft = previous && x >= channels ? previous[x - channels] : 0;
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 255;
      else if (filter === 2) row[x] = (value + up) & 255;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const estimate = left + up - upperLeft;
        const pa = Math.abs(estimate - left); const pb = Math.abs(estimate - up); const pc = Math.abs(estimate - upperLeft);
        row[x] = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft)) & 255;
      } else throw new Error(`unsupported PNG filter ${filter}`);
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels; const target = pixel * 4;
    if (colorType === 0 || colorType === 4) rgba[target] = rgba[target + 1] = rgba[target + 2] = scanlines[source];
    else { rgba[target] = scanlines[source]; rgba[target + 1] = scanlines[source + 1]; rgba[target + 2] = scanlines[source + 2]; }
    rgba[target + 3] = colorType === 4 ? scanlines[source + 1] : colorType === 6 ? scanlines[source + 3] : 255;
  }
  return { width, height, rgba };
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const value of buffer) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const pngChunk = (type, data) => {
  const name = Buffer.from(type); const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0); name.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
};

export function encodePng({ width, height, rgba }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

function parseHex(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`invalid semantic color '${color}'`);
  return [Number.parseInt(color.slice(1, 3), 16), Number.parseInt(color.slice(3, 5), 16), Number.parseInt(color.slice(5, 7), 16)];
}

function rasterizeGeometry(map) {
  const { width, height } = map.world;
  const road = new Uint8Array(width * height);
  const pads = new Uint8Array(width * height);
  for (const route of map.routes) for (let segment = 0; segment < route.centerline.length - 1; segment += 1) {
    const start = route.centerline[segment]; const end = route.centerline[segment + 1];
    const dx = end.x - start.x; const dy = end.y - start.y; const squared = dx * dx + dy * dy;
    const x0 = Math.max(0, Math.floor(Math.min(start.x, end.x) - route.halfWidth));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(start.x, end.x) + route.halfWidth));
    const y0 = Math.max(0, Math.floor(Math.min(start.y, end.y) - route.halfWidth));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(start.y, end.y) + route.halfWidth));
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const ratio = squared === 0 ? 0 : Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / squared));
      if (Math.hypot(x - (start.x + dx * ratio), y - (start.y + dy * ratio)) <= route.halfWidth) road[y * width + x] = 1;
    }
  }
  for (const pad of map.buildPads) {
    const x0 = Math.max(0, Math.floor(pad.x - pad.radius)); const x1 = Math.min(width - 1, Math.ceil(pad.x + pad.radius));
    const y0 = Math.max(0, Math.floor(pad.y - pad.radius)); const y1 = Math.min(height - 1, Math.ceil(pad.y + pad.radius));
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (Math.hypot(x - pad.x, y - pad.y) <= pad.radius) {
      const index = y * width + x; pads[index] = 1; road[index] = 0;
    }
  }
  return { road, pads };
}

/** Creates the red-road/green-pad guide used by painting agents and mask exports. */
export function createSemanticMaskTemplate(map, config = {}) {
  const roadColor = parseHex(config.roadColor ?? '#ff0000'); const padColor = parseHex(config.padColor ?? '#00ff00');
  const geometry = rasterizeGeometry(map); const rgba = new Uint8Array(map.world.width * map.world.height * 4);
  for (let index = 0; index < geometry.road.length; index += 1) {
    const color = geometry.pads[index] ? padColor : geometry.road[index] ? roadColor : [0, 0, 0];
    rgba[index * 4] = color[0]; rgba[index * 4 + 1] = color[1]; rgba[index * 4 + 2] = color[2]; rgba[index * 4 + 3] = geometry.road[index] || geometry.pads[index] ? 255 : 0;
  }
  return { width: map.world.width, height: map.world.height, rgba };
}

function summedArea(mask, width, height) {
  const stride = width + 1; const sum = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) { row += mask[y * width + x]; sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row; }
  }
  return sum;
}
function near(sum, width, height, x, y, radius) {
  const stride = width + 1; const x0 = Math.max(0, x - radius); const y0 = Math.max(0, y - radius); const x1 = Math.min(width - 1, x + radius); const y1 = Math.min(height - 1, y + radius);
  return sum[(y1 + 1) * stride + x1 + 1] - sum[y0 * stride + x1 + 1] - sum[(y1 + 1) * stride + x0] + sum[y0 * stride + x0] > 0;
}

function compareMask(expected, actual, width, height, tolerancePx) {
  const actualSum = summedArea(actual, width, height); const expectedSum = summedArea(expected, width, height);
  let expectedCount = 0; let actualCount = 0; let recalled = 0; let precise = 0;
  for (let index = 0; index < expected.length; index += 1) {
    const x = index % width; const y = Math.floor(index / width);
    if (expected[index]) { expectedCount += 1; if (near(actualSum, width, height, x, y, tolerancePx)) recalled += 1; }
    if (actual[index]) { actualCount += 1; if (near(expectedSum, width, height, x, y, tolerancePx)) precise += 1; }
  }
  return { recall: expectedCount ? recalled / expectedCount : 1, precision: actualCount ? precise / actualCount : 0, expectedPixels: expectedCount, actualPixels: actualCount };
}

export function compareSemanticMask(map, decoded, config = {}) {
  if (decoded.width !== map.world.width || decoded.height !== map.world.height) throw new Error(`semantic mask is ${decoded.width}×${decoded.height}; expected ${map.world.width}×${map.world.height}`);
  const roadColor = parseHex(config.roadColor ?? '#ff0000'); const padColor = parseHex(config.padColor ?? '#00ff00');
  const colorTolerance = config.colorTolerance ?? 8; const tolerancePx = config.tolerancePx ?? 6;
  const actualRoad = new Uint8Array(decoded.width * decoded.height); const actualPads = new Uint8Array(actualRoad.length);
  for (let index = 0; index < actualRoad.length; index += 1) {
    const offset = index * 4; if (decoded.rgba[offset + 3] < 128) continue;
    const delta = (color) => Math.max(Math.abs(decoded.rgba[offset] - color[0]), Math.abs(decoded.rgba[offset + 1] - color[1]), Math.abs(decoded.rgba[offset + 2] - color[2]));
    if (delta(roadColor) <= colorTolerance) actualRoad[index] = 1;
    else if (delta(padColor) <= colorTolerance) actualPads[index] = 1;
  }
  const expected = rasterizeGeometry(map);
  const road = compareMask(expected.road, actualRoad, decoded.width, decoded.height, tolerancePx);
  const pads = compareMask(expected.pads, actualPads, decoded.width, decoded.height, tolerancePx);
  const proof = new Uint8Array(decoded.width * decoded.height * 4);
  for (let index = 0; index < actualRoad.length; index += 1) {
    let color = [12, 18, 24, 255];
    if (expected.road[index] && actualRoad[index]) color = [38, 210, 210, 255];
    else if (expected.road[index]) color = [255, 55, 55, 255];
    else if (actualRoad[index]) color = [220, 55, 255, 255];
    if (expected.pads[index] && actualPads[index]) color = [80, 235, 100, 255];
    else if (expected.pads[index]) color = [255, 215, 45, 255];
    else if (actualPads[index]) color = [255, 135, 35, 255];
    proof.set(color, index * 4);
  }
  return { road, pads, proof: { width: decoded.width, height: decoded.height, rgba: proof } };
}
