// 敌人实体：按难度实例化属性，沿路径移动，处理受击/逃脱
import type { Cell, EnemyDefinition, EnemyInstance } from '../types'
import { GridMap } from '../map/grid'

let enemyId = 0

const jitter = (min: number, max: number) => Math.random() * (max - min) + min

export class Enemy {
  readonly data: EnemyInstance
  private map: GridMap
  private worldPath: { x: number; y: number }[]
  private pathIndex = 0

  constructor(def: EnemyDefinition, path: Cell[], difficulty: number, map: GridMap) {
    const variance = jitter(0.8, 1.2)
    this.map = map
    this.worldPath = path.map((cell) => map.worldFromCell(cell))

    this.data = {
      id: enemyId += 1,
      type: def.type,
      hp: def.baseHp * difficulty * variance,
      maxHp: def.baseHp * difficulty * variance,
      armor: def.baseArmor * difficulty,
      speed: def.baseSpeed * difficulty,
      damage: def.baseDamage,
      reward: def.reward * variance,
      color: def.color,
      progress: 0,
      path,
      alive: true,
      escaped: false,
    }
  }

  update(dt: number): { escaped: boolean } {
    if (!this.data.alive || this.data.escaped) return { escaped: false }

    const speed = this.data.speed * this.map.cellSize
    let remaining = dt * speed

    while (remaining > 0 && this.pathIndex < this.worldPath.length - 1) {
      const curr = this.worldPath[this.pathIndex]
      const next = this.worldPath[this.pathIndex + 1]
      const dx = next.x - curr.x
      const dy = next.y - curr.y
      const dist = Math.hypot(dx, dy)
      if (dist === 0) {
        this.pathIndex += 1
        continue
      }
      const step = Math.min(remaining, dist - this.data.progress)
      this.data.progress += step
      if (this.data.progress >= dist) {
        this.pathIndex += 1
        this.data.progress = 0
      }
      remaining -= step
    }

    if (this.pathIndex >= this.worldPath.length - 1) {
      this.data.escaped = true
      this.data.alive = false
      return { escaped: true }
    }

    return { escaped: false }
  }

  position(): { x: number; y: number } {
    const curr = this.worldPath[this.pathIndex]
    const next = this.worldPath[Math.min(this.pathIndex + 1, this.worldPath.length - 1)]
    const dx = next.x - curr.x
    const dy = next.y - curr.y
    const dist = Math.hypot(dx, dy) || 1
    const t = this.data.progress / dist
    return {
      x: curr.x + dx * t,
      y: curr.y + dy * t,
    }
  }

  applyDamage(amount: number): boolean {
    const effective = Math.max(0, amount - this.data.armor)
    this.data.hp -= effective
    if (this.data.hp <= 0) {
      this.data.alive = false
      return true
    }
    return false
  }

  progressToExit(): number {
    return this.pathIndex + this.data.progress
  }

  occupiesCell(cell: Cell): boolean {
    const currentCell = this.map.cellFromWorld(this.position().x, this.position().y)
    return currentCell.x === cell.x && currentCell.y === cell.y
  }

  retargetPath(path: Cell[]): void {
    this.data.path = path
    this.worldPath = path.map((cell) => this.map.worldFromCell(cell))
    this.pathIndex = 0
    this.data.progress = 0
  }
}
