'use client'

// Reward juice: floating +XP bursts on quest completion, and live
// combo / XP-booster chips for the headers.

import { useEffect, useRef, useState } from 'react'
import { useSystem } from '@/lib/store'
import { getComboMultiplier } from '@/lib/system'

const COMBO_WINDOW = 5 * 60 * 1000

// ═══ Floating +XP burst ═══
export function FloatingXP() {
  const lastReward = useSystem(s => s.lastReward)
  const [bursts, setBursts] = useState<{ id: number; xp: number; pp: number }[]>([])
  const seen = useRef(0)

  useEffect(() => {
    if (!lastReward || lastReward.ts === seen.current) return
    seen.current = lastReward.ts
    const id = lastReward.ts
    setBursts(b => [...b, { id, xp: lastReward.xp, pp: lastReward.pp }])
    const t = setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1600)
    return () => clearTimeout(t)
  }, [lastReward])

  if (bursts.length === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-1/3 z-[80] pointer-events-none flex justify-center">
      {bursts.map(b => (
        <div key={b.id} className="sl-float-up absolute text-center">
          <p className="font-display text-3xl sl-glow-gold">+{b.xp} XP</p>
          {b.pp > 0 && <p className="font-display text-sm sl-glow-blue mt-1">+{b.pp} PP</p>}
        </div>
      ))}
    </div>
  )
}

// ═══ Live buff chips (combo countdown + XP booster) ═══
export function BuffChips() {
  const combo = useSystem(s => s.combo)
  const comboTimer = useSystem(s => s.comboTimer)
  const xpBoostUntil = useSystem(s => s.xpBoostUntil)
  const xpBoostMultiplier = useSystem(s => s.xpBoostMultiplier)
  const [, tick] = useState(0)

  const comboLeft = comboTimer ? COMBO_WINDOW - (Date.now() - comboTimer) : 0
  const boostLeft = xpBoostUntil ? xpBoostUntil - Date.now() : 0
  const comboActive = combo >= 2 && comboLeft > 0
  const boostActive = boostLeft > 0 && xpBoostMultiplier > 1

  useEffect(() => {
    if (!comboActive && !boostActive) return
    const t = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [comboActive, boostActive])

  if (!comboActive && !boostActive) return null
  const comboInfo = getComboMultiplier(combo)

  return (
    <>
      {comboActive && (
        <span className="sl-chip sl-glow-gold sl-pulse" title={`Complete the next quest within ${fmt(comboLeft)} to keep the combo`}>
          ⚡ ×{combo} COMBO{comboInfo.multiplier > 1 ? ` +${Math.round((comboInfo.multiplier - 1) * 100)}%` : ''} · {fmt(comboLeft)}
        </span>
      )}
      {boostActive && (
        <span className="sl-chip sl-glow-purple" title="XP booster active">
          ▲ +{Math.round((xpBoostMultiplier - 1) * 100)}% XP · {fmt(boostLeft)}
        </span>
      )}
    </>
  )
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`
}
