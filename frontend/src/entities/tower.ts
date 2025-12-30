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
        const start = {
          x: origin.x + Math.cos(this.data.heading) * muzzleOffset,
          y: origin.y + Math.sin(this.data.heading) * muzzleOffset,
        }
        this.data.lastShotStart = start
        this.data.lastShot = targetPos
        if (this.data.lastShots && this.data.lastShots.length > 0) {
          this.data.lastShots = [{ start, end: targetPos }, ...this.data.lastShots.slice(1)]
        } else {
          this.data.lastShots = [{ start, end: targetPos }]
        }
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
    const candidates: { enemy: Enemy; progress: number; dist: number }[] = []

    for (const enemy of enemies) {
      if (!enemy.data.alive) continue
      const pos = enemy.position()
      const dx = pos.x - origin.x
      const dy = pos.y - origin.y
      const dist = Math.hypot(dx, dy)
      if (dist > rangePx) continue
      candidates.push({ enemy, progress: enemy.progressToExit(), dist })
    }

    if (candidates.length === 0) return { killed: 0, damage: 0, scoreGain: 0 }

    candidates.sort((a, b) => b.progress - a.progress)
    const targetCount = this.def.type === 'LASER' ? this.laserTargetCount() : 1
    const selected = candidates.slice(0, targetCount)
    const primary = selected[0]
    const desiredHeading = Math.atan2(primary.enemy.position().y - origin.y, primary.enemy.position().x - origin.x)
    // 射击瞬间直接朝向目标，避免炮口偏差
    this.data.heading = desiredHeading

    const damage = this.damagePerShot()
    const splashPx = (this.def.splashRadius ?? 0) * this.map.cellSize
    const muzzleOffset = this.def.type === 'LASER' ? this.map.cellSize * 0.15 : this.map.cellSize * 0.45
    const start = {
      x: origin.x + Math.cos(this.data.heading) * muzzleOffset,
      y: origin.y + Math.sin(this.data.heading) * muzzleOffset,
    }

    let furthestDist = 0
    let killed = 0
    let totalDamage = 0
    let scoreGain = 0
    const impactedIds = new Set<number>()
    const shots: { start: { x: number; y: number }; end: { x: number; y: number } }[] = []

    for (const pick of selected) {
      const impactPos = pick.enemy.position()
      shots.push({ start, end: impactPos })
      furthestDist = Math.max(furthestDist, pick.dist)
      const affected =
        splashPx > 0
          ? enemies.filter((e) => {
              if (!e.data.alive) return false
              const pos = e.position()
              return Math.hypot(pos.x - impactPos.x, pos.y - impactPos.y) <= splashPx
            })
          : [pick.enemy]

      for (const foe of affected) {
        if (impactedIds.has(foe.data.id)) continue
        impactedIds.add(foe.data.id)
        const result = foe.applyDamage(damage)
        if (this.def.type === 'FREEZE' && this.def.slow) {
          foe.applySlow(this.def.slow.multiplier, this.def.slow.duration)
        }
        if (result.killed) killed += 1
        totalDamage += result.dealt
        if (result.dealt > 0) scoreGain += Math.floor(Math.sqrt(result.dealt))
      }
    }

    this.data.cooldown = 1 / this.def.fireRate
    const flight = this.def.type === 'LASER' ? 0.6 : Math.max(0.08, furthestDist / this.projectileSpeed())
    const visibleTime = this.def.type === 'LASER' ? Math.max(flight, this.data.cooldown) : flight
    this.data.shotTimer = visibleTime
    this.data.shotDuration = visibleTime
    this.data.lastShotStart = start
    this.data.lastShot = shots[0]?.end
    this.data.lastShots = shots
    this.data.lastTargetId = primary.enemy.data.id
    // 激光击杀后立即允许锁定下一个目标
    if (this.def.type === 'LASER' && killed > 0) {
      this.data.cooldown = 0
      this.data.shotTimer = 0.2
      this.data.shotDuration = 0.2
    }
    return { killed, damage: totalDamage, scoreGain }
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
      case 'FREEZE':
        return base * 12
      default:
        return base * 8
    }
  }

  private laserTargetCount(): number {
    return Math.min(this.data.level, 3)
  }

  private damagePerShot(): number {
    if (this.def.type === 'LASER') {
      const level = this.data.level
      const extraLevels = Math.max(0, level - 3)
      const multiplier = level <= 3 ? 1 : 1 + extraLevels * 0.35
      return this.def.baseDamage * multiplier
    }
    return this.def.baseDamage * levelMultiplier(this.data.level)
  }
}
