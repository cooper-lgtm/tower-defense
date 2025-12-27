import type { LevelConfig } from '../types'

// 递归稳定序列化：按 key 排序，保证 hash 一致
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`
}

// 轻量 FNV-1a，满足一致性（非安全用途）
export function hashStringFNV1a(input: string): string {
  let hash = 0x811c9dc5

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }

  return `fnv1a-${hash.toString(16).padStart(8, '0')}`
}

export function hashLevelConfig(config: LevelConfig): string {
  const { metadata, ...rest } = config
  const normalized = {
    ...rest,
    metadata: { ...metadata, hash: '' },
  }
  return hashStringFNV1a(stableStringify(normalized))
}
