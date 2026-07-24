'use client'

import { useEffect, useState } from 'react'
import { useSystem } from '@/lib/store'
import { SystemNotification } from '@/lib/system'

const TYPE_STYLES: Record<string, { color: string; icon: string; pulse?: boolean }> = {
  QUEST: { color: 'var(--system-cyan)', icon: '◆' },
  LEVEL_UP: { color: 'var(--system-gold)', icon: '★', pulse: true },
  WARNING: { color: 'var(--system-red)', icon: '⚠' },
  SUCCESS: { color: 'var(--system-cyan)', icon: '✓' },
  PENALTY: { color: 'var(--system-red)', icon: '☠', pulse: true },
  SHADOW: { color: 'var(--system-shadow)', icon: '💀', pulse: true },
  SYSTEM: { color: 'var(--system-cyan)', icon: '◈' },
}

export function SystemNotifications() {
  const notifications = useSystem(s => s.notifications)
  const dismissNotification = useSystem(s => s.dismissNotification)
  const [visible, setVisible] = useState<SystemNotification | null>(null)

  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[notifications.length - 1]
    if (!visible) {
      setVisible(latest)
      const timer = setTimeout(() => { setVisible(null); dismissNotification(latest.id) }, 4500)
      return () => clearTimeout(timer)
    }
  }, [notifications, visible, dismissNotification])

  if (!visible) return null
  const style = TYPE_STYLES[visible.type] || TYPE_STYLES.SYSTEM

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-6">
      <div className={`sl-window sl-window-glow max-w-sm w-full sl-level-up ${style.pulse ? 'sl-glow-pulse' : ''}`} style={{ pointerEvents: 'auto' }}>
        <div className="sl-title-bar" style={{ color: style.color, textShadow: `0 0 8px ${style.color}` }}>
          <span>{style.icon} {visible.title}</span>
          <button onClick={() => { dismissNotification(visible.id); setVisible(null) }} className="ml-auto text-[var(--system-text-dim)] hover:text-[var(--system-cyan)] text-sm leading-none">✕</button>
        </div>
        <div className="p-5 text-center"><p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: style.color, textShadow: `0 0 4px ${style.color}40` }}>{visible.message}</p></div>
      </div>
    </div>
  )
}
