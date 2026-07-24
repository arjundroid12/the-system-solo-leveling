import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'
import { GROWTH_PATHS, createGrowthPlan } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ═══ GET — fetch player's growth plan + available paths ═══
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const plans = await tursoQuery('SELECT * FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC', [playerId])

    return NextResponse.json({
      availablePaths: GROWTH_PATHS.map(p => ({
        id: p.id, name: p.name, icon: p.icon, description: p.description,
        category: p.category, difficulty: p.difficulty, durationDays: p.durationDays,
        milestones: p.milestones.map(m => ({ title: m.title, description: m.description, targetDay: m.targetDay })),
        recommendedStats: p.recommendedStats,
      })),
      currentPlan: plans[0] ? {
        id: plans[0].id, pathId: plans[0].path_id, pathName: plans[0].path_name,
        pathIcon: plans[0].path_icon, startDate: plans[0].start_date,
        currentDay: plans[0].current_day, totalDays: plans[0].total_days,
        season: plans[0].season,
        milestones: JSON.parse(plans[0].milestones_json || '[]'),
        goals: JSON.parse(plans[0].goals_json || '[]'),
        aiNotes: plans[0].ai_notes || '',
      } : null,
      pastPlans: plans.slice(1).map((p: any) => ({ id: p.id, pathName: p.path_name, season: p.season })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}

// ═══ POST — create or update growth plan ═══
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const { action, pathId, goals, milestoneUpdates } = await req.json()
    const ts = now()

    if (action === 'create') {
      const path = GROWTH_PATHS.find(p => p.id === pathId)
      if (!path) return NextResponse.json({ error: 'Path not found' }, { status: 404 })

      const plan = createGrowthPlan(playerId, path)
      await tursoExecute(
        `INSERT INTO sl_growth_plans (id, player_id, path_id, path_name, path_icon, start_date, current_day, total_days, season, milestones_json, goals_json, ai_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, playerId, plan.pathId, plan.pathName, plan.pathIcon, plan.startDate, plan.currentDay, plan.totalDays, plan.season, JSON.stringify(plan.milestones), JSON.stringify(plan.goals), plan.aiNotes, ts, ts]
      )
      return NextResponse.json({ success: true, plan })
    }

    if (action === 'add_goal') {
      const plans = await tursoQuery('SELECT id, goals_json FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1', [playerId])
      if (plans.length === 0) return NextResponse.json({ error: 'No active plan' }, { status: 400 })

      const currentGoals = JSON.parse(plans[0].goals_json || '[]')
      const newGoal = { id: genId(), ...goals, progress: 0, createdAt: ts }
      currentGoals.push(newGoal)
      await tursoExecute('UPDATE sl_growth_plans SET goals_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(currentGoals), ts, plans[0].id])
      return NextResponse.json({ success: true, goal: newGoal })
    }

    if (action === 'update_milestone') {
      const plans = await tursoQuery('SELECT id, milestones_json FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1', [playerId])
      if (plans.length === 0) return NextResponse.json({ error: 'No active plan' }, { status: 400 })

      const milestones = JSON.parse(plans[0].milestones_json || '[]')
      const updated = milestones.map((m: any) => {
        if (m.id === milestoneUpdates.id) {
          return { ...m, ...milestoneUpdates, completedAt: milestoneUpdates.completed ? ts : null }
        }
        return m
      })
      await tursoExecute('UPDATE sl_growth_plans SET milestones_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(updated), ts, plans[0].id])
      return NextResponse.json({ success: true, milestones: updated })
    }

    if (action === 'update_day') {
      await tursoExecute('UPDATE sl_growth_plans SET current_day = ?, updated_at = ? WHERE player_id = (SELECT id FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1)', [milestoneUpdates.currentDay, ts, playerId])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
