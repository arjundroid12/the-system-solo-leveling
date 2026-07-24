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

    const { subscription } = await req.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth)
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    const existing = await tursoQuery('SELECT id FROM sl_push_subscriptions WHERE endpoint = ?', [subscription.endpoint])
    if (existing.length > 0) {
      await tursoExecute('UPDATE sl_push_subscriptions SET player_id = ? WHERE endpoint = ?', [playerId, subscription.endpoint])
      return NextResponse.json({ success: true })
    }

    const deviceType = req.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'web'
    await tursoExecute(
      'INSERT INTO sl_push_subscriptions (id, player_id, endpoint, p256dh_key, auth_key, device_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [genId(), playerId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, deviceType, now()]
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
