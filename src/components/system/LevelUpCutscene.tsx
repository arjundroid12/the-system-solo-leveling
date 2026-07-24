'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { soundLevelUp, soundShadowExtract, soundSystemBoot } from '@/lib/sound'

interface CutsceneData { level: number; isMilestone: boolean; statPointsGained: number; hpRestored: number; mpRestored: number }
interface Props { data: CutsceneData | null; onDismiss: () => void }

type Phase = 'flash' | 'energy' | 'text' | 'stats' | 'complete'

export function LevelUpCutscene({ data, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('flash')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!data) { setPhase('flash'); setDismissed(false); return }
    soundLevelUp()
    const phases: { phase: Phase; delay: number }[] = [
      { phase: 'flash', delay: 0 }, { phase: 'energy', delay: 400 },
      { phase: 'text', delay: 900 }, { phase: 'stats', delay: 1800 },
      { phase: 'complete', delay: 3200 },
    ]
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const p of phases) timers.push(setTimeout(() => { if (!dismissed) setPhase(p.phase) }, p.delay))
    if (data.isMilestone) timers.push(setTimeout(() => { if (!dismissed) soundShadowExtract() }, 1200))
    const dismissTimer = setTimeout(() => handleDismiss(), 5500)
    return () => { timers.forEach(t => clearTimeout(t)); clearTimeout(dismissTimer) }
  }, [data])

  const handleDismiss = () => {
    if (dismissed) return
    setDismissed(true); soundSystemBoot()
    setTimeout(() => onDismiss(), 300)
  }

  if (!data || dismissed) return null
  const isMilestone = data.isMilestone

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden cursor-pointer" onClick={handleDismiss} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: phase === 'flash' ? 0.5 : 0.85 }} transition={{ duration: 0.4 }} />
        {phase === 'flash' && <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(93, 213, 255, 0.8) 0%, transparent 70%)' }} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 2 }} transition={{ duration: 0.4, ease: 'easeOut' }} />}
        {phase !== 'flash' && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div key={i} className="absolute" style={{ width: '2px', height: '100vh', background: `linear-gradient(to bottom, transparent, ${isMilestone ? '#b794f4' : '#5dd5ff'}, transparent)`, left: `${(i / 12) * 100}%`, transformOrigin: 'center', rotate: `${(i - 6) * 5}deg` }} initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: [0, 0.8, 0.3], scaleY: [0, 1, 1] }} transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }} />
            ))}
          </div>
        )}
        {phase !== 'flash' && (
          <motion.div className="absolute" style={{ width: '600px', height: '600px', borderRadius: '50%', background: `radial-gradient(circle, ${isMilestone ? 'rgba(107, 45, 196, 0.4)' : 'rgba(30, 144, 255, 0.4)'} 0%, transparent 60%)` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.5] }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        )}
        {phase !== 'flash' && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => {
              const angle = (i / 40) * Math.PI * 2; const distance = 150 + Math.random() * 200; const x = Math.cos(angle) * distance; const y = Math.sin(angle) * distance
              return <motion.div key={i} className="absolute" style={{ width: '4px', height: '4px', borderRadius: '50%', background: isMilestone ? '#b794f4' : '#5dd5ff', boxShadow: `0 0 8px ${isMilestone ? '#b794f4' : '#5dd5ff'}`, left: '50%', top: '50%' }} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x, y, opacity: 0, scale: 0.3 }} transition={{ duration: 1.5, delay: 0.3 + Math.random() * 0.5, ease: 'easeOut' }} />
            })}
          </div>
        )}
        {isMilestone && phase === 'energy' && (
          <motion.div className="absolute" initial={{ opacity: 0, scale: 2, y: -50 }} animate={{ opacity: [0, 1, 0], scale: [2, 1, 0.8], y: [-50, 0, 20] }} transition={{ duration: 0.8 }}>
            <p className="font-display text-4xl sl-glow-shadow tracking-[0.3em]">ARISE</p>
          </motion.div>
        )}
        {phase === 'text' || phase === 'stats' || phase === 'complete' ? (
          <div className="relative z-10 text-center px-8">
            <motion.div initial={{ opacity: 0, scale: 0.3, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="mb-4">
              <p className="font-mono text-xs sl-glow-blue tracking-[0.4em] mb-2">◆ YOU HAVE LEVELED UP ◆</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: [0, 1.3, 0.9, 1.1, 1] }} transition={{ duration: 0.8, ease: 'easeOut' }} className="mb-6">
              <p className="font-display text-7xl md:text-8xl sl-glow-gold leading-none">{data.level}</p>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="font-display text-2xl md:text-3xl sl-glow-blue tracking-[0.3em] mb-8">LEVEL</motion.p>
            <AnimatePresence>
              {phase === 'stats' || phase === 'complete' ? (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
                  {data.statPointsGained > 0 && <StatLine label="STAT POINTS" value={`+${data.statPointsGained}`} color="var(--system-gold)" delay={0} />}
                  {data.hpRestored > 0 && <StatLine label="HP RESTORED" value={`+${data.hpRestored}`} color="var(--system-red)" delay={0.15} />}
                  {data.mpRestored > 0 && <StatLine label="MP RESTORED" value={`+${data.mpRestored}`} color="var(--system-cyan)" delay={0.3} />}
                </motion.div>
              ) : null}
            </AnimatePresence>
            {isMilestone && (phase === 'stats' || phase === 'complete') && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="font-display text-sm sl-glow-shadow tracking-widest mt-6">◆ MILESTONE BONUS: +{data.statPointsGained} STAT POINTS ◆</motion.p>}
            {phase === 'complete' && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="font-mono text-[10px] text-[var(--system-text-dim)] mt-8 sl-pulse">◆ TAP TO CONTINUE ◆</motion.p>}
          </div>
        ) : null}
        {phase !== 'flash' && <motion.div className="absolute border-2 rounded-full" style={{ borderColor: isMilestone ? 'rgba(183, 148, 244, 0.4)' : 'rgba(93, 213, 255, 0.4)', width: '400px', height: '400px' }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 3], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }} />}
      </motion.div>
    </AnimatePresence>
  )
}

function StatLine({ label, value, color, delay }: { label: string; value: string; color: string; delay: number }) {
  return <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="flex items-center justify-center gap-4"><span className="font-mono text-[10px] text-[var(--system-text-dim)] tracking-widest">{label}</span><span className="font-display text-lg" style={{ color, textShadow: `0 0 8px ${color}` }}>{value}</span></motion.div>
}
