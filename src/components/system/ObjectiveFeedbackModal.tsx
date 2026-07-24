'use client'

import { useState } from 'react'
import { useSystem } from '@/lib/store'
import { completeObjectiveToday } from '@/lib/objectives'
import { soundClick, soundNotification } from '@/lib/sound'

const OPTIONS: { key: 'EASY' | 'RIGHT' | 'HARD'; label: string; sub: string; cls: string }[] = [
  { key: 'EASY', label: 'TOO EASY', sub: 'Barely felt it. Raise the bar.', cls: 'sl-btn-gold' },
  { key: 'RIGHT', label: 'JUST RIGHT', sub: 'Challenged but cleared clean.', cls: '' },
  { key: 'HARD', label: 'BARELY MADE IT', sub: 'That was a war. Hold or deload.', cls: 'sl-btn-red' },
]

export function ObjectiveFeedbackModal() {
  const pending = useSystem(s => s.pendingObjectiveFeedback)
  const setPending = useSystem(s => s.setPendingObjectiveFeedback)
  const pushNotification = useSystem(s => s.pushNotification)
  const [busy, setBusy] = useState(false)

  if (!pending) return null

  const answer = async (feedback: 'EASY' | 'RIGHT' | 'HARD') => {
    if (busy) return
    setBusy(true); soundClick()
    const res = await completeObjectiveToday(pending.objectiveId, feedback)
    setBusy(false)
    setPending(null)
    if (res?.adjustment) {
      soundNotification()
      const { previousTarget, newTarget, message } = res.adjustment
      pushNotification({
        type: newTarget > previousTarget ? 'SUCCESS' : 'SYSTEM',
        title: newTarget !== previousTarget ? '[ PROGRESSIVE OVERLOAD ]' : '[ ASSESSMENT LOGGED ]',
        message,
      })
    } else if (res?.alreadyDone) {
      pushNotification({ type: 'SYSTEM', title: '[ ALREADY LOGGED ]', message: 'Today was already recorded for this objective.' })
    } else {
      pushNotification({ type: 'WARNING', title: '[ SYNC FAILED ]', message: 'Assessment not saved — will not affect your target.' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[70] px-4">
      <div className="sl-window sl-window-glow max-w-sm w-full sl-level-up">
        <div className="sl-title-bar"><span>◈ DIFFICULTY ASSESSMENT</span></div>
        <div className="p-5">
          <p className="text-xs text-center text-[var(--system-text-dim)] mb-1">Objective cleared:</p>
          <p className="text-sm text-center sl-glow-blue mb-5">{pending.title}</p>
          <p className="sl-label text-center mb-3">HOW DID IT FEEL, PLAYER?</p>
          <div className="space-y-2">
            {OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => answer(opt.key)} disabled={busy} className={`sl-btn ${opt.cls} w-full py-3 flex-col`}>
                <span className="text-[11px]">{opt.label}</span>
                <span className="text-[9px] opacity-70 normal-case tracking-normal">{opt.sub}</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-center text-[var(--system-text-faint)] mt-4">The System adjusts tomorrow's prescription based on your answer.</p>
        </div>
      </div>
    </div>
  )
}
