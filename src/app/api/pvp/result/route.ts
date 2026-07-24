import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, now } from '@/lib/turso'
import { simulateBattle } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const { opponentId } = await req.json()
    if (!opponentId) return NextResponse.json({ error: 'Opponent ID required' }, { status: 400 })

    // Get both players
    const me = (await tursoQuery('SELECT * FROM sl_players WHERE id = ?', [playerId]))[0]
    const enemy = (await tursoQuery('SELECT * FROM sl_players WHERE id = ?', [opponentId]))[0]
    if (!me || !enemy) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Calculate power scores
    const myPower = me.level * 100 + me.xp + me.total_shadows * 50
    const enemyPower = enemy.level * 100 + enemy.xp + enemy.total_shadows * 50

    // Simulate battle
    const result = simulateBattle(myPower, enemyPower)

    // Apply rewards/penalties
    if (result.win) {
      await tursoExecute(
        'UPDATE sl_players SET xp = xp + ?, player_points = player_points + ?, updated_at = ? WHERE id = ?',
        [result.xpGained, result.pointsGained, now(), playerId]
      )
    } else {
      await tursoExecute(
        'UPDATE sl_players SET xp = xp + ?, player_points = player_points + ?, hp = GREATEST(10, hp - ?), updated_at = ? WHERE id = ?',
        [result.xpGained, result.pointsGained, result.enemyDamage, now(), playerId]
      )
    }

    return NextResponse.json({
      result,
      myName: me.username,
      enemyName: enemy.username,
      myPower,
      enemyPower,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
