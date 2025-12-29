export type GameState = 'menu' | 'building' | 'running' | 'paused' | 'gameover'

export type EnemyType = 'NORMAL' | 'FAST' | 'TANK' | 'SHIELD' | 'BRUISER' | 'BOSS'
export type TowerType = 'CANNON' | 'LMG' | 'HMG' | 'LASER' | 'WALL'

export interface Cell {
  x: number
  y: number
}

export interface TowerDefinition {
  name: string
  type: TowerType
  baseDamage: number
  fireRate: number
  range: number
  costByLevel: number[]
  splashRadius?: number
  pierce?: number
}

export interface EnemyDefinition {
  name: string
  type: EnemyType
  baseHp: number
  baseArmor: number
  baseSpeed: number
  baseDamage: number
  reward: number
  color: string
}

export interface PresetTower {
  type: TowerType
  cell: Cell
  level: number
}

export interface GridConfig {
  width: number
  height: number
  cellSize: number
  entry: Cell
  exit: Cell
  blocked: Cell[]
  noBuild: Cell[]
  presetTowers: PresetTower[]
  initialGold: number
  initialLife: number
}

export interface LevelMetadata {
  id: string
  version: string
  hash: string
}

export interface WaveEnemy {
  type: EnemyType
  count: number
}

export interface WaveSpec {
  enemies: WaveEnemy[]
}

export interface WaveGeneratorConfig {
  maxPerWave: number
  typeWeights: Record<EnemyType, number>
  difficultyGrowth: number
}

export interface DifficultyTuning {
  base: number
  minMultiplier: number
  maxMultiplier: number
  gainBonus: number
  lossPenalty: number
}

export interface EconomyConfig {
  sellRefundRate: number
  waveRewardBase: number
  waveRewardGrowth: number
  killRewardMultiplier: number
}

export interface LevelConfig {
  metadata: LevelMetadata
  grid: GridConfig
  towers: Record<TowerType, TowerDefinition>
  enemies: Record<EnemyType, EnemyDefinition>
  waves: {
    fixed: WaveSpec[]
    generator: WaveGeneratorConfig
  }
  difficulty: DifficultyTuning
  economy: EconomyConfig
}

export interface TowerInstance {
  id: number
  type: TowerType
  level: number
  cell: Cell
  cooldown: number
  heading: number
  shotTimer: number
  lastShot?: { x: number; y: number }
  lastShotStart?: { x: number; y: number }
  shotDuration?: number
  lastTargetId?: number
}

export interface EnemyInstance {
  id: number
  type: EnemyType
  hp: number
  maxHp: number
  armor: number
  speed: number
  damage: number
  reward: number
  color: string
  progress: number
  path: Cell[]
  alive: boolean
  escaped: boolean
}

export interface LeaderboardEntry {
  user_id: number
  name: string
  score: number
  wave: number
  time_ms: number
  life_left: number
  created_at: string
}
