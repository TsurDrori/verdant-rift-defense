export const ASSETS = {
  environment: {
    verdantRift: 'environment.verdant-rift',
  },
  towers: {
    thorn: 'tower.thorn', ember: 'tower.ember', aegis: 'tower.aegis', astral: 'tower.astral',
  },
  towerRanks: {
    thorn: 'tower.ranks.thorn', ember: 'tower.ranks.ember', aegis: 'tower.ranks.aegis', astral: 'tower.ranks.astral',
  },
  towerBranches: {
    thorn: 'tower.branches.thorn', ember: 'tower.branches.ember', aegis: 'tower.branches.aegis', astral: 'tower.branches.astral',
  },
  units: { aegisDefender: 'unit.aegis-defender' },
  heroes: { kael: 'hero.kael', lyra: 'hero.lyra' },
  heroActions: { kael: 'hero.actions.kael', lyra: 'hero.actions.lyra' },
  enemies: {
    skitter: 'enemy.skitter', marauder: 'enemy.marauder', wisp: 'enemy.wisp',
    brute: 'enemy.brute', bloomlord: 'enemy.bloomlord',
  },
  enemyActions: {
    skitter: 'enemy.actions.skitter', marauder: 'enemy.actions.marauder', wisp: 'enemy.actions.wisp',
    brute: 'enemy.actions.brute', bloomlord: 'enemy.actions.bloomlord',
  },
} as const;

export const SPRITESHEETS = {
  [ASSETS.towerRanks.thorn]: { path: '/assets/towers/ranks/thorn-ranks.png', frameWidth: 591, frameHeight: 887 },
  [ASSETS.towerRanks.ember]: { path: '/assets/towers/ranks/ember-ranks.png', frameWidth: 724, frameHeight: 724 },
  [ASSETS.towerRanks.aegis]: { path: '/assets/towers/ranks/aegis-ranks.png', frameWidth: 674, frameHeight: 777 },
  [ASSETS.towerRanks.astral]: { path: '/assets/towers/ranks/astral-ranks.png', frameWidth: 591, frameHeight: 887 },
  [ASSETS.towerBranches.thorn]: { path: '/assets/towers/branches/thorn-branches.png', frameWidth: 887, frameHeight: 887 },
  [ASSETS.towerBranches.ember]: { path: '/assets/towers/branches/ember-branches.png', frameWidth: 775, frameHeight: 1014 },
  [ASSETS.towerBranches.aegis]: { path: '/assets/towers/branches/aegis-branches.png', frameWidth: 836, frameHeight: 941 },
  [ASSETS.towerBranches.astral]: { path: '/assets/towers/branches/astral-branches.png', frameWidth: 768, frameHeight: 1024 },
  [ASSETS.units.aegisDefender]: { path: '/assets/units/expanded/aegis-defender-12.png', frameWidth: 402, frameHeight: 347 },
  [ASSETS.heroActions.kael]: { path: '/assets/heroes/animation/expanded/kael-actions-12.png', frameWidth: 344, frameHeight: 428 },
  [ASSETS.heroActions.lyra]: { path: '/assets/heroes/animation/expanded/lyra-actions-12.png', frameWidth: 382, frameHeight: 372 },
  [ASSETS.enemyActions.skitter]: { path: '/assets/enemies/animation/expanded/skitter-actions-12.png', frameWidth: 402, frameHeight: 366 },
  [ASSETS.enemyActions.marauder]: { path: '/assets/enemies/animation/expanded/marauder-actions-12.png', frameWidth: 360, frameHeight: 349 },
  [ASSETS.enemyActions.wisp]: { path: '/assets/enemies/animation/expanded/wisp-actions-12.png', frameWidth: 337, frameHeight: 367 },
  [ASSETS.enemyActions.brute]: { path: '/assets/enemies/animation/expanded/brute-actions-12.png', frameWidth: 396, frameHeight: 313 },
  [ASSETS.enemyActions.bloomlord]: { path: '/assets/enemies/animation/expanded/bloomlord-actions-12.png', frameWidth: 389, frameHeight: 367 },
} as const;

export const ASSET_PATHS = {
  [ASSETS.environment.verdantRift]: '/assets/environment/verdant-rift.png',
} as const;
