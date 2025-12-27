// 网格/占用判定：建造、阻挡、坐标换算
import type { Cell, GridConfig } from '../types'

const key = (cell: Cell) => `${cell.x},${cell.y}`

export class GridMap {
  readonly width: number
  readonly height: number
  readonly cellSize: number
  readonly entry: Cell
  readonly exit: Cell
  private blocked: Set<string>
  private noBuild: Set<string>
  private occupied: Set<string>

  constructor(config: GridConfig) {
    this.width = config.width
    this.height = config.height
    this.cellSize = config.cellSize
    this.entry = config.entry
    this.exit = config.exit
    this.blocked = new Set(config.blocked.map(key))
    this.noBuild = new Set(config.noBuild.map(key))
    this.occupied = new Set(config.presetTowers.map((tower) => key(tower.cell)))
  }

  isInside(cell: Cell): boolean {
    return cell.x >= 0 && cell.y >= 0 && cell.x < this.width && cell.y < this.height
  }

  isBlocked(cell: Cell): boolean {
    return this.blocked.has(key(cell))
  }

  isOccupied(cell: Cell): boolean {
    return this.occupied.has(key(cell))
  }

  isNoBuild(cell: Cell): boolean {
    return this.noBuild.has(key(cell))
  }

  isBuildable(cell: Cell): boolean {
    if (!this.isInside(cell)) return false
    if (this.isBlocked(cell)) return false
    if (this.isNoBuild(cell)) return false
    if (this.isOccupied(cell)) return false
    if (cell.x === this.entry.x && cell.y === this.entry.y) return false
    if (cell.x === this.exit.x && cell.y === this.exit.y) return false
    return true
  }

  occupy(cell: Cell): void {
    this.occupied.add(key(cell))
  }

  release(cell: Cell): void {
    this.occupied.delete(key(cell))
  }

  worldFromCell(cell: Cell): { x: number; y: number } {
    return {
      x: (cell.x + 0.5) * this.cellSize,
      y: (cell.y + 0.5) * this.cellSize,
    }
  }

  cellFromWorld(x: number, y: number): Cell {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize),
    }
  }

  cloneBlockedWithExtra(blocks: Cell[]): Set<string> {
    const set = new Set<string>(this.blocked)
    this.occupied.forEach((k) => set.add(k))
    blocks.forEach((b) => set.add(key(b)))
    return set
  }

  blockedWithOccupancy(extra: Cell[] = []): Set<string> {
    const set = new Set<string>(this.blocked)
    this.occupied.forEach((k) => set.add(k))
    extra.forEach((b) => set.add(key(b)))
    return set
  }
}
