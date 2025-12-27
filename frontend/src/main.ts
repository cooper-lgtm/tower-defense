import './style.css'
import { Game } from './core/game'
import { createDefaultLevel } from './config/defaultLevel'
import { OverlayUI } from './ui/overlay'
import { fetchLeaderboard, fetchLevel, loadToken, login, register } from './api/client'
import type { LevelConfig, TowerType } from './types'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app root element')

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
canvas.tabIndex = 0
app.appendChild(canvas)

const uiContainer = document.createElement('div')
app.appendChild(uiContainer)

let game: Game | null = null
let levelConfig: LevelConfig | null = null
let started = false

async function loadLevel(): Promise<LevelConfig> {
  try {
    return await fetchLevel('endless')
  } catch {
    return createDefaultLevel()
  }
}

async function startGame() {
  if (started) return
  if (!levelConfig) {
    levelConfig = await loadLevel()
  }
  game = new Game(canvas, levelConfig)
  game.start()
  started = true
}

async function bootstrap() {
  levelConfig = await loadLevel()

  const overlay = new OverlayUI({
    onSelectTower: (type: TowerType) => game?.setBuildType(type),
    onLogin: async (name: string, password: string) => {
      await login(name, password)
      if (name === 'guest') {
        console.warn('游客模式：成绩不计入排行榜')
      }
    },
    onRegister: async (name: string, password: string) => {
      await register(name, password)
    },
    onRefreshLeaderboard: async () => {
      try {
        const entries = await fetchLeaderboard('endless')
        overlay.setLeaderboard(entries)
      } catch (err) {
        console.error(err)
      }
    },
    onStartGame: () => {
      startGame().catch((err) => console.error(err))
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
