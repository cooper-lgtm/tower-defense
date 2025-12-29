// 简单 Canvas2D 渲染器，绘制网格、塔、敌人和 HUD
import { Enemy } from '../entities/enemy'
import { Tower } from '../entities/tower'
import { GridMap } from '../map/grid'
import type { Cell, GameState } from '../types'

export interface RenderState {
  towers: Tower[]
  enemies: Enemy[]
  gold: number
  score: number
  life: number
  wave: number
  state: GameState
  preview?: {
    cell: Cell
    buildable: boolean
  }
  selectedTowerId?: number
  rangeHighlights?: { x: number; y: number; radius: number; color: string; dashed?: boolean }[]
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D
  private dpr: number
  private map: GridMap
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, map: GridMap) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.map = map
    this.canvas = canvas
    this.dpr = window.devicePixelRatio || 1
    this.resize()
  }

  resize(): void {
    // DPR 适配：内部尺寸按 DPR 缩放，样式尺寸保持逻辑像素
    const width = this.map.width * this.map.cellSize
    const height = this.map.height * this.map.cellSize
    this.canvas.width = width * this.dpr
    this.canvas.height = height * this.dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.scale(this.dpr, this.dpr)
  }

  render(state: RenderState): void {
    const { ctx, map } = this
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(this.dpr, this.dpr)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawGrid()
    this.drawPreview(state.preview)
    this.drawRanges(state.rangeHighlights)
    this.drawTowers(state.towers, state.selectedTowerId)
    this.drawEnemies(state.enemies)

    // Entry/exit markers on top
    ctx.fillStyle = '#6bc46d'
    const entry = map.worldFromCell(map.entry)
    ctx.beginPath()
    ctx.arc(entry.x, entry.y, map.cellSize * 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ff6b6b'
    const exit = map.worldFromCell(map.exit)
    ctx.beginPath()
    ctx.arc(exit.x, exit.y, map.cellSize * 0.3, 0, Math.PI * 2)
    ctx.fill()

    if (state.state === 'gameover') {
      this.drawGameOver()
    }

    ctx.restore()
  }

  private drawGrid(): void {
    const { ctx, map } = this
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, map.width * map.cellSize, map.height * map.cellSize)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const px = x * map.cellSize
        const py = y * map.cellSize
        ctx.strokeRect(px, py, map.cellSize, map.cellSize)
        const cell = { x, y }
        if (map.isBlocked(cell)) {
          ctx.fillStyle = '#f1f5f9'
          ctx.fillRect(px, py, map.cellSize, map.cellSize)
        } else if (map.isNoBuild(cell)) {
          ctx.fillStyle = 'rgba(100,116,139,0.12)'
          ctx.fillRect(px, py, map.cellSize, map.cellSize)
        }
      }
    }
  }

  private drawPreview(preview?: { cell: Cell; buildable: boolean }): void {
    if (!preview) return
    const { ctx, map } = this
    const { cell, buildable } = preview
    const px = cell.x * map.cellSize
    const py = cell.y * map.cellSize
    ctx.fillStyle = buildable ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'
    ctx.fillRect(px, py, map.cellSize, map.cellSize)
  }

  private drawRanges(ranges?: { x: number; y: number; radius: number; color: string; dashed?: boolean }[]) {
    if (!ranges || ranges.length === 0) return
    const { ctx } = this
    ctx.save()
    ctx.lineWidth = 2
    for (const r of ranges) {
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
      ctx.strokeStyle = r.color
      if (r.dashed) ctx.setLineDash([8, 6])
      else ctx.setLineDash([])
      ctx.fillStyle = r.color
      ctx.globalAlpha = 0.4
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawTowers(towers: Tower[], selectedId?: number): void {
    const { ctx, map } = this
    for (const tower of towers) {
      const pos = map.worldFromCell(tower.data.cell)
      if (tower.data.id === selectedId) {
        ctx.save()
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(
          pos.x - map.cellSize * 0.45,
          pos.y - map.cellSize * 0.45,
          map.cellSize * 0.9,
          map.cellSize * 0.9
        )
        ctx.restore()
      }
      this.drawProjectile(tower)
      this.drawTowerIcon(tower, pos.x, pos.y, map.cellSize, tower.data.type === 'WALL' ? '#94a3b8' : '#0ea5e9')
    }
  }

  private drawProjectile(tower: Tower) {
    if (!tower.data.lastShot || tower.data.shotTimer <= 0 || !tower.data.lastShotStart) return
    const { ctx } = this
    const t = tower.data.shotTimer
    const isLaser = tower.data.type === 'LASER'
    const duration = tower.data.shotDuration || (isLaser ? 0.3 : 0.12)
    const alpha = isLaser ? 0.8 : Math.min(1, t / duration)
    const start = tower.data.lastShotStart
    const end = tower.data.lastShot
    const progress = 1 - t / duration

    ctx.save()
    if (isLaser) {
      ctx.strokeStyle = `rgba(244,63,94,${0.55 * alpha})`
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      ctx.strokeStyle = `rgba(168,85,247,${0.35 * alpha})`
      ctx.lineWidth = 4
      ctx.stroke()
    } else {
      const color =
        tower.data.type === 'CANNON' ? '#1d4ed8' : tower.data.type === 'HMG' ? '#ea580c' : '#22c55e'
      // 子弹当前位置插值
      const bx = start.x + (end.x - start.x) * progress
      const by = start.y + (end.y - start.y) * progress
      ctx.fillStyle = color
      const radius = tower.data.type === 'CANNON' ? 4 : tower.data.type === 'HMG' ? 3 : 2.4
      ctx.beginPath()
      ctx.arc(bx, by, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawTowerIcon(tower: Tower, x: number, y: number, size: number, baseColor: string): void {
    const { ctx } = this
    const radius = size * 0.35
    ctx.save()
    ctx.translate(x, y)
    if (tower.data.type !== 'WALL') {
      ctx.rotate(tower.data.heading || 0)
    }
    switch (tower.data.type) {
      case 'CANNON': {
        ctx.fillStyle = '#0ea5e9'
        ctx.beginPath()
        ctx.arc(-radius * 0.25, 0, radius * 0.9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(0, -radius * 0.3, radius * 1.1, radius * 0.6)
        ctx.fillStyle = '#1d4ed8'
        ctx.fillRect(radius * 0.4, -radius * 0.18, radius * 0.9, radius * 0.36)
        break
      }
      case 'LMG': {
        ctx.fillStyle = '#16a34a'
        ctx.beginPath()
        ctx.rect(-radius * 0.9, -radius * 0.6, radius * 1.6, radius * 1.2)
        ctx.fill()
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(0, -radius * 0.18, radius * 1.1, radius * 0.36)
        ctx.fillStyle = '#bbf7d0'
        ctx.fillRect(radius * 0.9, -radius * 0.22, radius * 0.5, radius * 0.44)
        break
      }
      case 'HMG': {
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.rect(-radius * 0.95, -radius * 0.8, radius * 1.6, radius * 1.6)
        ctx.fill()
        ctx.fillStyle = '#ea580c'
        ctx.fillRect(0, -radius * 0.22, radius * 1.05, radius * 0.44)
        ctx.fillStyle = '#fed7aa'
        ctx.fillRect(radius * 0.8, -radius * 0.3, radius * 0.45, radius * 0.6)
        break
      }
      case 'LASER': {
        ctx.fillStyle = '#a855f7'
        ctx.beginPath()
        ctx.rect(-radius * 0.7, -radius * 0.7, radius * 1.2, radius * 1.2)
        ctx.fill()
        ctx.fillStyle = '#f9a8d4'
        ctx.beginPath()
        ctx.arc(-radius * 0.2, 0, radius * 0.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f43f5e'
        ctx.fillRect(radius * 0.2, -radius * 0.2, radius * 0.9, radius * 0.4)
        break
      }
      case 'WALL': {
        ctx.fillStyle = '#94a3b8'
        ctx.beginPath()
        ctx.rect(-radius, -radius, radius * 2, radius * 2)
        ctx.fill()
        ctx.fillStyle = '#cbd5e1'
        ctx.fillRect(-radius * 0.9, -radius * 0.4, radius * 1.8, radius * 0.8)
        break
      }
      default: {
        ctx.fillStyle = baseColor
        ctx.beginPath()
        ctx.rect(-radius, -radius, radius * 2, radius * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  private drawEnemies(enemies: Enemy[]): void {
    const { ctx, map } = this
    for (const enemy of enemies) {
      const pos = enemy.position()
      ctx.fillStyle = enemy.data.color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, map.cellSize * 0.25, 0, Math.PI * 2)
      ctx.fill()
      // HP bar
      const hpRatio = Math.max(0, enemy.data.hp) / Math.max(1, enemy.data.maxHp)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(
        pos.x - map.cellSize * 0.25,
        pos.y - map.cellSize * 0.35,
        map.cellSize * 0.5,
        4
      )
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(
        pos.x - map.cellSize * 0.25,
        pos.y - map.cellSize * 0.35,
        map.cellSize * 0.5 * hpRatio,
        4
      )
    }
  }

  private drawGameOver(): void {
    const { ctx, map } = this
    const centerX = (map.width * map.cellSize) / 2
    const centerY = (map.height * map.cellSize) / 2
    ctx.save()
    ctx.fillStyle = 'rgba(15,23,42,0.25)'
    ctx.fillRect(0, 0, map.width * map.cellSize, map.height * map.cellSize)
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 64px "Inter", "SFMono-Regular", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GAME OVER', centerX, centerY)
    ctx.restore()
  }
}
