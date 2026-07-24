import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Username and password required' }, { status: 400 })

    const players = await tursoQuery('SELECT id, username, password FROM sl_players WHERE username = ?', [username])
    if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    if (players[0].password !== password) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })

    const player = players[0]
    const deviceType = req.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'web'
    await tursoExecute('INSERT INTO sl_sync_log (id, player_id, device_type, last_sync) VALUES (?, ?, ?, ?)', [genId(), player.id, deviceType, now()]).catch(() => {})

    return NextResponse.json({ playerId: player.id, username: player.username, token: Buffer.from(`${player.id}:${password}`).toString('base64'), message: 'Welcome back.' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
