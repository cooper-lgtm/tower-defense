import './style.css'
import { Game } from './core/game'
import { createDefaultLevel } from './config/defaultLevel'
import { OverlayUI } from './ui/overlay'
import { AuthModal } from './ui/authModal'
import { fetchLeaderboard, fetchLevel, loadToken } from './api/client'
import type { LevelConfig, TowerType } from './types'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app root element')

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
canvas.tabIndex = 0
// 左列：排行榜
const leftColumn = document.createElement('div')
leftColumn.id = 'left-column'
app.appendChild(leftColumn)

// 中列：画布
const canvasWrapper = document.createElement('div')
canvasWrapper.style.position = 'relative'
canvasWrapper.appendChild(canvas)
app.appendChild(canvasWrapper)

// 右列：用户/塔/榜单
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
    onRefreshLeaderboard: async () => {
      try {
        const entries = await fetchLeaderboard('endless')
        overlay.setLeaderboard(entries)
      } catch (err) {
        console.error(err)
      }
    },
  })
  overlay.mount(uiContainer, leftColumn)

  overlay.setLeaderboard([])
  try {
    const entries = await fetchLeaderboard('endless')
    overlay.setLeaderboard(entries)
  } catch (err) {
    console.error('Leaderboard fetch failed', err)
  }
  // Auth modal
  const auth = new AuthModal({
    onAuthenticated: (info) => {
      overlay.setUser(info.name, info.isGuest)
      startButton.style.display = 'block'
    },
  })
  auth.mount(document.body)

  // Load existing token if any (best-effort)
  loadToken()

  // Center start button overlay
  const startButton = document.createElement('button')
  startButton.className = 'panel center-start'
  startButton.style.display = 'none'
  startButton.textContent = '开始游戏'
  startButton.onclick = () => {
    startButton.style.display = 'none'
    startGame().catch((err) => console.error(err))
  }
  document.body.appendChild(startButton)
}

bootstrap().catch((err) => console.error(err))
