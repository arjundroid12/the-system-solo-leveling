import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const authParam = req.nextUrl.searchParams.get('secret')
  const secret = authHeader?.replace('Bearer ', '') || authParam
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-load web-push only when needed (avoids build-time issues)
  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:arjunvashishtha2004@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    const subs = await tursoQuery(`
      SELECT s.id, s.endpoint, s.p256dh_key, s.auth_key, s.player_id, p.username, p.level
      FROM sl_push_subscriptions s JOIN sl_players p ON s.player_id = p.id
    `)
    if (subs.length === 0) return NextResponse.json({ success: true, sent: 0, message: 'No subscriptions' })

    const messages = [
      { title: '◆ DAILY QUEST', body: 'New quests have been issued. The System awaits your response.' },
      { title: '⚠ GATE ALERT', body: 'A gate has appeared. Complete today\'s quests before the penalty zone activates.' },
      { title: '💀 SHADOW ARMY', body: 'Your shadows grow restless. Return to clear today\'s dungeons.' },
      { title: '🔥 STREAK REMINDER', body: 'Don\'t break your streak! Complete today\'s quests.' },
    ]
    const msg = messages[Math.floor(Math.random() * messages.length)]
    let sent = 0, failed = 0
    const payload = JSON.stringify({ title: msg.title, body: msg.body, icon: '/icon.svg', badge: '/icon.svg', url: '/', tag: 'daily-reminder' })

    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } }, payload)
        sent++
      } catch (error: any) {
        if (error?.statusCode === 410 || error?.statusCode === 404)
          await tursoQuery('DELETE FROM sl_push_subscriptions WHERE id = ?', [sub.id]).catch(() => {})
        failed++
      }
    }
    return NextResponse.json({ success: true, sent, failed, total: subs.length })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
