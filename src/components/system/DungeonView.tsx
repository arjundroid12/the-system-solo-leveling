'use client'

import { useState, useEffect } from 'react'
import { useSystem } from '@/lib/store'
import { DUNGEON_TYPES, DungeonType } from '@/lib/system'
import { soundClick, soundGateOpen } from '@/lib/sound'

export function DungeonView() {
  const player = useSystem(s => s.player)
  const activeDungeon = useSystem(s => s.activeDungeon)
  const startDungeon = useSystem(s => s.startDungeon)
  const completeDungeon = useSystem(s => s.completeDungeon)
  const failDungeon = useSystem(s => s.failDungeon)
  const extractShadow = useSystem(s => s.extractShadow)
  const skills = useSystem(s => s.skills)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showShadowPrompt, setShowShadowPrompt] = useState(false)
  const hasShadowSkill = skills.find(s => s.id === 'shadow_extract')?.unlocked

  useEffect(() => {
    if (!activeDungeon || activeDungeon.status !== 'ACTIVE') return
    const endTime = new Date(activeDungeon.startedAt).getTime() + activeDungeon.duration * 60000
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now())
      setTimeLeft(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeDungeon])

  if (!player) return null

  if (activeDungeon && activeDungeon.status === 'ACTIVE') {
    const minutes = Math.floor(timeLeft / 60000)
    const seconds = Math.floor((timeLeft % 60000) / 1000)
    const totalSeconds = activeDungeon.duration * 60
    const elapsed = totalSeconds - Math.floor(timeLeft / 1000)
    const percent = (elapsed / totalSeconds) * 100
    return (
      <div className="px-4 py-4">
        <div className="sl-window sl-window-glow sl-glow-pulse sl-slide-in">
          <div className="sl-title-bar"><span>◆ GATE ACTIVE</span><span className="ml-auto sl-glow-red sl-pulse text-[10px]">IN PROGRESS</span></div>
          <div className="p-6 text-center">
            <p className="text-2xl mb-1">{DUNGEON_TYPES[activeDungeon.type].icon}</p>
            <h2 className="font-display text-xl sl-glow-blue mb-4">{activeDungeon.name}</h2>
            <div className="sl-numeral text-8xl mb-4 tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
            <div className="sl-bar mb-5" style={{ height: 6 }}><div className="sl-bar-fill sl-bar-fill-mp" style={{ width: `${percent}%` }} /></div>
            <div className="flex justify-center flex-wrap gap-1.5 mb-6">
              <span className="sl-chip sl-glow-gold">+{activeDungeon.xpReward} XP</span>
              <span className="sl-chip sl-glow-blue">+{activeDungeon.pointReward} PP</span>
              {activeDungeon.shadowEligible && hasShadowSkill && <span className="sl-chip sl-glow-purple sl-pulse">◆ EXTRACTION READY</span>}
            </div>
            <div className="space-y-2">
              <button onClick={() => { soundClick(); completeDungeon(activeDungeon.id); if (activeDungeon.shadowEligible && hasShadowSkill) setTimeout(() => setShowShadowPrompt(true), 500) }} className="sl-btn sl-btn-gold w-full" disabled={timeLeft > 0}>{timeLeft > 0 ? 'GATE LOCKED' : '◆ CLEAR GATE ◆'}</button>
              <button onClick={() => { if (confirm('Failing this dungeon will incur penalties.')) { soundClick(); failDungeon(activeDungeon.id) } }} className="sl-btn sl-btn-red w-full text-[10px]">ABANDON GATE</button>
            </div>
          </div>
        </div>
        {showShadowPrompt && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <div className="sl-window sl-window-glow sl-glow-pulse max-w-sm w-full sl-level-up">
              <div className="sl-title-bar"><span>◆ SHADOW EXTRACTION</span></div>
              <div className="p-6 text-center">
                <p className="text-3xl mb-4">💀</p>
                <p className="text-sm sl-glow-purple mb-6">Would you like to extract it?</p>
                <div className="space-y-2">
                  <button onClick={() => { extractShadow(activeDungeon.id, activeDungeon.name); setShowShadowPrompt(false) }} className="sl-btn w-full">◆ EXTRACT SHADOW ◆</button>
                  <button onClick={() => setShowShadowPrompt(false)} className="sl-btn sl-btn-red w-full text-[10px]">RELEASE</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>◆ GATE SELECTION</span></div>
        <div className="p-4"><p className="text-[10px] text-[var(--system-text-dim)] leading-relaxed">Gates are timed focus sessions. Clear them for XP and rewards.<br />Higher tier gates yield <span className="sl-glow-purple">shadow extraction</span> opportunities.</p></div>
      </div>
      {(Object.keys(DUNGEON_TYPES) as DungeonType[]).map((type, i) => {
        const d = DUNGEON_TYPES[type]
        const locked = player.level < d.minLevel
        const rewards = type === 'FOCUS_SPRINT' ? { xp: 80, points: 8, shadowEligible: false } : type === 'DEEP_WORK' ? { xp: 300, points: 30, shadowEligible: true } : type === 'LEARNING' ? { xp: 180, points: 18, shadowEligible: true } : { xp: 150, points: 15, shadowEligible: true }
        return (
          <div key={type} className={`sl-window sl-slide-in ${locked ? 'opacity-40' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="sl-title-bar"><span>{d.icon} {d.name.toUpperCase()}</span>{locked && <span className="ml-auto text-[10px] sl-glow-red">LOCKED</span>}</div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3"><span className="text-3xl">{d.icon}</span><div className="flex-1"><p className="text-xs text-[var(--system-text-dim)] mb-1">{d.description}</p><p className="text-[10px] text-[var(--system-text-dim)]">Duration: {d.duration} min{locked && ` · Requires Level ${d.minLevel}`}</p></div></div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="sl-chip sl-glow-gold">+{rewards.xp} XP</span>
                <span className="sl-chip sl-glow-blue">+{rewards.points} PP</span>
                {rewards.shadowEligible && <span className="sl-chip sl-glow-shadow">◆ SHADOW</span>}
              </div>
              <button onClick={() => { soundGateOpen(); startDungeon(type) }} disabled={locked} className="sl-btn w-full text-[11px] py-2.5">{locked ? 'LEVEL LOCKED' : '◆ ENTER GATE ◆'}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
