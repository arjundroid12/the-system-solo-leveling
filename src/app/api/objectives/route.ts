import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'
import { applyFeedback, reconcileMissedDays, currentPhase, objectiveXp, goalReached, roundTarget, type Objective, type ObjectivePlan } from '@/lib/objectives-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ZAI_URL = 'https://api.z.ai/api/paas/v4/chat/completions'

function playerIdFrom(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')
    return playerId || null
  } catch { return null }
}

function rowToObjective(r: any): Objective {
  return {
    id: r.id, playerId: r.player_id, title: r.title, icon: r.icon || '🎯',
    category: r.category || 'TRAINING', status: r.status || 'ACTIVE',
    plan: JSON.parse(r.plan_json), currentTarget: Number(r.current_target),
    unit: r.unit || 'REPS', day: Number(r.day) || 1,
    easyRun: Number(r.easy_run) || 0, hardRun: Number(r.hard_run) || 0,
    history: JSON.parse(r.history_json || '[]'),
    startedAt: r.started_at, lastQuestDate: r.last_quest_date || null,
  }
}

function serialize(o: Objective) {
  const phase = currentPhase(o)
  return {
    ...o,
    phase,
    xpReward: objectiveXp(o),
    completedDays: o.history.filter(h => h.done).length,
    reached: goalReached(o),
  }
}

async function callZai(system: string, user: string, maxTokens = 1800, timeoutMs = 52000): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(ZAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.ZAI_API_KEY}`, 'Content-Type': 'application/json' },
      // thinking disabled — structured JSON doesn't need chain-of-thought and
      // with it enabled glm-4.5-flash takes 40-60s (blows the serverless budget)
      body: JSON.stringify({ model: 'glm-4.5-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature: 0.5, thinking: { type: 'disabled' } }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    try { return JSON.parse(cleaned) } catch { const m = cleaned.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]) }
    return null
  } catch { return null }
}

function fallbackPlan(goal: string): ObjectivePlan {
  return {
    summary: `A steady 60-day progression toward: ${goal}. Start small, add load as it gets easy.`,
    metric: { name: 'daily effort', unit: 'MINUTES' },
    baseline: 15, increment: 5, maxTarget: 60,
    phases: [
      { name: 'FOUNDATION', days: 14, focus: 'Show up daily. Build the habit before the load.' },
      { name: 'BUILD', days: 28, focus: 'Add volume steadily. Never miss twice.' },
      { name: 'PEAK', days: 18, focus: 'Push near your limit. Consolidate the gains.' },
    ],
    milestones: [
      { day: 7, title: 'One full week without missing' },
      { day: 21, title: 'Habit locked in — 3 weeks deep' },
      { day: 45, title: 'Operating at 3× your starting volume' },
      { day: 60, title: 'Goal within reach' },
    ],
    tips: ['Anchor it to the same time every day.', 'A bad session still counts — never zero.'],
    estimatedDays: 60, xpBase: 80,
  }
}

// ═══ GET — list objectives (with lazy missed-day reconciliation) ═══
export async function GET(req: NextRequest) {
  try {
    const playerId = playerIdFrom(req)
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rows = await tursoQuery('SELECT * FROM sl_objectives WHERE player_id = ? ORDER BY created_at DESC', [playerId])
    const today = new Date().toISOString().slice(0, 10)
    const objectives: Objective[] = []

    for (const r of rows) {
      const o = rowToObjective(r)
      if (o.status === 'ACTIVE' && o.lastQuestDate && o.lastQuestDate < today) {
        const { history, newTarget, missed } = reconcileMissedDays(o, today)
        if (missed > 0) {
          o.history = history
          o.currentTarget = newTarget
          await tursoExecute('UPDATE sl_objectives SET history_json = ?, current_target = ?, updated_at = ? WHERE id = ?',
            [JSON.stringify(history), newTarget, now(), o.id])
        }
      }
      objectives.push(o)
    }

    return NextResponse.json({ objectives: objectives.map(serialize), today })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

// ═══ POST — create / progress / complete / analyze / pause / resume / delete ═══
export async function POST(req: NextRequest) {
  try {
    const playerId = playerIdFrom(req)
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const action = body.action
    const today = new Date().toISOString().slice(0, 10)
    const ts = now()

    // ─── CREATE: goal text → AI-designed program ───
    if (action === 'create') {
      const goal = String(body.goal || '').trim().slice(0, 300)
      const context = String(body.context || '').trim().slice(0, 300)
      if (!goal) return NextResponse.json({ error: 'Goal required' }, { status: 400 })

      const active = await tursoQuery("SELECT COUNT(*) as c FROM sl_objectives WHERE player_id = ? AND status = 'ACTIVE'", [playerId])
      if (Number(active[0]?.c) >= 5) return NextResponse.json({ error: 'Maximum 5 active objectives. Complete or abandon one first.' }, { status: 400 })

      const players = await tursoQuery('SELECT level, stats_json FROM sl_players WHERE id = ?', [playerId])
      if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

      const ai = await callZai(
        'You are the System — a ruthless but scientific training-program designer from a Solo Leveling-style RPG. You design progressive-overload programs for real-life goals: fitness, study, skills, career, content creation, anything. You output STRICT JSON only, no prose.',
        `Design a daily progressive-overload program for this goal.

GOAL: ${goal}
${context ? `PLAYER'S CURRENT ABILITY / CONTEXT: ${context}` : ''}
PLAYER LEVEL: ${players[0].level}

Rules:
- ONE measurable daily metric with a unit from: REPS, MINUTES, PAGES, WORDS, SESSIONS, KM, PROBLEMS, COUNT.
- baseline = conservative day-1 prescription the player can definitely do (respect their stated current ability; go slightly BELOW it).
- increment = smallest meaningful step up.
- maxTarget = daily volume at which the goal is effectively achieved.
- 2-4 phases whose days sum to estimatedDays (realistic: 21-120 days).
- 3-5 milestones at meaningful day marks.
- 2-3 sharp, specific tips (no generic fluff).
- icon = one emoji. category = one of TRAINING, STUDY, CREATE, HEALTH, CAREER.
- xpBase = 60-150 based on daily effort required.
- shortTitle = 2-4 word quest-style name (e.g. "Pushup Protocol", "DSA Grind").

Return ONLY this JSON object:
{"shortTitle":"...","icon":"..","category":"..","summary":"1-2 sentences on the strategy","metric":{"name":"...","unit":".."},"baseline":N,"increment":N,"maxTarget":N,"phases":[{"name":"..","days":N,"focus":".."}],"milestones":[{"day":N,"title":".."}],"tips":[".."],"estimatedDays":N,"xpBase":N}`
      )

      let plan: ObjectivePlan
      let icon = '🎯', category = 'TRAINING', title = goal.slice(0, 60)
      if (ai && ai.metric && ai.baseline) {
        plan = {
          summary: String(ai.summary || '').slice(0, 400),
          metric: { name: String(ai.metric.name || 'daily effort').slice(0, 60), unit: String(ai.metric.unit || 'COUNT').toUpperCase() },
          baseline: Number(ai.baseline) || 10,
          increment: Number(ai.increment) || 1,
          maxTarget: Number(ai.maxTarget) || Number(ai.baseline) * 5,
          phases: (Array.isArray(ai.phases) && ai.phases.length ? ai.phases : fallbackPlan(goal).phases).slice(0, 4).map((p: any) => ({ name: String(p.name || 'PHASE').slice(0, 30).toUpperCase(), days: Number(p.days) || 21, focus: String(p.focus || '').slice(0, 160) })),
          milestones: (Array.isArray(ai.milestones) ? ai.milestones : []).slice(0, 5).map((m: any) => ({ day: Number(m.day) || 7, title: String(m.title || '').slice(0, 100) })),
          tips: (Array.isArray(ai.tips) ? ai.tips : []).slice(0, 3).map((t: any) => String(t).slice(0, 160)),
          estimatedDays: Number(ai.estimatedDays) || 60,
          xpBase: Math.min(150, Math.max(40, Number(ai.xpBase) || 80)),
        }
        icon = String(ai.icon || '🎯').slice(0, 4)
        category = ['TRAINING', 'STUDY', 'CREATE', 'HEALTH', 'CAREER'].includes(ai.category) ? ai.category : 'TRAINING'
        title = String(ai.shortTitle || goal).slice(0, 60)
      } else {
        plan = fallbackPlan(goal)
      }

      const id = genId()
      await tursoExecute(
        `INSERT INTO sl_objectives (id, player_id, title, icon, category, status, plan_json, current_target, unit, day, easy_run, hard_run, history_json, started_at, last_quest_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, 0, 0, '[]', ?, ?, ?, ?)`,
        [id, playerId, title, icon, category, JSON.stringify(plan), plan.baseline, plan.metric.unit, today, today, ts, ts]
      )
      const rows = await tursoQuery('SELECT * FROM sl_objectives WHERE id = ?', [id])
      return NextResponse.json({ success: true, objective: serialize(rowToObjective(rows[0])), goalText: goal })
    }

    // All other actions need an existing objective owned by this player
    const id = String(body.id || '')
    const rows = await tursoQuery('SELECT * FROM sl_objectives WHERE id = ? AND player_id = ?', [id, playerId])
    if (rows.length === 0) return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    const o = rowToObjective(rows[0])

    // ─── PROGRESS: record partial progress for today ───
    if (action === 'progress') {
      const progress = Math.max(0, Number(body.progress) || 0)
      const entry = o.history.find(h => h.date === today)
      if (entry && !entry.done) entry.progress = progress
      else if (!entry) o.history.push({ date: today, target: o.currentTarget, done: false, progress })
      await tursoExecute('UPDATE sl_objectives SET history_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(o.history), ts, id])
      return NextResponse.json({ success: true })
    }

    // ─── COMPLETE: mark today done + progressive overload ───
    if (action === 'complete') {
      const feedback = ['EASY', 'RIGHT', 'HARD'].includes(body.feedback) ? body.feedback : 'RIGHT'
      const existing = o.history.find(h => h.date === today)
      if (existing?.done) return NextResponse.json({ success: true, alreadyDone: true, objective: serialize(o) })

      const doneEntry = { date: today, target: o.currentTarget, done: true, progress: o.currentTarget, feedback }
      o.history = [...o.history.filter(h => h.date !== today), doneEntry]

      const adj = applyFeedback(o, feedback)
      const prevTarget = o.currentTarget
      o.currentTarget = adj.newTarget
      o.easyRun = adj.easyRun
      o.hardRun = adj.hardRun
      o.day += 1
      const reached = goalReached(o)
      if (reached) o.status = 'COMPLETED'

      await tursoExecute(
        'UPDATE sl_objectives SET history_json = ?, current_target = ?, easy_run = ?, hard_run = ?, day = ?, status = ?, last_quest_date = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(o.history), o.currentTarget, o.easyRun, o.hardRun, o.day, o.status, today, ts, id]
      )

      return NextResponse.json({
        success: true,
        objective: serialize(o),
        adjustment: { previousTarget: prevTarget, newTarget: o.currentTarget, message: reached ? `OBJECTIVE COMPLETE. ${o.title} has been conquered.` : adj.message },
      })
    }

    // ─── ANALYZE: AI reviews the history and recalibrates ───
    if (action === 'analyze') {
      const recent = o.history.slice(-14)
      const ai = await callZai(
        'You are the System — a data-driven coach in a Solo Leveling-style RPG. Analyze training history and recalibrate. STRICT JSON only. Verdict text is 2-4 sentences, in the cold, imperative voice of the System (address the player as "Player").',
        `OBJECTIVE: ${o.title} (${o.plan.metric.name}, unit ${o.unit})
DAY: ${o.day} of ~${o.plan.estimatedDays} · CURRENT DAILY TARGET: ${o.currentTarget} · GOAL TARGET: ${o.plan.maxTarget}
LAST 14 DAYS (target/done/feedback): ${JSON.stringify(recent)}

Assess: completion rate, difficulty trend, whether the current target is right. Recommend a new daily target if warranted (stay within ±30% of current unless clearly justified).

Return ONLY: {"verdict":"...","recommendedTarget":N,"trend":"AHEAD|ON_TRACK|BEHIND"}`
      )
      if (!ai?.verdict) return NextResponse.json({ error: 'Analysis unavailable. Try again.' }, { status: 502 })

      let applied = false
      const rec = roundTarget(Number(ai.recommendedTarget) || o.currentTarget, o.plan.increment)
      if (rec > 0 && Math.abs(rec - o.currentTarget) / o.currentTarget <= 0.5 && rec !== o.currentTarget) {
        o.currentTarget = Math.min(rec, o.plan.maxTarget)
        await tursoExecute('UPDATE sl_objectives SET current_target = ?, updated_at = ? WHERE id = ?', [o.currentTarget, ts, id])
        applied = true
      }
      return NextResponse.json({ success: true, verdict: String(ai.verdict).slice(0, 600), trend: ai.trend || 'ON_TRACK', recommendedTarget: rec, applied, objective: serialize(o) })
    }

    // ─── PAUSE / RESUME / DELETE ───
    if (action === 'pause' || action === 'resume') {
      const status = action === 'pause' ? 'PAUSED' : 'ACTIVE'
      await tursoExecute('UPDATE sl_objectives SET status = ?, last_quest_date = ?, updated_at = ? WHERE id = ?', [status, today, ts, id])
      return NextResponse.json({ success: true, status })
    }
    if (action === 'delete') {
      await tursoExecute('DELETE FROM sl_objectives WHERE id = ?', [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
