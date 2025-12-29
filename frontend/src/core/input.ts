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
  private clickListener!: (ev: MouseEvent) => void
  private moveListener!: (ev: MouseEvent) => void
  private touchEndListener!: (ev: TouchEvent) => void
  private touchMoveListener!: (ev: TouchEvent) => void

  constructor(canvas: HTMLCanvasElement, grid: GridMap) {
    this.canvas = canvas
    this.grid = grid
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
      const x = clientX - rect.left
      const y = clientY - rect.top
      const cell = this.grid.cellFromWorld(x, y)
      if (isClick) {
        this.onClickHandlers.forEach((fn) => fn(cell))
      } else {
        this.onMoveHandlers.forEach((fn) => fn(cell))
      }
    }

    this.clickListener = (ev) => handlePointer(ev.clientX, ev.clientY, true)
    this.moveListener = (ev) => handlePointer(ev.clientX, ev.clientY, false)
    this.touchEndListener = (ev) => {
      const touch = ev.changedTouches[0]
      handlePointer(touch.clientX, touch.clientY, true)
      ev.preventDefault()
    }
    this.touchMoveListener = (ev) => {
      const touch = ev.changedTouches[0]
      handlePointer(touch.clientX, touch.clientY, false)
    }

    this.canvas.addEventListener('click', this.clickListener)
    this.canvas.addEventListener('mousemove', this.moveListener)
    this.canvas.addEventListener('touchend', this.touchEndListener, { passive: false })
    this.canvas.addEventListener('touchmove', this.touchMoveListener, { passive: false })
  }

  dispose(): void {
    this.canvas.removeEventListener('click', this.clickListener)
    this.canvas.removeEventListener('mousemove', this.moveListener)
    this.canvas.removeEventListener('touchend', this.touchEndListener)
    this.canvas.removeEventListener('touchmove', this.touchMoveListener)
  }
}
