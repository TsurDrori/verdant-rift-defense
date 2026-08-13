import type { RunDefinition, StageCatalogEntry } from '../stages/types';

// Generated from content/stages/** by `pnpm content:sync`. Do not hand-edit.
export const STAGE_CATALOG = [
  {
    "id": "sunken-way",
    "chapter": 1,
    "order": 1,
    "name": "The Sunken Way",
    "mission": "Hold the Verdant Rift",
    "description": "The Hollow Bloom has poisoned the old crossing. Bind rival covenants to the stone circles and keep the golden gate alive.",
    "objective": "Defend the gate through 12 escalating waves",
    "threat": "Balanced assault",
    "reward": 3,
    "waves": 12,
    "enemies": [
      "Marauders",
      "Wisps",
      "Brutes"
    ],
    "mapPosition": {
      "x": 17,
      "y": 70
    },
    "playable": true,
    "run": {
      "stageId": "sunken-way",
      "map": {
        "id": "sunken-way",
        "title": "The Sunken Way",
        "world": {
          "width": 1600,
          "height": 900
        },
        "visual": {
          "kind": "painted",
          "assetKey": "environment.verdant-rift",
          "assetPath": "assets/environment/verdant-rift-1600.png"
        },
        "primaryRouteId": "main",
        "routes": [
          {
            "id": "main",
            "halfWidth": 36,
            "centerline": [
              {
                "x": 130,
                "y": -30
              },
              {
                "x": 245,
                "y": 58
              },
              {
                "x": 225,
                "y": 154
              },
              {
                "x": 355,
                "y": 229
              },
              {
                "x": 575,
                "y": 247
              },
              {
                "x": 720,
                "y": 190
              },
              {
                "x": 880,
                "y": 128
              },
              {
                "x": 1040,
                "y": 130
              },
              {
                "x": 1115,
                "y": 180
              },
              {
                "x": 1145,
                "y": 265
              },
              {
                "x": 1210,
                "y": 330
              },
              {
                "x": 1325,
                "y": 360
              },
              {
                "x": 1385,
                "y": 445
              },
              {
                "x": 1350,
                "y": 535
              },
              {
                "x": 1390,
                "y": 620
              },
              {
                "x": 1370,
                "y": 700
              },
              {
                "x": 1260,
                "y": 760
              },
              {
                "x": 1145,
                "y": 780
              },
              {
                "x": 1030,
                "y": 780
              },
              {
                "x": 900,
                "y": 740
              },
              {
                "x": 760,
                "y": 710
              },
              {
                "x": 620,
                "y": 710
              },
              {
                "x": 500,
                "y": 748
              },
              {
                "x": 360,
                "y": 792
              },
              {
                "x": 236,
                "y": 818
              },
              {
                "x": 135,
                "y": 830
              }
            ]
          }
        ],
        "buildPads": [
          {
            "id": "pad-0",
            "x": 394,
            "y": 154,
            "radius": 37
          },
          {
            "id": "pad-1",
            "x": 575,
            "y": 327,
            "radius": 37
          },
          {
            "id": "pad-2",
            "x": 1025,
            "y": 207,
            "radius": 37
          },
          {
            "id": "pad-3",
            "x": 1244,
            "y": 253,
            "radius": 37
          },
          {
            "id": "pad-4",
            "x": 1238,
            "y": 410,
            "radius": 37
          },
          {
            "id": "pad-5",
            "x": 1415,
            "y": 526,
            "radius": 37
          },
          {
            "id": "pad-6",
            "x": 1287,
            "y": 659,
            "radius": 37
          },
          {
            "id": "pad-7",
            "x": 1117,
            "y": 706,
            "radius": 37
          },
          {
            "id": "pad-8",
            "x": 906,
            "y": 676,
            "radius": 37
          },
          {
            "id": "pad-9",
            "x": 753,
            "y": 659,
            "radius": 37
          },
          {
            "id": "pad-10",
            "x": 462,
            "y": 675,
            "radius": 37
          }
        ],
        "markers": {
          "entrances": [
            {
              "routeId": "main",
              "x": 225,
              "y": 132,
              "label": "RIFT APPROACH"
            }
          ],
          "gate": {
            "x": 145,
            "y": 817,
            "label": "GATE"
          },
          "entrance": {
            "x": 225,
            "y": 132,
            "label": "RIFT APPROACH"
          }
        },
        "route": {
          "id": "main",
          "halfWidth": 36,
          "centerline": [
            {
              "x": 130,
              "y": -30
            },
            {
              "x": 245,
              "y": 58
            },
            {
              "x": 225,
              "y": 154
            },
            {
              "x": 355,
              "y": 229
            },
            {
              "x": 575,
              "y": 247
            },
            {
              "x": 720,
              "y": 190
            },
            {
              "x": 880,
              "y": 128
            },
            {
              "x": 1040,
              "y": 130
            },
            {
              "x": 1115,
              "y": 180
            },
            {
              "x": 1145,
              "y": 265
            },
            {
              "x": 1210,
              "y": 330
            },
            {
              "x": 1325,
              "y": 360
            },
            {
              "x": 1385,
              "y": 445
            },
            {
              "x": 1350,
              "y": 535
            },
            {
              "x": 1390,
              "y": 620
            },
            {
              "x": 1370,
              "y": 700
            },
            {
              "x": 1260,
              "y": 760
            },
            {
              "x": 1145,
              "y": 780
            },
            {
              "x": 1030,
              "y": 780
            },
            {
              "x": 900,
              "y": 740
            },
            {
              "x": 760,
              "y": 710
            },
            {
              "x": 620,
              "y": 710
            },
            {
              "x": 500,
              "y": 748
            },
            {
              "x": 360,
              "y": 792
            },
            {
              "x": 236,
              "y": 818
            },
            {
              "x": 135,
              "y": 830
            }
          ]
        }
      },
      "waves": [
        {
          "label": "First Rustle",
          "intel": "Light skitter packs. Establish overlapping fire.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 9,
              "interval": 0.82,
              "delay": 0
            }
          ]
        },
        {
          "label": "Bark & Blade",
          "intel": "Armored marauders resist arrows. Arcane damage is efficient.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 8,
              "interval": 0.62,
              "delay": 0
            },
            {
              "enemy": "marauder",
              "count": 5,
              "interval": 1.35,
              "delay": 2.4
            }
          ]
        },
        {
          "label": "Over the Canopy",
          "intel": "Gloam Wisps fly beyond ground-only towers and resist magic.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 6,
              "interval": 0.9,
              "delay": 0
            },
            {
              "enemy": "skitter",
              "count": 10,
              "interval": 0.55,
              "delay": 3.2
            }
          ]
        },
        {
          "label": "Heavy Footfall",
          "intel": "Mossbacks are heavily armored. Stall them inside blast zones.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 6,
              "interval": 0.9,
              "delay": 0
            },
            {
              "enemy": "brute",
              "count": 1,
              "interval": 2.4,
              "delay": 3.5
            }
          ]
        },
        {
          "label": "Twilight Pincer",
          "intel": "Mixed ranks create conflicting target priorities.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 16,
              "interval": 0.42,
              "delay": 0
            },
            {
              "enemy": "wisp",
              "count": 9,
              "interval": 0.72,
              "delay": 2.6
            },
            {
              "enemy": "marauder",
              "count": 7,
              "interval": 1,
              "delay": 4.2
            }
          ]
        },
        {
          "label": "Rootbreakers",
          "intel": "A disciplined armored column. Upgrade before expanding.",
          "groups": [
            {
              "enemy": "brute",
              "count": 3,
              "interval": 1.9,
              "delay": 0
            },
            {
              "enemy": "marauder",
              "count": 8,
              "interval": 0.68,
              "delay": 1.1
            },
            {
              "enemy": "skitter",
              "count": 10,
              "interval": 0.35,
              "delay": 2.2
            }
          ]
        },
        {
          "label": "Violet Rain",
          "intel": "A broad aerial assault tests your physical coverage.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 12,
              "interval": 0.55,
              "delay": 0
            },
            {
              "enemy": "skitter",
              "count": 12,
              "interval": 0.45,
              "delay": 3.4
            }
          ]
        },
        {
          "label": "Splinterhost",
          "intel": "Dense swarms screen durable brutes. Area damage is decisive.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 28,
              "interval": 0.27,
              "delay": 0
            },
            {
              "enemy": "brute",
              "count": 5,
              "interval": 1.7,
              "delay": 1.2
            }
          ]
        },
        {
          "label": "The Long Gloam",
          "intel": "Sustained mixed pressure. Save hero ultimates for the overlap.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 14,
              "interval": 0.6,
              "delay": 0
            },
            {
              "enemy": "wisp",
              "count": 15,
              "interval": 0.54,
              "delay": 2
            },
            {
              "enemy": "brute",
              "count": 6,
              "interval": 1.55,
              "delay": 4
            }
          ]
        },
        {
          "label": "Rift Tremor",
          "intel": "Veterans march beneath a warded sky.",
          "groups": [
            {
              "enemy": "brute",
              "count": 6,
              "interval": 1.45,
              "delay": 0
            },
            {
              "enemy": "wisp",
              "count": 14,
              "interval": 0.48,
              "delay": 1.5
            },
            {
              "enemy": "marauder",
              "count": 12,
              "interval": 0.58,
              "delay": 3.2
            }
          ]
        },
        {
          "label": "Last Green Dawn",
          "intel": "All enemy types commit. Refit weak sectors by selling at 70%.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 20,
              "interval": 0.27,
              "delay": 0
            },
            {
              "enemy": "marauder",
              "count": 12,
              "interval": 0.55,
              "delay": 1.4
            },
            {
              "enemy": "wisp",
              "count": 12,
              "interval": 0.48,
              "delay": 3
            },
            {
              "enemy": "brute",
              "count": 4,
              "interval": 1.4,
              "delay": 4.6
            }
          ]
        },
        {
          "label": "The Hollow Bloom",
          "intel": "The sovereign advances with a final escort. Break the bloom.",
          "groups": [
            {
              "enemy": "bloomlord",
              "count": 1,
              "interval": 0,
              "delay": 0
            },
            {
              "enemy": "marauder",
              "count": 14,
              "interval": 0.62,
              "delay": 2
            },
            {
              "enemy": "wisp",
              "count": 16,
              "interval": 0.46,
              "delay": 4
            },
            {
              "enemy": "brute",
              "count": 6,
              "interval": 1.4,
              "delay": 7
            }
          ]
        }
      ],
      "tacticalPressure": {
        "8": [
          {
            "enemy": "marauder",
            "count": 8,
            "interval": 0.58,
            "delay": 2.5
          }
        ],
        "9": [
          {
            "enemy": "skitter",
            "count": 12,
            "interval": 0.3,
            "delay": 5.6
          }
        ],
        "10": [
          {
            "enemy": "skitter",
            "count": 8,
            "interval": 0.28,
            "delay": 4.8
          },
          {
            "enemy": "wisp",
            "count": 5,
            "interval": 0.48,
            "delay": 5.4
          }
        ],
        "11": [
          {
            "enemy": "brute",
            "count": 3,
            "interval": 1.12,
            "delay": 3.1
          },
          {
            "enemy": "wisp",
            "count": 8,
            "interval": 0.43,
            "delay": 5.7
          }
        ],
        "12": [
          {
            "enemy": "skitter",
            "count": 10,
            "interval": 0.24,
            "delay": 1.1
          },
          {
            "enemy": "marauder",
            "count": 4,
            "interval": 0.52,
            "delay": 5.2
          }
        ]
      },
      "economy": {
        "difficulties": {
          "wanderer": {
            "startingGold": 360,
            "startingLives": 25,
            "enemyHp": 0.84,
            "enemySpeed": 0.94
          },
          "warden": {
            "startingGold": 310,
            "startingLives": 20,
            "enemyHp": 1,
            "enemySpeed": 1
          },
          "mythic": {
            "startingGold": 270,
            "startingLives": 15,
            "enemyHp": 1.18,
            "enemySpeed": 1.08
          }
        },
        "earlyCall": {
          "goldPerSecond": 2.2,
          "maximumBonus": 45,
          "heroCooldownRefund": 2.5
        },
        "intermissions": [
          {
            "throughWave": 3,
            "seconds": 18
          },
          {
            "throughWave": 7,
            "seconds": 22
          },
          {
            "throughWave": 12,
            "seconds": 26
          }
        ]
      },
      "objectives": [
        {
          "type": "protect-gate"
        },
        {
          "type": "survive-waves",
          "count": 12
        }
      ],
      "modifiers": [],
      "assets": {
        "images": [
          {
            "key": "environment.verdant-rift",
            "path": "assets/environment/verdant-rift-1600.png"
          }
        ]
      },
      "heroSpawns": {
        "kael": {
          "routeId": "main",
          "progress": 0.45
        },
        "lyra": {
          "routeId": "main",
          "progress": 0.68
        }
      }
    }
  },
  {
    "id": "rootbound-crossing",
    "chapter": 1,
    "order": 2,
    "name": "Rootbound Crossing",
    "mission": "Break the Briar Host",
    "description": "Two converging forest roads coil around an ancient wardstone. Enemy groups alternate approaches, demanding coverage that can answer both flanks.",
    "objective": "Hold both approaches through 10 waves",
    "threat": "Converging routes",
    "reward": 3,
    "waves": 10,
    "enemies": [
      "Skitter packs",
      "Marauders",
      "Wisps",
      "Brutes"
    ],
    "mapPosition": {
      "x": 35,
      "y": 53
    },
    "playable": true,
    "unlockAfter": "sunken-way",
    "run": {
      "stageId": "rootbound-crossing",
      "map": {
        "id": "rootbound-crossing",
        "title": "Rootbound Crossing",
        "world": {
          "width": 1600,
          "height": 900
        },
        "visual": {
          "kind": "procedural",
          "seed": 42017,
          "palette": {
            "ground": "#183b2b",
            "groundAlt": "#24543a",
            "road": "#b99b67",
            "roadEdge": "#6d593a",
            "water": "#1b6270",
            "foliage": [
              "#173e2b",
              "#27613c",
              "#497d3f",
              "#815b2e"
            ],
            "accent": "#9ee6c2"
          },
          "density": 0.72,
          "waterBands": [
            {
              "x": 770,
              "y": 390,
              "width": 210,
              "height": 1000,
              "rotation": 0.13
            },
            {
              "x": 1110,
              "y": 580,
              "width": 480,
              "height": 100,
              "rotation": -0.18
            }
          ],
          "landmarks": [
            {
              "kind": "wardstone",
              "x": 810,
              "y": 425,
              "scale": 1.3
            },
            {
              "kind": "ruin",
              "x": 1260,
              "y": 180,
              "scale": 0.9,
              "rotation": 0.2
            },
            {
              "kind": "grove",
              "x": 370,
              "y": 450,
              "scale": 1.2
            },
            {
              "kind": "crystal",
              "x": 1160,
              "y": 720,
              "scale": 0.85
            }
          ]
        },
        "primaryRouteId": "north",
        "routes": [
          {
            "id": "north",
            "halfWidth": 38,
            "centerline": [
              {
                "x": -50,
                "y": 145
              },
              {
                "x": 185,
                "y": 165
              },
              {
                "x": 350,
                "y": 255
              },
              {
                "x": 525,
                "y": 215
              },
              {
                "x": 690,
                "y": 295
              },
              {
                "x": 835,
                "y": 415
              },
              {
                "x": 1020,
                "y": 445
              },
              {
                "x": 1190,
                "y": 540
              },
              {
                "x": 1365,
                "y": 650
              },
              {
                "x": 1510,
                "y": 760
              },
              {
                "x": 1650,
                "y": 795
              }
            ]
          },
          {
            "id": "south",
            "halfWidth": 38,
            "centerline": [
              {
                "x": -50,
                "y": 760
              },
              {
                "x": 165,
                "y": 735
              },
              {
                "x": 315,
                "y": 650
              },
              {
                "x": 485,
                "y": 690
              },
              {
                "x": 655,
                "y": 585
              },
              {
                "x": 835,
                "y": 415
              },
              {
                "x": 1020,
                "y": 445
              },
              {
                "x": 1190,
                "y": 540
              },
              {
                "x": 1365,
                "y": 650
              },
              {
                "x": 1510,
                "y": 760
              },
              {
                "x": 1650,
                "y": 795
              }
            ]
          }
        ],
        "buildPads": [
          {
            "id": "north-0",
            "x": 210,
            "y": 270,
            "radius": 38
          },
          {
            "id": "north-1",
            "x": 430,
            "y": 110,
            "radius": 38
          },
          {
            "id": "north-2",
            "x": 620,
            "y": 160,
            "radius": 38
          },
          {
            "id": "junction-0",
            "x": 780,
            "y": 255,
            "radius": 38
          },
          {
            "id": "junction-1",
            "x": 920,
            "y": 540,
            "radius": 38
          },
          {
            "id": "south-0",
            "x": 205,
            "y": 625,
            "radius": 38
          },
          {
            "id": "south-1",
            "x": 430,
            "y": 800,
            "radius": 38
          },
          {
            "id": "south-2",
            "x": 620,
            "y": 735,
            "radius": 38
          },
          {
            "id": "merge-0",
            "x": 1080,
            "y": 340,
            "radius": 38
          },
          {
            "id": "merge-1",
            "x": 1225,
            "y": 670,
            "radius": 38
          },
          {
            "id": "gate-0",
            "x": 1405,
            "y": 570,
            "radius": 38
          },
          {
            "id": "gate-1",
            "x": 1480,
            "y": 835,
            "radius": 38
          }
        ],
        "markers": {
          "entrances": [
            {
              "routeId": "north",
              "x": 105,
              "y": 145,
              "label": "BRIAR NORTH"
            },
            {
              "routeId": "south",
              "x": 105,
              "y": 760,
              "label": "ROOT SOUTH"
            }
          ],
          "gate": {
            "x": 1510,
            "y": 790,
            "label": "WARD GATE"
          },
          "entrance": {
            "x": 105,
            "y": 145,
            "label": "BRIAR NORTH"
          }
        },
        "route": {
          "id": "north",
          "halfWidth": 38,
          "centerline": [
            {
              "x": -50,
              "y": 145
            },
            {
              "x": 185,
              "y": 165
            },
            {
              "x": 350,
              "y": 255
            },
            {
              "x": 525,
              "y": 215
            },
            {
              "x": 690,
              "y": 295
            },
            {
              "x": 835,
              "y": 415
            },
            {
              "x": 1020,
              "y": 445
            },
            {
              "x": 1190,
              "y": 540
            },
            {
              "x": 1365,
              "y": 650
            },
            {
              "x": 1510,
              "y": 760
            },
            {
              "x": 1650,
              "y": 795
            }
          ]
        }
      },
      "waves": [
        {
          "label": "Forked Trail",
          "intel": "Skitter scouts probe both approaches.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 7,
              "interval": 0.75,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 7,
              "interval": 0.75,
              "delay": 2.2,
              "route": "south"
            }
          ]
        },
        {
          "label": "Briar Discipline",
          "intel": "Marauders pressure the north while skitters race south.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 7,
              "interval": 1.05,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 12,
              "interval": 0.48,
              "delay": 1.5,
              "route": "south"
            }
          ]
        },
        {
          "label": "Crosswind",
          "intel": "Wisps ignore the split and test total anti-air coverage.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 8,
              "interval": 0.7,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 10,
              "interval": 0.52,
              "delay": 2,
              "route": "north"
            }
          ]
        },
        {
          "label": "Twin Hammers",
          "intel": "A brute anchors each road.",
          "groups": [
            {
              "enemy": "brute",
              "count": 2,
              "interval": 2.4,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "brute",
              "count": 2,
              "interval": 2.4,
              "delay": 1.2,
              "route": "south"
            },
            {
              "enemy": "marauder",
              "count": 8,
              "interval": 0.72,
              "delay": 2.2,
              "route": "north"
            }
          ]
        },
        {
          "label": "Wardstone Spiral",
          "intel": "Alternating packs converge at the wardstone.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 18,
              "interval": 0.34,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "marauder",
              "count": 10,
              "interval": 0.67,
              "delay": 1.1,
              "route": "south"
            },
            {
              "enemy": "wisp",
              "count": 8,
              "interval": 0.62,
              "delay": 3,
              "route": "north"
            }
          ]
        },
        {
          "label": "Rootbound Column",
          "intel": "Armor on the south conceals a northern rush.",
          "groups": [
            {
              "enemy": "brute",
              "count": 4,
              "interval": 1.75,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 22,
              "interval": 0.3,
              "delay": 1,
              "route": "north"
            }
          ]
        },
        {
          "label": "Canopy Divide",
          "intel": "Air and ground pressure arrive on opposite routes.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 16,
              "interval": 0.47,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "marauder",
              "count": 14,
              "interval": 0.6,
              "delay": 1.4,
              "route": "south"
            }
          ]
        },
        {
          "label": "Briar Flood",
          "intel": "Both approaches saturate before the merge.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 24,
              "interval": 0.25,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 24,
              "interval": 0.25,
              "delay": 0.8,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 5,
              "interval": 1.55,
              "delay": 2,
              "route": "south"
            }
          ]
        },
        {
          "label": "The Knotted Host",
          "intel": "Mixed formations punish isolated defenses.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 15,
              "interval": 0.54,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "wisp",
              "count": 15,
              "interval": 0.48,
              "delay": 1.2,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 7,
              "interval": 1.45,
              "delay": 2.8,
              "route": "north"
            }
          ]
        },
        {
          "label": "Briarheart Vanguard",
          "intel": "The complete host commits to both roads.",
          "groups": [
            {
              "enemy": "brute",
              "count": 7,
              "interval": 1.25,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "marauder",
              "count": 18,
              "interval": 0.48,
              "delay": 0.8,
              "route": "north"
            },
            {
              "enemy": "wisp",
              "count": 18,
              "interval": 0.42,
              "delay": 2.3,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 28,
              "interval": 0.23,
              "delay": 3.8,
              "route": "north"
            }
          ]
        }
      ],
      "tacticalPressure": {
        "6": [
          {
            "enemy": "marauder",
            "count": 6,
            "interval": 0.55,
            "delay": 4,
            "route": "north"
          }
        ],
        "8": [
          {
            "enemy": "wisp",
            "count": 7,
            "interval": 0.45,
            "delay": 4.5,
            "route": "south"
          }
        ],
        "9": [
          {
            "enemy": "skitter",
            "count": 12,
            "interval": 0.24,
            "delay": 5,
            "route": "south"
          }
        ],
        "10": [
          {
            "enemy": "brute",
            "count": 3,
            "interval": 1.1,
            "delay": 5.5,
            "route": "north"
          }
        ]
      },
      "economy": {
        "difficulties": {
          "wanderer": {
            "startingGold": 390,
            "startingLives": 25,
            "enemyHp": 0.82,
            "enemySpeed": 0.93
          },
          "warden": {
            "startingGold": 335,
            "startingLives": 20,
            "enemyHp": 1,
            "enemySpeed": 1
          },
          "mythic": {
            "startingGold": 295,
            "startingLives": 15,
            "enemyHp": 1.2,
            "enemySpeed": 1.09
          }
        },
        "earlyCall": {
          "goldPerSecond": 2,
          "maximumBonus": 42,
          "heroCooldownRefund": 2.25
        },
        "intermissions": [
          {
            "throughWave": 3,
            "seconds": 18
          },
          {
            "throughWave": 7,
            "seconds": 22
          },
          {
            "throughWave": 10,
            "seconds": 26
          }
        ]
      },
      "objectives": [
        {
          "type": "protect-gate"
        },
        {
          "type": "survive-waves",
          "count": 10
        }
      ],
      "modifiers": [
        "alternating-approaches"
      ],
      "assets": {
        "images": []
      },
      "heroSpawns": {
        "kael": {
          "routeId": "north",
          "progress": 0.58
        },
        "lyra": {
          "routeId": "south",
          "progress": 0.61
        }
      }
    }
  },
  {
    "id": "glasswood",
    "chapter": 1,
    "order": 3,
    "name": "The Glasswood",
    "mission": "Silence the Sky Choir",
    "description": "Crystal canopies conceal a flight path above the road. Mixed damage and mobile champions will be essential.",
    "objective": "Counter an airborne incursion",
    "threat": "Heavy air",
    "reward": 4,
    "waves": 14,
    "enemies": [
      "Wisp swarms",
      "Crystal heralds"
    ],
    "mapPosition": {
      "x": 53,
      "y": 68
    },
    "playable": false,
    "unlockAfter": "rootbound-crossing"
  },
  {
    "id": "cinder-grove",
    "chapter": 1,
    "order": 4,
    "name": "Cinder Grove",
    "mission": "Quench the Ember March",
    "description": "Armored warbands advance beneath a rain of ash. The route rewards armor breaking and deliberate stalling.",
    "objective": "Shatter the armored vanguard",
    "threat": "Heavy armor",
    "reward": 4,
    "waves": 15,
    "enemies": [
      "Brutes",
      "Cinder knights"
    ],
    "mapPosition": {
      "x": 70,
      "y": 45
    },
    "playable": false,
    "unlockAfter": "glasswood"
  },
  {
    "id": "hollow-crown",
    "chapter": 1,
    "order": 5,
    "name": "The Hollow Crown",
    "mission": "Sever the Bloom",
    "description": "At the forest heart, the sovereign wakes. Every covenant and champion will be tested in the final siege.",
    "objective": "Defeat the chapter sovereign",
    "threat": "Boss siege",
    "reward": 6,
    "waves": 16,
    "enemies": [
      "Elite host",
      "The Hollow Bloom"
    ],
    "mapPosition": {
      "x": 86,
      "y": 25
    },
    "playable": false,
    "unlockAfter": "cinder-grove"
  }
] as const satisfies readonly StageCatalogEntry[];

export type GeneratedStageId = typeof STAGE_CATALOG[number]['id'];
export const RUN_DEFINITIONS: Readonly<Record<string, RunDefinition>> = Object.fromEntries(
  STAGE_CATALOG.flatMap((stage) => 'run' in stage && stage.run ? [[stage.id, stage.run] as const] : []),
);
