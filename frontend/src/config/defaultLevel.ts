// 本地默认关卡配置，含塔/怪/波次/经济参数，计算并填充配置哈希
import { hashLevelConfig } from '../utils/hash'
import type {
  DifficultyTuning,
  EconomyConfig,
  EnemyDefinition,
  EnemyType,
  GridConfig,
  LevelConfig,
  TowerDefinition,
  TowerType,
  WaveGeneratorConfig,
  WaveSpec,
} from '../types'

const towerDefs: Record<TowerType, TowerDefinition> = {
  CANNON: {
    name: '加农炮',
    type: 'CANNON',
    baseDamage: 22,
    fireRate: 1.1,
    range: 3.5,
    costByLevel: [12, 18, 28, 44, 68],
    splashRadius: 0.6,
  },
  LMG: {
    name: '轻机枪',
    type: 'LMG',
    baseDamage: 10,
    fireRate: 3.2,
    range: 4.5,
    costByLevel: [10, 16, 24, 36, 52],
  },
  HMG: {
    name: '重机枪',
    type: 'HMG',
    baseDamage: 40,
    fireRate: 0.85,
    range: 2.8,
    costByLevel: [16, 24, 36, 52, 72],
    splashRadius: 0.4,
  },
  LASER: {
    name: '激光塔',
    type: 'LASER',
    baseDamage: 55,
    fireRate: 0.65,
    range: 4.2,
    costByLevel: [20, 32, 48, 70, 96],
    pierce: 2,
  },
  FREEZE: {
    name: '冷冻炮',
    type: 'FREEZE',
    baseDamage: 8,
    fireRate: 1,
    range: 4,
    costByLevel: [14, 22, 32, 48, 66],
    slow: { multiplier: 0.5, duration: 2.5 },
  },
  WALL: {
    name: '路障',
    type: 'WALL',
    baseDamage: 0,
    fireRate: 0,
    range: 0,
    costByLevel: [6, 9, 12, 16, 22],
  },
}

const enemyDefs: Record<EnemyType, EnemyDefinition> = {
  NORMAL: {
    name: 'Normal',
    type: 'NORMAL',
    baseHp: 35,
    baseArmor: 2,
    baseSpeed: 0.95,
    baseDamage: 1,
    reward: 2,
    color: '#5bb0ff',
  },
  FAST: {
    name: 'Fast',
    type: 'FAST',
    baseHp: 24,
    baseArmor: 1,
    baseSpeed: 1.6,
    baseDamage: 1,
    reward: 2,
    color: '#8de26d',
  },
  TANK: {
    name: 'Tank',
    type: 'TANK',
    baseHp: 90,
    baseArmor: 6,
    baseSpeed: 0.75,
    baseDamage: 2,
    reward: 4,
    color: '#d6a05f',
  },
  SHIELD: {
    name: 'Shield',
    type: 'SHIELD',
    baseHp: 55,
    baseArmor: 10,
    baseSpeed: 0.8,
    baseDamage: 1,
    reward: 3,
    color: '#7a6bff',
  },
  BRUISER: {
    name: 'Bruiser',
    type: 'BRUISER',
    baseHp: 110,
    baseArmor: 8,
    baseSpeed: 0.9,
    baseDamage: 3,
    reward: 6,
    color: '#ff7b6f',
  },
  BOSS: {
    name: 'Boss',
    type: 'BOSS',
    baseHp: 400,
    baseArmor: 12,
    baseSpeed: 0.72,
    baseDamage: 5,
    reward: 30,
    color: '#ff3b30',
  },
}

const grid: GridConfig = {
  width: 16,
  height: 16,
  cellSize: 32,
  entry: { x: 0, y: 8 },
  exit: { x: 15, y: 8 },
  blocked: [
    { x: 6, y: 7 },
    { x: 6, y: 8 },
    { x: 6, y: 9 },
  ],
  noBuild: [
    { x: 0, y: 8 },
    { x: 15, y: 8 },
  ],
  presetTowers: [
    { type: 'CANNON', cell: { x: 3, y: 7 }, level: 1 },
    { type: 'LMG', cell: { x: 3, y: 9 }, level: 1 },
  ],
  initialGold: 70,
  initialLife: 20,
}

const fixedWaves: WaveSpec[] = [
  { enemies: [{ type: 'NORMAL', count: 8 }] },
  { enemies: [{ type: 'NORMAL', count: 10 }, { type: 'FAST', count: 6 }] },
  { enemies: [{ type: 'NORMAL', count: 10 }, { type: 'FAST', count: 10 }, { type: 'TANK', count: 3 }] },
  { enemies: [{ type: 'SHIELD', count: 6 }, { type: 'FAST', count: 12 }] },
  { enemies: [{ type: 'BRUISER', count: 4 }, { type: 'TANK', count: 6 }, { type: 'FAST', count: 8 }] },
  { enemies: [{ type: 'BOSS', count: 1 }] },
]

const waveGenerator: WaveGeneratorConfig = {
  maxPerWave: 40,
  typeWeights: {
    NORMAL: 2,
    FAST: 1.6,
    TANK: 1.1,
    SHIELD: 1,
    BRUISER: 0.9,
    BOSS: 0.1,
  },
  difficultyGrowth: 0.12,
}

const difficulty: DifficultyTuning = {
  base: 1,
  minMultiplier: 0.6,
  maxMultiplier: 3,
  gainBonus: 0.08,
  lossPenalty: 0.18,
}

const economy: EconomyConfig = {
  sellRefundRate: 0.5,
  waveRewardBase: 6,
  waveRewardGrowth: 1.15,
  killRewardMultiplier: 1,
}

export function createDefaultLevel(): LevelConfig {
  const config: LevelConfig = {
    metadata: {
      id: 'endless',
      version: '0.2.0',
      hash: '',
    },
    grid,
    towers: towerDefs,
    enemies: enemyDefs,
    waves: {
      fixed: fixedWaves,
      generator: waveGenerator,
    },
    difficulty,
    economy,
  }

  const hash = hashLevelConfig(config)

  return {
    ...config,
    metadata: { ...config.metadata, hash },
  }
}
