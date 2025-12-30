import type { LeaderboardEntry, LevelConfig } from '../types'

// Default to same-origin relative API so deployed frontend calls the server it's hosted on.
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

let token: string | null = null

export function setToken(value: string | null) {
  token = value
  if (value) localStorage.setItem('td_token', value)
  else localStorage.removeItem('td_token')
}

export function loadToken() {
  token = localStorage.getItem('td_token')
  return token
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function login(name: string, password?: string): Promise<{ token: string }> {
  const data = await apiFetch<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  })
  setToken(data.access_token)
  return { token: data.access_token }
}

export async function register(name: string, password: string) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  })
}

export async function fetchLevel(id = 'endless'): Promise<LevelConfig> {
  const payload = await apiFetch<{ config: LevelConfig }>(`/levels/${id}`)
  return payload.config
}

export async function fetchLeaderboard(level = 'endless'): Promise<LeaderboardEntry[]> {
  const payload = await apiFetch<{ entries: LeaderboardEntry[] }>(`/leaderboard?level=${level}`)
  return payload.entries
}

export interface ScoreSubmitPayload {
  score: number
  wave: number
  time_ms: number
  life_left: number
  level_id: string
  level_version: string
  level_hash: string
}

export async function submitScore(payload: ScoreSubmitPayload) {
  return apiFetch('/score', {
    method: 'POST',
    body: JSON.stringify({
      score: payload.score,
      wave: payload.wave,
      time_ms: payload.time_ms,
      life_left: payload.life_left,
      level_id: payload.level_id,
      level_version: payload.level_version,
      level_hash: payload.level_hash,
    }),
  })
}

export interface BestScore {
  best_score: number | null
  wave: number | null
  time_ms: number | null
  life_left: number | null
  created_at: string | null
}

export async function fetchBestScore(level = 'endless'): Promise<BestScore> {
  return apiFetch(`/score/best?level=${level}`)
}
