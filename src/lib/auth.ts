// THE SYSTEM — Auth & Cloud Sync Helper
const AUTH_KEY = 'sl_auth'

export interface AuthState { playerId: string; username: string; token: string }

export function getAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
export function setAuth(auth: AuthState) { if (typeof window !== 'undefined') localStorage.setItem(AUTH_KEY, JSON.stringify(auth)) }
export function clearAuth() { if (typeof window !== 'undefined') localStorage.removeItem(AUTH_KEY) }

export async function apiRegister(username: string, password: string): Promise<{ success: boolean; error?: string; auth?: AuthState }> {
  try {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error }
    return { success: true, auth: { playerId: data.playerId, username: data.username, token: data.token } }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function apiLogin(username: string, password: string): Promise<{ success: boolean; error?: string; auth?: AuthState }> {
  try {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error }
    return { success: true, auth: { playerId: data.playerId, username: data.username, token: data.token } }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function apiPull(token: string): Promise<any | null> {
  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'pull' }) })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function apiPush(token: string, data: any): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'push', data }) })
    return res.ok
  } catch { return false }
}

export async function apiGenerateQuests(token: string, context: any): Promise<any[] | null> {
  try {
    const res = await fetch('/api/quests/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(context) })
    if (!res.ok) return null
    const data = await res.json()
    return data.quests
  } catch { return null }
}

export function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}
