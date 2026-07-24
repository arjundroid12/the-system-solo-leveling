'use client'

import { useSystem } from '@/lib/store'
import { ShadowRank } from '@/lib/system'
import { soundClick } from '@/lib/sound'

const RANK_COLORS: Record<ShadowRank, string> = { E: '#a3a3a3', D: '#5dd5ff', C: '#b794f4', B: '#ffd966', A: '#ff8c42', S: '#ff4d6d', MONARCH: '#6b2dc4' }

export function ShadowArmy() {
  const shadows = useSystem(s => s.shadows)
  const player = useSystem(s => s.player)
  const skills = useSystem(s => s.skills)
  const deployShadow = useSystem(s => s.deployShadow)
  const undeployShadow = useSystem(s => s.undeployShadow)
  const hasShadowSkill = skills.find(s => s.id === 'shadow_extract')?.unlocked

  if (!player) return null
  const totalAttack = shadows.reduce((sum, s) => sum + s.attack, 0)
  const totalDefense = shadows.reduce((sum, s) => sum + s.defense, 0)
  const deployedCount = shadows.filter(s => s.deployed).length

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>💀 SHADOW ARMY</span><span className="ml-auto text-[10px] sl-glow-shadow">{shadows.length} SOLDIERS</span></div>
        <div className="p-4">
          {shadows.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3 opacity-30">💀</p>
              <p className="text-xs text-[var(--system-text-dim)] mb-2">No shadows under your command.</p>
              {!hasShadowSkill ? <p className="text-[10px] text-[var(--system-text-dim)] leading-relaxed">Unlock <span className="sl-glow-purple">Shadow Extraction</span> at Level 10<br />by selecting the Necromancer class.</p> : <p className="text-[10px] text-[var(--system-text-dim)] leading-relaxed">Clear <span className="sl-glow-blue">Deep Work</span> or <span className="sl-glow-blue">Learning</span> gates<br />to extract shadows.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="font-display text-xl sl-glow-shadow">{shadows.length}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">TOTAL</p></div>
              <div><p className="font-display text-xl sl-glow-blue">{deployedCount}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">DEPLOYED</p></div>
              <div><p className="font-display text-xl sl-glow-red">{totalAttack}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">ATK</p></div>
            </div>
          )}
        </div>
      </div>

      {shadows.length > 0 && (
        <div className="sl-window sl-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="sl-title-bar"><span>◆ SHADOW ROSTER</span></div>
          <div className="p-3 space-y-2">
            {shadows.map((shadow, i) => (
              <div key={shadow.id} className="border border-[var(--system-border)] p-3 sl-shadow-rise" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center text-xl border" style={{ borderColor: RANK_COLORS[shadow.rank], boxShadow: `0 0 8px ${RANK_COLORS[shadow.rank]}` }}>💀</div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="font-display text-sm sl-glow-shadow">{shadow.name} {shadow.deployed && <span className="text-[9px] sl-glow-blue">[DEPLOYED]</span>}</p>
                      <span className="text-[10px] font-bold px-1.5" style={{ color: RANK_COLORS[shadow.rank], textShadow: `0 0 6px ${RANK_COLORS[shadow.rank]}` }}>{shadow.rank}</span>
                    </div>
                    <p className="text-[9px] text-[var(--system-text-dim)] mt-0.5">{shadow.originalName} · LV {shadow.level} · {shadow.ability}</p>
                    <div className="flex gap-3 mt-1 text-[9px]">
                      <span className="sl-glow-red">ATK {shadow.attack}</span>
                      <span className="sl-glow-blue">DEF {shadow.defense}</span>
                      <span className="text-[var(--system-text-dim)]">XP {shadow.xp}/{shadow.xpToNext}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { soundClick(); shadow.deployed ? undeployShadow(shadow.id) : deployShadow(shadow.id) }} className={`sl-btn flex-1 text-[9px] py-1.5 ${shadow.deployed ? 'sl-btn-red' : ''}`}>
                    {shadow.deployed ? 'UNDEPLOY' : '◆ DEPLOY'}
                  </button>
                </div>
                <p className="text-[8px] text-[var(--system-text-dim)] mt-1 text-center">Deployed shadows gain XP when you clear dungeons</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="sl-title-bar"><span>◆ SHADOW SKILLS</span></div>
        <div className="p-3 space-y-2">
          {skills.filter(s => s.category === 'SHADOW').map(skill => (
            <div key={skill.id} className={`flex items-center gap-3 p-2 border ${skill.unlocked ? 'border-[var(--system-shadow)]/40' : 'border-[var(--system-border)] opacity-40'}`}>
              <span className="text-lg">{skill.unlocked ? '💀' : '🔒'}</span>
              <div className="flex-1">
                <p className={`text-xs ${skill.unlocked ? 'sl-glow-shadow' : 'text-[var(--system-text-dim)]'}`}>{skill.name} <span className="text-[9px]">[{skill.rank}]</span></p>
                <p className="text-[9px] text-[var(--system-text-dim)]">{skill.description}</p>
                {!skill.unlocked && <p className="text-[9px] text-[var(--system-text-dim)] mt-0.5">Unlocks at Level {skill.unlockLevel}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
