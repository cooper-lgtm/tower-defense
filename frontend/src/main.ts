import './style.css'
import { Game } from './core/game'
import { createDefaultLevel } from './config/defaultLevel'
import { OverlayUI } from './ui/overlay'
import { fetchLeaderboard, fetchLevel, loadToken, login } from './api/client'
import type { LevelConfig, TowerType } from './types'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app root element')

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
canvas.tabIndex = 0
app.appendChild(canvas)

const uiContainer = document.createElement('div')
app.appendChild(uiContainer)

async function loadLevel(): Promise<LevelConfig> {
  try {
    return await fetchLevel('endless')
  } catch {
    return createDefaultLevel()
  }
}

async function bootstrap() {
  const levelConfig = await loadLevel()
  const game = new Game(canvas, levelConfig)
  game.start()

  const overlay = new OverlayUI({
    onSelectTower: (type: TowerType) => game.setBuildType(type),
    onLogin: async (name: string) => {
      await login(name)
      uiContainer.querySelector('.panel')?.classList.add('authed')
    },
    onRefreshLeaderboard: async () => {
      try {
        const entries = await fetchLeaderboard('endless')
        overlay.setLeaderboard(entries)
      } catch (err) {
        console.error(err)
      }
    },
  })
  overlay.mount(uiContainer)

  loadToken()
  overlay.setLeaderboard([])
  try {
    const entries = await fetchLeaderboard('endless')
    overlay.setLeaderboard(entries)
  } catch (err) {
    console.error('Leaderboard fetch failed', err)
  }
}

bootstrap().catch((err) => console.error(err))
