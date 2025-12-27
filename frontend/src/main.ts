import './style.css'
import { Game } from './core/game'
import { createDefaultLevel } from './config/defaultLevel'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
canvas.tabIndex = 0
app.appendChild(canvas)

const levelConfig = createDefaultLevel()
const game = new Game(canvas, levelConfig)

game.start()
