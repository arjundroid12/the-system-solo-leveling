'use client'

import { useState } from 'react'
import { useSystem } from '@/lib/store'
import { CATEGORY_ICONS, DIFFICULTY_COLORS, Quest, getStreakMultiplier } from '@/lib/system'
import { soundClick } from '@/lib/sound'
import { generateAIQuestsNow, isLoggedIn } from '@/lib/cloudSync'

export function QuestPanel() {
  const quests = useSystem(s => s.quests)
  const player = useSystem(s => s.player)
  const completeQuest = useSystem(s => s.completeQuest)
  const updateQuestProgress = useSystem(s => s.updateQuestProgress)
  const rerollQuests = useSystem(s => s.rerollQuests)
  const skills = useSystem(s => s.skills)
  const [regenerating, setRegenerating] = useState(false)
  const hasStealth = skills.find(s => s.id === 'stealth')?.unlocked
  const cloudEnabled = isLoggedIn()
  const pending = quests.filter(q => q.status === 'PENDING')
  const completed = quests.filter(q => q.status === 'COMPLETE')
  const allDone = pending.length === 0 && completed.length > 0

  const handleRegenerate = async () => {
    if (regenerating) return
    setRegenerating(true); soundClick()
    if (cloudEnabled) await generateAIQuestsNow()
    else rerollQuests()
    setRegenerating(false)
  }

  // Objective quests (id: obj-<objectiveId>-<date>) ask for a difficulty
  // assessment after completion — that's what drives progressive overload.
  const handleComplete = (quest: Quest) => {
    completeQuest(quest.id)
    if (quest.id.startsWith('obj-')) {
      const objectiveId = quest.id.slice(4).split('-')[0]
      useSystem.getState().setPendingObjectiveFeedback({ objectiveId, title: quest.title })
    }
  }

  const dayPercent = quests.length > 0 ? (completed.length / quests.length) * 100 : 0

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>◆ DAILY QUESTS</span><span className="ml-auto text-[10px] sl-glow-blue tabular-nums">{completed.length}/{quests.length} CLEAR</span></div>
        <div className="p-4">
          <div className="sl-bar mb-3" style={{ height: 6 }}><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${dayPercent}%` }} /></div>
          <p className="text-xs text-[var(--system-text-dim)] leading-relaxed">
            {cloudEnabled ? <>Quests are <span className="sl-glow-purple">AI-generated</span> and scale with your level.</> : <>Complete all quests to avoid <span className="sl-glow-red">PENALTY ZONE</span>.</>}
            {player && player.streak >= 3 && <><br /><span className="sl-glow-gold">🔥 {player.streak}-day streak — +{Math.round((getStreakMultiplier(player.streak) - 1) * 100)}% XP active.</span></>}
          </p>
          {allDone && <p className="text-[11px] sl-glow-gold mt-2 sl-pulse">◆ ALL DAILY QUESTS COMPLETE — BONUS AWARDED ◆</p>}
          <button onClick={handleRegenerate} disabled={regenerating} className="sl-btn sl-btn-ghost w-full mt-3 text-[10px] py-2">{regenerating ? '◆ ANALYZING…' : '⟳ REGENERATE QUESTS'}</button>
        </div>
      </div>
      {pending.map((quest, i) => <QuestCard key={quest.id} quest={quest} onComplete={() => handleComplete(quest)} onProgress={p => updateQuestProgress(quest.id, p)} hasStealth={!!hasStealth} onSkip={() => useSystem.getState().skipQuest(quest.id)} delay={i * 0.05} />)}
      {completed.length > 0 && (
        <div className="sl-window sl-slide-in">
          <div className="sl-title-bar"><span>◆ COMPLETED</span></div>
          <div className="p-3 space-y-2">{completed.map(q => <div key={q.id} className="flex items-center gap-3 opacity-50"><span className="text-[var(--system-gold)]">✓</span><span className="text-xs line-through">{q.title}</span></div>)}</div>
        </div>
      )}
    </div>
  )
}

function QuestCard({ quest, onComplete, onProgress, hasStealth, onSkip, delay }: { quest: Quest; onComplete: () => void; onProgress: (p: number) => void; hasStealth: boolean; onSkip: () => void; delay: number }) {
  const [incrementValue, setIncrementValue] = useState(1)
  const [showInput, setShowInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const percent = (quest.progress / quest.target) * 100
  const isComplete = quest.progress >= quest.target
  const diffColor = DIFFICULTY_COLORS[quest.difficulty as keyof typeof DIFFICULTY_COLORS] || '#5dd5ff'

  const handleIncrement = () => { soundClick(); onProgress(Math.min(quest.target, quest.progress + incrementValue)) }
  const handleCustomSubmit = () => { const val = parseInt(customValue) || 0; soundClick(); onProgress(Math.min(quest.target, Math.max(0, val))); setShowInput(false); setCustomValue('') }

  return (
    <div className="sl-window sl-slide-in" style={{ animationDelay: `${delay}s` }}>
      <div className="sl-title-bar"><span>{CATEGORY_ICONS[quest.category as keyof typeof CATEGORY_ICONS]} {quest.title.toUpperCase()}</span><span className="ml-auto text-[10px] px-2" style={{ color: diffColor, textShadow: `0 0 6px ${diffColor}` }}>{quest.difficulty}</span></div>
      <div className="p-4">
        <p className="text-[13px] text-[var(--system-text-dim)] mb-3 leading-relaxed">{quest.description}</p>
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1"><span className="text-[var(--system-text-dim)]">PROGRESS</span><span className="sl-glow-blue">{quest.progress} / {quest.target}</span></div>
          <div className="sl-bar"><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="sl-chip sl-glow-gold">+{quest.xpReward} XP</span>
          <span className="sl-chip sl-glow-blue">+{quest.pointReward} PP</span>
          {Object.entries(quest.statReward).map(([stat, val]) => <span key={stat} className="sl-chip sl-glow-purple">+{val} {stat}</span>)}
        </div>
        {!isComplete ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={handleIncrement} className="sl-btn flex-1 text-[12px] py-3">+{incrementValue}</button>
              <select value={incrementValue} onChange={e => setIncrementValue(parseInt(e.target.value))} className="bg-transparent border border-[var(--system-border)] text-[var(--system-cyan)] text-[12px] px-3 min-h-[44px] outline-none">
                <option value={1} className="bg-[var(--system-dark)]">+1</option><option value={5} className="bg-[var(--system-dark)]">+5</option><option value={10} className="bg-[var(--system-dark)]">+10</option><option value={25} className="bg-[var(--system-dark)]">+25</option>
              </select>
              <button onClick={() => setShowInput(!showInput)} className="sl-btn px-4 py-3 text-[12px]">⋯</button>
            </div>
            {showInput && <div className="flex gap-2"><input type="number" value={customValue} onChange={e => setCustomValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()} placeholder="Set exact" className="flex-1 bg-transparent border border-[var(--system-border)] text-[var(--system-cyan)] text-xs px-3 min-h-[44px] outline-none" /><button onClick={handleCustomSubmit} className="sl-btn px-4 text-[10px] min-h-[44px]">SET</button></div>}
            {hasStealth && <button onClick={onSkip} className="sl-btn sl-btn-red w-full text-[10px] min-h-[40px]">STEALTH SKIP</button>}
          </div>
        ) : <button onClick={onComplete} className="sl-btn sl-btn-gold w-full text-[11px] py-2.5 sl-glow-pulse">◆ COMPLETE QUEST ◆</button>}
      </div>
    </div>
  )
}
