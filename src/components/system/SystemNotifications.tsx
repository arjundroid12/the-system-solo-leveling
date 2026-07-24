'use client'

import { useEffect, useRef, useState } from 'react'
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

const TOAST_MS = 3800
const MAX_VISIBLE = 3

// Non-blocking corner toasts. Only PENALTY gets the dramatic centered
// treatment — everything else must never cover the UI (the old centered
// notification blocked all clicks for 4.5s per message).
export function SystemNotifications() {
  const notifications = useSystem(s => s.notifications)
  const dismissNotification = useSystem(s => s.dismissNotification)
  const [visible, setVisible] = useState<SystemNotification[]>([])
  const shown = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const n of notifications) {
      if (shown.current.has(n.id)) continue
      shown.current.add(n.id)
      setVisible(v => [...v.slice(-(MAX_VISIBLE - 1)), n])
      setTimeout(() => {
        setVisible(v => v.filter(x => x.id !== n.id))
        dismissNotification(n.id)
      }, n.type === 'PENALTY' ? 6000 : TOAST_MS)
    }
  }, [notifications, dismissNotification])

  if (visible.length === 0) return null

  const penalty = visible.find(n => n.type === 'PENALTY')
  const toasts = visible.filter(n => n.type !== 'PENALTY')

  const close = (id: string) => {
    setVisible(v => v.filter(x => x.id !== id))
    dismissNotification(id)
  }

  return (
    <>
      {/* corner toasts — never block the page */}
      {toasts.length > 0 && (
        <div className="fixed z-[100] top-[calc(104px+env(safe-area-inset-top))] lg:top-6 left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] lg:left-auto lg:w-[340px] space-y-2 pointer-events-none">
          {toasts.map(n => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES.SYSTEM
            return (
              <div key={n.id} className="sl-window sl-slide-in pointer-events-auto" onClick={() => close(n.id)} role="status">
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 cursor-pointer">
                  <span className="text-sm leading-tight" style={{ color: style.color, textShadow: `0 0 8px ${style.color}` }}>{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] tracking-widest" style={{ color: style.color, textShadow: `0 0 6px ${style.color}` }}>{n.title}</p>
                    <p className="text-[10px] text-[var(--system-text-dim)] whitespace-pre-line leading-relaxed mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-[var(--system-text-faint)] text-xs leading-none">✕</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* penalty — rare, dramatic, centered */}
      {penalty && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none px-6">
          <div className="sl-window sl-window-glow sl-glow-pulse max-w-sm w-full sl-level-up pointer-events-auto">
            <div className="sl-title-bar" style={{ color: 'var(--system-red)', textShadow: '0 0 8px var(--system-red)' }}>
              <span>☠ {penalty.title}</span>
              <button onClick={() => close(penalty.id)} className="ml-auto text-[var(--system-text-dim)] hover:text-[var(--system-cyan)] text-sm leading-none">✕</button>
            </div>
            <div className="p-5 text-center">
              <p className="text-xs whitespace-pre-line leading-relaxed sl-glow-red">{penalty.message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
