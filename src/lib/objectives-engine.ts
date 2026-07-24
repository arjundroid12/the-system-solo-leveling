// THE SYSTEM — Objectives Engine
// Goal → AI-designed program → daily quest prescription → progressive overload.
// Pure functions shared by the API route (server) and UI (client).

export type ObjectiveFeedback = 'EASY' | 'RIGHT' | 'HARD'

export interface ObjectivePlan {
  summary: string
  metric: { name: string; unit: string }
  baseline: number            // day-1 prescription
  increment: number           // smallest meaningful step up
  maxTarget: number           // where the goal is considered reached
  phases: { name: string; days: number; focus: string }[]
  milestones: { day: number; title: string }[]
  tips: string[]
  estimatedDays: number
  xpBase: number              // XP for completing one daily prescription at baseline
}

export interface ObjectiveHistoryEntry {
  date: string                // UTC yyyy-mm-dd
  target: number
  done: boolean
  progress: number
  feedback?: ObjectiveFeedback
}

export interface Objective {
  id: string
  playerId: string
  title: string
  icon: string
  category: string
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED'
  plan: ObjectivePlan
  currentTarget: number
  unit: string
  day: number
  easyRun: number             // consecutive EASY reports
  hardRun: number             // consecutive HARD reports
  history: ObjectiveHistoryEntry[]
  startedAt: string
  lastQuestDate: string | null
}

// ═══ PROGRESSIVE OVERLOAD RULES ═══
// EASY ×2 in a row      → step up by 2 increments (you're sandbagging)
// EASY                  → step up by 1 increment
// RIGHT                 → step up by 1 increment every 3rd completed day (steady grind)
// HARD                  → hold
// HARD ×2 in a row      → deload 15% (round to increment)
// missed day            → hold; 2+ consecutive missed → deload 10%
export function applyFeedback(o: Objective, feedback: ObjectiveFeedback): { newTarget: number; easyRun: number; hardRun: number; message: string } {
  const { increment, maxTarget } = o.plan
  const completedDays = o.history.filter(h => h.done).length + 1
  let target = o.currentTarget
  let easyRun = o.easyRun
  let hardRun = o.hardRun
  let message = ''

  if (feedback === 'EASY') {
    easyRun += 1; hardRun = 0
    const step = easyRun >= 2 ? increment * 2 : increment
    target = target + step
    message = easyRun >= 2
      ? `Too easy twice in a row. The System raises the bar: ${o.currentTarget} → ${roundTarget(target, increment)}.`
      : `Target increased: ${o.currentTarget} → ${roundTarget(target, increment)}. Growth demands resistance.`
  } else if (feedback === 'RIGHT') {
    easyRun = 0; hardRun = 0
    if (completedDays % 3 === 0) {
      target = target + increment
      message = `Steady progress. Scheduled overload: ${o.currentTarget} → ${roundTarget(target, increment)}.`
    } else {
      message = `Target holds at ${o.currentTarget}. Consistency builds the base.`
    }
  } else {
    hardRun += 1; easyRun = 0
    if (hardRun >= 2) {
      target = Math.max(o.plan.baseline * 0.5, target * 0.85)
      hardRun = 0
      message = `Struggle detected twice. Deload: ${o.currentTarget} → ${roundTarget(target, increment)}. Recover, then climb.`
    } else {
      message = `Target holds at ${o.currentTarget}. Survive today, adapt tomorrow.`
    }
  }

  target = Math.min(target, maxTarget)
  return { newTarget: roundTarget(target, increment), easyRun, hardRun, message }
}

// Missed-day reconciliation (run lazily whenever objectives are fetched)
export function reconcileMissedDays(o: Objective, todayUTC: string): { history: ObjectiveHistoryEntry[]; newTarget: number; missed: number } {
  const history = [...o.history]
  let missed = 0
  if (o.lastQuestDate && o.lastQuestDate < todayUTC) {
    let d = new Date(o.lastQuestDate + 'T00:00:00Z')
    const end = new Date(todayUTC + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    while (d < end) {
      const ds = d.toISOString().slice(0, 10)
      if (!history.find(h => h.date === ds)) { history.push({ date: ds, target: o.currentTarget, done: false, progress: 0 }); missed++ }
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }
  let newTarget = o.currentTarget
  if (missed >= 2) newTarget = Math.max(o.plan.baseline * 0.5, roundTarget(o.currentTarget * 0.9, o.plan.increment))
  return { history, newTarget, missed }
}

export function roundTarget(v: number, increment: number): number {
  const decimals = increment < 1 ? 1 : 0
  const r = Math.round(v / (increment || 1)) * (increment || 1)
  return parseFloat(Math.max(1, r).toFixed(decimals))
}

export function currentPhase(o: Objective): { name: string; focus: string } {
  let acc = 0
  for (const p of o.plan.phases) {
    acc += p.days
    if (o.day <= acc) return { name: p.name, focus: p.focus }
  }
  return o.plan.phases[o.plan.phases.length - 1] || { name: 'GRIND', focus: 'Keep going.' }
}

export function objectiveXp(o: Objective): number {
  const ratio = o.currentTarget / Math.max(o.plan.baseline, 0.001)
  return Math.min(400, Math.max(40, Math.round(o.plan.xpBase * Math.pow(Math.max(ratio, 0.5), 0.4))))
}

export function goalReached(o: Objective): boolean {
  return o.currentTarget >= o.plan.maxTarget
}

// Quest row injected into the daily quest list for an objective
export function objectiveQuestId(objectiveId: string, dateUTC: string): string {
  return `obj-${objectiveId}-${dateUTC}`
}
