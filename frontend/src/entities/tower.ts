import type { Cell, TowerDefinition, TowerInstance } from '../types'
import { Enemy } from './enemy'
import { GridMap } from '../map/grid'

let towerId = 0

const levelMultiplier = (level: number) => 1 + (level - 1) * 0.35

export class Tower {
  readonly data: TowerInstance
  private def: TowerDefinition
  private map: GridMap

  constructor(def: TowerDefinition, cell: Cell, level: number, map: GridMap) {
    this.def = def
    this.map = map
    this.data = {
      id: towerId += 1,
      type: def.type,
      level,
      cell,
      cooldown: 0,
    }
  }

  update(dt: number, enemies: Enemy[]): { killed: number; damage: number } {
    if (this.def.type === 'WALL') return { killed: 0, damage: 0 }

    this.data.cooldown = Math.max(0, this.data.cooldown - dt)

    if (this.data.cooldown > 0) return { killed: 0, damage: 0 }

    const rangePx = this.def.range * this.map.cellSize
    const origin = this.map.worldFromCell(this.data.cell)
    let target: Enemy | null = null
    let bestProgress = -Infinity

    for (const enemy of enemies) {
      if (!enemy.data.alive) continue
      const pos = enemy.position()
      const dx = pos.x - origin.x
      const dy = pos.y - origin.y
      const dist = Math.hypot(dx, dy)
      if (dist > rangePx) continue
      const progressScore = enemy.progressToExit()
      if (progressScore > bestProgress) {
        bestProgress = progressScore
        target = enemy
      }
    }

    if (!target) return { killed: 0, damage: 0 }

    const damage = this.def.baseDamage * levelMultiplier(this.data.level)
    const killed = target.applyDamage(damage) ? 1 : 0
    this.data.cooldown = 1 / this.def.fireRate
    return { killed, damage }
  }
}
