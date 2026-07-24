'use client'

import { useState, useEffect } from 'react'
import { useSystem } from '@/lib/store'
import { getHunterRank, HUNTER_RANKS, calculateArmyPower } from '@/lib/system'
import { soundClick, soundWarning, soundDungeonClear, soundPenalty } from '@/lib/sound'
import { getAuth } from '@/lib/auth'

type SubTab = 'rankings' | 'pvp' | 'boss'

export function ArenaView() {
  const [tab, setTab] = useState<SubTab>('rankings')
  const player = useSystem(s => s.player)
  const shadows = useSystem(s => s.shadows)

  if (!player) return null

  const rank = getHunterRank(player.level)
  const rankInfo = HUNTER_RANKS[rank]
  const armyPower = calculateArmyPower(shadows, player)

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>⚔️ THE ARENA</span></div>
        <div className="p-4 text-center">
          <p className="text-3xl mb-2">{rankInfo.icon}</p>
          <p className="font-display text-lg" style={{ color: rankInfo.color, textShadow: `0 0 8px ${rankInfo.color}` }}>{rankInfo.name}</p>
          <p className="text-[10px] text-[var(--system-text-dim)] mt-1">{rankInfo.desc}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="border border-[var(--system-border)] p-2">
              <p className="text-[9px] text-[var(--system-text-dim)]">ARMY POWER</p>
              <p className="font-display text-base sl-glow-shadow">{armyPower}</p>
            </div>
            <div className="border border-[var(--system-border)] p-2">
              <p className="text-[9px] text-[var(--system-text-dim)]">PLAYER LV</p>
              <p className="font-display text-base sl-glow-gold">{player.level}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="sl-window sl-slide-in">
        <div className="grid grid-cols-3">
          <button onClick={() => { soundClick(); setTab('rankings') }} className={`py-2.5 text-[10px] tracking-widest ${tab === 'rankings' ? 'sl-glow-blue bg-[var(--system-blue)]/10 border-b-2 border-[var(--system-cyan)]' : 'text-[var(--system-text-dim)]'}`}>🏆 RANK</button>
          <button onClick={() => { soundClick(); setTab('pvp') }} className={`py-2.5 text-[10px] tracking-widest ${tab === 'pvp' ? 'sl-glow-red bg-[var(--system-red)]/10 border-b-2 border-[var(--system-red)]' : 'text-[var(--system-text-dim)]'}`}>⚔️ PvP</button>
          <button onClick={() => { soundClick(); setTab('boss') }} className={`py-2.5 text-[10px] tracking-widest ${tab === 'boss' ? 'sl-glow-purple bg-[var(--system-purple)]/10 border-b-2 border-[var(--system-purple)]' : 'text-[var(--system-text-dim)]'}`}>👑 BOSS</button>
        </div>
      </div>

      {tab === 'rankings' && <RankingsTab />}
      {tab === 'pvp' && <PvpTab />}
      {tab === 'boss' && <BossTab />}
    </div>
  )
}

function RankingsTab() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myRank, setMyRank] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const auth = getAuth()
      if (!auth) return
      try {
        const res = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` } })
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
        setMyRank(data.myRank || 0)
      } catch {}
      setLoading(false)
    }
    fetchLeaderboard()
  }, [])

  if (loading) return <div className="sl-window p-8 text-center"><p className="text-xs sl-glow-blue sl-pulse">◆ LOADING RANKINGS...</p></div>

  return (
    <div className="space-y-2">
      <div className="sl-window sl-slide-in p-3 text-center">
        <p className="text-[10px] text-[var(--system-text-dim)]">YOUR RANK</p>
        <p className="font-display text-2xl sl-glow-gold">#{myRank}</p>
        <p className="text-[9px] text-[var(--system-text-dim)] mt-1">Out of {leaderboard.length} Players</p>
      </div>
      {leaderboard.slice(0, 20).map((p, i) => (
        <div key={p.id} className={`sl-window sl-slide-in ${p.isMe ? 'sl-window-glow' : ''}`} style={{ animationDelay: `${i * 0.03}s` }}>
          <div className="p-3 flex items-center gap-3">
            <span className={`font-display text-lg w-8 text-center ${i < 3 ? 'sl-glow-gold' : 'text-[var(--system-text-dim)]'}`}>{i + 1}</span>
            <div className="flex-1">
              <p className={`text-xs ${p.isMe ? 'sl-glow-blue' : ''}`}>{p.name} {p.isMe && '(YOU)'}</p>
              <p className="text-[9px] text-[var(--system-text-dim)]">LV {p.level} {p.job !== 'NONE' && `· ${p.job}`} · "{p.title}"</p>
            </div>
            <div className="text-right">
              <p className="font-display text-sm sl-glow-shadow">{p.power}</p>
              <p className="text-[9px] text-[var(--system-text-dim)]">POWER</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PvpTab() {
  const [opponents, setOpponents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [battling, setBattling] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const fetchOpponents = async () => {
      const auth = getAuth()
      if (!auth) return
      try {
        const res = await fetch('/api/pvp/match', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` } })
        const data = await res.json()
        setOpponents(data.opponents || [])
      } catch {}
      setLoading(false)
    }
    fetchOpponents()
  }, [])

  const battle = async (opponentId: string) => {
    if (battling) return
    setBattling(true)
    soundWarning()
    const auth = getAuth()
    if (!auth) { setBattling(false); return }
    try {
      const res = await fetch('/api/pvp/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ opponentId })
      })
      const data = await res.json()
      setResult(data)
      if (data.result.win) soundDungeonClear()
      else soundPenalty()
    } catch {}
    setBattling(false)
  }

  if (loading) return <div className="sl-window p-8 text-center"><p className="text-xs sl-glow-blue sl-pulse">◆ SEARCHING FOR OPPONENTS...</p></div>

  if (result) {
    return (
      <div className="sl-window sl-window-glow sl-slide-in">
        <div className="sl-title-bar"><span>⚔️ BATTLE RESULT</span></div>
        <div className="p-6 text-center">
          <p className="text-4xl mb-3">{result.result.win ? '🏆' : '💀'}</p>
          <p className={`font-display text-xl mb-4 ${result.result.win ? 'sl-glow-gold' : 'sl-glow-red'}`}>
            {result.result.win ? 'VICTORY' : 'DEFEAT'}
          </p>
          <p className="text-xs text-[var(--system-text-dim)] mb-4">{result.myName} vs {result.enemyName}</p>
          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <div className="border border-[var(--system-border)] p-2"><p className="text-[9px] text-[var(--system-text-dim)]">YOUR POWER</p><p className="sl-glow-blue">{result.myPower}</p></div>
            <div className="border border-[var(--system-border)] p-2"><p className="text-[9px] text-[var(--system-text-dim)]">ENEMY POWER</p><p className="sl-glow-red">{result.enemyPower}</p></div>
            <div className="border border-[var(--system-border)] p-2"><p className="text-[9px] text-[var(--system-text-dim)]">DAMAGE DEALT</p><p className="sl-glow-gold">{result.result.playerDamage}</p></div>
            <div className="border border-[var(--system-border)] p-2"><p className="text-[9px] text-[var(--system-text-dim)]">DAMAGE TAKEN</p><p className="sl-glow-red">{result.result.enemyDamage}</p></div>
          </div>
          <p className="text-xs mb-4">Rounds: {result.result.rounds}</p>
          <div className="space-y-1 mb-4">
            <p className="text-[10px] sl-glow-gold">+{result.result.xpGained} XP</p>
            <p className="text-[10px] sl-glow-blue">+{result.result.pointsGained} PP</p>
          </div>
          <button onClick={() => { soundClick(); setResult(null) }} className="sl-btn w-full">◆ CONTINUE</button>
        </div>
      </div>
    )
  }

  if (opponents.length === 0) return <div className="sl-window p-8 text-center"><p className="text-xs text-[var(--system-text-dim)]">No opponents found. Recruit more Players!</p></div>

  return (
    <div className="space-y-2">
      <div className="sl-window sl-slide-in p-3">
        <p className="text-[10px] text-[var(--system-text-dim)] text-center leading-relaxed">
          Challenge other Players to PvP shadow battles.<br />Win = +XP & PP. Lose = HP damage.
        </p>
      </div>
      {opponents.map((opp, i) => (
        <div key={opp.id} className="sl-window sl-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--system-red)] flex items-center justify-center sl-glow-red">
              <span className="font-display text-lg">{opp.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs sl-glow-blue">{opp.name}</p>
              <p className="text-[9px] text-[var(--system-text-dim)]">LV {opp.level} {opp.job !== 'NONE' && `· ${opp.job}`} · "{opp.title}"</p>
              <p className="text-[9px] mt-1 sl-glow-shadow">POWER: {opp.power}</p>
            </div>
            <button onClick={() => battle(opp.id)} disabled={battling} className="sl-btn sl-btn-red px-3 py-1.5 text-[10px]">⚔️ FIGHT</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function BossTab() {
  const [boss, setBoss] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attacking, setAttacking] = useState(false)
  const player = useSystem(s => s.player)
  const shadows = useSystem(s => s.shadows)

  useEffect(() => {
    const fetchBoss = async () => {
      const auth = getAuth()
      if (!auth) return
      try {
        const res = await fetch('/api/boss/state', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` } })
        const data = await res.json()
        setBoss(data.boss)
      } catch {}
      setLoading(false)
    }
    fetchBoss()
  }, [])

  const attack = async () => {
    if (attacking || !player || !boss) return
    setAttacking(true)
    soundWarning()
    const auth = getAuth()
    if (!auth) { setAttacking(false); return }

    // Calculate damage based on player power
    const armyPower = calculateArmyPower(shadows, player)
    const damage = Math.floor(armyPower * (0.5 + Math.random() * 0.5))

    try {
      const res = await fetch('/api/boss/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ damage })
      })
      const data = await res.json()
      if (data.error) {
        setResultMessage(data.error)
      } else {
        setBoss((prev: any) => ({ ...prev, hp: data.bossHp, hpMax: data.bossHpMax, defeatedToday: data.defeated }))
        if (data.defeated) {
          soundDungeonClear()
          setResultMessage(`🏆 You landed the killing blow on ${boss.name}!\n+${data.reward.xp} XP\n+${data.reward.points} PP\nTitle: "${data.reward.title}"`)
        } else {
          setResultMessage(`You dealt ${data.damage} damage!\nBoss HP: ${data.bossHp}/${data.bossHpMax}`)
        }
      }
    } catch {}
    setAttacking(false)
  }

  const [resultMessage, setResultMessage] = useState<string | null>(null)

  if (loading) return <div className="sl-window p-8 text-center"><p className="text-xs sl-glow-purple sl-pulse">◆ SUMMONING BOSS...</p></div>
  if (!boss) return <div className="sl-window p-8 text-center"><p className="text-xs text-[var(--system-text-dim)]">No boss available today.</p></div>

  const hpPercent = (boss.hp / boss.hpMax) * 100

  return (
    <div className="space-y-3">
      <div className="sl-window sl-window-glow sl-glow-pulse sl-slide-in">
        <div className="sl-title-bar"><span>👑 DAILY BOSS RAID</span></div>
        <div className="p-6 text-center">
          <p className="text-5xl mb-3">{boss.icon}</p>
          <p className="font-display text-lg sl-glow-purple mb-1">{boss.name}</p>
          <p className="text-[9px] text-[var(--system-text-dim)] mb-4">{boss.description}</p>

          {/* Boss HP bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="sl-glow-red">BOSS HP</span>
              <span className="sl-glow-red">{boss.hp.toLocaleString()} / {boss.hpMax.toLocaleString()}</span>
            </div>
            <div className="sl-bar h-4">
              <div className="sl-bar-fill sl-bar-fill-hp" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* Rewards */}
          <div className="flex justify-center gap-2 mb-4 text-[10px]">
            <span className="px-2 py-0.5 border border-[var(--system-gold)]/30 sl-glow-gold">+{boss.xpReward} XP</span>
            <span className="px-2 py-0.5 border border-[var(--system-cyan)]/30 sl-glow-blue">+{boss.pointReward} PP</span>
          </div>

          {boss.defeatedToday ? (
            <p className="text-xs sl-glow-gold sl-pulse">◆ BOSS DEFEATED TODAY ◆</p>
          ) : (
            <button onClick={attack} disabled={attacking} className="sl-btn sl-btn-red w-full">
              {attacking ? '◆ ATTACKING...' : '⚔️ ATTACK BOSS'}
            </button>
          )}
        </div>
      </div>

      {resultMessage && (
        <div className="sl-window sl-window-glow sl-slide-in">
          <div className="sl-title-bar"><span>⚔️ BATTLE LOG</span></div>
          <div className="p-4 text-center">
            <p className="text-xs whitespace-pre-line sl-glow-blue">{resultMessage}</p>
            <button onClick={() => { soundClick(); setResultMessage(null) }} className="sl-btn w-full mt-3">◆ CONTINUE</button>
          </div>
        </div>
      )}

      <div className="sl-window sl-slide-in p-3">
        <p className="text-[9px] text-[var(--system-text-dim)] leading-relaxed text-center">
          The player who lands the killing blow gets the full rewards + a special title.<br />
          Damage scales with your Army Power. Deploy more shadows for more damage.
        </p>
      </div>
    </div>
  )
}
