import { login, register } from '../api/client'

interface AuthResult {
  name: string
  isGuest: boolean
}

interface AuthModalOpts {
  onAuthenticated: (info: AuthResult) => void
}

export class AuthModal {
  private root: HTMLDivElement
  private inputName: HTMLInputElement
  private inputPwd: HTMLInputElement
  private status: HTMLDivElement
  private opts: AuthModalOpts

  constructor(opts: AuthModalOpts) {
    this.opts = opts
    this.root = document.createElement('div')
    this.root.className = 'auth-modal'

    const panel = document.createElement('div')
    panel.className = 'auth-panel'

    const title = document.createElement('h3')
    title.textContent = '登录 / 注册'
    panel.appendChild(title)

    const nameLabel = document.createElement('label')
    nameLabel.textContent = '昵称'
    panel.appendChild(nameLabel)

    this.inputName = document.createElement('input')
    this.inputName.placeholder = '玩家昵称，游客填 guest'
    panel.appendChild(this.inputName)

    const pwdLabel = document.createElement('label')
    pwdLabel.textContent = '密码'
    panel.appendChild(pwdLabel)

    this.inputPwd = document.createElement('input')
    this.inputPwd.type = 'password'
    this.inputPwd.placeholder = '游客可留空'
    panel.appendChild(this.inputPwd)

    const row = document.createElement('div')
    row.className = 'auth-buttons'

    const loginBtn = document.createElement('button')
    loginBtn.textContent = '登录'
    loginBtn.onclick = () => this.handleLogin()
    row.appendChild(loginBtn)

    const regBtn = document.createElement('button')
    regBtn.className = 'secondary'
    regBtn.textContent = '注册'
    regBtn.onclick = () => this.handleRegister()
    row.appendChild(regBtn)

    const guestBtn = document.createElement('button')
    guestBtn.className = 'ghost'
    guestBtn.textContent = '游客模式'
    guestBtn.onclick = () => this.handleGuest()
    row.appendChild(guestBtn)

    panel.appendChild(row)

    this.status = document.createElement('div')
    this.status.className = 'auth-status'
    this.status.textContent = '未登录（游客不计入排行榜）'
    panel.appendChild(this.status)

    this.root.appendChild(panel)
  }

  mount(target: HTMLElement) {
    target.appendChild(this.root)
  }

  hide() {
    this.root.style.display = 'none'
  }

  private async handleLogin() {
    const name = this.inputName.value || 'guest'
    const pwd = this.inputPwd.value || ''
    await login(name, pwd)
    this.status.textContent = `已登录：${name}${name === 'guest' ? '（游客不计入排行榜）' : ''}`
    this.opts.onAuthenticated({ name, isGuest: name === 'guest' })
    this.hide()
  }

  private async handleRegister() {
    const name = this.inputName.value
    const pwd = this.inputPwd.value
    if (!name || !pwd) {
      this.status.textContent = '请输入昵称和密码'
      return
    }
    await register(name, pwd)
    this.status.textContent = '注册成功，请登录'
  }

  private async handleGuest() {
    await login('guest', '')
    this.status.textContent = '游客模式（不计入排行榜）'
    this.opts.onAuthenticated({ name: 'guest', isGuest: true })
    this.hide()
  }
}
