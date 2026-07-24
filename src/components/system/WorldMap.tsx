'use client'

import { useSystem } from '@/lib/store'
import { WORLD_ZONES, getHunterRank, HUNTER_RANKS, WorldZone } from '@/lib/system'
import { soundClick } from '@/lib/sound'

export function WorldMap() {
  const player = useSystem(s => s.player)
  if (!player) return null

  const myRank = getHunterRank(player.level)

  const isUnlocked = (zone: WorldZone) => {
    return player.level >= zone.minLevel && HUNTER_RANKS[myRank].minLevel >= HUNTER_RANKS[zone.minRank].minLevel
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>🗺️ WORLD MAP</span></div>
        <div className="p-4 text-center">
          <p className="text-xs text-[var(--system-text-dim)] leading-relaxed">
            Unlock new zones by leveling up and ranking up.<br />
            Higher zones give <span className="sl-glow-gold">XP multipliers</span> on all quests and dungeons.
          </p>
        </div>
      </div>

      {WORLD_ZONES.map((zone, i) => {
        const unlocked = isUnlocked(zone)
        const meetsLevel = player.level >= zone.minLevel
        const meetsRank = HUNTER_RANKS[myRank].minLevel >= HUNTER_RANKS[zone.minRank].minLevel
        const isCurrentZone = unlocked && (i === WORLD_ZONES.findIndex(z => isUnlocked(z) && z.id === zone.id))

        return (
          <div
            key={zone.id}
            className={`sl-window sl-slide-in ${!unlocked ? 'opacity-50' : ''}`}
            style={{ animationDelay: `${i * 0.05}s`, borderColor: unlocked ? zone.color : undefined }}
          >
            <div className="sl-title-bar" style={{ color: unlocked ? zone.color : undefined }}>
              <span>{zone.icon} {zone.name.toUpperCase()}</span>
              {unlocked ? (
                <span className="ml-auto text-[10px] sl-glow-green">✓ UNLOCKED</span>
              ) : (
                <span className="ml-auto text-[10px] sl-glow-red">🔒 LOCKED</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{zone.icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--system-text-dim)] mb-2">{zone.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="sl-chip sl-glow-gold">×{zone.xpMultiplier} XP</span>
                    <span className="sl-chip sl-glow-blue">×{zone.pointMultiplier} PP</span>
                    {!unlocked && (
                      <>
                        {!meetsLevel && <span className="sl-chip sl-glow-red">LV {zone.minLevel} REQ</span>}
                        {!meetsRank && <span className="sl-chip sl-glow-red">{zone.minRank}-RANK REQ</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
              {unlocked && (
                <div className="text-center text-[10px] sl-glow-green">
                  ◆ ACTIVE — All XP gains multiplied by {zone.xpMultiplier}x
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Current zone bonus info */}
      <div className="sl-window sl-slide-in">
        <div className="sl-title-bar"><span>◆ CURRENT BONUS</span></div>
        <div className="p-4 text-center">
          <p className="text-[10px] text-[var(--system-text-dim)] mb-2">Your highest unlocked zone:</p>
          {(() => {
            const highest = [...WORLD_ZONES].reverse().find(z => isUnlocked(z))
            if (!highest) return <p className="text-xs sl-glow-blue">Awakening Park</p>
            return (
              <>
                <p className="font-display text-lg" style={{ color: highest.color }}>{highest.icon} {highest.name}</p>
                <p className="text-[10px] sl-glow-gold mt-1">x{highest.xpMultiplier} XP multiplier active on all gains</p>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
