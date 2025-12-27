// 输入抽象：统一鼠标/触摸到网格坐标，分发点击与移动回调
import type { Cell } from '../types'
import { GridMap } from '../map/grid'

type ClickHandler = (cell: Cell) => void
type MoveHandler = (cell: Cell) => void

export class InputController {
  private onClickHandlers: ClickHandler[] = []
  private onMoveHandlers: MoveHandler[] = []
  private canvas: HTMLCanvasElement
  private grid: GridMap
  private dpr: number

  constructor(canvas: HTMLCanvasElement, grid: GridMap, dpr: number) {
    this.canvas = canvas
    this.grid = grid
    this.dpr = dpr
    this.attach()
  }

  onClick(handler: ClickHandler): void {
    this.onClickHandlers.push(handler)
  }

  onMove(handler: MoveHandler): void {
    this.onMoveHandlers.push(handler)
  }

  private attach(): void {
    // 将屏幕坐标换算到 canvas 逻辑坐标后转成格子
    const handlePointer = (clientX: number, clientY: number, isClick: boolean) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = (clientX - rect.left) * this.dpr
      const y = (clientY - rect.top) * this.dpr
      const cell = this.grid.cellFromWorld(x, y)
      if (isClick) {
        this.onClickHandlers.forEach((fn) => fn(cell))
      } else {
        this.onMoveHandlers.forEach((fn) => fn(cell))
      }
    }

    this.canvas.addEventListener('click', (ev) => {
      handlePointer(ev.clientX, ev.clientY, true)
    })

    this.canvas.addEventListener('mousemove', (ev) => {
      handlePointer(ev.clientX, ev.clientY, false)
    })

    this.canvas.addEventListener(
      'touchend',
      (ev) => {
        const touch = ev.changedTouches[0]
        handlePointer(touch.clientX, touch.clientY, true)
        ev.preventDefault()
      },
      { passive: false }
    )

    this.canvas.addEventListener(
      'touchmove',
      (ev) => {
        const touch = ev.changedTouches[0]
        handlePointer(touch.clientX, touch.clientY, false)
      },
      { passive: false }
    )
  }
}
