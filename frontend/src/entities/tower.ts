// 防御塔实体：简单最近进度优先选怪，按等级倍率造成伤害
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
      heading: 0,
      shotTimer: 0,
    }
  }

  definition(): TowerDefinition {
    return this.def
  }

  update(dt: number, enemies: Enemy[]): { killed: number; damage: number; scoreGain: number } {
    if (this.def.type === 'WALL') return { killed: 0, damage: 0, scoreGain: 0 }

    this.data.cooldown = Math.max(0, this.data.cooldown - dt)
    this.data.shotTimer = Math.max(0, this.data.shotTimer - dt)

    // 激光持续中：跟踪同一目标，更新炮口朝向与末端
    if (this.def.type === 'LASER' && this.data.shotTimer > 0 && this.data.lastTargetId != null) {
      const target = enemies.find((e) => e.data.id === this.data.lastTargetId && e.data.alive)
      if (target) {
        const origin = this.map.worldFromCell(this.data.cell)
        const targetPos = target.position()
        const dx = targetPos.x - origin.x
        const dy = targetPos.y - origin.y
        this.data.heading = Math.atan2(dy, dx)
        const muzzleOffset = this.map.cellSize * 0.45
        this.data.lastShotStart = {
          x: origin.x + Math.cos(this.data.heading) * muzzleOffset,
          y: origin.y + Math.sin(this.data.heading) * muzzleOffset,
        }
        this.data.lastShot = targetPos
        // 保持可见性
        if (this.data.shotTimer < 0.1) {
          this.data.shotTimer = 0.1
          this.data.shotDuration = Math.max(this.data.shotDuration ?? 0.1, 0.1)
        }
      }
    }

    if (this.data.cooldown > 0) return { killed: 0, damage: 0, scoreGain: 0 }

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

    if (!target) return { killed: 0, damage: 0, scoreGain: 0 }

    const targetPos = target.position()
    const dx = targetPos.x - origin.x
    const dy = targetPos.y - origin.y
    const desiredHeading = Math.atan2(dy, dx)
    // 射击瞬间直接朝向目标，避免炮口偏差
    this.data.heading = desiredHeading

    const damage = this.def.baseDamage * levelMultiplier(this.data.level)
    const { killed, dealt } = target.applyDamage(damage)
    const scoreGain = dealt > 0 ? Math.floor(Math.sqrt(dealt)) : 0
    this.data.cooldown = 1 / this.def.fireRate
    const dist = Math.hypot(dx, dy)
    const flight = this.def.type === 'LASER' ? 0.6 : Math.max(0.08, dist / this.projectileSpeed())
    const visibleTime = this.def.type === 'LASER' ? Math.max(flight, this.data.cooldown) : flight
    this.data.shotTimer = visibleTime
    this.data.shotDuration = visibleTime
    const muzzleOffset = this.map.cellSize * 0.45
    this.data.lastShotStart = {
      x: origin.x + Math.cos(this.data.heading) * muzzleOffset,
      y: origin.y + Math.sin(this.data.heading) * muzzleOffset,
    }
    this.data.lastShot = targetPos
    this.data.lastTargetId = target.data.id
    // 激光击杀后立即允许锁定下一个目标
    if (this.def.type === 'LASER' && killed) {
      this.data.cooldown = 0
      this.data.shotTimer = 0.2
      this.data.shotDuration = 0.2
    }
    return { killed: killed ? 1 : 0, damage: dealt, scoreGain }
  }

  private projectileSpeed(): number {
    const base = this.map.cellSize
    switch (this.def.type) {
      case 'CANNON':
        return base * 10
      case 'HMG':
        return base * 14
      case 'LMG':
        return base * 18
      case 'LASER':
        return base * 60
      default:
        return base * 8
    }
  }

}
