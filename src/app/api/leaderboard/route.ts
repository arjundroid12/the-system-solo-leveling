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

    const allPlayers = await tursoQuery(`
      SELECT id, username, level, xp, job, title, streak, total_shadows, total_quests, total_dungeons,
             (level * 100 + xp + total_shadows * 50) as power_score
      FROM sl_players
      ORDER BY power_score DESC
      LIMIT 100
    `)

    const myRank = allPlayers.findIndex((p: any) => p.id === playerId) + 1
    const myEntry = allPlayers.find((p: any) => p.id === playerId)

    return NextResponse.json({
      leaderboard: allPlayers.map((p: any, i: number) => ({
        rank: i + 1,
        id: p.id,
        name: p.username,
        level: p.level,
        job: p.job,
        title: p.title || 'The Player',
        streak: p.streak || 0,
        shadows: p.total_shadows || 0,
        power: p.power_score,
        isMe: p.id === playerId,
      })),
      myRank,
      myPower: (myEntry as any)?.power_score || 0,
      totalPlayers: allPlayers.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
