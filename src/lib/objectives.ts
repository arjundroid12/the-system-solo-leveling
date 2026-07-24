'use client'

// THE SYSTEM — Objectives client: API calls + daily quest injection

import { getAuth } from './auth'
import { useSystem } from './store'
import { objectiveQuestId } from './objectives-engine'
import type { Quest } from './system'

async function call(method: 'GET' | 'POST', body?: any): Promise<any | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const res = await fetch('/api/objectives', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return await res.json()
  } catch { return null }
}

export async function refreshObjectives(): Promise<any[]> {
  const data = await call('GET')
  if (!data?.objectives) return useSystem.getState().objectives
  useSystem.getState().setObjectives(data.objectives)
  injectObjectiveQuests(data.objectives, data.today)
  return data.objectives
}

export async function createObjective(goal: string, context: string): Promise<{ ok: boolean; error?: string; objective?: any }> {
  const data = await call('POST', { action: 'create', goal, context })
  if (!data?.success) return { ok: false, error: data?.error || 'The System could not reach the architect. Try again.' }
  await refreshObjectives()
  return { ok: true, objective: data.objective }
}

export async function completeObjectiveToday(objectiveId: string, feedback: 'EASY' | 'RIGHT' | 'HARD'): Promise<any | null> {
  const data = await call('POST', { action: 'complete', id: objectiveId, feedback })
  if (data?.success) await refreshObjectives()
  return data
}

export async function reportObjectiveProgress(objectiveId: string, progress: number): Promise<void> {
  await call('POST', { action: 'progress', id: objectiveId, progress })
}

export async function analyzeObjective(objectiveId: string): Promise<any | null> {
  const data = await call('POST', { action: 'analyze', id: objectiveId })
  if (data?.success) await refreshObjectives()
  return data
}

export async function mutateObjective(objectiveId: string, action: 'pause' | 'resume' | 'delete'): Promise<void> {
  await call('POST', { action, id: objectiveId })
  await refreshObjectives()
}

// Map objective categories onto quest categories the UI knows how to badge
const CATEGORY_MAP: Record<string, string> = { TRAINING: 'TRAINING', STUDY: 'STUDY', CREATE: 'CREATE', HEALTH: 'MINDFULNESS', CAREER: 'CHALLENGE' }
const STAT_MAP: Record<string, Record<string, number>> = { TRAINING: { STR: 1 }, STUDY: { INT: 1 }, CREATE: { PER: 1 }, HEALTH: { VIT: 1 }, CAREER: { AGI: 1 } }

// Upsert today's quest for every active objective into the normal quest list.
// Objective quests are isDaily:false → immune to the 5-quest regen, the
// penalty sweep, and the all-daily-complete bonus. Missed ones are judged
// by the objective engine (deload), not the streak system.
export function injectObjectiveQuests(objectives: any[], today: string) {
  const state = useSystem.getState()
  if (!state.player) return
  const existing = state.quests

  // drop stale objective quests from previous days
  let quests = existing.filter(q => !(q.id.startsWith('obj-') && !q.id.endsWith(today)))

  for (const o of objectives) {
    if (o.status !== 'ACTIVE') {
      quests = quests.filter(q => q.id !== objectiveQuestId(o.id, today))
      continue
    }
    const id = objectiveQuestId(o.id, today)
    const todayEntry = (o.history || []).find((h: any) => h.date === today)
    const done = !!todayEntry?.done
    const quest: Quest = {
      id,
      title: `${o.icon} ${o.title}`,
      description: `${o.plan.metric.name} — Day ${o.day} · ${o.phase?.name || 'GRIND'}. ${o.phase?.focus || ''}`.trim(),
      category: (CATEGORY_MAP[o.category] || 'CHALLENGE') as Quest['category'],
      difficulty: `DAY ${o.day}`,
      xpReward: o.xpReward || 80,
      pointReward: Math.max(5, Math.round((o.xpReward || 80) / 10)),
      statReward: (STAT_MAP[o.category] || { STR: 1 }) as Quest['statReward'],
      target: Number(o.currentTarget),
      unit: o.unit as Quest['unit'],
      progress: done ? Number(o.currentTarget) : Number(todayEntry?.progress || 0),
      status: done ? 'COMPLETE' : 'PENDING',
      date: today,
      isDaily: false,
      updatedAt: new Date().toISOString(),
    }
    const idx = quests.findIndex(q => q.id === id)
    if (idx >= 0) {
      // keep local completion if the store already marked it done
      const local = quests[idx]
      quests[idx] = local.status === 'COMPLETE' ? { ...quest, status: 'COMPLETE', progress: quest.target } : { ...quest, progress: Math.max(quest.progress, local.progress) }
    } else {
      quests.push(quest)
    }
  }

  useSystem.setState({ quests })
}
