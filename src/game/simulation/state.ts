import type { DamageType, EnemyId, HeroActiveSpellId, HeroArtifactId, HeroId, HeroMilestoneId, HeroSpellId, TowerBranch, TowerId } from '../content/types';
import type { Vec2 } from './geometry';

export interface EnemyState extends Vec2 {
  uid: number;
  wave: number;
  type: EnemyId;
  routeId: string;
  hp: number;
  maxHp: number;
  progress: number;
  /** Signed offset within the authored road corridor; progress stays authoritative. */
  laneOffset: number;
  /** Desired lane offset, approached at a bounded lateral speed. */
  laneTarget: number;
  alive: boolean;
  slow: number;
  slowTime: number;
  mark: number;
  markTime: number;
  spawnedAt: number;
  burn: number;
  burnTime: number;
  exposed: number;
  exposedTime: number;
  bossPhase: number;
  attackCooldown: number;
  engagedAllyUid: string | null;
  /** Guards the last-hit economy against duplicate splash/chain resolutions. */
  xpPaid: boolean;
}

export type TargetPriority = 'first' | 'strong' | 'flying';
export type ProjectileStyle = TowerId | HeroId | 'impact';
export type HeroMilestone = HeroMilestoneId;
export type DamageOwner =
  | { kind: 'hero'; heroId: HeroId; channel: 'basic' | 'ultimate' | 'magic' }
  | { kind: 'tower'; towerUid: number }
  | { kind: 'defender'; defenderUid: number }
  | { kind: 'environment' };
export type AttackPresentationActor = 'tower' | 'ally' | 'enemy';
export type AttackPresentationStyle = ProjectileStyle | EnemyId;

export interface AttackPresentationEvent {
  attackId: number;
  actor: AttackPresentationActor;
  actorUid: string;
  targetUid: string;
  source: Vec2;
  target: Vec2;
  /** Presentation-time seconds from attack start; scaled by the active game speed. */
  delay: number;
  color: number;
  style: AttackPresentationStyle;
}

export interface TowerState {
  uid: number;
  type: TowerId;
  padIndex: number;
  level: number;
  branch?: TowerBranch;
  cooldown: number;
  totalSpent: number;
  kills: number;
  shots: number;
  priority: TargetPriority;
  disabledTime: number;
}

export interface HeroState extends Vec2 {
  id: HeroId;
  name: string;
  color: number;
  accent: number;
  range: number;
  damage: number;
  fireRate: number;
  attackCooldown: number;
  speed: number;
  /** Combat-domain capability; ranged Lyra can acquire airborne targets. */
  canHitFlying: boolean;
  /** Only ground melee heroes may reserve and physically stop a lane enemy. */
  canBlock: boolean;
  /** Run-scoped, last-hit-only mastery. XP is cumulative and resets on restart. */
  level: number;
  xp: number;
  ownKills: number;
  milestones: HeroMilestone[];
  /** Run-scoped spell book derived only from personal-kill level progression. */
  unlockedSpells: HeroSpellId[];
  /** Authoritative simulation cooldowns; inactive or foreign spell keys stay zero. */
  spellCooldowns: Record<HeroActiveSpellId, number>;
  /** Optional briefing choice. Artifacts never drop or level during a run. */
  artifact: HeroArtifactId | null;
  basicStrikeCount: number;
  starseedPrimed: boolean;
  /** True after the player deliberately assigns this run's guard anchor. */
  commanded: boolean;
  target: Vec2;
  ultimateCooldown: number;
  ultimateMax: number;
  hp: number;
  maxHp: number;
  armor: number;
  alive: boolean;
  respawnTime: number;
  respawnMax: number;
  /** Uninterrupted disengagement required before passive recovery. */
  regenCooldown: number;
  spawn: Vec2;
  engagedEnemyUid: number | null;
}

export interface DefenderState extends Vec2 {
  uid: number;
  allyUid: string;
  towerUid: number;
  slot: number;
  hp: number;
  maxHp: number;
  armor: number;
  damage: number;
  fireRate: number;
  attackCooldown: number;
  alive: boolean;
  respawnTime: number;
  respawnMax: number;
  /** Uninterrupted disengagement required before passive recovery. */
  regenCooldown: number;
  engagedEnemyUid: number | null;
  home: Vec2;
}

export type GameEvent =
  | { type: 'enemy-spawned'; enemyUid: number }
  | { type: 'enemy-hit'; enemyUid: number; source: Vec2; damageType: DamageType; amount: number; splash: number; color: number; style: ProjectileStyle; lethal: boolean; bounty: number; owner: DamageOwner }
  | { type: 'enemy-defeated'; enemyUid: number; bounty: number; presentationDelayed: boolean }
  | { type: 'enemy-leaked'; enemyUid: number; lives: number }
  | { type: 'ally-attack'; allyUid: string; enemyUid: number; source: Vec2; color: number }
  | ({ type: 'attack-start' } & AttackPresentationEvent)
  | ({ type: 'attack-release' } & AttackPresentationEvent)
  | ({ type: 'attack-impact' } & AttackPresentationEvent)
  | { type: 'ally-hit'; allyUid: string; enemyUid: number; amount: number; hp: number }
  | { type: 'ally-defeated'; allyUid: string; respawn: number }
  | { type: 'ally-respawned'; allyUid: string; point: Vec2 }
  | { type: 'tower-built'; towerUid: number; padIndex: number }
  | { type: 'tower-upgraded'; towerUid: number }
  | { type: 'tower-sold'; towerUid: number; refund: number }
  | { type: 'wave-started'; wave: number; bonus: number }
  | { type: 'wave-cleared'; wave: number }
  | { type: 'hero-spell-cast'; hero: HeroId; spell: HeroActiveSpellId; point: Vec2; radius: number; targets: readonly number[] }
  | { type: 'hero-artifact-equipped'; hero: HeroId; artifact: HeroArtifactId | null }
  | { type: 'hero-xp'; hero: HeroId; enemyUid: number; amount: number; xp: number; ownKills: number }
  | { type: 'hero-level-up'; hero: HeroId; level: number; point: Vec2; unlocked?: HeroMilestone }
  | { type: 'boss-telegraph'; source: Vec2; point: Vec2; radius: number; duration: number; label: string }
  | { type: 'tower-disabled'; towerUid: number; duration: number }
  | { type: 'toast'; tone: 'good' | 'danger' | 'info'; message: string }
  | { type: 'victory' }
  | { type: 'defeat' };

export type GamePhase = 'briefing' | 'playing' | 'paused' | 'victory' | 'defeat';
export type DifficultyId = 'wanderer' | 'warden' | 'mythic';

export interface GameSnapshot {
  phase: GamePhase;
  difficulty: DifficultyId;
  gold: number;
  lives: number;
  startingLives: number;
  wave: number;
  waveTotal: number;
  waveActive: boolean;
  canCallWave: boolean;
  intermission: number;
  speed: 1 | 2;
  score: number;
  enemies: readonly EnemyState[];
  towers: readonly TowerState[];
  heroes: readonly HeroState[];
  defenders: readonly DefenderState[];
}
