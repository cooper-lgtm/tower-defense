import type { LeaderboardEntry, LevelConfig } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000/api'

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
