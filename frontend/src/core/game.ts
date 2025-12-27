// 核心游戏管线：持有地图/渲染/输入/实体，驱动固定步更新与波次逻辑
import { CanvasRenderer } from '../renderer/canvasRenderer'
import type { RenderState } from '../renderer/canvasRenderer'
import { GridMap } from '../map/grid'
import { StateMachine } from './stateMachine'
import { InputController } from './input'
import { Enemy } from '../entities/enemy'
import { Tower } from '../entities/tower'
import { findPath } from '../pathfinding/aStar'
import type { GeneratedWave, WaveResult } from '../logic/waveGenerator'
import { generateWave } from '../logic/waveGenerator'
import type { LevelConfig, Cell, TowerType, EnemyType } from '../types'

const DEFAULT_BUILD_TOWER: TowerType = 'CANNON'
// 刷怪间隔（秒）
const SPAWN_INTERVAL = 0.6

export class Game {
  private canvas: HTMLCanvasElement
  private config: LevelConfig
  private renderer: CanvasRenderer
  private map: GridMap
  private state = new StateMachine()
  private input: InputController
  private towers: Tower[] = []
  private enemies: Enemy[] = []
  private gold: number
  private life: number
  private waveIndex = 0
  private currentDifficulty: number
  private wavePlan: GeneratedWave | null = null
  private spawnTypes: EnemyType[] = []
  private spawnTimer = 0
  private lastFrame = performance.now()
  private preview: RenderState['preview']
  private statusMessage = ''
  private statusTimer = 0
  private waveResult: WaveResult | null = null
  private basePath: Cell[]
  private waveLivesLost = 0

  constructor(canvas: HTMLCanvasElement, config: LevelConfig) {
    this.canvas = canvas
    this.config = config
    this.map = new GridMap(config.grid)
    this.renderer = new CanvasRenderer(canvas, this.map)
    this.input = new InputController(canvas, this.map, window.devicePixelRatio || 1)
    this.gold = config.grid.initialGold
    this.life = config.grid.initialLife
    this.currentDifficulty = config.difficulty.base
    const path = this.computePath([])
    if (!path) {
      throw new Error('No valid path from entry to exit with current map')
    }
    this.basePath = path
    this.setupInput()
    this.placePresetTowers()
  }

  start(): void {
    this.state.set('running')
    this.prepareWave()
    this.loop()
  }

  private setupInput(): void {
    // 鼠标/触摸移动：更新预览格子是否可建
    this.input.onMove((cell) => {
      const buildable = this.canBuild(cell)
      this.preview = { cell, buildable }
    })
    // 点击：尝试建默认塔，否则维持状态
    this.input.onClick((cell) => {
      if (this.tryBuildTower(cell, DEFAULT_BUILD_TOWER)) return
      this.state.set(this.state.state === 'paused' ? 'running' : this.state.state)
    })
    // 快捷键：空格暂停/继续，N 跳过当前波（需无敌人）
    window.addEventListener('keydown', (ev) => {
      if (ev.code === 'Space') {
        ev.preventDefault()
        this.togglePause()
      }
      if (ev.code === 'KeyN') {
        ev.preventDefault()
        this.skipToNextWave()
      }
    })
  }

  private togglePause(): void {
    if (this.state.is('paused')) {
      this.state.set('running')
    } else if (this.state.is('running')) {
      this.state.set('paused')
    }
  }

  private placePresetTowers(): void {
    // 预置塔直接占用地图，不扣金币
    for (const preset of this.config.grid.presetTowers) {
      const def = this.config.towers[preset.type]
      if (!def) continue
      this.map.occupy(preset.cell)
      this.towers.push(new Tower(def, preset.cell, preset.level, this.map))
    }
  }

  private canBuild(cell: Cell): boolean {
    if (!this.map.isBuildable(cell)) return false
    const blocked = this.map.blockedWithOccupancy([cell])
    const path = this.computePath([], blocked)
    return !!path
  }

  private tryBuildTower(cell: Cell, type: TowerType): boolean {
    if (!this.canBuild(cell)) {
      this.flashStatus('不可建造：路径被阻断或格子不可用')
      return false
    }
    const def = this.config.towers[type]
    if (!def) return false
    const cost = def.costByLevel[0]
    if (this.gold < cost) {
      this.flashStatus('金币不足')
      return false
    }
    this.gold -= cost
    this.map.occupy(cell)
    this.towers.push(new Tower(def, cell, 1, this.map))
    this.recomputeBasePath()
    this.flashStatus(`建造 ${def.name} (-${cost})`)
    return true
  }

  private flashStatus(message: string): void {
    this.statusMessage = message
    this.statusTimer = 1.5
  }

  private recomputeBasePath(): void {
    const path = this.computePath([])
    if (path) this.basePath = path
  }

  private computePath(extra: Cell[], blockedOverride?: Set<string>): Cell[] | null {
    const blocked = blockedOverride || this.map.blockedWithOccupancy(extra)
    return findPath(this.map, this.map.entry, this.map.exit, blocked)
  }

  private prepareWave(): void {
    // 生成本波配置和难度倍率；填充刷怪队列
    this.wavePlan = generateWave(this.waveIndex, this.config, this.currentDifficulty, this.waveResult)
    this.currentDifficulty = this.wavePlan.difficultyMultiplier
    this.spawnTypes = []
    for (const pack of this.wavePlan.spec.enemies) {
      for (let i = 0; i < pack.count; i += 1) {
        this.spawnTypes.push(pack.type)
      }
    }
    this.shuffleSpawn()
    this.spawnTimer = 0
    this.waveResult = null
    this.waveLivesLost = 0
  }

  private shuffleSpawn(): void {
    for (let i = this.spawnTypes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.spawnTypes[i], this.spawnTypes[j]] = [this.spawnTypes[j], this.spawnTypes[i]]
    }
  }

  private spawnEnemy(): void {
    if (!this.wavePlan || this.spawnTypes.length === 0) return
    const next = this.spawnTypes.pop()
    if (!next) return
    const enemyDef = this.config.enemies[next]
    if (!enemyDef) return
    if (!this.basePath) {
      this.flashStatus('路径被堵死，无法刷新怪物')
      this.state.set('paused')
      return
    }
    const enemy = new Enemy(enemyDef, this.basePath, this.currentDifficulty, this.map)
    this.enemies.push(enemy)
  }

  private skipToNextWave(): void {
    if (this.enemies.length === 0 && this.state.is('running')) {
      this.finishWave(this.waveLivesLost)
      this.prepareWave()
    }
  }

  private finishWave(livesLost: number): void {
    // 结算波次：记录损失、发放金币奖励，推进波次序号
    this.waveResult = { livesLost }
    const reward = this.config.economy.waveRewardBase + this.waveIndex * this.config.economy.waveRewardGrowth
    this.gold += reward
    this.waveIndex += 1
    this.waveLivesLost = 0
    this.flashStatus(`波次完成 +${reward} 金币`)
  }

  private update(dt: number): void {
    if (this.state.is('paused') || this.state.is('gameover')) return

    this.statusTimer = Math.max(0, this.statusTimer - dt)

    // 刷怪节流
    if (this.spawnTypes.length > 0) {
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) {
        this.spawnEnemy()
        this.spawnTimer = SPAWN_INTERVAL
      }
    }

    for (const enemy of this.enemies) {
      const { escaped } = enemy.update(dt)
      if (escaped) {
        this.waveLivesLost += enemy.data.damage
        this.life = Math.max(0, this.life - enemy.data.damage)
      }
    }

    if (this.life <= 0) {
      this.state.set('gameover')
    }

    let killed = 0
    for (const tower of this.towers) {
      const result = tower.update(dt, this.enemies)
      killed += result.killed
    }

    const survivors: Enemy[] = []
    for (const enemy of this.enemies) {
      if (!enemy.data.alive) {
        this.gold += enemy.data.reward * this.config.economy.killRewardMultiplier
      } else {
        survivors.push(enemy)
      }
    }
    this.enemies = survivors

    if (this.enemies.length === 0 && this.spawnTypes.length === 0 && this.state.is('running')) {
      this.finishWave(this.waveLivesLost)
      this.prepareWave()
    }
  }

  private render(): void {
    const state: RenderState = {
      towers: this.towers,
      enemies: this.enemies,
      gold: this.gold,
      life: this.life,
      wave: this.waveIndex + 1,
      state: this.state.state,
      preview: this.preview,
    }
    this.renderer.render(state)
    if (this.statusTimer > 0) {
      const ctx = this.canvas.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.font = '16px "JetBrains Mono", monospace'
        ctx.fillText(this.statusMessage, 12, 46)
        ctx.restore()
      }
    }
  }

  private loop = () => {
    const now = performance.now()
    const delta = (now - this.lastFrame) / 1000
    this.lastFrame = now
    const fixedDelta = 1 / 60
    let accumulator = delta
    while (accumulator > fixedDelta) {
      this.update(fixedDelta)
      accumulator -= fixedDelta
    }
    this.update(accumulator)
    this.render()
    requestAnimationFrame(this.loop)
  }
}
