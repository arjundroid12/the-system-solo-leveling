'use client'

import { useSystem } from '@/lib/store'
import { SKILL_TREE, ActiveSkill, JOB_CLASSES, getHunterRank, HUNTER_RANKS } from '@/lib/system'
import { soundClick, soundSkillUnlock } from '@/lib/sound'

export function SkillTreeView() {
  const player = useSystem(s => s.player)
  const skills = useSystem(s => s.skills)
  if (!player) return null

  const myRank = getHunterRank(player.level)

  // Get active combat skills (separate from passive skills shown in SkillsPanel)
  const activeSkills = SKILL_TREE

  const canUnlock = (skill: ActiveSkill) => {
    if (skill.unlocked) return false
    if (player.level < skill.unlockLevel) return false
    if (!skill.jobReq.includes(player.job)) return false
    for (const [stat, req] of Object.entries(skill.statReq)) {
      if (player.stats[stat as keyof typeof player.stats] < (req as number)) return false
    }
    return true
  }

  const getLockReason = (skill: ActiveSkill): string => {
    if (skill.unlocked) return ''
    if (player.level < skill.unlockLevel) return `Requires Level ${skill.unlockLevel}`
    if (!skill.jobReq.includes(player.job)) return `Requires: ${skill.jobReq.filter(j => j !== 'NONE').join(' or ')}`
    for (const [stat, req] of Object.entries(skill.statReq)) {
      if (player.stats[stat as keyof typeof player.stats] < (req as number)) {
        return `Requires ${stat} ${req} (you have ${player.stats[stat as keyof typeof player.stats]})`
      }
    }
    return ''
  }

  // Group by job
  const universal = activeSkills.filter(s => s.jobReq.includes('NONE'))
  const fighter = activeSkills.filter(s => s.jobReq.includes('FIGHTER') && !s.jobReq.includes('NONE'))
  const assassin = activeSkills.filter(s => s.jobReq.includes('ASSASSIN') && !s.jobReq.includes('NONE'))
  const mage = activeSkills.filter(s => s.jobReq.includes('MAGE') && !s.jobReq.includes('NONE'))
  const necro = activeSkills.filter(s => s.jobReq.includes('NECROMANCER') && !s.jobReq.includes('NONE'))
  const tank = activeSkills.filter(s => s.jobReq.includes('TANK') && !s.jobReq.includes('NONE'))

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>🌳 SKILL TREE</span></div>
        <div className="p-4 text-center">
          <p className="text-xs text-[var(--system-text-dim)] leading-relaxed">
            Active combat skills for Boss Raids and PvP battles.<br />
            Unlock with level + stat requirements. Class-specific skills require that job.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="border border-[var(--system-border)] p-2">
              <p className="text-[10px] text-[var(--system-text-dim)]">UNLOCKED</p>
              <p className="sl-glow-blue">{activeSkills.filter(s => s.unlocked).length}/{activeSkills.length}</p>
            </div>
            <div className="border border-[var(--system-border)] p-2">
              <p className="text-[10px] text-[var(--system-text-dim)]">YOUR CLASS</p>
              <p className="sl-glow-purple">{JOB_CLASSES[player.job].icon} {JOB_CLASSES[player.job].name}</p>
            </div>
          </div>
        </div>
      </div>

      <SkillGroup title="UNIVERSAL SKILLS" icon="◈" skills={universal} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />
      {fighter.length > 0 && player.job === 'FIGHTER' && <SkillGroup title="FIGHTER SKILLS" icon="⚔️" skills={fighter} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />}
      {assassin.length > 0 && player.job === 'ASSASSIN' && <SkillGroup title="ASSASSIN SKILLS" icon="🗡️" skills={assassin} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />}
      {mage.length > 0 && player.job === 'MAGE' && <SkillGroup title="MAGE SKILLS" icon="🔮" skills={mage} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />}
      {necro.length > 0 && player.job === 'NECROMANCER' && <SkillGroup title="NECROMANCER SKILLS" icon="💀" skills={necro} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />}
      {tank.length > 0 && player.job === 'TANK' && <SkillGroup title="TANK SKILLS" icon="🛡️" skills={tank} player={player} canUnlock={canUnlock} getLockReason={getLockReason} />}

      {/* Show locked class skills if not that class */}
      {player.job !== 'FIGHTER' && player.job !== 'NONE' && (
        <div className="sl-window sl-slide-in opacity-40">
          <div className="sl-title-bar"><span>⚔️ FIGHTER SKILLS (LOCKED CLASS)</span></div>
          <div className="p-3">
            <p className="text-[10px] text-[var(--system-text-dim)] text-center">Select Fighter class to unlock these skills.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SkillGroup({ title, icon, skills, player, canUnlock, getLockReason }: {
  title: string; icon: string; skills: ActiveSkill[]; player: any;
  canUnlock: (s: ActiveSkill) => boolean; getLockReason: (s: ActiveSkill) => string
}) {
  return (
    <div className="sl-window sl-slide-in">
      <div className="sl-title-bar"><span>{icon} {title}</span><span className="ml-auto text-[10px] text-[var(--system-text-dim)]">{skills.filter(s => s.unlocked).length}/{skills.length}</span></div>
      <div className="p-3 space-y-2">
        {skills.map(skill => {
          const unlockable = canUnlock(skill)
          const reason = getLockReason(skill)
          return (
            <div key={skill.id} className={`border p-3 ${skill.unlocked ? 'border-[var(--system-blue)]/40 bg-[var(--system-blue)]/5' : unlockable ? 'border-[var(--system-gold)]/40 sl-glow-pulse' : 'border-[var(--system-border)] opacity-60'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{skill.unlocked ? skill.icon : '🔒'}</span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className={`text-xs ${skill.unlocked ? 'sl-glow-blue' : 'text-[var(--system-text-dim)]'}`}>{skill.name}</p>
                    <span className="text-[10px] px-1 sl-glow-purple">[{skill.effect}]</span>
                  </div>
                  <p className="text-[10px] text-[var(--system-text-dim)] mt-0.5">{skill.description}</p>
                  <div className="flex gap-3 mt-1 text-[10px]">
                    <span className="sl-glow-blue">MP {skill.mpCost}</span>
                    {skill.damage > 0 && <span className="sl-glow-red">DMG x{skill.damage}</span>}
                    <span className="text-[var(--system-text-dim)]">CD {skill.cooldown}t</span>
                  </div>
                  {!skill.unlocked && reason && <p className="text-[10px] sl-glow-red mt-1">{reason}</p>}
                </div>
                {unlockable && (
                  <button onClick={() => { soundSkillUnlock(); }} className="sl-btn sl-btn-gold px-2 py-1 text-[10px]">UNLOCK</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
