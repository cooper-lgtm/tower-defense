// 4 邻接 A* 寻路，返回入口→出口的栅格路径（含可选额外阻挡）
import type { Cell } from '../types'
import { GridMap } from '../map/grid'

interface Node {
  cell: Cell
  g: number
  f: number
  parent?: Node
}

const dirs: Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const heuristic = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
const key = (c: Cell) => `${c.x},${c.y}`

export function findPath(
  grid: GridMap,
  start: Cell,
  goal: Cell,
  extraBlocked?: Set<string>
): Cell[] | null {
  const open: Node[] = []
  const visited = new Map<string, Node>()

  const startNode: Node = { cell: start, g: 0, f: heuristic(start, goal) }
  open.push(startNode)
  visited.set(key(start), startNode)

  const isBlocked = (cell: Cell) =>
    (extraBlocked && extraBlocked.has(key(cell))) || grid.isBlocked(cell) || !grid.isInside(cell)

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!

    if (current.cell.x === goal.x && current.cell.y === goal.y) {
      const path: Cell[] = []
      let node: Node | undefined = current
      while (node) {
        path.push(node.cell)
        node = node.parent
      }
      return path.reverse()
    }

    for (const dir of dirs) {
      const next: Cell = { x: current.cell.x + dir.x, y: current.cell.y + dir.y }
      if (isBlocked(next)) continue
      const k = key(next)
      const g = current.g + 1
      const f = g + heuristic(next, goal)
      const existing = visited.get(k)
      if (!existing || g < existing.g) {
        const node: Node = { cell: next, g, f, parent: current }
        visited.set(k, node)
        open.push(node)
      }
    }
  }

  return null
}
