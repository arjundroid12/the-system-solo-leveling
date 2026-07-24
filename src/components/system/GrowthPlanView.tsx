'use client'

import { useState, useEffect } from 'react'
import { useSystem } from '@/lib/store'
import { getAuth } from '@/lib/auth'
import { soundClick, soundSkillUnlock } from '@/lib/sound'

export function GrowthPlanView({ onPathSelected }: { onPathSelected?: () => void }) {
  const player = useSystem(s => s.player)
  const [paths, setPaths] = useState<any[]>([])
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchPlan = async () => {
      const auth = getAuth()
      if (!auth) return
      try {
        const res = await fetch('/api/growth-plan', { headers: { Authorization: `Bearer ${auth.token}` } })
        const data = await res.json()
        setPaths(data.availablePaths || [])
        setCurrentPlan(data.currentPlan)
      } catch {}
      setLoading(false)
    }
    fetchPlan()
  }, [])

  const selectPath = async (pathId: string) => {
    const auth = getAuth()
    if (!auth) return
    setSaving(true)
    soundSkillUnlock()
    try {
      const res = await fetch('/api/growth-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ action: 'create', pathId }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentPlan(data.plan)
        setSelecting(false)
        // Call onPathSelected to dismiss onboarding
        if (onPathSelected) onPathSelected()
      }
    } catch (e) {
      console.error('Failed to save path:', e)
    }
    setSaving(false)
  }

  if (loading) return <div className="px-4 py-8 text-center"><p className="text-xs sl-glow-blue sl-pulse">◆ LOADING GROWTH PLAN...</p></div>
  if (!player) return null

  // No plan — show path selection
  if (!currentPlan || selecting) {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="sl-window sl-window-glow sl-slide-in">
          <div className="sl-title-bar"><span>🚀 CHOOSE YOUR GROWTH PATH</span></div>
          <div className="p-4 text-center">
            <p className="text-[10px] text-[var(--system-text-dim)] leading-relaxed">
              Select a 90-day growth path. The System will generate a structured roadmap with milestones, daily quests, and AI coaching.<br />
              You can also set personal goals alongside your path.
            </p>
          </div>
        </div>

        {paths.map((path, i) => (
          <div key={path.id} className="sl-window sl-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="sl-title-bar">
              <span>{path.icon} {path.name.toUpperCase()}</span>
              <span className="ml-auto text-[10px] sl-glow-purple">{path.difficulty}</span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{path.icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--system-text-dim)] mb-2">{path.description}</p>
                  <p className="text-[9px] text-[var(--system-text-dim)]">Duration: {path.durationDays} days · {path.milestones.length} milestones</p>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {path.milestones.map((m: any, mi: number) => (
                  <div key={mi} className="flex items-center gap-2 text-[10px] text-[var(--system-text-dim)]">
                    <span className="sl-glow-gold">Day {m.targetDay}:</span>
                    <span>{m.title}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => selectPath(path.id)} className="sl-btn sl-btn-gold w-full text-[11px] py-2.5">
                ◆ START THIS PATH
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Has plan — show roadmap
  const dayPercent = (currentPlan.currentDay / currentPlan.totalDays) * 100
  return (
    <div className="px-4 py-4 space-y-3">
      {/* Plan header */}
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>{currentPlan.pathIcon} {currentPlan.pathName.toUpperCase()}</span><span className="ml-auto text-[10px] sl-glow-gold">SEASON {currentPlan.season}</span></div>
        <div className="p-4 text-center">
          <p className="font-display text-2xl sl-glow-blue">{currentPlan.pathIcon} {currentPlan.pathName}</p>
          <p className="text-[10px] text-[var(--system-text-dim)] mt-1">Day {currentPlan.currentDay} of {currentPlan.totalDays}</p>
          <div className="sl-bar mt-3 h-3"><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${dayPercent}%` }} /></div>
        </div>
      </div>

      {/* Milestones */}
      <div className="sl-window sl-slide-in">
        <div className="sl-title-bar"><span>◆ MILESTONES</span></div>
        <div className="p-3 space-y-3">
          {currentPlan.milestones.map((m: any, i: number) => (
            <div key={i} className={`border p-3 ${m.completed ? 'border-[var(--system-gold)]/40 bg-[var(--system-gold)]/5' : 'border-[var(--system-border)]'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{m.completed ? '✓' : '🔒'}</span>
                <div className="flex-1">
                  <p className={`text-xs ${m.completed ? 'sl-glow-gold' : ''}`}>{m.title}</p>
                  <p className="text-[9px] text-[var(--system-text-dim)] mt-0.5">{m.description}</p>
                  <div className="flex gap-3 mt-1 text-[9px]">
                    <span className="sl-glow-gold">Day {m.targetDay}</span>
                    <span className="sl-glow-blue">+{m.xpReward} XP</span>
                    <span className="sl-glow-purple">+{m.ppReward} PP</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="sl-window sl-slide-in">
        <div className="sl-title-bar"><span>🎯 PERSONAL GOALS</span></div>
        <div className="p-3">
          {currentPlan.goals && currentPlan.goals.length > 0 ? (
            <div className="space-y-2">
              {currentPlan.goals.map((g: any, i: number) => (
                <div key={i} className="border border-[var(--system-border)] p-2">
                  <p className="text-xs sl-glow-blue">{g.title}</p>
                  <p className="text-[9px] text-[var(--system-text-dim)]">{g.description}</p>
                  <div className="sl-bar mt-1 h-1"><div className="sl-bar-fill sl-bar-fill-mp" style={{ width: `${g.progress}%` }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--system-text-dim)] text-center py-2">No personal goals set. Ask the AI coach to set one!</p>
          )}
        </div>
      </div>

      {/* Change path */}
      <button onClick={() => setSelecting(true)} className="sl-btn w-full text-[10px] py-2">
        🔄 CHANGE PATH
      </button>

      {/* AI hint */}
      <div className="sl-window sl-slide-in">
        <div className="p-3 text-center">
          <p className="text-[10px] text-[var(--system-text-dim)] leading-relaxed">
            💡 Tap the <span className="sl-glow-blue">◆ AI</span> button at the bottom to chat with your growth coach. It can create quests, adjust your plan, and analyze your progress.
          </p>
        </div>
      </div>
    </div>
  )
}
