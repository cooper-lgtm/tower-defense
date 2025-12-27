// 简单 Canvas2D 渲染器，绘制网格、塔、敌人和 HUD
import { Enemy } from '../entities/enemy'
import { Tower } from '../entities/tower'
import { GridMap } from '../map/grid'
import type { Cell, GameState } from '../types'

export interface RenderState {
  towers: Tower[]
  enemies: Enemy[]
  gold: number
  life: number
  wave: number
  state: GameState
  preview?: {
    cell: Cell
    buildable: boolean
  }
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
    this.drawTowers(state.towers)
    this.drawEnemies(state.enemies)
    this.drawHud(state)

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

  private drawTowers(towers: Tower[]): void {
    const { ctx, map } = this
    for (const tower of towers) {
      const pos = map.worldFromCell(tower.data.cell)
      ctx.fillStyle = '#0ea5e9'
      if (tower.data.type === 'WALL') ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.rect(
        pos.x - map.cellSize * 0.35,
        pos.y - map.cellSize * 0.35,
        map.cellSize * 0.7,
        map.cellSize * 0.7
      )
      ctx.fill()
    }
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

  private drawHud(state: RenderState): void {
    const { ctx, map } = this
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(0, 0, map.width * map.cellSize, 28)
    ctx.fillStyle = '#0f172a'
    ctx.font = '14px "Inter", "SFMono-Regular", monospace'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Wave ${state.wave}`, 12, 14)
    ctx.fillText(`Gold: ${Math.floor(state.gold)}`, 90, 14)
    ctx.fillText(`Life: ${state.life}`, 180, 14)
    ctx.fillText(`State: ${state.state}`, 250, 14)
  }
}
