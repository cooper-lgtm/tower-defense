import type {
  DifficultyTuning,
  EnemyType,
  LevelConfig,
  WaveGeneratorConfig,
  WaveSpec,
} from '../types'

export interface WaveResult {
  livesLost: number
}

export interface GeneratedWave {
  spec: WaveSpec
  difficultyMultiplier: number
}

const pickTypeByWeight = (weights: Record<EnemyType, number>): EnemyType => {
  const entries = Object.entries(weights) as [EnemyType, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const r = Math.random() * total
  let acc = 0
  for (const [type, weight] of entries) {
    acc += weight
    if (r <= acc) return type
  }
  return entries[entries.length - 1][0]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function computeNextDifficulty(
  previous: number,
  waveResult: WaveResult | null,
  tuning: DifficultyTuning
): number {
  if (!waveResult) return tuning.base
  const lossPenalty = waveResult.livesLost > 0 ? tuning.lossPenalty * waveResult.livesLost : 0
  const gain = waveResult.livesLost === 0 ? tuning.gainBonus : 0
  const next = previous + gain - lossPenalty
  return clamp(next, tuning.minMultiplier, tuning.maxMultiplier)
}

function generateAutoWave(
  waveIndex: number,
  config: WaveGeneratorConfig
): WaveSpec {
  const count = Math.min(config.maxPerWave, Math.round(Math.pow(waveIndex + 1.2, 1.1) * 6))
  const enemies: Record<EnemyType, number> = {
    NORMAL: 0,
    FAST: 0,
    TANK: 0,
    SHIELD: 0,
    BRUISER: 0,
    BOSS: 0,
  }

  const weighted: Record<EnemyType, number> = { ...config.typeWeights }
  // Increase heavier types over time
  weighted.BOSS += waveIndex >= 8 ? 0.2 * waveIndex : 0
  weighted.BRUISER += waveIndex * 0.08
  weighted.TANK += waveIndex * 0.06
  weighted.SHIELD += waveIndex * 0.04

  for (let i = 0; i < count; i += 1) {
    const type = pickTypeByWeight(weighted)
    enemies[type] += 1
  }

  const packed = Object.entries(enemies)
    .filter(([, c]) => c > 0)
    .map(([type, c]) => ({ type: type as EnemyType, count: c }))

  return { enemies: packed }
}

export function generateWave(
  waveIndex: number,
  config: LevelConfig,
  previousDifficulty: number,
  waveResult: WaveResult | null
): GeneratedWave {
  const { fixed, generator } = config.waves
  const difficultyMultiplier = computeNextDifficulty(previousDifficulty, waveResult, config.difficulty)

  if (waveIndex < fixed.length) {
    return {
      spec: fixed[waveIndex],
      difficultyMultiplier,
    }
  }

  const autoWaveIndex = waveIndex - fixed.length
  const spec = generateAutoWave(autoWaveIndex, generator)

  return {
    spec,
    difficultyMultiplier: difficultyMultiplier + autoWaveIndex * generator.difficultyGrowth,
  }
}
