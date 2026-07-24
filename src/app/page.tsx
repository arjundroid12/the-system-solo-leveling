'use client'

import { useEffect, useState } from 'react'
import { useSystem } from '@/lib/store'
import { useCloudSync } from '@/lib/cloudSync'
import { BootScreen } from '@/components/system/BootScreen'
import { StatusWindow } from '@/components/system/StatusWindow'
import { QuestPanel } from '@/components/system/QuestPanel'
import { DungeonView } from '@/components/system/DungeonView'
import { ShadowArmy } from '@/components/system/ShadowArmy'
import { SkillsPanel } from '@/components/system/SkillsPanel'
import { InventoryShop } from '@/components/system/InventoryShop'
import { ArenaView } from '@/components/system/ArenaView'
import { WorldMap } from '@/components/system/WorldMap'
import { ObjectivesView } from '@/components/system/ObjectivesView'
import { ObjectiveFeedbackModal } from '@/components/system/ObjectiveFeedbackModal'
import { refreshObjectives } from '@/lib/objectives'
import { AIChatPanel } from '@/components/system/AIChatPanel'
import { SystemNotifications } from '@/components/system/SystemNotifications'
import { LevelUpCutscene } from '@/components/system/LevelUpCutscene'
import { FloatingXP, BuffChips } from '@/components/system/RewardJuice'
import { setSoundEnabled, soundClick, soundNotification } from '@/lib/sound'
import { getAuth, apiPull } from '@/lib/auth'
import { xpForLevel, hpFromStats, mpFromStats, fatigueMaxFromStats } from '@/lib/system'

type Tab = 'status' | 'quests' | 'dungeons' | 'shadows' | 'skills' | 'arena' | 'world' | 'growth' | 'inventory'

const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'status', label: 'STATUS', icon: '◈' },
  { key: 'quests', label: 'QUESTS', icon: '◆' },
  { key: 'dungeons', label: 'GATES', icon: '⌖' },
  { key: 'shadows', label: 'ARMY', icon: '☠' },
  { key: 'skills', label: 'SKILLS', icon: '✦' },
  { key: 'arena', label: 'ARENA', icon: '⚔' },
  { key: 'world', label: 'WORLD', icon: '⬡' },
  { key: 'growth', label: 'GROWTH', icon: '↗' },
  { key: 'inventory', label: 'BAG', icon: '▣' },
]

// Mobile: 4 primary destinations + MORE sheet (9 cramped tabs was the
// single biggest "not optimized for mobile" problem)
const MOBILE_PRIMARY: Tab[] = ['status', 'quests', 'dungeons', 'growth']
const MOBILE_MORE: Tab[] = ['shadows', 'skills', 'arena', 'world', 'inventory']

export default function Home() {
  const booted = useSystem(s => s.booted)
  const player = useSystem(s => s.player)
  const generateQuestsIfNewDay = useSystem(s => s.generateQuestsIfNewDay)
  const soundEnabled = useSystem(s => s.soundEnabled)
  const levelUpCutscene = useSystem(s => s.levelUpCutscene)
  const dismissLevelUpCutscene = useSystem(s => s.dismissLevelUpCutscene)
  const [tab, setTab] = useState<Tab>('status')
  const [showAIChat, setShowAIChat] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const needsOnboarding = useSystem(s => s.needsOnboarding)
  const isRefreshing = useSystem(s => s.isRefreshing)
  const setOnboarded = useSystem(s => s.setOnboarded)
  const setRefreshing = useSystem(s => s.setRefreshing)

  useCloudSync()

  useEffect(() => { setSoundEnabled(soundEnabled) }, [soundEnabled])
  useEffect(() => { if (booted) { generateQuestsIfNewDay(); useSystem.getState().checkLoginBonus() } }, [booted, generateQuestsIfNewDay])
  // Objectives: fetch programs + inject today's objective quests into the quest list
  useEffect(() => { if (booted) refreshObjectives() }, [booted])

  // Manual refresh — force-fetch from server
  const handleRefresh = async () => {
    const auth = getAuth()
    if (!auth) return
    soundClick()
    setRefreshing(true)
    try {
      const data = await apiPull(auth.token)
      if (data && data.player) {
        const p = data.player
        const currentState = useSystem.getState()
        const cloudProgress = (p.level || 1) * 100000 + (p.xp || 0)
        const localProgress = (currentState.player?.level || 1) * 100000 + (currentState.player?.xp || 0)
        if (cloudProgress >= localProgress) {
          useSystem.setState({
            player: {
              ...p, xpToNext: xpForLevel(p.level), jobUnlocked: p.job !== 'NONE',
              hpMax: p.hpMax || hpFromStats(p.stats, p.level), mpMax: p.mpMax || mpFromStats(p.stats, p.level),
              fatigueMax: p.fatigueMax || fatigueMaxFromStats(p.stats),
            } as any,
            quests: data.quests || [],
            shadows: data.shadows || [],
            inventory: data.inventory || [],
          })
        }
        soundNotification()
        useSystem.getState().pushNotification({ type: 'SUCCESS', title: '[ SYNC COMPLETE ]', message: 'All data refreshed from server.' })
      } else {
        useSystem.getState().pushNotification({ type: 'WARNING', title: '[ SYNC FAILED ]', message: 'Could not reach server.' })
      }
    } catch {
      useSystem.getState().pushNotification({ type: 'WARNING', title: '[ SYNC FAILED ]', message: 'Network error.' })
    }
    setRefreshing(false)
  }

  if (!booted || !player) return <BootScreen />

  // Onboarding gate — new accounts pick a growth path (skippable)
  if (needsOnboarding) {
    return (
      <div className="min-h-screen min-h-dvh relative z-[1]">
        <div className="max-w-md mx-auto px-4 pb-10" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
          <div className="text-center mb-5">
            <p className="font-display text-xl sl-glow-blue">THE SYSTEM</p>
            <p className="sl-label mt-1.5">◆ FIRST-TIME SETUP · DECLARE YOUR FIRST OBJECTIVE ◆</p>
          </div>
          <ObjectivesView onCreated={() => setOnboarded()} />
          <button onClick={() => { soundClick(); setOnboarded() }} className="sl-btn sl-btn-ghost w-full mt-4 text-[10px]">
            SKIP FOR NOW — DECLARE LATER IN GROWTH
          </button>
        </div>
        <SystemNotifications />
      </div>
    )
  }

  const activeNav = NAV_ITEMS.find(n => n.key === tab)
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.hpMax) * 100))
  const mpPct = Math.max(0, Math.min(100, (player.mp / player.mpMax) * 100))
  const xpPct = Math.max(0, Math.min(100, (player.xp / player.xpToNext) * 100))

  return (
    <div className="min-h-screen min-h-dvh flex relative z-[1]">
      <div className="sl-scan-line" />

      {/* ═══ Desktop side rail ═══ */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen h-dvh border-r border-[rgba(30,144,255,0.18)] bg-gradient-to-b from-[rgba(6,11,24,0.7)] to-[rgba(2,4,9,0.4)] backdrop-blur-md">
        <div className="px-6 pt-7 pb-5">
          <p className="font-display text-xl sl-glow-blue leading-none">THE SYSTEM</p>
          <p className="sl-label-faint mt-2">◆ PLAYER INTERFACE ◆</p>
        </div>

        {/* player card */}
        <div className="mx-4 mb-4 sl-window">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 border-2 border-[var(--system-cyan)] flex items-center justify-center sl-glow-blue" style={{ clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}>
                <span className="font-display text-lg">{player.name[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm sl-glow-blue font-display truncate">{player.name}</p>
                <p className="sl-label mt-0.5">LV {player.level}{player.job !== 'NONE' ? ` · ${player.job}` : ''}</p>
              </div>
            </div>
            <p className="text-[10px] sl-glow-purple mt-2 truncate">"{player.title || 'The Player'}"</p>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1"><span className="sl-label">XP</span><span className="sl-glow-gold tabular-nums">{player.xp}/{player.xpToNext}</span></div>
              <div className="sl-bar" style={{ height: 5 }}><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${xpPct}%` }} /></div>
            </div>
            {(player.streak || 0) >= 3 && <p className="text-[10px] sl-glow-gold mt-2">🔥 {player.streak}-DAY STREAK</p>}
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => { soundClick(); setTab(item.key) }} className={`sl-rail-btn ${tab === item.key ? 'active' : ''}`}>
              <span className="text-base leading-none w-5 text-center">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[rgba(30,144,255,0.18)]">
          <button onClick={handleRefresh} disabled={isRefreshing} className="sl-btn sl-btn-ghost w-full text-[10px] py-2 mb-3">
            {isRefreshing ? '◆ SYNCING…' : '⟳ FORCE SYNC'}
          </button>
          <div className="flex items-center gap-2 sl-label">
            <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-[var(--system-gold)]' : 'bg-[var(--system-green)]'} sl-pulse`} />
            {isRefreshing ? 'SYNCING…' : 'CLOUD SYNCED'}
          </div>
        </div>
      </aside>

      {/* ═══ Main column ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* mobile header — game HUD */}
        <header className="lg:hidden sticky top-0 z-40 bg-[rgba(2,4,9,0.82)] backdrop-blur-xl border-b border-[rgba(30,144,255,0.28)]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="px-4 pt-2.5 pb-2 max-w-[480px] mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <p className="font-display text-sm sl-glow-blue leading-none">THE SYSTEM</p>
                <span className="sl-chip sl-glow-blue">LV {player.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <BuffChips />
                {(player.streak || 0) >= 3 && <span className="text-[10px] sl-glow-gold">🔥{player.streak}</span>}
                <button onClick={handleRefresh} disabled={isRefreshing} className="sl-btn sl-btn-ghost text-[10px] min-w-[40px] min-h-[40px] flex items-center justify-center" title="Force sync">
                  {isRefreshing ? '…' : '⟳'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-2">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5"><span className="sl-label-faint">HP</span><span className="text-[var(--system-red)] tabular-nums">{player.hp}</span></div>
                <div className="sl-bar" style={{ height: 4 }}><div className="sl-bar-fill sl-bar-fill-hp" style={{ width: `${hpPct}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5"><span className="sl-label-faint">MP</span><span className="text-[var(--system-cyan)] tabular-nums">{player.mp}</span></div>
                <div className="sl-bar" style={{ height: 4 }}><div className="sl-bar-fill sl-bar-fill-mp" style={{ width: `${mpPct}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5"><span className="sl-label-faint">XP</span><span className="text-[var(--system-gold)] tabular-nums">{player.xp}/{player.xpToNext}</span></div>
                <div className="sl-bar" style={{ height: 4 }}><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${xpPct}%` }} /></div>
              </div>
            </div>
          </div>
        </header>

        {/* desktop header */}
        <header className="hidden lg:block sticky top-0 z-40 bg-[rgba(2,4,9,0.82)] backdrop-blur-xl border-b border-[rgba(30,144,255,0.28)]">
          <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
            <h1 className="font-display text-xl sl-glow-blue">{activeNav?.icon} {activeNav?.label}</h1>
            <div className="flex items-center gap-3">
              <BuffChips />
              <span className="sl-chip"><span className="sl-label-faint">HP</span><span className="sl-glow-red tabular-nums">{player.hp}/{player.hpMax}</span></span>
              <span className="sl-chip"><span className="sl-label-faint">MP</span><span className="sl-glow-blue tabular-nums">{player.mp}/{player.mpMax}</span></span>
              <span className="sl-chip"><span className="sl-label-faint">PP</span><span className="sl-glow-gold tabular-nums">{player.playerPoints}</span></span>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div key={tab} className="sl-slide-in max-w-[480px] lg:max-w-3xl mx-auto w-full lg:px-8 lg:py-6 pb-24 lg:pb-10">
            {tab === 'status' && <StatusWindow />}
            {tab === 'quests' && <QuestPanel />}
            {tab === 'dungeons' && <DungeonView />}
            {tab === 'shadows' && <ShadowArmy />}
            {tab === 'skills' && <SkillsPanel />}
            {tab === 'arena' && <ArenaView />}
            {tab === 'world' && <WorldMap />}
            {tab === 'growth' && <ObjectivesView />}
            {tab === 'inventory' && <InventoryShop />}
          </div>
        </main>
      </div>

      {/* ═══ Mobile bottom nav — 4 primary + MORE ═══ */}
      <nav className="sl-bottom-nav lg:hidden">
        {MOBILE_PRIMARY.map(key => {
          const item = NAV_ITEMS.find(n => n.key === key)!
          return (
            <button key={key} onClick={() => { soundClick(); setTab(key); setShowMore(false) }} className={`sl-nav-btn ${tab === key ? 'active' : ''}`}>
              <span className="text-xl leading-none">{item.icon}</span><span>{item.label}</span>
            </button>
          )
        })}
        <button onClick={() => { soundClick(); setShowMore(v => !v) }} className={`sl-nav-btn ${MOBILE_MORE.includes(tab) || showMore ? 'active' : ''}`}>
          <span className="text-xl leading-none">⋯</span><span>MORE</span>
        </button>
      </nav>

      {/* MORE sheet */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          <div className="absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto px-2 pb-2 sl-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="sl-window sl-window-glow">
              <div className="sl-title-bar">
                <span>◆ ALL SYSTEMS</span>
                <button onClick={() => setShowMore(false)} className="ml-auto text-[var(--system-text-dim)] text-base leading-none px-2 py-1">✕</button>
              </div>
              <div className="p-3 pb-[calc(12px+env(safe-area-inset-bottom))] grid grid-cols-3 gap-2">
                {MOBILE_MORE.map(key => {
                  const item = NAV_ITEMS.find(n => n.key === key)!
                  const isActive = tab === key
                  return (
                    <button
                      key={key}
                      onClick={() => { soundClick(); setTab(key); setShowMore(false) }}
                      className={`flex flex-col items-center gap-2 py-4 border transition-colors ${isActive ? 'border-[var(--system-cyan)] bg-[rgba(30,144,255,0.12)] sl-glow-blue' : 'border-[var(--system-border)] text-[var(--system-text-dim)] active:bg-[rgba(30,144,255,0.08)]'}`}
                    >
                      <span className="text-2xl leading-none">{item.icon}</span>
                      <span className="text-[11px] tracking-widest">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <LevelUpCutscene data={levelUpCutscene} onDismiss={dismissLevelUpCutscene} />

      {/* AI Coach */}
      <button
        onClick={() => { soundClick(); setShowAIChat(true) }}
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-5 z-50 w-12 h-12 border-2 border-[var(--system-cyan)] bg-[rgba(12,21,40,0.85)] backdrop-blur flex items-center justify-center text-xl sl-glow-blue sl-glow-pulse"
        style={{ clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)', right: 'calc(1rem + env(safe-area-inset-right))' }}
        aria-label="AI Coach"
      >
        ◆
      </button>
      {showAIChat && <AIChatPanel onClose={() => setShowAIChat(false)} />}

      <ObjectiveFeedbackModal />
      <FloatingXP />
      <SystemNotifications />
    </div>
  )
}
