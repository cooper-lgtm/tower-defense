import './style.css'
import { Game } from './core/game'
import { createDefaultLevel } from './config/defaultLevel'
import { OverlayUI } from './ui/overlay'
import { AuthModal } from './ui/authModal'
import { fetchLeaderboard, fetchLevel, fetchBestScore, loadToken, submitScore } from './api/client'
import type { LevelConfig, TowerType, GameState } from './types'

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

const towerMenu = document.createElement('div')
towerMenu.className = 'tower-menu'
const upgradeBtn = document.createElement('button')
upgradeBtn.textContent = '升级'
const sellBtn = document.createElement('button')
sellBtn.className = 'secondary'
towerMenu.appendChild(upgradeBtn)
towerMenu.appendChild(sellBtn)
canvasWrapper.appendChild(towerMenu)
towerMenu.style.display = 'none'
upgradeBtn.onclick = () => {
  game?.upgradeSelectedTower()
}
sellBtn.onclick = () => {
  game?.sellSelectedTower()
  hideTowerMenu()
}

// 右列：用户/塔/榜单
const uiContainer = document.createElement('div')
app.appendChild(uiContainer)

let game: Game | null = null
let levelConfig: LevelConfig | null = null
let overlay: OverlayUI | null = null
let startButton: HTMLButtonElement
let currentUser: { name: string; isGuest: boolean } = { name: 'guest', isGuest: true }
let latestStats = { life: 0, state: 'menu' as GameState, score: 0, gold: 0, wave: 1 }
let latestSelection:
  | {
      world: { x: number; y: number }
      upgradeCost: number | null
      canAffordUpgrade: boolean
      sellRefund: number
    }
  | null = null

function hideTowerMenu() {
  towerMenu.style.display = 'none'
}

function showTowerMenu(info: {
  world: { x: number; y: number }
  upgradeCost: number | null
  canAffordUpgrade: boolean
  sellRefund: number
}) {
  const offsetX = (levelConfig?.grid.cellSize ?? 32) * 0.6
  towerMenu.style.display = 'flex'
  towerMenu.style.left = `${info.world.x + offsetX}px`
  towerMenu.style.top = `${info.world.y - (levelConfig?.grid.cellSize ?? 32) * 0.4}px`
  if (info.upgradeCost == null) {
    upgradeBtn.textContent = '升级（满级）'
    upgradeBtn.disabled = true
  } else {
    upgradeBtn.textContent = `升级 (-${info.upgradeCost})`
    upgradeBtn.disabled = !info.canAffordUpgrade
  }
  sellBtn.textContent = `出售 (+${info.sellRefund})`
}

async function loadLevel(): Promise<LevelConfig> {
  try {
    return await fetchLevel('endless')
  } catch {
    return createDefaultLevel()
  }
}

function createGameInstance() {
  if (!levelConfig || !overlay) return
  game?.dispose()
  latestSelection = null
  hideTowerMenu()
  game = new Game(canvas, levelConfig, {
    onStats: (stats) => {
      latestStats = stats
      overlay!.setStats(stats)
      if (latestSelection) {
        const canAfford =
          latestSelection.upgradeCost != null ? stats.gold >= latestSelection.upgradeCost : false
        latestSelection = { ...latestSelection, canAffordUpgrade: canAfford }
        showTowerMenu(latestSelection)
      }
    },
    onGameOver: (summary) => handleGameOver(summary).catch((err) => console.error(err)),
    onStateChange: (state) => {
      overlay!.setStats({ ...latestStats, state })
    },
    onTowerSelected: (info) => {
      latestSelection = info
      if (!info) {
        hideTowerMenu()
        return
      }
      showTowerMenu(info)
    },
    onCancel: () => {
      hideTowerMenu()
      overlay?.clearTowerSelection()
    },
  })
  game.start()
  latestStats = game.getStats()
  overlay!.setStats(latestStats)
}

async function handleGameOver(summary: { score: number; wave: number; timeMs: number; lifeLeft: number }) {
  if (!levelConfig || !overlay) return
  if (currentUser.isGuest) {
    console.info('游客模式不上传成绩')
    return
  }

  try {
    await submitScore({
      score: summary.score,
      wave: summary.wave,
      time_ms: summary.timeMs,
      life_left: summary.lifeLeft,
      level_id: levelConfig.metadata.id,
      level_version: levelConfig.metadata.version,
      level_hash: levelConfig.metadata.hash,
    })
    const entries = await fetchLeaderboard('endless')
    overlay?.setLeaderboard(entries)
    await refreshBestScore()
  } catch (err) {
    console.error('成绩上传失败', err)
  }
}

async function refreshBestScore() {
  if (!overlay) return
  if (currentUser.isGuest) {
    overlay.setBestScore(null)
    return
  }
  try {
    const best = await fetchBestScore('endless')
    overlay.setBestScore(best.best_score)
  } catch (err) {
    console.error('获取最高分失败', err)
  }
}

async function bootstrap() {
  levelConfig = await loadLevel()

  overlay = new OverlayUI({
    towerDefs: levelConfig.towers,
    onSelectTower: (type: TowerType) => game?.setBuildType(type),
    onRefreshLeaderboard: async () => {
      try {
        const entries = await fetchLeaderboard('endless')
        overlay?.setLeaderboard(entries)
      } catch (err) {
        console.error(err)
      }
    },
    onTogglePause: () => {
      if (!game) return
      game.togglePause()
      overlay?.setStats({ ...latestStats, state: game.getStats().state })
    },
    onRestart: () => {
      createGameInstance()
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
  overlay.setStats({
    life: levelConfig.grid.initialLife,
    state: 'menu',
    score: 0,
    gold: Math.round(levelConfig.grid.initialGold),
    wave: 1,
  })
  overlay.setBestScore(null)

  // Auth modal
  const auth = new AuthModal({
    onAuthenticated: (info) => {
      currentUser = info
      overlay?.setUser(info.name, info.isGuest)
      refreshBestScore().catch((err) => console.error(err))
      startButton.style.display = 'block'
    },
  })
  auth.mount(document.body)

  // Load existing token if any (best-effort)
  loadToken()

  // Center start button overlay
  startButton = document.createElement('button')
  startButton.className = 'panel center-start'
  startButton.style.display = 'none'
  startButton.textContent = '开始游戏'
  startButton.onclick = () => {
    startButton.style.display = 'none'
    if (!levelConfig) {
      console.error('Level not loaded')
      return
    }
    createGameInstance()
  }
  document.body.appendChild(startButton)
}

bootstrap().catch((err) => console.error(err))
