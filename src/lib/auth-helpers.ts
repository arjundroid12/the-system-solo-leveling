'use client'

import { useSystem } from './store'
import { getAuth, setAuth, clearAuth, apiRegister, apiLogin, apiPull, apiPush, apiGenerateQuests, getTimeOfDay } from './auth'
import { createNewPlayer, todayStr, xpForLevel, hpFromStats, mpFromStats, fatigueMaxFromStats, generateFixedQuests, QuestMode } from './system'
import { soundNotification, soundSystemBoot } from './sound'

export async function registerAndBoot(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const result = await apiRegister(username, password)
  if (!result.success || !result.auth) return { success: false, error: result.error }
  setAuth(result.auth)
  // CRITICAL: Clear old localStorage before booting new account
  if (typeof window !== 'undefined') {
    localStorage.removeItem('solo-leveling-system')
  }
  const player = createNewPlayer(username)
  const quests = generateFixedQuests(todayStr())
  useSystem.setState({
    booted: true, player, quests,
    skills: useSystem.getState().skills.map(s => ({ ...s })),
    shadows: [], inventory: [], activeDungeon: null,
    needsOnboarding: true,  // FORCE PATH SELECTION FOR NEW ACCOUNTS
    isRefreshing: false,
  })
  soundSystemBoot()
  setTimeout(() => soundNotification(), 500)
  return { success: true }
}

export async function loginAndPull(): Promise<{ success: boolean; error?: string }> {
  const auth = getAuth()
  if (!auth) return { success: false, error: 'No saved auth' }
  const data = await apiPull(auth.token)
  if (!data || !data.player) return { success: false, error: 'Failed to pull data' }
  const p = data.player

  // Check if player has a growth plan (determines onboarding)
  let hasGrowthPlan = false
  try {
    const planRes = await fetch('/api/growth-plan', { headers: { Authorization: `Bearer ${auth.token}` } })
    const planData = await planRes.json()
    hasGrowthPlan = !!planData.currentPlan
  } catch {}

  useSystem.setState({
    booted: true,
    player: {
      ...p, xpToNext: xpForLevel(p.level), jobUnlocked: p.job !== 'NONE',
      hpMax: p.hpMax || hpFromStats(p.stats, p.level), mpMax: p.mpMax || mpFromStats(p.stats, p.level),
      fatigueMax: p.fatigueMax || fatigueMaxFromStats(p.stats),
    } as any,
    quests: data.quests || [],
    shadows: data.shadows || [],
    inventory: data.inventory || [],
    skills: useSystem.getState().skills.map(s => {
      const cs = (data.skills || []).find((cs: any) => cs.id === s.id)
      return cs ? { ...s, unlocked: cs.unlocked } : s
    }),
    needsOnboarding: !hasGrowthPlan,  // ONBOARDING NEEDED IF NO GROWTH PLAN
    isRefreshing: false,
  })
  return { success: true }
}

export async function loginWithCredentials(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const result = await apiLogin(username, password)
  if (!result.success || !result.auth) return { success: false, error: result.error }
  setAuth(result.auth)
  const pullResult = await loginAndPull()
  if (!pullResult.success) {
    const player = createNewPlayer(username)
    useSystem.setState({ booted: true, player, quests: generateFixedQuests(todayStr()) })
  }
  // Generate quests if new day
  const today = todayStr()
  const existingQuests = useSystem.getState().quests
  const todayQuests = existingQuests.filter(q => q.date === today && q.isDaily)
  if (todayQuests.length === 0) {
    const mode = useSystem.getState().player?.questMode || 'FIXED'
    if (mode === 'AI_STRUCTURED') {
      setTimeout(async () => {
        const auth = getAuth()
        if (!auth) return
        const p = useSystem.getState().player
        if (!p) return
        const recent = existingQuests.filter(q => q.status === 'COMPLETE').slice(-10).map(q => q.title)
        const quests = await apiGenerateQuests(auth.token, { level: p.level, stats: p.stats, job: p.job, recentQuestTitles: recent, timeOfDay: getTimeOfDay() })
        if (quests?.length) {
          useSystem.setState({ quests: [...existingQuests.filter(q => q.date !== today || !q.isDaily), ...quests] })
          soundNotification()
        }
      }, 500)
    } else {
      const { generateFixedQuests } = await import('./system')
      useSystem.setState({ quests: [...existingQuests.filter(q => q.date !== today || !q.isDaily), ...generateFixedQuests(today)] })
      soundNotification()
    }
  }
  return { success: true }
}

export async function generateAIQuestsNow(): Promise<void> {
  const auth = getAuth()
  if (!auth) return
  const player = useSystem.getState().player
  if (!player) return
  const recent = useSystem.getState().quests.filter(q => q.status === 'COMPLETE').slice(-10).map(q => q.title)
  const quests = await apiGenerateQuests(auth.token, { level: player.level, stats: player.stats, job: player.job, recentQuestTitles: recent, timeOfDay: getTimeOfDay() })
  if (quests?.length) {
    const today = todayStr()
    useSystem.setState(state => ({ quests: [...state.quests.filter(q => q.date !== today || !q.isDaily), ...quests] }))
    soundNotification()
  }
}

export async function pushToCloudNow(): Promise<void> {
  const auth = getAuth()
  if (!auth) return
  const player = useSystem.getState().player
  if (!player) return
  await apiPush(auth.token, {
    player: { ...player, hpMax: hpFromStats(player.stats, player.level), mpMax: mpFromStats(player.stats, player.level), fatigueMax: fatigueMaxFromStats(player.stats) },
    quests: useSystem.getState().quests, shadows: useSystem.getState().shadows,
    inventory: useSystem.getState().inventory,
    skills: useSystem.getState().skills.map(s => ({ id: s.id, unlocked: s.unlocked })),
  })
}

export function logout() { clearAuth(); useSystem.getState().resetSystem() }
export function isLoggedIn(): boolean { return !!getAuth() }
