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
    "id": "moonroot-confluence",
    "chapter": 1,
    "order": 2,
    "name": "Moonroot Confluence",
    "mission": "Hold the Drowned Observatory",
    "description": "Two ancient forest roads meet on a moonlit stone bridge, wind around a ruined observatory, and coil past Moonroot's crystal ward before reaching the gate.",
    "objective": "Master both approaches and survive 12 converging waves",
    "threat": "Shared choke and double-pass hairpin",
    "reward": 5,
    "waves": 12,
    "enemies": [
      "Skitter packs",
      "Marauders",
      "Gloam Wisps",
      "Mossback Brutes",
      "The Hollow Bloom"
    ],
    "mapPosition": {
      "x": 35,
      "y": 53
    },
    "playable": true,
    "unlockAfter": "sunken-way",
    "run": {
      "stageId": "moonroot-confluence",
      "map": {
        "id": "moonroot-confluence",
        "title": "Moonroot Confluence",
        "world": {
          "width": 1600,
          "height": 900
        },
        "visual": {
          "kind": "painted",
          "assetKey": "environment.moonroot-confluence",
          "assetPath": "assets/environment/moonroot-confluence-painted-1600.png",
          "semanticMaskPath": "assets/environment/moonroot-confluence-semantic.png",
          "semanticMask": {
            "roadColor": "#ff0000",
            "padColor": "#00ff00",
            "tolerancePx": 6,
            "minRoadRecall": 0.97,
            "minRoadPrecision": 0.9,
            "minPadRecall": 0.95,
            "minPadPrecision": 0.9
          }
        },
        "primaryRouteId": "north",
        "routes": [
          {
            "id": "north",
            "halfWidth": 36,
            "centerline": [
              {
                "x": -60,
                "y": 125
              },
              {
                "x": 90,
                "y": 180
              },
              {
                "x": 205,
                "y": 225
              },
              {
                "x": 330,
                "y": 265
              },
              {
                "x": 470,
                "y": 260
              },
              {
                "x": 575,
                "y": 310
              },
              {
                "x": 650,
                "y": 405
              },
              {
                "x": 700,
                "y": 448
              },
              {
                "x": 780,
                "y": 385
              },
              {
                "x": 890,
                "y": 320
              },
              {
                "x": 1010,
                "y": 275
              },
              {
                "x": 1140,
                "y": 250
              },
              {
                "x": 1270,
                "y": 250
              },
              {
                "x": 1385,
                "y": 315
              },
              {
                "x": 1460,
                "y": 380
              },
              {
                "x": 1480,
                "y": 460
              },
              {
                "x": 1450,
                "y": 535
              },
              {
                "x": 1380,
                "y": 605
              },
              {
                "x": 1280,
                "y": 645
              },
              {
                "x": 1170,
                "y": 650
              },
              {
                "x": 1070,
                "y": 640
              },
              {
                "x": 1010,
                "y": 700
              },
              {
                "x": 1010,
                "y": 760
              },
              {
                "x": 1110,
                "y": 795
              },
              {
                "x": 1260,
                "y": 790
              },
              {
                "x": 1410,
                "y": 785
              },
              {
                "x": 1540,
                "y": 790
              },
              {
                "x": 1660,
                "y": 790
              }
            ],
            "sections": [
              {
                "id": "north-approach",
                "from": 0,
                "to": 0.277541
              },
              {
                "id": "north-shared-traffic",
                "from": 0.277541,
                "to": 1,
                "trafficGroup": "moonroot-shared-road"
              },
              {
                "id": "north-moonroot-bridge",
                "from": 0.277541,
                "to": 0.351821,
                "speedMultiplier": 0.72
              }
            ]
          },
          {
            "id": "south",
            "halfWidth": 36,
            "centerline": [
              {
                "x": -60,
                "y": 740
              },
              {
                "x": 80,
                "y": 715
              },
              {
                "x": 215,
                "y": 700
              },
              {
                "x": 340,
                "y": 675
              },
              {
                "x": 460,
                "y": 625
              },
              {
                "x": 570,
                "y": 555
              },
              {
                "x": 640,
                "y": 485
              },
              {
                "x": 700,
                "y": 448
              },
              {
                "x": 780,
                "y": 385
              },
              {
                "x": 890,
                "y": 320
              },
              {
                "x": 1010,
                "y": 275
              },
              {
                "x": 1140,
                "y": 250
              },
              {
                "x": 1270,
                "y": 250
              },
              {
                "x": 1385,
                "y": 315
              },
              {
                "x": 1460,
                "y": 380
              },
              {
                "x": 1480,
                "y": 460
              },
              {
                "x": 1450,
                "y": 535
              },
              {
                "x": 1380,
                "y": 605
              },
              {
                "x": 1280,
                "y": 645
              },
              {
                "x": 1170,
                "y": 650
              },
              {
                "x": 1070,
                "y": 640
              },
              {
                "x": 1010,
                "y": 700
              },
              {
                "x": 1010,
                "y": 760
              },
              {
                "x": 1110,
                "y": 795
              },
              {
                "x": 1260,
                "y": 790
              },
              {
                "x": 1410,
                "y": 785
              },
              {
                "x": 1540,
                "y": 790
              },
              {
                "x": 1660,
                "y": 790
              }
            ],
            "sections": [
              {
                "id": "south-approach",
                "from": 0,
                "to": 0.272248
              },
              {
                "id": "south-shared-traffic",
                "from": 0.272248,
                "to": 1,
                "trafficGroup": "moonroot-shared-road"
              },
              {
                "id": "south-moonroot-bridge",
                "from": 0.272248,
                "to": 0.347073,
                "speedMultiplier": 0.72
              }
            ]
          }
        ],
        "buildPads": [
          {
            "id": "north-watch",
            "x": 198,
            "y": 142,
            "radius": 37
          },
          {
            "id": "north-bend",
            "x": 480,
            "y": 200,
            "radius": 37
          },
          {
            "id": "upper-lens",
            "x": 939,
            "y": 243,
            "radius": 37
          },
          {
            "id": "observatory-high",
            "x": 1184,
            "y": 176,
            "radius": 37
          },
          {
            "id": "east-arc",
            "x": 1417,
            "y": 280,
            "radius": 37
          },
          {
            "id": "moonroot-heart",
            "x": 1108,
            "y": 498,
            "radius": 37
          },
          {
            "id": "inner-return",
            "x": 923,
            "y": 634,
            "radius": 37
          },
          {
            "id": "double-pass-ward",
            "x": 1193,
            "y": 698,
            "radius": 37
          },
          {
            "id": "south-watch",
            "x": 68,
            "y": 770,
            "radius": 37
          }
        ],
        "markers": {
          "entrances": [
            {
              "routeId": "north",
              "x": 75,
              "y": 174,
              "label": "MOONWEIR ROAD"
            },
            {
              "routeId": "south",
              "x": 75,
              "y": 716,
              "label": "REEDMARCH ROAD"
            }
          ],
          "gate": {
            "x": 1540,
            "y": 790,
            "label": "WARD"
          },
          "entrance": {
            "x": 75,
            "y": 174,
            "label": "MOONWEIR ROAD"
          }
        },
        "strategicRequirements": {
          "baseTowerRanges": [
            126,
            158,
            170,
            176
          ],
          "minDoublePassPads": 1,
          "minMultiRoutePads": 2,
          "minDistinctProfiles": 4,
          "maxDominatedPads": 1
        },
        "route": {
          "id": "north",
          "halfWidth": 36,
          "centerline": [
            {
              "x": -60,
              "y": 125
            },
            {
              "x": 90,
              "y": 180
            },
            {
              "x": 205,
              "y": 225
            },
            {
              "x": 330,
              "y": 265
            },
            {
              "x": 470,
              "y": 260
            },
            {
              "x": 575,
              "y": 310
            },
            {
              "x": 650,
              "y": 405
            },
            {
              "x": 700,
              "y": 448
            },
            {
              "x": 780,
              "y": 385
            },
            {
              "x": 890,
              "y": 320
            },
            {
              "x": 1010,
              "y": 275
            },
            {
              "x": 1140,
              "y": 250
            },
            {
              "x": 1270,
              "y": 250
            },
            {
              "x": 1385,
              "y": 315
            },
            {
              "x": 1460,
              "y": 380
            },
            {
              "x": 1480,
              "y": 460
            },
            {
              "x": 1450,
              "y": 535
            },
            {
              "x": 1380,
              "y": 605
            },
            {
              "x": 1280,
              "y": 645
            },
            {
              "x": 1170,
              "y": 650
            },
            {
              "x": 1070,
              "y": 640
            },
            {
              "x": 1010,
              "y": 700
            },
            {
              "x": 1010,
              "y": 760
            },
            {
              "x": 1110,
              "y": 795
            },
            {
              "x": 1260,
              "y": 790
            },
            {
              "x": 1410,
              "y": 785
            },
            {
              "x": 1540,
              "y": 790
            },
            {
              "x": 1660,
              "y": 790
            }
          ],
          "sections": [
            {
              "id": "north-approach",
              "from": 0,
              "to": 0.277541
            },
            {
              "id": "north-shared-traffic",
              "from": 0.277541,
              "to": 1,
              "trafficGroup": "moonroot-shared-road"
            },
            {
              "id": "north-moonroot-bridge",
              "from": 0.277541,
              "to": 0.351821,
              "speedMultiplier": 0.72
            }
          ]
        }
      },
      "waves": [
        {
          "label": "Two Roads Stir",
          "intel": "Equal skitter scouts reveal both approach roads. Two cheap route-exclusive towers are safer than one greedy choke tower.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 8,
              "interval": 0.76,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 8,
              "interval": 0.76,
              "delay": 2.2,
              "route": "south"
            }
          ]
        },
        {
          "label": "Reed and Iron",
          "intel": "Armor marches north while a fast southern pack tests whether both entrances are covered.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 6,
              "interval": 1.08,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 14,
              "interval": 0.46,
              "delay": 1.4,
              "route": "south"
            }
          ]
        },
        {
          "label": "Lanterns Above",
          "intel": "Wisps cross both roads and ignore the slowing shallows. Build anti-air coverage beyond the entrance pads.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 7,
              "interval": 0.72,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "wisp",
              "count": 7,
              "interval": 0.72,
              "delay": 2.1,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 10,
              "interval": 0.44,
              "delay": 3.3,
              "route": "south"
            }
          ]
        },
        {
          "label": "The First Confluence",
          "intel": "Staggered columns meet in the Veilwater choke. Area damage and blocking gain their first decisive window.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 9,
              "interval": 0.82,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 18,
              "interval": 0.34,
              "delay": 2.4,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 2,
              "interval": 2.2,
              "delay": 4.3,
              "route": "north"
            }
          ]
        },
        {
          "label": "Lensward Coil",
          "intel": "Alternating ground packs traverse both sides of the observatory hairpin. Its inner foundations earn two firing windows.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 16,
              "interval": 0.32,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "marauder",
              "count": 10,
              "interval": 0.68,
              "delay": 1.5,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 14,
              "interval": 0.3,
              "delay": 4.4,
              "route": "south"
            }
          ]
        },
        {
          "label": "Moss in the Shallows",
          "intel": "Brutes crowd the shared water while a northern rush punishes defenses committed too far downstream.",
          "groups": [
            {
              "enemy": "brute",
              "count": 4,
              "interval": 1.7,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 22,
              "interval": 0.28,
              "delay": 1.1,
              "route": "north"
            },
            {
              "enemy": "marauder",
              "count": 8,
              "interval": 0.62,
              "delay": 3.9,
              "route": "south"
            }
          ]
        },
        {
          "label": "False Reflection",
          "intel": "Aerial pressure ignores the choke while armored ground troops bunch beneath it. Separate anti-air and splash duties.",
          "groups": [
            {
              "enemy": "wisp",
              "count": 16,
              "interval": 0.45,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "marauder",
              "count": 14,
              "interval": 0.54,
              "delay": 1.7,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 3,
              "interval": 1.55,
              "delay": 4.2,
              "route": "south"
            }
          ]
        },
        {
          "label": "Flood at Moonfall",
          "intel": "Both entrances saturate together. Shared-lane queues become dangerous rather than safely serialized.",
          "groups": [
            {
              "enemy": "skitter",
              "count": 26,
              "interval": 0.24,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 26,
              "interval": 0.24,
              "delay": 0.65,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 5,
              "interval": 1.42,
              "delay": 2.8,
              "route": "north"
            }
          ]
        },
        {
          "label": "The Drowned Column",
          "intel": "Durable formations overlap throughout the hairpin. Upgrade the double-pass foundations instead of buying uniform coverage.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 16,
              "interval": 0.5,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 7,
              "interval": 1.35,
              "delay": 1.6,
              "route": "north"
            },
            {
              "enemy": "wisp",
              "count": 14,
              "interval": 0.43,
              "delay": 3.4,
              "route": "south"
            }
          ]
        },
        {
          "label": "Broken Orrery",
          "intel": "The formation reverses its earlier pattern: armored south, air north, then skitters through both gates of the choke.",
          "groups": [
            {
              "enemy": "brute",
              "count": 7,
              "interval": 1.28,
              "delay": 0,
              "route": "south"
            },
            {
              "enemy": "wisp",
              "count": 18,
              "interval": 0.4,
              "delay": 0.8,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 24,
              "interval": 0.24,
              "delay": 3.1,
              "route": "north"
            },
            {
              "enemy": "skitter",
              "count": 18,
              "interval": 0.26,
              "delay": 4.3,
              "route": "south"
            }
          ]
        },
        {
          "label": "No Quiet Water",
          "intel": "Sustained mixed pressure leaves no empty lane. Save hero spells for the true merge, not the first visible pack.",
          "groups": [
            {
              "enemy": "marauder",
              "count": 18,
              "interval": 0.46,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "wisp",
              "count": 18,
              "interval": 0.39,
              "delay": 1.1,
              "route": "south"
            },
            {
              "enemy": "brute",
              "count": 8,
              "interval": 1.2,
              "delay": 2.4,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 28,
              "interval": 0.21,
              "delay": 4.6,
              "route": "north"
            }
          ]
        },
        {
          "label": "Sovereign of the Veil",
          "intel": "The Hollow Bloom advances from Moonweir under a complete two-road escort. The observatory coil is the final killing ground.",
          "groups": [
            {
              "enemy": "bloomlord",
              "count": 1,
              "interval": 0,
              "delay": 0,
              "route": "north"
            },
            {
              "enemy": "brute",
              "count": 8,
              "interval": 1.16,
              "delay": 1.2,
              "route": "south"
            },
            {
              "enemy": "marauder",
              "count": 20,
              "interval": 0.43,
              "delay": 2.2,
              "route": "north"
            },
            {
              "enemy": "wisp",
              "count": 20,
              "interval": 0.36,
              "delay": 3.6,
              "route": "south"
            },
            {
              "enemy": "skitter",
              "count": 32,
              "interval": 0.2,
              "delay": 5.4,
              "route": "south"
            }
          ]
        }
      ],
      "tacticalPressure": {
        "6": [
          {
            "enemy": "marauder",
            "count": 6,
            "interval": 0.52,
            "delay": 4.8,
            "route": "north"
          }
        ],
        "8": [
          {
            "enemy": "wisp",
            "count": 8,
            "interval": 0.4,
            "delay": 4.7,
            "route": "south"
          }
        ],
        "9": [
          {
            "enemy": "skitter",
            "count": 14,
            "interval": 0.22,
            "delay": 5.2,
            "route": "north"
          }
        ],
        "10": [
          {
            "enemy": "marauder",
            "count": 7,
            "interval": 0.46,
            "delay": 5.4,
            "route": "south"
          }
        ],
        "11": [
          {
            "enemy": "wisp",
            "count": 9,
            "interval": 0.36,
            "delay": 5.8,
            "route": "north"
          }
        ],
        "12": [
          {
            "enemy": "brute",
            "count": 4,
            "interval": 1.05,
            "delay": 6.2,
            "route": "north"
          }
        ]
      },
      "economy": {
        "difficulties": {
          "wanderer": {
            "startingGold": 370,
            "startingLives": 25,
            "enemyHp": 0.84,
            "enemySpeed": 0.94
          },
          "warden": {
            "startingGold": 305,
            "startingLives": 18,
            "enemyHp": 1.04,
            "enemySpeed": 1.03
          },
          "mythic": {
            "startingGold": 260,
            "startingLives": 12,
            "enemyHp": 1.27,
            "enemySpeed": 1.12
          }
        },
        "earlyCall": {
          "goldPerSecond": 2.35,
          "maximumBonus": 48,
          "heroCooldownRefund": 2.5
        },
        "intermissions": [
          {
            "throughWave": 3,
            "seconds": 17
          },
          {
            "throughWave": 7,
            "seconds": 21
          },
          {
            "throughWave": 10,
            "seconds": 24
          },
          {
            "throughWave": 12,
            "seconds": 28
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
      "modifiers": [
        "alternating-approaches"
      ],
      "assets": {
        "images": [
          {
            "key": "environment.moonroot-confluence",
            "path": "assets/environment/moonroot-confluence-painted-1600.png"
          }
        ]
      },
      "heroSpawns": {
        "kael": {
          "routeId": "north",
          "progress": 0.32
        },
        "lyra": {
          "routeId": "south",
          "progress": 0.38
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
    "unlockAfter": "moonroot-confluence"
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
  },
  {
    "id": "rootbound-crossing",
    "chapter": 1,
    "order": 6,
    "name": "Rootbound Crossing",
    "mission": "Route Systems Test",
    "description": "An internal procedural fixture retained for navigation and multi-route regression testing. It is not a production campaign stage.",
    "objective": "Development fixture",
    "threat": "Non-production",
    "reward": 0,
    "waves": 10,
    "enemies": [
      "Skitter packs",
      "Marauders",
      "Wisps",
      "Brutes"
    ],
    "mapPosition": {
      "x": 94,
      "y": 13
    },
    "playable": false
  }
] as const satisfies readonly StageCatalogEntry[];

export type GeneratedStageId = typeof STAGE_CATALOG[number]['id'];
export const RUN_DEFINITIONS: Readonly<Record<string, RunDefinition>> = Object.fromEntries(
  STAGE_CATALOG.flatMap((stage) => 'run' in stage && stage.run ? [[stage.id, stage.run] as const] : []),
);
