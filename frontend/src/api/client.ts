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
  ops_digest?: string
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function signScorePayload(payload: ScoreSubmitPayload) {
  const secret = import.meta.env.VITE_SCORE_SIGNING_KEY
  if (!secret) throw new Error('缺少 VITE_SCORE_SIGNING_KEY，用于成绩签名')
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  const ops = payload.ops_digest ?? ''
  const message = [
    payload.level_id,
    payload.level_version,
    payload.level_hash,
    String(payload.score),
    String(payload.wave),
    String(payload.time_ms),
    String(payload.life_left),
    String(timestamp),
    nonce,
    ops,
  ].join('|')
  const signature = await hmacSha256Hex(secret, message)
  return { ...payload, timestamp, nonce, signature, ops_digest: payload.ops_digest }
}

export async function submitScore(payload: ScoreSubmitPayload) {
  const signed = await signScorePayload(payload)
  return apiFetch('/score', {
    method: 'POST',
    body: JSON.stringify({
      score: signed.score,
      wave: signed.wave,
      time_ms: signed.time_ms,
      life_left: signed.life_left,
      level_id: signed.level_id,
      level_version: signed.level_version,
      level_hash: signed.level_hash,
      timestamp: signed.timestamp,
      nonce: signed.nonce,
      signature: signed.signature,
      ops_digest: signed.ops_digest,
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
