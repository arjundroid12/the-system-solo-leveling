'use client'

import { useSystem } from '@/lib/store'
import { STAT_INFO, StatKey, JOB_CLASSES, ACHIEVEMENTS } from '@/lib/system'
import { soundStatUp } from '@/lib/sound'

export function StatusWindow() {
  const player = useSystem(s => s.player)
  const allocateStat = useSystem(s => s.allocateStat)
  if (!player) return null

  const xpPercent = (player.xp / player.xpToNext) * 100
  const hpPercent = (player.hp / player.hpMax) * 100
  const mpPercent = (player.mp / player.mpMax) * 100
  const fatiguePercent = (player.fatigue / player.fatigueMax) * 100
  const unlockedAchievements = ACHIEVEMENTS.filter(a => (player.achievements || []).includes(a.id))

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>◆ PLAYER INFO</span></div>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl sl-glow-blue leading-tight">{player.name}</h1>
              <p className="text-[10px] text-[var(--system-text-dim)] mt-1 tracking-widest">
                LEVEL {player.level} {player.job !== 'NONE' && `· ${JOB_CLASSES[player.job].icon} ${JOB_CLASSES[player.job].name.toUpperCase()}`}
              </p>
              <p className="text-[10px] sl-glow-purple mt-1">"{player.title}"</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--system-text-dim)]">PP</p>
              <p className="font-display text-lg sl-glow-gold">{player.playerPoints}</p>
            </div>
          </div>
          <StatBar label="HP" current={player.hp} max={player.hpMax} percent={hpPercent} variant="hp" />
          <StatBar label="MP" current={player.mp} max={player.mpMax} percent={mpPercent} variant="mp" />
          <StatBar label="XP" current={player.xp} max={player.xpToNext} percent={xpPercent} variant="xp" />
          <StatBar label="FTG" current={player.fatigue} max={player.fatigueMax} percent={fatiguePercent} variant="fatigue" />
        </div>
      </div>

      {/* Streak Display (v3 new) */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.05s' }}>
        <div className="sl-title-bar"><span>🔥 STREAK</span></div>
        <div className="p-4 flex items-center justify-around">
          <div className="text-center">
            <p className="font-display text-2xl sl-glow-gold">{player.streak}</p>
            <p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">CURRENT</p>
          </div>
          <div className="w-px h-10 bg-[var(--system-border)]" />
          <div className="text-center">
            <p className="font-display text-2xl sl-glow-blue">{player.bestStreak}</p>
            <p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">BEST</p>
          </div>
          <div className="w-px h-10 bg-[var(--system-border)]" />
          <div className="text-center">
            <p className="font-display text-sm sl-glow-purple">
              {player.streak >= 30 ? 'x1.5' : player.streak >= 14 ? 'x1.3' : player.streak >= 7 ? 'x1.2' : player.streak >= 3 ? 'x1.1' : 'x1.0'}
            </p>
            <p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">XP MULT</p>
          </div>
        </div>
      </div>

      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.1s' }}>
        <div className="sl-title-bar">
          <span>◆ STATS</span>
          {player.statPoints > 0 && <span className="ml-auto sl-glow-gold sl-pulse text-[10px]">{player.statPoints} PTS</span>}
        </div>
        <div className="p-4 space-y-3">
          {(Object.keys(STAT_INFO) as StatKey[]).map(stat => (
            <div key={stat} className="flex items-center gap-3">
              <div className="w-12"><span className="text-xs font-bold" style={{ color: STAT_INFO[stat].color }}>{stat}</span></div>
              <div className="flex-1 text-xs text-[var(--system-text-dim)]">{STAT_INFO[stat].name}</div>
              <div className="w-10 text-right font-display text-lg sl-glow-blue">{player.stats[stat]}</div>
              <button onClick={() => { if (player.statPoints > 0) { soundStatUp(); allocateStat(stat) } }} disabled={player.statPoints === 0} className="w-7 h-7 border border-[var(--system-border)] text-[var(--system-cyan)] hover:border-[var(--system-cyan)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm">+</button>
            </div>
          ))}
        </div>
      </div>

      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.2s' }}>
        <div className="sl-title-bar"><span>◆ RECORD</span></div>
        <div className="p-4 grid grid-cols-3 gap-3 text-center">
          <div><p className="font-display text-2xl sl-glow-gold">{player.totalQuestsCompleted}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">QUESTS</p></div>
          <div><p className="font-display text-2xl sl-glow-gold">{player.totalDungeonsCleared}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">DUNGEONS</p></div>
          <div><p className="font-display text-2xl sl-glow-gold">{player.totalShadowsExtracted}</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">SHADOWS</p></div>
        </div>
      </div>

      {/* Achievements (v3 new) */}
      {unlockedAchievements.length > 0 && (
        <div className="sl-window sl-slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="sl-title-bar"><span>◆ ACHIEVEMENTS</span><span className="ml-auto text-[10px] sl-glow-gold">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span></div>
          <div className="p-3 grid grid-cols-4 gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = player.achievements.includes(ach.id)
              return (
                <div key={ach.id} className={`text-center p-2 border ${unlocked ? 'border-[var(--system-gold)]/40' : 'border-[var(--system-border)] opacity-30'}`} title={`${ach.name}: ${ach.description}`}>
                  <p className="text-lg" style={{ color: unlocked ? 'var(--system-gold)' : 'var(--system-text-dim)', textShadow: unlocked ? '0 0 6px var(--system-gold)' : 'none' }}>{ach.icon}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.35s' }}>
        <div className="sl-title-bar"><span>◆ JOB</span></div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{JOB_CLASSES[player.job].icon}</span>
            <div>
              <p className="font-display text-base sl-glow-purple">{JOB_CLASSES[player.job].name}</p>
              <p className="text-[10px] text-[var(--system-text-dim)]">{JOB_CLASSES[player.job].description}</p>
            </div>
          </div>
          {JOB_CLASSES[player.job].bonuses && <p className="text-[10px] text-[var(--system-gold)] mt-2">{JOB_CLASSES[player.job].bonuses}</p>}
        </div>
      </div>
    </div>
  )
}

function StatBar({ label, current, max, percent, variant }: { label: string; current: number; max: number; percent: number; variant: 'hp' | 'mp' | 'xp' | 'fatigue' }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-[var(--system-text-dim)] tracking-widest">{label}</span>
        <span className="sl-glow-blue">{Math.floor(current)} / {max}</span>
      </div>
      <div className="sl-bar"><div className={`sl-bar-fill sl-bar-fill-${variant}`} style={{ width: `${percent}%` }} /></div>
    </div>
  )
}
