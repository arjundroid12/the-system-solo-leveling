import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const { damage } = await req.json()
    if (!damage || damage < 0) return NextResponse.json({ error: 'Invalid damage' }, { status: 400 })

    const today = new Date().toISOString().slice(0, 10)

    // Get player
    const players = await tursoQuery('SELECT * FROM sl_players WHERE id = ?', [playerId])
    if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    const player = players[0]

    // Get boss HP from a boss_state table (create if not exists)
    await tursoExecute(`CREATE TABLE IF NOT EXISTS sl_boss_state (
      id TEXT PRIMARY KEY,
      boss_id TEXT NOT NULL,
      boss_name TEXT NOT NULL,
      hp INTEGER NOT NULL,
      hp_max INTEGER NOT NULL,
      date TEXT NOT NULL,
      defeated_by TEXT,
      defeated_at TEXT,
      UNIQUE(boss_id)
    )`).catch(() => {})

    const bossId = `boss-${today}`
    let bossState = await tursoQuery('SELECT * FROM sl_boss_state WHERE boss_id = ?', [bossId])

    if (bossState.length === 0) {
      // Initialize boss for today
      const { getDailyBoss } = require('@/lib/system')
      const boss = getDailyBoss(today)
      await tursoExecute(
        'INSERT INTO sl_boss_state (id, boss_id, boss_name, hp, hp_max, date) VALUES (?, ?, ?, ?, ?, ?)',
        [genId(), bossId, boss.name, boss.hpMax, boss.hpMax, today]
      )
      bossState = await tursoQuery('SELECT * FROM sl_boss_state WHERE boss_id = ?', [bossId])
    }

    const boss = bossState[0]
    if (boss.defeated_by) {
      return NextResponse.json({ error: 'Boss already defeated today', defeatedBy: boss.defeated_by })
    }

    const newHp = Math.max(0, boss.hp - damage)
    const isDefeated = newHp === 0

    await tursoExecute('UPDATE sl_boss_state SET hp = ? WHERE boss_id = ?', [newHp, bossId])

    // Reward: if boss defeated, give rewards to the player who landed the final blow
    let reward = null
    if (isDefeated) {
      await tursoExecute('UPDATE sl_boss_state SET defeated_by = ?, defeated_at = ? WHERE boss_id = ?', [player.username, now(), bossId])

      const { getDailyBoss } = require('@/lib/system')
      const bossInfo = getDailyBoss(today)
      reward = {
        xp: bossInfo.xpReward,
        points: bossInfo.pointReward,
        title: `${bossInfo.name} Slayer`,
      }

      // Give rewards
      await tursoExecute(
        'UPDATE sl_players SET xp = xp + ?, player_points = player_points + ?, updated_at = ? WHERE id = ?',
        [reward.xp, reward.points, now(), playerId]
      )
    }

    return NextResponse.json({
      bossHp: newHp,
      bossHpMax: boss.hp_max,
      defeated: isDefeated,
      defeatedBy: isDefeated ? player.username : null,
      damage,
      reward,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
