'use client'

import { useSystem } from '@/lib/store'
import { JOB_CLASSES, JobClass, Skill } from '@/lib/system'
import { soundSkillUnlock } from '@/lib/sound'

export function SkillsPanel() {
  const player = useSystem(s => s.player)
  const skills = useSystem(s => s.skills)
  const unlockSkill = useSystem(s => s.unlockSkill)
  const selectJob = useSystem(s => s.selectJob)
  if (!player) return null
  const canChangeJob = player.level >= 10 && player.job === 'NONE'
  const categories: { key: Skill['category']; label: string; icon: string }[] = [
    { key: 'PASSIVE', label: 'PASSIVE SKILLS', icon: '⚡' },
    { key: 'ACTIVE', label: 'ACTIVE SKILLS', icon: '✦' },
    { key: 'SHADOW', label: 'SHADOW SKILLS', icon: '💀' },
  ]

  return (
    <div className="px-4 py-4 space-y-3">
      {canChangeJob && (
        <div className="sl-window sl-window-glow sl-glow-pulse sl-slide-in">
          <div className="sl-title-bar"><span>◆ JOB CHANGE AVAILABLE</span></div>
          <div className="p-4">
            <p className="text-xs sl-glow-gold mb-3 text-center">You have reached Level 10. Select your class.</p>
            <div className="space-y-2">
              {(Object.keys(JOB_CLASSES) as JobClass[]).filter(j => j !== 'NONE').map(job => {
                const jc = JOB_CLASSES[job]
                return (
                  <button key={job} onClick={() => { soundSkillUnlock(); selectJob(job) }} className="w-full text-left border border-[var(--system-border)] hover:border-[var(--system-purple)] p-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{jc.icon}</span>
                      <div className="flex-1"><p className="font-display text-sm sl-glow-purple">{jc.name}</p><p className="text-[10px] text-[var(--system-text-dim)]">{jc.description}</p><p className="text-[10px] text-[var(--system-gold)] mt-1">{jc.bonuses}</p></div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {categories.map((cat, catIdx) => {
        const catSkills = skills.filter(s => s.category === cat.key)
        if (catSkills.length === 0) return null
        return (
          <div key={cat.key} className="sl-window sl-slide-in" style={{ animationDelay: `${catIdx * 0.1}s` }}>
            <div className="sl-title-bar"><span>{cat.icon} {cat.label}</span><span className="ml-auto text-[10px] text-[var(--system-text-dim)]">{catSkills.filter(s => s.unlocked).length}/{catSkills.length}</span></div>
            <div className="p-3 space-y-2">
              {catSkills.map(skill => <SkillRow key={skill.id} skill={skill} playerLevel={player.level} onUnlock={() => { soundSkillUnlock(); unlockSkill(skill.id) }} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SkillRow({ skill, playerLevel, onUnlock }: { skill: Skill; playerLevel: number; onUnlock: () => void }) {
  const canUnlock = !skill.unlocked && playerLevel >= skill.unlockLevel
  return (
    <div className={`flex items-center gap-3 p-3 border ${skill.unlocked ? 'border-[var(--system-blue)]/40 bg-[var(--system-blue)]/5' : 'border-[var(--system-border)] opacity-60'}`}>
      <span className={`text-xl ${skill.unlocked ? 'sl-glow-blue' : ''}`}>{skill.unlocked ? '✦' : '🔒'}</span>
      <div className="flex-1">
        <div className="flex items-baseline justify-between"><p className={`text-xs ${skill.unlocked ? 'sl-glow-blue' : 'text-[var(--system-text-dim)]'}`}>{skill.name}</p><span className="text-[9px] sl-glow-purple px-1">[{skill.rank}]</span></div>
        <p className="text-[9px] text-[var(--system-text-dim)] mt-0.5">{skill.description}</p>
        {!skill.unlocked && <p className="text-[9px] text-[var(--system-text-dim)] mt-0.5">Unlocks at Level {skill.unlockLevel}</p>}
      </div>
      {canUnlock && skill.category === 'ACTIVE' && <button onClick={onUnlock} className="sl-btn px-2 py-1 text-[9px]">UNLOCK</button>}
    </div>
  )
}
