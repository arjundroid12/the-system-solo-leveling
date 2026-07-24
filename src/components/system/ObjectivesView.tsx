'use client'

import { useEffect, useState } from 'react'
import { useSystem } from '@/lib/store'
import { refreshObjectives, createObjective, analyzeObjective, mutateObjective } from '@/lib/objectives'
import { soundClick, soundSkillUnlock, soundNotification } from '@/lib/sound'

const FORGE_LINES = ['> ANALYZING GOAL…', '> CONSULTING TRAINING DOCTRINE…', '> CALIBRATING BASELINE TO PLAYER…', '> DESIGNING PROGRESSION PHASES…', '> FORGING PROGRAM…']

export function ObjectivesView({ onCreated }: { onCreated?: () => void }) {
  const objectives = useSystem(s => s.objectives)
  const pushNotification = useSystem(s => s.pushNotification)
  const [showForm, setShowForm] = useState(false)
  const [goal, setGoal] = useState('')
  const [context, setContext] = useState('')
  const [forging, setForging] = useState(false)
  const [forgeLine, setForgeLine] = useState(0)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<{ id: string; text: string; trend: string } | null>(null)

  useEffect(() => { refreshObjectives() }, [])
  useEffect(() => {
    if (!forging) return
    const t = setInterval(() => setForgeLine(l => Math.min(l + 1, FORGE_LINES.length - 1)), 1600)
    return () => clearInterval(t)
  }, [forging])

  const active = objectives.filter((o: any) => o.status === 'ACTIVE')
  const paused = objectives.filter((o: any) => o.status === 'PAUSED')
  const completed = objectives.filter((o: any) => o.status === 'COMPLETED')

  const handleForge = async () => {
    if (!goal.trim() || forging) return
    setError(''); setForging(true); setForgeLine(0); soundClick()
    const res = await createObjective(goal.trim(), context.trim())
    setForging(false)
    if (!res.ok) { setError(res.error || 'Failed.'); return }
    soundSkillUnlock()
    pushNotification({ type: 'SUCCESS', title: '[ OBJECTIVE FORGED ]', message: `${res.objective.icon} ${res.objective.title}\nDay 1 target: ${res.objective.currentTarget} ${res.objective.unit}. Quest issued.` })
    setGoal(''); setContext(''); setShowForm(false)
    onCreated?.()
  }

  const handleAnalyze = async (id: string) => {
    if (analyzing) return
    setAnalyzing(id); setVerdict(null); soundClick()
    const res = await analyzeObjective(id)
    setAnalyzing(null)
    if (res?.verdict) {
      setVerdict({ id, text: res.verdict, trend: res.trend })
      if (res.applied) { soundNotification(); pushNotification({ type: 'SYSTEM', title: '[ TARGET RECALIBRATED ]', message: `New daily target: ${res.recommendedTarget}` }) }
    } else {
      pushNotification({ type: 'WARNING', title: '[ ANALYSIS FAILED ]', message: res?.error || 'The System could not analyze. Try again.' })
    }
  }

  const showEmptyState = active.length === 0 && paused.length === 0 && completed.length === 0 && !showForm

  return (
    <div className="px-4 py-4 space-y-3">
      {/* ═══ FORGE FORM / EMPTY STATE ═══ */}
      {(showEmptyState || showForm) && (
        <div className="sl-window sl-window-glow sl-slide-in">
          <div className="sl-title-bar"><span>🎯 DECLARE YOUR OBJECTIVE</span></div>
          {forging ? (
            <div className="p-5 font-mono text-xs space-y-2">
              {FORGE_LINES.slice(0, forgeLine + 1).map((l, i) => (
                <p key={i} className={i === forgeLine ? 'sl-glow-blue sl-pulse' : 'sl-glow-blue opacity-60'}>{l}</p>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-xs text-[var(--system-text-dim)] leading-relaxed">
                Tell the System what you want to conquer. It will design a <span className="sl-glow-purple">progressive-overload program</span> — a daily quest that starts where you are and climbs as you grow stronger.
              </p>
              <div>
                <p className="sl-label mb-1.5">THE GOAL</p>
                <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} maxLength={300}
                  placeholder={'e.g. "Do 50 pushups in one set" · "Crack DSA for placements" · "Read 20 books this year"'}
                  className="w-full bg-transparent border border-[var(--system-border)] text-xs text-[var(--system-text)] p-2.5 outline-none focus:border-[var(--system-cyan)] resize-none" />
              </div>
              <div>
                <p className="sl-label mb-1.5">WHERE YOU ARE NOW <span className="sl-label-faint">(OPTIONAL, MAKES IT SMARTER)</span></p>
                <input value={context} onChange={e => setContext(e.target.value)} maxLength={300}
                  placeholder={'e.g. "I can do 12 pushups" · "Solved ~40 leetcode easies"'}
                  className="w-full bg-transparent border border-[var(--system-border)] text-xs text-[var(--system-text)] p-2.5 outline-none focus:border-[var(--system-cyan)]" />
              </div>
              {error && <p className="text-[10px] sl-glow-red sl-shake">{error}</p>}
              <button onClick={handleForge} disabled={!goal.trim()} className="sl-btn sl-btn-gold w-full py-2.5 text-[11px]">◆ FORGE PROGRAM ◆</button>
              {showForm && <button onClick={() => { setShowForm(false); setError('') }} className="sl-btn sl-btn-ghost w-full py-1.5 text-[10px]">CANCEL</button>}
            </div>
          )}
        </div>
      )}

      {/* ═══ ACTIVE OBJECTIVES ═══ */}
      {active.map((o: any, i: number) => {
        const today = new Date().toISOString().slice(0, 10)
        const todayDone = (o.history || []).some((h: any) => h.date === today && h.done)
        const progressPct = Math.min(100, (o.day / Math.max(o.plan.estimatedDays, 1)) * 100)
        const targetPct = Math.min(100, (o.currentTarget / Math.max(o.plan.maxTarget, 0.001)) * 100)
        const nextMilestones = (o.plan.milestones || []).filter((m: any) => m.day >= o.day).slice(0, 2)
        const recent = (o.history || []).slice(-7)
        return (
          <div key={o.id} className="sl-window sl-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="sl-title-bar">
              <span>{o.icon} {o.title.toUpperCase()}</span>
              <span className="ml-auto text-[10px] sl-glow-purple">{o.phase?.name || 'GRIND'} · DAY {o.day}</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-[var(--system-text-dim)] leading-relaxed mb-3">{o.plan.summary}</p>

              {/* today's prescription */}
              <div className={`border p-3 mb-3 ${todayDone ? 'border-[var(--system-green)]/40 bg-[rgba(61,220,151,0.05)]' : 'border-[var(--system-cyan)]/40 bg-[rgba(93,213,255,0.04)]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="sl-label">TODAY'S PRESCRIPTION</p>
                    <p className="font-display text-2xl mt-0.5 tabular-nums">
                      <span className={todayDone ? 'sl-glow-green' : 'sl-glow-blue'}>{o.currentTarget}</span>
                      <span className="text-xs text-[var(--system-text-dim)] ml-2">{o.unit} · {o.plan.metric.name}</span>
                    </p>
                  </div>
                  <span className={`sl-chip ${todayDone ? 'sl-glow-green' : 'sl-glow-gold sl-pulse'}`}>{todayDone ? '✓ CLEARED' : `+${o.xpReward} XP WAITING`}</span>
                </div>
                {!todayDone && <p className="text-[10px] text-[var(--system-text-dim)] mt-2">Complete it from the <span className="sl-glow-blue">QUESTS</span> tab — it's in today's list.</p>}
              </div>

              {/* progress bars */}
              <div className="mb-1 flex justify-between text-[10px]"><span className="sl-label">PROGRAM PROGRESS</span><span className="text-[var(--system-text-dim)] tabular-nums">DAY {o.day}/{o.plan.estimatedDays}</span></div>
              <div className="sl-bar mb-3" style={{ height: 5 }}><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${progressPct}%` }} /></div>
              <div className="mb-1 flex justify-between text-[10px]"><span className="sl-label">LOAD VS GOAL</span><span className="text-[var(--system-text-dim)] tabular-nums">{o.currentTarget} → {o.plan.maxTarget} {o.unit}</span></div>
              <div className="sl-bar mb-3" style={{ height: 5 }}><div className="sl-bar-fill sl-bar-fill-mp" style={{ width: `${targetPct}%` }} /></div>

              {/* last 7 days strip */}
              {recent.length > 0 && (
                <div className="flex gap-1 mb-3">
                  {recent.map((h: any, hi: number) => (
                    <div key={hi} title={`${h.date}: ${h.done ? `${h.target} done (${h.feedback || 'OK'})` : 'missed'}`}
                      className={`h-2 flex-1 ${h.done ? 'bg-[var(--system-green)]' : 'bg-[var(--system-red)]/40'}`}
                      style={{ boxShadow: h.done ? '0 0 6px rgba(61,220,151,0.5)' : 'none' }} />
                  ))}
                </div>
              )}

              {/* milestones */}
              {nextMilestones.length > 0 && (
                <div className="space-y-1 mb-3">
                  {nextMilestones.map((m: any, mi: number) => (
                    <p key={mi} className="text-[10px] text-[var(--system-text-dim)]"><span className="sl-glow-gold">DAY {m.day}:</span> {m.title}</p>
                  ))}
                </div>
              )}

              {/* verdict */}
              {verdict?.id === o.id && (
                <div className="border border-[var(--system-purple)]/40 bg-[rgba(183,148,244,0.05)] p-3 mb-3">
                  <p className="sl-label mb-1" style={{ color: 'var(--system-purple)' }}>SYSTEM ANALYSIS · {verdict.trend.replace('_', ' ')}</p>
                  <p className="text-[10px] text-[var(--system-text)] leading-relaxed">{verdict.text}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => handleAnalyze(o.id)} disabled={!!analyzing} className="sl-btn flex-1 text-[10px] min-h-[44px]">{analyzing === o.id ? '◆ ANALYZING…' : '◈ ANALYZE'}</button>
                <button onClick={() => { soundClick(); mutateObjective(o.id, 'pause') }} className="sl-btn sl-btn-ghost text-[12px] w-11 h-11 flex items-center justify-center shrink-0" aria-label="Pause">⏸</button>
                <button onClick={() => { if (confirm(`Abandon "${o.title}"? The program and history will be erased.`)) mutateObjective(o.id, 'delete') }} className="sl-btn sl-btn-red text-[12px] w-11 h-11 flex items-center justify-center shrink-0" aria-label="Abandon">✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {/* ═══ NEW OBJECTIVE BUTTON ═══ */}
      {!showForm && !showEmptyState && active.length < 5 && (
        <button onClick={() => { soundClick(); setShowForm(true) }} className="sl-btn w-full py-2.5 text-[11px]">＋ NEW OBJECTIVE</button>
      )}

      {/* ═══ PAUSED ═══ */}
      {paused.length > 0 && (
        <div className="sl-window sl-slide-in">
          <div className="sl-title-bar"><span>⏸ PAUSED</span></div>
          <div className="p-3 space-y-2">
            {paused.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between gap-2 border border-[var(--system-border)] p-2.5 opacity-70">
                <p className="text-xs">{o.icon} {o.title} <span className="sl-label-faint">DAY {o.day}</span></p>
                <button onClick={() => mutateObjective(o.id, 'resume')} className="sl-btn px-3 py-1 text-[10px]">RESUME</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CONQUERED ═══ */}
      {completed.length > 0 && (
        <div className="sl-window sl-slide-in">
          <div className="sl-title-bar"><span>🏆 CONQUERED</span><span className="ml-auto text-[10px] sl-glow-gold">{completed.length}</span></div>
          <div className="p-3 space-y-1.5">
            {completed.map((o: any) => (
              <p key={o.id} className="text-xs sl-glow-gold">{o.icon} {o.title} <span className="sl-label-faint">— {o.completedDays} DAYS OF WORK</span></p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
