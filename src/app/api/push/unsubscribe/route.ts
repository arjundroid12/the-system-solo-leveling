import { NextRequest, NextResponse } from 'next/server'
import { tursoExecute } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    await tursoExecute('DELETE FROM sl_push_subscriptions WHERE endpoint = ?', [endpoint])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
