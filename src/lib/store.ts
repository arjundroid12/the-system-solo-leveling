'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Player, Quest, Skill, Shadow, InventoryItem, SystemNotification,
  StatKey, JobClass, DungeonType, DungeonRun,
  createNewPlayer, todayStr, genId,
  xpForLevel, hpFromStats, mpFromStats, fatigueMaxFromStats,
  SKILLS, JOB_CLASSES, shadowRankFromDungeon, dungeonRewards,
  SHADOW_NAMES, shadowXpForLevel, getShadowAbility,
  checkAchievements, ACHIEVEMENTS, calculateStreakBonus, getStreakMultiplier,
  generateFallbackQuests, ShadowRank,
  XP_BOOSTERS, getDailyLoginBonus, getComboMultiplier, getRebirthBonus, getRebirthRequirement,
  EQUIP_SLOTS, Equipment, EquipSlot, getTitleBonus,
} from './system'
import {
  soundNotification, soundQuestComplete, soundLevelUp,
  soundWarning, soundPenalty, soundShadowExtract, soundGateOpen,
  soundDungeonClear, soundClick, soundStatUp, soundSkillUnlock,
  soundPurchase, soundSystemBoot, soundAchievement, soundStreak,
} from './sound'

interface CutsceneData {
  level: number; isMilestone: boolean; statPointsGained: number
  hpRestored: number; mpRestored: number
}

interface SystemState {
  booted: boolean
  player: Player | null
  quests: Quest[]
  skills: Skill[]
  shadows: Shadow[]
  inventory: InventoryItem[]
  activeDungeon: DungeonRun | null
  notifications: SystemNotification[]
  soundEnabled: boolean
  levelUpCutscene: CutsceneData | null
  // v4.1 fast leveling
  combo: number
  comboTimer: number  // timestamp of last quest completion
  xpBoostUntil: number  // timestamp when XP boost expires
  xpBoostMultiplier: number  // current boost multiplier (1.0 = none)
  lastLoginDate: string | null
  loginDayCount: number  // consecutive login days
  loginBonusClaimed: boolean  // claimed today?
  rebirthCount: number
  equipment: Partial<Record<EquipSlot, Equipment>>  // equipped items by slot
  needsOnboarding: boolean  // true for new accounts, false after path selection
  isRefreshing: boolean  // for manual refresh button loading state
  objectives: any[]  // serialized objectives from /api/objectives
  pendingObjectiveFeedback: { objectiveId: string; title: string } | null
  lastReward: { xp: number; pp: number; ts: number } | null  // drives the floating +XP animation

  boot: (name: string) => void
  resetSystem: () => void
  toggleSound: () => void
  setOnboarded: () => void
  setRefreshing: (v: boolean) => void
  setObjectives: (list: any[]) => void
  setPendingObjectiveFeedback: (v: { objectiveId: string; title: string } | null) => void

  generateQuestsIfNewDay: () => void
  updateQuestProgress: (id: string, progress: number) => void
  completeQuest: (id: string) => void
  skipQuest: (id: string) => void
  rerollQuests: () => void

  allocateStat: (stat: StatKey) => void
  selectJob: (job: JobClass) => void
  unlockSkill: (id: string) => void

  startDungeon: (type: DungeonType) => void
  completeDungeon: (id: string) => void
  failDungeon: (id: string) => void

  extractShadow: (dungeonId: string, originalName: string) => void
  deployShadow: (id: string) => void
  undeployShadow: (id: string) => void

  buyItem: (id: string) => void
  useItem: (id: string) => void

  pushNotification: (n: Omit<SystemNotification, 'id' | 'timestamp'>) => void
  dismissNotification: (id: string) => void
  clearNotifications: () => void
  dismissLevelUpCutscene: () => void

  // v4.1 fast leveling
  activateBooster: (boosterId: string) => void
  claimDailyLogin: () => void
  checkLoginBonus: () => void
  rebirth: () => void
  equipItem: (item: Equipment) => void
  unequipItem: (slot: EquipSlot) => void
  getEffectiveXpMultiplier: () => number

  applyXp: (xp: number) => void
  applyDamage: (amount: number) => void
  restoreHp: (amount: number) => void
  restoreMp: (amount: number) => void
  addFatigue: (amount: number) => void
  resetFatigue: () => void
}

export const useSystem = create<SystemState>()(
  persist(
    (set, get) => ({
      booted: false,
      player: null,
      quests: [],
      skills: SKILLS,
      shadows: [],
      inventory: [],
      activeDungeon: null,
      notifications: [],
      soundEnabled: true,
      objectives: [],
      pendingObjectiveFeedback: null,
      lastReward: null,
      setObjectives: (list) => set({ objectives: list }),
      setPendingObjectiveFeedback: (v) => set({ pendingObjectiveFeedback: v }),
      levelUpCutscene: null,
      combo: 0,
      comboTimer: 0,
      xpBoostUntil: 0,
      xpBoostMultiplier: 1.0,
      lastLoginDate: null,
      loginDayCount: 0,
      loginBonusClaimed: false,
      rebirthCount: 0,
      equipment: {},
      needsOnboarding: false,
      isRefreshing: false,

      boot: (name: string) => {
        const player = createNewPlayer(name)
        const quests = generateFallbackQuests()
        soundSystemBoot()
        set({
          booted: true, player, quests,
          skills: SKILLS.map(s => ({ ...s })),
          shadows: [], inventory: [], activeDungeon: null,
          needsOnboarding: true,  // NEW ACCOUNTS MUST SELECT A PATH
          isRefreshing: false,
          notifications: [{
            id: genId(), type: 'SYSTEM', title: '[ SYSTEM ]',
            message: `You have acquired the qualifications to be a Player.\nWelcome, ${name}.`,
            timestamp: new Date().toISOString(),
          }],
        })
        setTimeout(() => soundNotification(), 800)
      },

      resetSystem: () => set({ booted: false, player: null, quests: [], skills: SKILLS, shadows: [], inventory: [], activeDungeon: null, notifications: [], levelUpCutscene: null, needsOnboarding: false, isRefreshing: false, objectives: [], pendingObjectiveFeedback: null, lastReward: null }),

      setOnboarded: () => set({ needsOnboarding: false }),
      setRefreshing: (v: boolean) => set({ isRefreshing: v }),

      toggleSound: () => {
        const next = !get().soundEnabled
        set({ soundEnabled: next })
        const { setSoundEnabled } = require('./sound')
        setSoundEnabled(next)
      },

      generateQuestsIfNewDay: () => {
        const { player, quests } = get()
        if (!player) return
        const today = todayStr()

        // Check if we already have exactly 5 quests for today
        const todayQuests = quests.filter(q => q.date === today && q.isDaily)
        if (todayQuests.length === 5) return  // Already have today's quests

        if (player.lastQuestDate !== today) {
          // NEW DAY — generate fresh quests, keep completed history separate
          const newQuests = generateFallbackQuests()  // generates exactly 5
          const incomplete = quests.filter(q => q.status === 'PENDING' && q.isDaily && q.date !== today)

          if (incomplete.length > 0 && player.lastQuestDate) {
            // Streak broken — penalty
            const newPlayer = { ...player, penaltyActive: true, lastQuestDate: today, hp: Math.max(10, player.hp - 20), streak: 0 }
            soundPenalty()
            set({
              player: newPlayer,
              quests: newQuests,  // ONLY today's 5 quests, old ones dropped
              notifications: [{ id: genId(), type: 'PENALTY', title: '[ PENALTY ZONE ]', message: `${incomplete.length} quests incomplete.\nHP -20. Streak broken.`, timestamp: new Date().toISOString() }],
            })
          } else {
            // Streak continues
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            const newStreak = player.lastStreakDate === yesterday ? player.streak + 1 : 1
            const streakBonus = calculateStreakBonus(newStreak)

            soundNotification()
            set({
              player: { ...player, lastQuestDate: today, penaltyActive: false, streak: newStreak, bestStreak: Math.max(player.bestStreak, newStreak), lastStreakDate: today },
              quests: newQuests,  // ONLY today's 5 quests, old ones dropped
              notifications: [{
                id: genId(), type: 'QUEST', title: '[ DAILY QUESTS ISSUED ]',
                message: newStreak > 1 ? `Day ${newStreak} streak! ${streakBonus > 0 ? `+${streakBonus} XP bonus.` : ''}` : '5 new quests have been issued.',
                timestamp: new Date().toISOString(),
              }],
            })

            if (streakBonus > 0) {
              soundStreak()
              get().applyXp(streakBonus)
            }
          }
        }
      },

      updateQuestProgress: (id, progress) => set(state => ({ quests: state.quests.map(q => q.id === id ? { ...q, progress: Math.min(q.target, Math.max(0, progress)) } : q) })),

      completeQuest: (id) => {
        const { quests, player } = get()
        if (!player) return
        const quest = quests.find(q => q.id === id)
        if (!quest || quest.status !== 'PENDING') return

        soundQuestComplete()
        const updatedQuests = quests.map(q => q.id === id ? { ...q, status: 'COMPLETE' as const, progress: q.target } : q)
        const newPlayer = { ...player }
        newPlayer.playerPoints += quest.pointReward
        newPlayer.totalQuestsCompleted += 1
        newPlayer.fatigue = Math.min(newPlayer.fatigueMax, newPlayer.fatigue + 5)

        for (const [stat, val] of Object.entries(quest.statReward)) {
          newPlayer.stats[stat as StatKey] += val as number
        }

        newPlayer.hpMax = hpFromStats(newPlayer.stats, newPlayer.level)
        newPlayer.mpMax = mpFromStats(newPlayer.stats, newPlayer.level)
        newPlayer.fatigueMax = fatigueMaxFromStats(newPlayer.stats)

        set({ quests: updatedQuests, player: newPlayer })

        // v4.1: Combo system — increment combo on consecutive quest completions
        const now = Date.now()
        const COMBO_WINDOW = 5 * 60 * 1000  // 5 minutes between quests to maintain combo
        const currentCombo = (now - get().comboTimer < COMBO_WINDOW) ? get().combo + 1 : 1
        set({ combo: currentCombo, comboTimer: now })

        // Apply XP with ALL multipliers (streak + combo + booster + rebirth + title)
        const effectiveMult = get().getEffectiveXpMultiplier()
        const finalXp = Math.floor(quest.xpReward * effectiveMult)
        get().applyXp(finalXp)
        set({ lastReward: { xp: finalXp, pp: quest.pointReward, ts: Date.now() } })

        // Build bonus message
        const comboInfo = getComboMultiplier(currentCombo)
        let bonusMsg = ''
        if (effectiveMult > 1) bonusMsg = ` (${Math.round((effectiveMult - 1) * 100)}% total bonus)`
        if (comboInfo.multiplier > 1) bonusMsg += ` ${comboInfo.icon} ${comboInfo.label}!`

        get().pushNotification({ type: 'SUCCESS', title: '[ QUEST COMPLETE ]', message: `${quest.title}\n+${finalXp} XP  +${quest.pointReward} PP${bonusMsg}` })

        // Check if all daily quests complete — apply streak bonus
        const remaining = updatedQuests.filter(q => q.status === 'PENDING' && q.isDaily)
        if (remaining.length === 0) {
          get().pushNotification({ type: 'SUCCESS', title: '[ ALL DAILY QUESTS COMPLETE ]', message: `Day ${newPlayer.streak} streak!\nBonus: +200 XP, +20 PP` })
          get().applyXp(200)
          set(state => ({ player: state.player ? { ...state.player, playerPoints: state.player.playerPoints + 20 } : null }))
        }

        // Check achievements
        get().applyXp(0) // trigger achievement check without adding XP
      },

      skipQuest: (id) => {
        const stealth = get().skills.find(s => s.id === 'stealth')
        if (!stealth?.unlocked) return
        soundClick()
        set(state => ({ quests: state.quests.map(q => q.id === id ? { ...q, status: 'SKIPPED' as const } : q) }))
        get().pushNotification({ type: 'SYSTEM', title: '[ STEALTH ACTIVATED ]', message: 'Quest skipped. No penalty.' })
      },

      rerollQuests: () => {
        soundNotification()
        const today = todayStr()
        // Replace ONLY today's quests with 5 new ones
        const oldNonDaily = get().quests.filter(q => !q.isDaily || q.date !== today)
        set({ quests: [...oldNonDaily, ...generateFallbackQuests()] })
        get().pushNotification({ type: 'SYSTEM', title: '[ QUESTS REROLLED ]', message: '5 new quests have been issued.' })
      },

      allocateStat: (stat) => {
        const { player } = get()
        if (!player || player.statPoints <= 0) return
        soundStatUp()
        const newStats = { ...player.stats, [stat]: player.stats[stat] + 1 }
        set({ player: { ...player, stats: newStats, statPoints: player.statPoints - 1, hpMax: hpFromStats(newStats, player.level), mpMax: mpFromStats(newStats, player.level), fatigueMax: fatigueMaxFromStats(newStats) } })
      },

      selectJob: (job) => {
        const { player } = get()
        if (!player || player.level < 10 || player.job !== 'NONE') return
        soundSkillUnlock()
        set({ player: { ...player, job, jobUnlocked: true } })
        get().pushNotification({ type: 'SUCCESS', title: '[ JOB CLASS SELECTED ]', message: `You are now a ${JOB_CLASSES[job].name}.\n${JOB_CLASSES[job].bonuses}` })
        if (job === 'NECROMANCER') {
          set(state => ({ skills: state.skills.map(s => s.id === 'shadow_extract' ? { ...s, unlocked: true } : s) }))
        }
        get().applyXp(0) // trigger achievement check
      },

      unlockSkill: (id) => {
        const { skills, player } = get()
        if (!player) return
        const skill = skills.find(s => s.id === id)
        if (!skill || skill.unlocked || player.level < skill.unlockLevel) return
        soundSkillUnlock()
        set(state => ({ skills: state.skills.map(s => s.id === id ? { ...s, unlocked: true } : s) }))
        get().pushNotification({ type: 'SUCCESS', title: '[ SKILL UNLOCKED ]', message: `${skill.name}\n${skill.description}` })
      },

      startDungeon: (type) => {
        const { player, activeDungeon } = get()
        if (!player || activeDungeon) return
        const rewards = dungeonRewards(type)
        soundGateOpen()
        const dungeon: DungeonRun = {
          id: genId(), type, name: type.replace('_', ' '),
          duration: type === 'FOCUS_SPRINT' ? 25 : type === 'DEEP_WORK' ? 90 : type === 'LEARNING' ? 60 : 45,
          startedAt: new Date().toISOString(), completedAt: null,
          status: 'ACTIVE', xpReward: rewards.xp, pointReward: rewards.points, shadowEligible: rewards.shadowEligible,
        }
        set({ activeDungeon: dungeon })
        get().pushNotification({ type: 'WARNING', title: '[ GATE OPENED ]', message: `${dungeon.name} dungeon entered.\nDuration: ${dungeon.duration} min.` })
      },

      completeDungeon: (id) => {
        const { activeDungeon, player } = get()
        if (!activeDungeon || !player || activeDungeon.id !== id) return
        soundDungeonClear()
        const newPlayer = { ...player, playerPoints: player.playerPoints + activeDungeon.pointReward, totalDungeonsCleared: player.totalDungeonsCleared + 1, fatigue: Math.min(player.fatigueMax, player.fatigue + 15) }
        set({ activeDungeon: { ...activeDungeon, status: 'CLEARED', completedAt: new Date().toISOString() }, player: newPlayer })
        get().applyXp(activeDungeon.xpReward)
        get().pushNotification({ type: 'SUCCESS', title: '[ DUNGEON CLEARED ]', message: `${activeDungeon.name} cleared!\n+${activeDungeon.xpReward} XP  +${activeDungeon.pointReward} PP` })

        // Give XP to deployed shadows
        const shadowXpReward = Math.floor(activeDungeon.xpReward * 0.3)
        set(state => ({
          shadows: state.shadows.map(s => {
            if (!s.deployed) return s
            let newXp = s.xp + shadowXpReward
            let newLevel = s.level
            while (newXp >= shadowXpForLevel(newLevel)) {
              newXp -= shadowXpForLevel(newLevel)
              newLevel++
            }
            return { ...s, xp: newXp, xpToNext: shadowXpForLevel(newLevel), level: newLevel, attack: s.attack + 2, defense: s.defense + 1, ability: getShadowAbility(s.rank, newLevel) }
          }),
        }))

        if (activeDungeon.shadowEligible) {
          get().pushNotification({ type: 'SHADOW', title: '[ SHADOW EXTRACTION AVAILABLE ]', message: 'A shadow can be extracted from this cleared dungeon.' })
        }

        // v4: Equipment drop chance
        const { rollEquipmentDrop } = require('./system')
        const drop = rollEquipmentDrop(activeDungeon.type)
        if (drop) {
          set(state => ({ inventory: [...state.inventory, { ...drop, quantity: 1, type: 'EQUIPMENT' }] }))
          get().pushNotification({ type: 'SUCCESS', title: '[ EQUIPMENT DROP ]', message: `${drop.icon} ${drop.name}\n[${drop.rarity}]\n${drop.description}` })
        }

        setTimeout(() => set({ activeDungeon: null }), 100)
      },

      failDungeon: (id) => {
        const { activeDungeon, player } = get()
        if (!activeDungeon || !player || activeDungeon.id !== id) return
        soundPenalty()
        set({
          activeDungeon: { ...activeDungeon, status: 'FAILED', completedAt: new Date().toISOString() },
          player: { ...player, fatigue: Math.min(player.fatigueMax, player.fatigue + 30), hp: Math.max(1, player.hp - 30) },
        })
        get().pushNotification({ type: 'PENALTY', title: '[ DUNGEON FAILED ]', message: `${activeDungeon.name} failed.\nHP -30. Fatigue +30.` })
        setTimeout(() => set({ activeDungeon: null }), 100)
      },

      extractShadow: (dungeonId, originalName) => {
        const { player, activeDungeon } = get()
        if (!player) return
        const shadowSkill = get().skills.find(s => s.id === 'shadow_extract')
        if (!shadowSkill?.unlocked) {
          get().pushNotification({ type: 'WARNING', title: '[ SKILL LOCKED ]', message: 'Shadow Extraction is not unlocked.\nReach Level 10 and select Necromancer.' })
          return
        }

        const baseRate = 0.5
        const perBonus = player.stats.PER * 0.01
        const jobBonus = player.job === 'NECROMANCER' ? 0.3 : 0
        const successRate = Math.min(0.95, baseRate + perBonus + jobBonus)

        if (Math.random() >= successRate) {
          soundWarning()
          get().pushNotification({ type: 'WARNING', title: '[ EXTRACTION FAILED ]', message: 'The shadow resisted extraction.' })
          return
        }

        soundShadowExtract()
        const rank = shadowRankFromDungeon(activeDungeon?.type || 'DEEP_WORK')
        const shadowName = SHADOW_NAMES[Math.floor(Math.random() * SHADOW_NAMES.length)]
        const shadow: Shadow = {
          id: genId(), name: shadowName, originalName, rank,
          level: Math.max(1, player.level - 5 + Math.floor(Math.random() * 10)),
          extractedAt: new Date().toISOString(),
          description: `Shadow of ${originalName}. Rank ${rank} soldier.`,
          attack: 20 + Math.floor(Math.random() * 30) + player.stats.STR,
          defense: 15 + Math.floor(Math.random() * 20) + player.stats.VIT,
          xp: 0, xpToNext: shadowXpForLevel(1), loyalty: 50, deployed: false,
          ability: getShadowAbility(rank, 1),
        }

        set(state => ({
          shadows: [...state.shadows, shadow],
          player: state.player ? { ...state.player, totalShadowsExtracted: state.player.totalShadowsExtracted + 1 } : null,
        }))
        get().pushNotification({ type: 'SHADOW', title: '[ SHADOW EXTRACTED ]', message: `${shadow.name} has risen.\nRank: ${shadow.rank}  LV: ${shadow.level}\nATK: ${shadow.attack}  DEF: ${shadow.defense}\nAbility: ${shadow.ability}` })
        get().applyXp(0) // trigger achievement check
      },

      deployShadow: (id) => {
        set(state => ({ shadows: state.shadows.map(s => s.id === id ? { ...s, deployed: true } : s) }))
        soundClick()
      },

      undeployShadow: (id) => {
        set(state => ({ shadows: state.shadows.map(s => s.id === id ? { ...s, deployed: false } : s) }))
        soundClick()
      },

      buyItem: (id) => {
        const { player } = get()
        if (!player) return
        const { SHOP_ITEMS } = require('./system')
        const item = SHOP_ITEMS.find((i: any) => i.id === id)
        if (!item) return
        const cost = { COMMON: 20, RARE: 50, EPIC: 100, LEGENDARY: 250, MYTHIC: 1000 }[item.rarity]
        if (player.playerPoints < cost) {
          get().pushNotification({ type: 'WARNING', title: '[ INSUFFICIENT POINTS ]', message: `Need ${cost} PP. Have ${player.playerPoints} PP.` })
          return
        }
        soundPurchase()
        const existing = get().inventory.find(i => i.id === id)
        if (existing) {
          set(state => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i), player: { ...state.player!, playerPoints: state.player!.playerPoints - cost } }))
        } else {
          set(state => ({ inventory: [...state.inventory, { ...item, quantity: 1 }], player: { ...state.player!, playerPoints: state.player!.playerPoints - cost } }))
        }
      },

      useItem: (id) => {
        const { inventory, player } = get()
        if (!player) return
        const item = inventory.find(i => i.id === id)
        if (!item || item.quantity <= 0) return
        soundClick()
        let updatedPlayer = { ...player }
        switch (item.effect) {
          case 'restore_hp_50': updatedPlayer.hp = Math.min(updatedPlayer.hpMax, updatedPlayer.hp + 50); break
          case 'restore_mp_30': updatedPlayer.mp = Math.min(updatedPlayer.mpMax, updatedPlayer.mp + 30); break
          case 'reset_fatigue': updatedPlayer.fatigue = 0; break
          case 'bonus_xp_100': get().applyXp(100); break
          case 'reroll_quests': get().rerollQuests(); break
        }
        set({ player: updatedPlayer, inventory: inventory.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0) })
      },

      pushNotification: (n) => {
        const notification: SystemNotification = { ...n, id: genId(), timestamp: new Date().toISOString() }
        set(state => ({ notifications: [...state.notifications.slice(-4), notification] }))
      },

      dismissNotification: (id) => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),
      clearNotifications: () => set({ notifications: [] }),
      dismissLevelUpCutscene: () => set({ levelUpCutscene: null }),

      // ═══ v4.1 FAST LEVELING ═══

      activateBooster: (boosterId: string) => {
        const { player } = get()
        if (!player) return
        const booster = XP_BOOSTERS.find(b => b.id === boosterId)
        if (!booster) return
        if (player.playerPoints < booster.cost) {
          get().pushNotification({ type: 'WARNING', title: '[ INSUFFICIENT PP ]', message: `Need ${booster.cost} PP for ${booster.name}.` })
          return
        }
        soundPurchase()
        set({
          player: { ...player, playerPoints: player.playerPoints - booster.cost },
          xpBoostUntil: Date.now() + booster.duration,
          xpBoostMultiplier: booster.multiplier,
        })
        get().pushNotification({ type: 'SUCCESS', title: '[ XP BOOSTER ACTIVATED ]', message: `${booster.icon} ${booster.name}\n+${Math.round((booster.multiplier - 1) * 100)}% XP for ${booster.duration / 60000} minutes.` })
      },

      claimDailyLogin: () => {
        const { player, loginDayCount, loginBonusClaimed } = get()
        if (!player || loginBonusClaimed) return
        const bonus = getDailyLoginBonus(loginDayCount + 1)
        soundQuestComplete()
        set({
          player: { ...player, playerPoints: player.playerPoints + bonus.pp },
          loginDayCount: loginDayCount + 1,
          loginBonusClaimed: true,
          lastLoginDate: todayStr(),
        })
        get().applyXp(bonus.xp)
        get().pushNotification({ type: 'SUCCESS', title: `[ ${bonus.icon} DAILY LOGIN BONUS ]`, message: `${bonus.label}\n+${bonus.xp} XP  +${bonus.pp} PP\nCome back tomorrow for more!` })
      },

      checkLoginBonus: () => {
        const { lastLoginDate, loginBonusClaimed } = get()
        const today = todayStr()
        if (lastLoginDate !== today && !loginBonusClaimed) {
          // New day — reset claim status
          set({ loginBonusClaimed: false })
          get().pushNotification({ type: 'SYSTEM', title: '[ DAILY LOGIN BONUS AVAILABLE ]', message: 'Claim your daily reward in the BAG tab.' })
        }
      },

      rebirth: () => {
        const { player, rebirthCount } = get()
        if (!player || player.level < 50) return
        const req = getRebirthRequirement(player.level)
        if (player.playerPoints < req.pp) {
          get().pushNotification({ type: 'WARNING', title: '[ REBIRTH FAILED ]', message: `Need ${req.pp} PP to rebirth.` })
          return
        }
        soundLevelUp()
        const newRebirthCount = rebirthCount + 1
        const rebirthBonus = getRebirthBonus(newRebirthCount)
        const newStats: Record<StatKey, number> = {
          STR: 10 + rebirthBonus.statBonus,
          AGI: 10 + rebirthBonus.statBonus,
          INT: 10 + rebirthBonus.statBonus,
          VIT: 10 + rebirthBonus.statBonus,
          PER: 10 + rebirthBonus.statBonus,
        }
        set({
          player: {
            ...player,
            level: 1,
            xp: 0,
            xpToNext: xpForLevel(1),
            statPoints: 0,
            stats: newStats,
            hpMax: hpFromStats(newStats, 1),
            mpMax: mpFromStats(newStats, 1),
            hp: hpFromStats(newStats, 1),
            mp: mpFromStats(newStats, 1),
            fatigue: 0,
            playerPoints: player.playerPoints - req.pp,
            job: 'NONE',
            jobUnlocked: false,
          },
          rebirthCount: newRebirthCount,
          skills: SKILLS.map(s => ({ ...s, unlocked: s.id === 'dash' })),
          shadows: [],
          levelUpCutscene: { level: 1, isMilestone: false, statPointsGained: 0, hpRestored: 0, mpRestored: 0 },
        })
        get().pushNotification({ type: 'LEVEL_UP', title: '[ REBIRTH COMPLETE ]', message: `You have been reborn.\nRebirth ${newRebirthCount} (${rebirthBonus.label})\n+${rebirthBonus.statBonus} to all stats\n+${Math.round((rebirthBonus.xpMultiplier - 1) * 100)}% permanent XP\nLevel reset to 1.` })
      },

      equipItem: (item: Equipment) => {
        const { equipment, inventory, player } = get()
        if (!player) return
        soundClick()
        const newEquipment = { ...equipment, [item.slot]: item }
        // Remove from inventory
        const newInventory = inventory.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
        ).filter(i => i.quantity > 0)
        set({ equipment: newEquipment, inventory: newInventory })
        get().pushNotification({ type: 'SUCCESS', title: '[ EQUIPPED ]', message: `${item.icon} ${item.name} equipped to ${EQUIP_SLOTS[item.slot].name} slot.` })
      },

      unequipItem: (slot: EquipSlot) => {
        const { equipment, inventory } = get()
        const item = equipment[slot]
        if (!item) return
        soundClick()
        const newEquipment = { ...equipment }
        delete newEquipment[slot]
        // Return to inventory
        const existing = inventory.find(i => i.id === item.id)
        let newInventory
        if (existing) {
          newInventory = inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        } else {
          newInventory = [...inventory, { ...item, quantity: 1, type: 'EQUIPMENT' }]
        }
        set({ equipment: newEquipment, inventory: newInventory })
        get().pushNotification({ type: 'SYSTEM', title: '[ UNEQUIPPED ]', message: `${item.icon} ${item.name} moved to inventory.` })
      },

      getEffectiveXpMultiplier: () => {
        const { xpBoostUntil, xpBoostMultiplier, player, rebirthCount } = get()
        let mult = 1.0
        // XP booster (temporary)
        if (Date.now() < xpBoostUntil && xpBoostMultiplier > 1) {
          mult *= xpBoostMultiplier
        }
        // Rebirth bonus (permanent)
        const rebirthBonus = getRebirthBonus(rebirthCount)
        mult *= rebirthBonus.xpMultiplier
        // Streak bonus
        if (player && player.streak >= 3) {
          mult *= getStreakMultiplier(player.streak)
        }
        // Title bonus
        if (player) {
          const titleBonus = getTitleBonus(player.title)
          if (titleBonus.xpBonus) mult *= (1 + titleBonus.xpBonus)
        }
        // Combo bonus
        const { combo } = get()
        const comboMult = getComboMultiplier(combo)
        mult *= comboMult.multiplier
        return mult
      },

      applyXp: (xp) => {
        const { player } = get()
        if (!player) return

        let newXp = player.xp + xp
        let newLevel = player.level
        let newStatPoints = player.statPoints
        let leveledUp = false

        while (newXp >= xpForLevel(newLevel)) {
          newXp -= xpForLevel(newLevel)
          newLevel += 1
          newStatPoints += 3 + (newLevel % 10 === 0 ? 2 : 0)
          leveledUp = true
        }

        if (leveledUp) {
          soundLevelUp()
          const newStats = { ...player.stats }
          const statPointsGained = newStatPoints - player.statPoints
          const oldHpMax = player.hpMax
          const oldMpMax = player.mpMax
          const newHpMax = hpFromStats(newStats, newLevel)
          const newMpMax = mpFromStats(newStats, newLevel)
          const updatedPlayer: Player = {
            ...player, level: newLevel, xp: newXp, xpToNext: xpForLevel(newLevel), statPoints: newStatPoints,
            hpMax: newHpMax, mpMax: newMpMax, hp: newHpMax, mp: newMpMax,
            fatigue: Math.max(0, player.fatigue - 20),
          }
          set({ player: updatedPlayer, levelUpCutscene: { level: newLevel, isMilestone: newLevel % 10 === 0, statPointsGained, hpRestored: newHpMax - oldHpMax + (oldHpMax - player.hp), mpRestored: newMpMax - oldMpMax + (oldMpMax - player.mp) } })
          get().pushNotification({ type: 'LEVEL_UP', title: '[ LEVEL UP ]', message: `You are now Level ${newLevel}.\nHP & MP fully restored.\n+${statPointsGained} stat points.` })

          // Auto-unlock passive skills
          get().skills.forEach(skill => {
            if (!skill.unlocked && newLevel >= skill.unlockLevel && skill.category === 'PASSIVE') {
              set(state => ({ skills: state.skills.map(s => s.id === skill.id ? { ...s, unlocked: true } : s) }))
              get().pushNotification({ type: 'SUCCESS', title: '[ SKILL UNLOCKED ]', message: `${skill.name}\n${skill.description}` })
            }
          })

          if (newLevel === 10 && player.job === 'NONE') {
            get().pushNotification({ type: 'SYSTEM', title: '[ JOB CHANGE AVAILABLE ]', message: 'You have reached Level 10.\nA class can now be selected.' })
          }
        } else if (xp > 0) {
          set({ player: { ...player, xp: newXp } })
        }

        // Check achievements (regardless of level up)
        const currentPlayer = get().player!
        const newAchievements = checkAchievements(currentPlayer, get().shadows)
        if (newAchievements.length > 0) {
          soundAchievement()
          const updatedPlayer = { ...currentPlayer, achievements: [...currentPlayer.achievements, ...newAchievements.map(a => a.id)] }
          // Set the most recent achievement's title
          if (newAchievements.length > 0) {
            updatedPlayer.title = newAchievements[newAchievements.length - 1].title
          }
          set({ player: updatedPlayer })
          for (const ach of newAchievements) {
            get().pushNotification({ type: 'SUCCESS', title: '[ ACHIEVEMENT UNLOCKED ]', message: `${ach.icon} ${ach.name}\n${ach.description}\nTitle: "${ach.title}"` })
          }
        }
      },

      applyDamage: (amount) => { const { player } = get(); if (!player) return; set({ player: { ...player, hp: Math.max(0, player.hp - amount) } }) },
      restoreHp: (amount) => { const { player } = get(); if (!player) return; set({ player: { ...player, hp: Math.min(player.hpMax, player.hp + amount) } }) },
      restoreMp: (amount) => { const { player } = get(); if (!player) return; set({ player: { ...player, mp: Math.min(player.mpMax, player.mp + amount) } }) },
      addFatigue: (amount) => { const { player } = get(); if (!player) return; set({ player: { ...player, fatigue: Math.min(player.fatigueMax, player.fatigue + amount) } }) },
      resetFatigue: () => { const { player } = get(); if (!player) return; set({ player: { ...player, fatigue: 0 } }) },
    }),
    {
      name: 'solo-leveling-system',
      version: 3,
      partialize: (state) => ({
        booted: state.booted, player: state.player, quests: state.quests,
        skills: state.skills, shadows: state.shadows, inventory: state.inventory,
        soundEnabled: state.soundEnabled,
      }),
      // ═══ MIGRATION — upgrade old v2 state to v3 (add missing fields) ═══
      migrate: (persistedState: any, version: number) => {
        const s = persistedState as any
        // If player exists but is missing v3 fields, add defaults
        if (s?.player) {
          const p = s.player
          if (p.streak === undefined) p.streak = 0
          if (p.bestStreak === undefined) p.bestStreak = 0
          if (p.lastStreakDate === undefined) p.lastStreakDate = null
          if (p.title === undefined) p.title = 'The Player'
          if (p.achievements === undefined) p.achievements = []
          if (p.penaltyActive === undefined) p.penaltyActive = false
          if (p.jobUnlocked === undefined) p.jobUnlocked = p.job !== 'NONE'
          if (p.xpToNext === undefined) p.xpToNext = xpForLevel(p.level || 1)
          if (p.hpMax === undefined) p.hpMax = hpFromStats(p.stats || {STR:10,AGI:10,INT:10,VIT:10,PER:10}, p.level || 1)
          if (p.mpMax === undefined) p.mpMax = mpFromStats(p.stats || {STR:10,AGI:10,INT:10,VIT:10,PER:10}, p.level || 1)
          if (p.fatigueMax === undefined) p.fatigueMax = fatigueMaxFromStats(p.stats || {STR:10,AGI:10,INT:10,VIT:10,PER:10})
        }
        // Migrate old shadows (add v3 fields)
        if (s?.shadows && Array.isArray(s.shadows)) {
          s.shadows = s.shadows.map((sh: any) => ({
            ...sh,
            xp: sh.xp ?? 0,
            xpToNext: sh.xpToNext ?? 50,
            loyalty: sh.loyalty ?? 50,
            deployed: sh.deployed ?? false,
            ability: sh.ability ?? 'Basic Strike',
          }))
        }
        return s
      },
      // Also run onRehydrateStorage as a safety net
      onRehydrateStorage: () => (state) => {
        if (state?.player) {
          const p = state.player as any
          if (p.streak === undefined) p.streak = 0
          if (p.bestStreak === undefined) p.bestStreak = 0
          if (p.lastStreakDate === undefined) p.lastStreakDate = null
          if (p.title === undefined) p.title = 'The Player'
          if (p.achievements === undefined) p.achievements = []
          if (p.penaltyActive === undefined) p.penaltyActive = false
          if (p.jobUnlocked === undefined) p.jobUnlocked = p.job !== 'NONE'
        }
      },
    }
  )
)
