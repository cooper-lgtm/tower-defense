import type { LeaderboardEntry, TowerDefinition, TowerType } from '../types'

interface OverlayOptions {
  towerDefs: Record<TowerType, TowerDefinition>
  onSelectTower: (type: TowerType) => void
  onRefreshLeaderboard: () => Promise<void>
}

const towerMeta: Record<TowerType, { label: string; desc: string; iconClass: string }> = {
  CANNON: { label: '加农', desc: '中程溅射', iconClass: 'tower-icon--cannon' },
  LMG: { label: '轻机枪', desc: '远程速射', iconClass: 'tower-icon--lmg' },
  HMG: { label: '重机枪', desc: '近中高伤', iconClass: 'tower-icon--hmg' },
  LASER: { label: '激光', desc: '中远瞬时', iconClass: 'tower-icon--laser' },
  WALL: { label: '路障', desc: '阻挡', iconClass: 'tower-icon--wall' },
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

  constructor(opts: OverlayOptions) {
    this.opts = opts
    this.towerDefs = opts.towerDefs
    this.root = document.createElement('div')
    this.root.style.display = 'flex'
    this.root.style.flexDirection = 'column'
    this.root.style.gap = '12px'

    this.root.appendChild(this.buildLoginPanel())
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
          <div class="tower-icon ${meta.iconClass}">${meta.label.slice(0, 1)}</div>
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
}
