import type { LeaderboardEntry, TowerDefinition, TowerType } from '../types'

interface OverlayOptions {
  towerDefs: Record<TowerType, TowerDefinition>
  onSelectTower: (type: TowerType) => void
  onRefreshLeaderboard: () => Promise<void>
  onTogglePause: () => void
  onRestart: () => void
}

const towerMeta: Record<TowerType, { label: string; desc: string }> = {
  CANNON: { label: '加农炮', desc: '中程溅射' },
  LMG: { label: '轻机枪', desc: '远程速射' },
  HMG: { label: '重机枪', desc: '近中高伤' },
  LASER: { label: '激光炮', desc: '中远瞬时' },
  WALL: { label: '路障', desc: '阻挡' },
}

const towerOrder: TowerType[] = ['CANNON', 'LMG', 'HMG', 'LASER', 'WALL']

export class OverlayUI {
  private root: HTMLDivElement
  private leaderboardList!: HTMLUListElement
  private loginStatus!: HTMLDivElement
  private towerButtons: Map<TowerType, HTMLButtonElement> = new Map()
  private opts: OverlayOptions
  private userDisplay!: HTMLDivElement
  private towerDefs: Record<TowerType, TowerDefinition>
  private lifeValue!: HTMLSpanElement
  private stateValue!: HTMLSpanElement
  private scoreValue!: HTMLSpanElement
  private goldValue!: HTMLSpanElement
  private waveValue!: HTMLSpanElement
  private pauseButton!: HTMLButtonElement
  private restartButton!: HTMLButtonElement

  constructor(opts: OverlayOptions) {
    this.opts = opts
    this.towerDefs = opts.towerDefs
    this.root = document.createElement('div')
    this.root.style.display = 'flex'
    this.root.style.flexDirection = 'column'
    this.root.style.gap = '12px'

    this.root.appendChild(this.buildLoginPanel())
    this.root.appendChild(this.buildStatsPanel())
    this.root.appendChild(this.buildControlsPanel())
    this.root.appendChild(this.buildTowerPanel())
  }

  mount(target: HTMLElement, leaderboardContainer?: HTMLElement) {
    target.appendChild(this.root)
    if (leaderboardContainer) {
      const board = this.buildLeaderboardPanel()
      leaderboardContainer.appendChild(board)
    } else {
      this.root.appendChild(this.buildLeaderboardPanel())
    }
  }

  private buildLoginPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'

    this.userDisplay = document.createElement('div')
    this.userDisplay.style.fontSize = '14px'
    this.userDisplay.style.color = '#0f172a'
    this.userDisplay.style.fontWeight = '600'
    this.userDisplay.textContent = '用户：未登录'
    panel.appendChild(this.userDisplay)

    this.loginStatus = document.createElement('div')
    this.loginStatus.style.fontSize = '12px'
    this.loginStatus.style.color = '#475569'
    this.loginStatus.textContent = '游客不计入排行榜'
    panel.appendChild(this.loginStatus)

    return panel
  }

  private buildTowerPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'
    const title = document.createElement('h3')
    title.textContent = '选择防御塔'
    panel.appendChild(title)

    const grid = document.createElement('div')
    grid.className = 'tower-buttons'
    towerOrder.forEach((type, idx) => {
      const meta = towerMeta[type]
      const def = this.towerDefs[type]
      const cost = def?.costByLevel?.[0]
      const priceText = cost != null ? `${cost} 金币` : '—'
      const btn = document.createElement('button')
      btn.innerHTML = `
        <div class="tower-row">
          <div class="tower-text">
            <div class="tower-title-row">
              <strong>${meta.label}</strong>
              <span class="tower-price">${priceText}</span>
            </div>
            <span class="tower-desc">${meta.desc}</span>
          </div>
        </div>
      `
      btn.onclick = () => this.selectTower(type)
      if (idx === 0) btn.classList.add('active')
      this.towerButtons.set(type, btn)
      grid.appendChild(btn)
    })
    panel.appendChild(grid)
    return panel
  }

  private buildStatsPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'
    const title = document.createElement('h3')
    title.textContent = '战局信息'
    panel.appendChild(title)

    const grid = document.createElement('div')
    grid.className = 'stats-grid'

    const buildItem = (label: string, valueEl: HTMLSpanElement, spanFull = false) => {
      const item = document.createElement('div')
      item.className = 'stat-item'
      if (spanFull) item.classList.add('span-2')
      const name = document.createElement('span')
      name.className = 'stat-label'
      name.textContent = label
      item.appendChild(name)
      valueEl.className = 'stat-value'
      item.appendChild(valueEl)
      grid.appendChild(item)
    }

    this.lifeValue = document.createElement('span')
    this.stateValue = document.createElement('span')
    this.scoreValue = document.createElement('span')
    this.goldValue = document.createElement('span')
    this.waveValue = document.createElement('span')

    buildItem('生命', this.lifeValue)
    buildItem('状态', this.stateValue)
    buildItem('成绩', this.scoreValue)
    buildItem('金币', this.goldValue)

    const waveItem = document.createElement('div')
    waveItem.className = 'stat-item span-2'
    const waveLabel = document.createElement('span')
    waveLabel.className = 'stat-label'
    waveLabel.textContent = '怪物'
    const waveValue = document.createElement('span')
    waveValue.className = 'stat-value'
    waveValue.appendChild(this.waveValue)
    waveItem.appendChild(waveLabel)
    waveItem.appendChild(waveValue)
    grid.appendChild(waveItem)

    panel.appendChild(grid)
    return panel
  }

  private buildControlsPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'
    const row = document.createElement('div')
    row.className = 'control-row'

    this.pauseButton = document.createElement('button')
    this.pauseButton.textContent = '暂停'
    this.pauseButton.onclick = () => this.opts.onTogglePause()
    row.appendChild(this.pauseButton)

    this.restartButton = document.createElement('button')
    this.restartButton.className = 'secondary'
    this.restartButton.textContent = '重新开始'
    this.restartButton.onclick = () => this.opts.onRestart()
    row.appendChild(this.restartButton)

    panel.appendChild(row)
    return panel
  }

  private buildLeaderboardPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'
    const titleRow = document.createElement('div')
    titleRow.style.display = 'flex'
    titleRow.style.justifyContent = 'space-between'
    titleRow.style.alignItems = 'center'

    const title = document.createElement('h3')
    title.textContent = '排行榜（endless）'
    titleRow.appendChild(title)

    const refresh = document.createElement('button')
    refresh.className = 'secondary'
    refresh.textContent = '刷新'
    refresh.onclick = () => this.opts.onRefreshLeaderboard()
    titleRow.appendChild(refresh)

    panel.appendChild(titleRow)

    this.leaderboardList = document.createElement('ul')
    this.leaderboardList.className = 'leaderboard-list'
    panel.appendChild(this.leaderboardList)
    return panel
  }

  private selectTower(type: TowerType) {
    this.towerButtons.forEach((btn, key) => {
      if (key === type) btn.classList.add('active')
      else btn.classList.remove('active')
    })
    this.opts.onSelectTower(type)
  }

  clearTowerSelection() {
    this.towerButtons.forEach((btn) => btn.classList.remove('active'))
  }

  setLeaderboard(entries: LeaderboardEntry[]) {
    this.leaderboardList.innerHTML = ''
    if (entries.length === 0) {
      const li = document.createElement('li')
      li.textContent = '暂无数据'
      this.leaderboardList.appendChild(li)
      return
    }
    entries.forEach((e, idx) => {
      const li = document.createElement('li')
      li.innerHTML = `<span>#${idx + 1} ${e.name}</span><span>${e.score}</span>`
      this.leaderboardList.appendChild(li)
    })
  }

  setUser(name: string, isGuest: boolean) {
    this.userDisplay.textContent = `用户：${name}`
    this.loginStatus.textContent = isGuest ? '游客不计入排行榜' : ''
  }

  setStats(stats: { life: number; state: string; score: number; gold: number; wave: number }) {
    this.lifeValue.textContent = `${stats.life}`
    this.stateValue.textContent = stats.state
    this.scoreValue.textContent = `${stats.score}`
    this.goldValue.textContent = `${stats.gold}`
    this.waveValue.textContent = `第 ${stats.wave} 波`

    if (stats.life <= 0) this.lifeValue.classList.add('danger')
    else this.lifeValue.classList.remove('danger')

    if (stats.state === 'paused') this.pauseButton.textContent = '继续'
    else this.pauseButton.textContent = '暂停'

    this.pauseButton.disabled = stats.state === 'gameover'
  }
}
