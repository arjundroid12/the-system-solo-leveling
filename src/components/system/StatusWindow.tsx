'use client'

import { useSystem } from '@/lib/store'
import { STAT_INFO, StatKey, JOB_CLASSES, ACHIEVEMENTS, HUNTER_RANKS, getHunterRank, getStreakMultiplier } from '@/lib/system'
import { soundStatUp } from '@/lib/sound'
import { logout } from '@/lib/auth-helpers'

export function StatusWindow() {
  const player = useSystem(s => s.player)
  const allocateStat = useSystem(s => s.allocateStat)
  if (!player) return null

  const xpPercent = Math.min(100, (player.xp / player.xpToNext) * 100)
  const hpPercent = Math.min(100, (player.hp / player.hpMax) * 100)
  const mpPercent = Math.min(100, (player.mp / player.mpMax) * 100)
  const fatiguePercent = Math.min(100, (player.fatigue / player.fatigueMax) * 100)
  const fatigueHigh = player.fatigue >= player.fatigueMax * 0.8
  const unlockedAchievements = ACHIEVEMENTS.filter(a => (player.achievements || []).includes(a.id))
  const rank = getHunterRank(player.level)
  const rankInfo = HUNTER_RANKS[rank]
  const streakMult = getStreakMultiplier(player.streak || 0)

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ═══ HERO ═══ */}
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>◈ PLAYER INFO</span><span className="ml-auto sl-label" style={{ color: rankInfo.color }}>{rankInfo.icon} {rankInfo.name.toUpperCase()}</span></div>
        <div className="p-5">
          <div className="flex items-start gap-4 mb-5">
            {/* level block */}
            <div className="shrink-0 text-center">
              <p className="sl-label-faint">LEVEL</p>
              <p className="font-display text-5xl sl-glow-blue leading-none mt-1 tabular-nums">{player.level}</p>
            </div>
            <div className="w-px self-stretch bg-[var(--system-border)] opacity-60" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl sl-glow-blue leading-tight truncate">{player.name}</h1>
              <p className="text-[11px] sl-glow-purple mt-1 truncate">"{player.title || 'The Player'}"</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {player.job !== 'NONE' && <span className="sl-chip sl-glow-purple">{JOB_CLASSES[player.job].icon} {JOB_CLASSES[player.job].name.toUpperCase()}</span>}
                <span className="sl-chip sl-glow-gold">PP {player.playerPoints}</span>
                {(player.rebirthCount || 0) > 0 && <span className="sl-chip sl-glow-red">REBIRTH ×{player.rebirthCount}</span>}
              </div>
            </div>
          </div>
          <StatBar label="HP" current={player.hp} max={player.hpMax} percent={hpPercent} variant="hp" />
          <StatBar label="MP" current={player.mp} max={player.mpMax} percent={mpPercent} variant="mp" />
          <StatBar label="XP" current={player.xp} max={player.xpToNext} percent={xpPercent} variant="xp" />
          <StatBar label="FTG" current={player.fatigue} max={player.fatigueMax} percent={fatiguePercent} variant="fatigue" warn={fatigueHigh} />
          {fatigueHigh && <p className="text-[9px] sl-glow-red mt-1 sl-pulse">⚠ EXHAUSTED — XP GAIN REDUCED 25%</p>}
        </div>
      </div>

      {/* ═══ STREAK STRIP ═══ */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.05s' }}>
        <div className="sl-title-bar"><span>🔥 STREAK</span>{streakMult > 1 && <span className="ml-auto text-[10px] sl-glow-gold">+{Math.round((streakMult - 1) * 100)}% XP ACTIVE</span>}</div>
        <div className="p-4 grid grid-cols-3 text-center divide-x divide-[var(--system-border)]">
          <div>
            <p className="font-display text-2xl sl-glow-gold tabular-nums">{player.streak || 0}</p>
            <p className="sl-label mt-1">CURRENT</p>
          </div>
          <div>
            <p className="font-display text-2xl sl-glow-blue tabular-nums">{player.bestStreak || 0}</p>
            <p className="sl-label mt-1">BEST</p>
          </div>
          <div>
            <p className="font-display text-2xl sl-glow-purple">×{streakMult.toFixed(1)}</p>
            <p className="sl-label mt-1">XP MULT</p>
          </div>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.1s' }}>
        <div className="sl-title-bar">
          <span>◆ STATS</span>
          {player.statPoints > 0 && <span className="ml-auto sl-glow-gold sl-pulse text-[10px]">{player.statPoints} PTS TO ALLOCATE</span>}
        </div>
        <div className="p-4 space-y-3">
          {(Object.keys(STAT_INFO) as StatKey[]).map(stat => (
            <div key={stat} className="flex items-center gap-3">
              <div className="w-11"><span className="text-xs font-bold tracking-widest" style={{ color: STAT_INFO[stat].color, textShadow: `0 0 8px ${STAT_INFO[stat].color}55` }}>{stat}</span></div>
              <div className="flex-1 text-[11px] text-[var(--system-text-dim)]">{STAT_INFO[stat].name}</div>
              <div className="w-10 text-right font-display text-lg sl-glow-blue tabular-nums">{player.stats[stat]}</div>
              <button
                onClick={() => { if (player.statPoints > 0) { soundStatUp(); allocateStat(stat) } }}
                disabled={player.statPoints === 0}
                className={`w-7 h-7 border flex items-center justify-center text-sm transition-all ${player.statPoints > 0 ? 'border-[var(--system-cyan)] text-[var(--system-cyan)] sl-glow-blue hover:bg-[rgba(93,213,255,0.1)]' : 'border-[var(--system-border)] text-[var(--system-text-faint)] opacity-40 cursor-not-allowed'}`}
              >+</button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECORD ═══ */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.15s' }}>
        <div className="sl-title-bar"><span>◆ RECORD</span></div>
        <div className="p-4 grid grid-cols-3 text-center divide-x divide-[var(--system-border)]">
          <div><p className="font-display text-2xl sl-glow-gold tabular-nums">{player.totalQuestsCompleted}</p><p className="sl-label mt-1">QUESTS</p></div>
          <div><p className="font-display text-2xl sl-glow-gold tabular-nums">{player.totalDungeonsCleared}</p><p className="sl-label mt-1">DUNGEONS</p></div>
          <div><p className="font-display text-2xl sl-glow-gold tabular-nums">{player.totalShadowsExtracted}</p><p className="sl-label mt-1">SHADOWS</p></div>
        </div>
      </div>

      {/* ═══ ACHIEVEMENTS ═══ */}
      {unlockedAchievements.length > 0 && (
        <div className="sl-window sl-slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="sl-title-bar"><span>◆ ACHIEVEMENTS</span><span className="ml-auto text-[10px] sl-glow-gold">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span></div>
          <div className="p-3 grid grid-cols-6 gap-1.5">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = player.achievements.includes(ach.id)
              return (
                <div key={ach.id} className={`aspect-square flex items-center justify-center border transition-all ${unlocked ? 'border-[var(--system-gold)]/50 bg-[rgba(255,217,102,0.05)]' : 'border-[var(--system-border)] opacity-25'}`} title={`${ach.name}: ${ach.description}`}>
                  <p className="text-base" style={{ color: unlocked ? 'var(--system-gold)' : 'var(--system-text-dim)', textShadow: unlocked ? '0 0 8px var(--system-gold)' : 'none' }}>{ach.icon}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ JOB ═══ */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.25s' }}>
        <div className="sl-title-bar"><span>◆ JOB CLASS</span></div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{JOB_CLASSES[player.job].icon}</span>
            <div className="min-w-0">
              <p className="font-display text-base sl-glow-purple">{JOB_CLASSES[player.job].name}</p>
              <p className="text-[10px] text-[var(--system-text-dim)]">{JOB_CLASSES[player.job].description}</p>
            </div>
          </div>
          {JOB_CLASSES[player.job].bonuses && <p className="text-[10px] sl-glow-gold mt-2">{JOB_CLASSES[player.job].bonuses}</p>}
        </div>
      </div>

      {/* ═══ ACCOUNT ═══ */}
      <div className="sl-window sl-slide-in" style={{ animationDelay: '0.3s' }}>
        <div className="sl-title-bar"><span>◆ ACCOUNT</span></div>
        <div className="p-4 flex items-center justify-between gap-3">
          <p className="sl-label">LOGGED IN AS <span className="sl-glow-blue">{player.name?.toUpperCase()}</span></p>
          <button
            onClick={() => {
              if (window.confirm('Log out of this device? Anything not yet synced to the cloud will be lost.')) {
                logout()
                window.location.reload()
              }
            }}
            className="sl-btn sl-btn-red px-4 py-2 text-[10px]"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  )
}

function StatBar({ label, current, max, percent, variant, warn }: { label: string; current: number; max: number; percent: number; variant: 'hp' | 'mp' | 'xp' | 'fatigue'; warn?: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-[10px] mb-1">
        <span className={warn ? 'sl-glow-red' : 'sl-label'}>{label}</span>
        <span className="text-[var(--system-text-dim)] tabular-nums">{current} / {max}</span>
      </div>
      <div className="sl-bar"><div className={`sl-bar-fill sl-bar-fill-${variant} ${warn ? 'sl-pulse' : ''}`} style={{ width: `${percent}%` }} /></div>
    </div>
  )
}
