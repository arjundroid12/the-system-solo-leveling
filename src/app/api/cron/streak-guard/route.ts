import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Evening sweep (15:00 UTC ≈ 8:30 PM IST): ping only players who still have
// PENDING quests today — their streak dies at rollover. Targeted, not spam:
// players who already finished get nothing.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const authParam = req.nextUrl.searchParams.get('secret')
  const secret = authHeader?.replace('Bearer ', '') || authParam
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:arjunvashishtha2004@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    const today = new Date().toISOString().slice(0, 10)
    const rows = await tursoQuery(`
      SELECT s.id, s.endpoint, s.p256dh_key, s.auth_key, p.username, p.streak,
        (SELECT COUNT(*) FROM sl_quests q WHERE q.player_id = p.id AND q.quest_date = ? AND q.status = 'PENDING' AND q.is_daily = 1) AS pending
      FROM sl_push_subscriptions s JOIN sl_players p ON s.player_id = p.id
    `, [today])

    const atRisk = rows.filter((r: any) => Number(r.pending) > 0)
    if (atRisk.length === 0) return NextResponse.json({ success: true, sent: 0, message: 'Nobody at risk' })

    let sent = 0, failed = 0
    for (const sub of atRisk) {
      const streak = Number(sub.streak) || 0
      const pending = Number(sub.pending)
      const body = streak >= 3
        ? `${pending} quest${pending > 1 ? 's' : ''} remain. Your ${streak}-day streak dies at midnight. Move, Player.`
        : `${pending} quest${pending > 1 ? 's' : ''} still pending today. The penalty zone is watching.`
      const payload = JSON.stringify({ title: '⚠ STREAK AT RISK', body, icon: '/icon.svg', badge: '/icon.svg', url: '/', tag: 'streak-guard', requireInteraction: false })
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } }, payload)
        sent++
      } catch (error: any) {
        if (error?.statusCode === 410 || error?.statusCode === 404)
          await tursoQuery('DELETE FROM sl_push_subscriptions WHERE id = ?', [sub.id]).catch(() => {})
        failed++
      }
    }
    return NextResponse.json({ success: true, sent, failed, atRisk: atRisk.length })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
