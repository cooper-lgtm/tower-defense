import type { GameState } from '../types'

export class StateMachine {
  private current: GameState = 'menu'

  get state(): GameState {
    return this.current
  }

  set(state: GameState): void {
    this.current = state
  }

  is(state: GameState): boolean {
    return this.current === state
  }
}
