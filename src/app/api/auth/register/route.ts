import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    if (username.length < 2 || username.length > 20) return NextResponse.json({ error: 'Username must be 2-20 characters' }, { status: 400 })
    if (password.length < 4) return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })

    const existing = await tursoQuery('SELECT id FROM sl_players WHERE username = ?', [username])
    if (existing.length > 0) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const playerId = genId()
    const ts = now()
    await tursoExecute(
      `INSERT INTO sl_players (id, username, password, level, xp, hp, mp, fatigue, stat_points, stats_json, job, player_points, last_quest_date, created_at, updated_at, total_quests, total_dungeons, total_shadows, streak, best_streak, last_streak_date, title, achievements)
       VALUES (?, ?, ?, 1, 0, 225, 23, 0, 0, '{"STR":10,"AGI":10,"INT":10,"VIT":10,"PER":10}', 'NONE', 0, NULL, ?, ?, 0, 0, 0, 0, 0, NULL, 'The Player', '[]')`,
      [playerId, username, password, ts, ts]
    )

    return NextResponse.json({ playerId, username, token: Buffer.from(`${playerId}:${password}`).toString('base64'), message: 'Player registered.' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
