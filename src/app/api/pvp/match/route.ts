import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    // Get all players sorted by level + XP (as a proxy for army power)
    const allPlayers = await tursoQuery(`
      SELECT id, username, level, xp, job, title, streak, total_shadows,
             (level * 100 + xp + total_shadows * 50) as power_score
      FROM sl_players
      ORDER BY power_score DESC
      LIMIT 50
    `)

    // Find player's rank
    const myRank = allPlayers.findIndex((p: any) => p.id === playerId) + 1

    // Find potential opponents (similar power)
    const me = allPlayers.find((p: any) => p.id === playerId)
    if (!me) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Get 3 random opponents within 10 ranks
    const nearbyOpponents = allPlayers.filter((p: any, i: number) => {
      const rank = i + 1
      return Math.abs(rank - myRank) <= 10 && p.id !== playerId
    })

    const shuffled = nearbyOpponents.sort(() => Math.random() - 0.5).slice(0, 3)

    return NextResponse.json({
      myRank,
      myPower: (me as any).power_score,
      opponents: shuffled.map((p: any) => ({
        id: p.id,
        name: p.username,
        level: p.level,
        job: p.job,
        title: p.title || 'The Player',
        shadows: p.total_shadows,
        power: p.power_score,
      })),
      totalPlayers: allPlayers.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
