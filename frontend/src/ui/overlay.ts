import type { LeaderboardEntry, TowerType } from '../types'

interface OverlayOptions {
  onSelectTower: (type: TowerType) => void
  onLogin: (name: string, password: string) => Promise<void>
  onRegister: (name: string, password: string) => Promise<void>
  onRefreshLeaderboard: () => Promise<void>
  onStartGame: () => void
}

const towerNames: { type: TowerType; label: string; desc: string }[] = [
  { type: 'CANNON', label: '加农', desc: '中程溅射' },
  { type: 'LMG', label: '轻机枪', desc: '远程速射' },
  { type: 'HMG', label: '重机枪', desc: '近中高伤' },
  { type: 'LASER', label: '激光', desc: '中远瞬时' },
  { type: 'WALL', label: '路障', desc: '阻挡' },
]

export class OverlayUI {
  private root: HTMLDivElement
  private leaderboardList!: HTMLUListElement
  private loginStatus!: HTMLDivElement
  private towerButtons: Map<TowerType, HTMLButtonElement> = new Map()
  private opts: OverlayOptions

  constructor(opts: OverlayOptions) {
    this.opts = opts
    this.root = document.createElement('div')
    this.root.style.display = 'flex'
    this.root.style.flexDirection = 'column'
    this.root.style.gap = '12px'

    this.root.appendChild(this.buildLoginPanel())
    this.root.appendChild(this.buildTowerPanel())
    this.root.appendChild(this.buildLeaderboardPanel())
  }

  mount(target: HTMLElement) {
    target.appendChild(this.root)
  }

  private buildLoginPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'panel'

    const title = document.createElement('h3')
    title.textContent = '登录 / 注册'
    panel.appendChild(title)

    const nameLabel = document.createElement('label')
    nameLabel.textContent = '昵称'
    panel.appendChild(nameLabel)

    const inputName = document.createElement('input')
    inputName.placeholder = '玩家昵称，游客填 guest'
    panel.appendChild(inputName)

    const pwdLabel = document.createElement('label')
    pwdLabel.textContent = '密码'
    panel.appendChild(pwdLabel)

    const inputPwd = document.createElement('input')
    inputPwd.placeholder = '游客可留空'
    inputPwd.type = 'password'
    panel.appendChild(inputPwd)

    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.gap = '8px'

    const btnLogin = document.createElement('button')
    btnLogin.textContent = '登录'
    btnLogin.onclick = async () => {
      btnLogin.disabled = true
      btnLogin.textContent = '登录中...'
      try {
        await this.opts.onLogin(inputName.value || 'guest', inputPwd.value || '')
        this.loginStatus.textContent = `已登录：${inputName.value || 'guest'}`
      } catch (err) {
        this.loginStatus.textContent = `登录失败：${(err as Error).message}`
      } finally {
        btnLogin.disabled = false
        btnLogin.textContent = '登录'
      }
    }
    row.appendChild(btnLogin)

    const btnRegister = document.createElement('button')
    btnRegister.className = 'secondary'
    btnRegister.textContent = '注册'
    btnRegister.onclick = async () => {
      btnRegister.disabled = true
      btnRegister.textContent = '注册中...'
      try {
        await this.opts.onRegister(inputName.value, inputPwd.value)
        this.loginStatus.textContent = '注册成功，请登录'
      } catch (err) {
        this.loginStatus.textContent = `注册失败：${(err as Error).message}`
      } finally {
        btnRegister.disabled = false
        btnRegister.textContent = '注册'
      }
    }
    row.appendChild(btnRegister)

    panel.appendChild(row)

    const startBtn = document.createElement('button')
    startBtn.style.marginTop = '8px'
    startBtn.textContent = '开始游戏'
    startBtn.onclick = () => this.opts.onStartGame()
    panel.appendChild(startBtn)

    this.loginStatus = document.createElement('div')
    this.loginStatus.style.fontSize = '12px'
    this.loginStatus.style.color = '#475569'
    this.loginStatus.textContent = '未登录（游客不计入排行榜）'
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
    towerNames.forEach((info, idx) => {
      const btn = document.createElement('button')
      btn.innerHTML = `<strong>${info.label}</strong><span style="font-size:12px;color:#475569">${info.desc}</span>`
      btn.onclick = () => this.selectTower(info.type)
      if (idx === 0) btn.classList.add('active')
      this.towerButtons.set(info.type, btn)
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
}
