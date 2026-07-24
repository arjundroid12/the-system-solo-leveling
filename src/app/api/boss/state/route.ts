import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery } from '@/lib/turso'
import { getDailyBoss } from '@/lib/system'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const today = new Date().toISOString().slice(0, 10)
    const boss = getDailyBoss(today)

    // Check if player already defeated today's boss
    const logs = await tursoQuery(
      'SELECT * FROM sl_sync_log WHERE player_id = ? ORDER BY last_sync DESC LIMIT 1',
      [playerId]
    ).catch(() => [])

    return NextResponse.json({ boss, defeatedToday: false })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
