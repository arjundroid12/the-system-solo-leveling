'use client'

import { useEffect, useState } from 'react'
import { useSystem } from '@/lib/store'
import { useCloudSync, isLoggedIn } from '@/lib/cloudSync'
import { BootScreen } from '@/components/system/BootScreen'
import { StatusWindow } from '@/components/system/StatusWindow'
import { QuestPanel } from '@/components/system/QuestPanel'
import { DungeonView } from '@/components/system/DungeonView'
import { ShadowArmy } from '@/components/system/ShadowArmy'
import { SkillsPanel } from '@/components/system/SkillsPanel'
import { SkillTreeView } from '@/components/system/SkillTreeView'
import { InventoryShop } from '@/components/system/InventoryShop'
import { ArenaView } from '@/components/system/ArenaView'
import { WorldMap } from '@/components/system/WorldMap'
import { GrowthPlanView } from '@/components/system/GrowthPlanView'
import { AIChatPanel } from '@/components/system/AIChatPanel'
import { SystemNotifications } from '@/components/system/SystemNotifications'
import { LevelUpCutscene } from '@/components/system/LevelUpCutscene'
import { setSoundEnabled, soundClick, soundNotification } from '@/lib/sound'
import { getAuth } from '@/lib/auth'
import { apiPull } from '@/lib/auth'
import { xpForLevel, hpFromStats, mpFromStats, fatigueMaxFromStats } from '@/lib/system'

type Tab = 'status' | 'quests' | 'dungeons' | 'shadows' | 'skills' | 'arena' | 'world' | 'growth' | 'inventory'

const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'status', label: 'STATUS', icon: '◈' }, { key: 'quests', label: 'QUESTS', icon: '◆' },
  { key: 'dungeons', label: 'GATES', icon: '⚔' }, { key: 'shadows', label: 'ARMY', icon: '💀' },
  { key: 'skills', label: 'SKILLS', icon: '✦' }, { key: 'arena', label: 'ARENA', icon: '🏆' },
  { key: 'world', label: 'WORLD', icon: '🗺️' }, { key: 'growth', label: 'GROWTH', icon: '🚀' },
  { key: 'inventory', label: 'BAG', icon: '🎒' },
]

export default function Home() {
  const booted = useSystem(s => s.booted)
  const player = useSystem(s => s.player)
  const generateQuestsIfNewDay = useSystem(s => s.generateQuestsIfNewDay)
  const soundEnabled = useSystem(s => s.soundEnabled)
  const levelUpCutscene = useSystem(s => s.levelUpCutscene)
  const dismissLevelUpCutscene = useSystem(s => s.dismissLevelUpCutscene)
  const [tab, setTab] = useState<Tab>('status')
  const [showAIChat, setShowAIChat] = useState(false)
  const needsOnboarding = useSystem(s => s.needsOnboarding)
  const isRefreshing = useSystem(s => s.isRefreshing)
  const setOnboarded = useSystem(s => s.setOnboarded)
  const setRefreshing = useSystem(s => s.setRefreshing)

  useCloudSync()

  useEffect(() => { setSoundEnabled(soundEnabled) }, [soundEnabled])
  useEffect(() => { if (booted) { generateQuestsIfNewDay(); useSystem.getState().checkLoginBonus() } }, [booted, generateQuestsIfNewDay])

  // Manual refresh function — force-fetch from server, bypass all caches
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
        // Cloud wins if higher progression
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

  // ONBOARDING GATE: new accounts must select a growth path before main UI
  if (needsOnboarding) {
    return (
      <div className="sl-app-wrapper min-h-screen">
        <div className="max-w-md mx-auto pt-4 px-4">
          <div className="text-center mb-4">
            <p className="font-display text-lg sl-glow-blue">THE SYSTEM</p>
            <p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">◆ FIRST-TIME SETUP ◆</p>
          </div>
          <GrowthPlanView onPathSelected={() => setOnboarded()} />
        </div>
        <SystemNotifications />
      </div>
    )
  }

  return (
    <div className="sl-app-wrapper min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--system-border)] bg-[var(--system-darker)]/80 backdrop-blur-md sticky top-0 h-screen">
        <div className="p-6 border-b border-[var(--system-border)]">
          <p className="font-display text-lg sl-glow-blue leading-none">THE SYSTEM</p>
          <p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-1">◆ PLAYER INTERFACE ◆</p>
        </div>
        <div className="p-4 border-b border-[var(--system-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--system-cyan)] flex items-center justify-center sl-glow-blue"><span className="font-display text-lg">{player.name[0]?.toUpperCase()}</span></div>
            <div>
              <p className="text-sm sl-glow-blue font-display">{player.name}</p>
              <p className="text-[10px] text-[var(--system-text-dim)]">LV {player.level} {player.job !== 'NONE' && `· ${player.job}`} · "{player.title || 'The Player'}"</p>
              {(player.streak || 0) >= 3 && <p className="text-[10px] sl-glow-gold">🔥 {player.streak}-day streak</p>}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[9px] mb-1"><span className="text-[var(--system-text-dim)]">XP</span><span className="sl-glow-gold">{player.xp}/{player.xpToNext}</span></div>
            <div className="sl-bar h-1"><div className="sl-bar-fill sl-bar-fill-xp" style={{ width: `${(player.xp / player.xpToNext) * 100}%` }} /></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-widest transition-colors ${tab === item.key ? 'bg-[var(--system-blue)]/10 border-l-2 border-[var(--system-cyan)] sl-glow-blue' : 'text-[var(--system-text-dim)] hover:text-[var(--system-cyan)] hover:bg-[var(--system-blue)]/5 border-l-2 border-transparent'}`}>
              <span className="text-lg">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--system-border)]">
          <button onClick={handleRefresh} disabled={isRefreshing} className="sl-btn w-full text-[10px] py-2 mb-2">
            {isRefreshing ? '◆ SYNCING...' : '🔄 REFRESH'}
          </button>
          <div className="flex items-center gap-2 text-[10px] text-[var(--system-text-dim)]"><span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-yellow-500 sl-pulse' : 'bg-green-500 sl-pulse'}`} />{isRefreshing ? 'SYNCING...' : 'CLOUD SYNCED'}</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-[var(--system-darker)]/80 backdrop-blur-md border-b border-[var(--system-border)]">
          <div className="px-4 py-3 flex items-center justify-between">
            <div><p className="font-display text-sm sl-glow-blue leading-none">THE SYSTEM</p><p className="text-[9px] text-[var(--system-text-dim)] tracking-widest mt-0.5">LV {player.level} · {player.name}</p></div>
            <div className="text-right flex items-center gap-2">
              <button onClick={handleRefresh} disabled={isRefreshing} className="sl-btn px-2 py-1 text-[9px]" title="Force sync">
                {isRefreshing ? '...' : '🔄'}
              </button>
              <div><p className="text-[9px] text-[var(--system-text-dim)]">XP</p><p className="text-[10px] sl-glow-gold tabular-nums">{player.xp} / {player.xpToNext}</p></div>
            </div>
          </div>
        </header>
        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-40 bg-[var(--system-darker)]/80 backdrop-blur-md border-b border-[var(--system-border)] px-8 py-4">
          <div className="max-w-3xl w-full flex items-center justify-between">
            <h1 className="font-display text-xl sl-glow-blue">{NAV_ITEMS.find(n => n.key === tab)?.icon} {NAV_ITEMS.find(n => n.key === tab)?.label}</h1>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-center"><p className="text-[9px] text-[var(--system-text-dim)]">HP</p><p className="sl-glow-red">{player.hp}/{player.hpMax}</p></div>
              <div className="text-center"><p className="text-[9px] text-[var(--system-text-dim)]">MP</p><p className="sl-glow-blue">{player.mp}/{player.mpMax}</p></div>
              <div className="text-center"><p className="text-[9px] text-[var(--system-text-dim)]">PP</p><p className="sl-glow-gold">{player.playerPoints}</p></div>
              {(player.streak || 0) >= 3 && <div className="text-center"><p className="text-[9px] text-[var(--system-text-dim)]">STREAK</p><p className="sl-glow-gold">🔥 {player.streak}</p></div>}
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-8">
          <div className="md:max-w-3xl md:mx-auto md:px-8 md:py-6 sl-app md:sl-app-none">
            {tab === 'status' && <StatusWindow />}
            {tab === 'quests' && <QuestPanel />}
            {tab === 'dungeons' && <DungeonView />}
            {tab === 'shadows' && <ShadowArmy />}
            {tab === 'skills' && <SkillsPanel />}
            {tab === 'arena' && <ArenaView />}
            {tab === 'world' && <WorldMap />}
            {tab === 'growth' && <GrowthPlanView />}
            {tab === 'inventory' && <InventoryShop />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="sl-bottom-nav md:hidden">
        {NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} className={`sl-nav-btn ${tab === item.key ? 'active' : ''}`}>
            <span className="text-lg leading-none">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>

      <LevelUpCutscene data={levelUpCutscene} onDismiss={dismissLevelUpCutscene} />

      {/* Floating AI Chat Button */}
      <button
        onClick={() => { soundClick(); setShowAIChat(true) }}
        className="fixed bottom-20 md:bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--system-blue)] to-[var(--system-purple)] border-2 border-[var(--system-cyan)] flex items-center justify-center text-2xl sl-glow-pulse"
        style={{ boxShadow: '0 0 20px rgba(30, 144, 255, 0.5)' }}
        aria-label="AI Coach"
      >
        ◆
      </button>

      {/* AI Chat Panel */}
      {showAIChat && <AIChatPanel onClose={() => setShowAIChat(false)} />}

      <SystemNotifications />
    </div>
  )
}
