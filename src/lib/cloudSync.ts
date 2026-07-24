'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSystem } from './store'
import { getAuth, apiPull, apiPush, apiGenerateQuests, getTimeOfDay } from './auth'
import { xpForLevel, hpFromStats, mpFromStats, fatigueMaxFromStats } from './system'

// ════════════════════════════════════════════════════════════════
// TIMESTAMP-BASED SYNC (v6 — no more DELETE ALL)
// ════════════════════════════════════════════════════════════════
//
// Rules:
// 1. Every record has an `updatedAt` timestamp
// 2. On PULL: only update local record if DB.updatedAt > local.updatedAt
// 3. On PUSH: only send records that changed locally (hash compare)
// 4. NEVER delete all and reinsert — update individual records
// 5. Quest completion: push only the changed quest, not all quests

const POLL_INTERVAL = 60000  // 60 seconds (was 15s)
const PUSH_DEBOUNCE = 3000

export function useCloudSync() {
  const player = useSystem(s => s.player)
  const quests = useSystem(s => s.quests)
  const shadows = useSystem(s => s.shadows)
  const inventory = useSystem(s => s.inventory)
  const skills = useSystem(s => s.skills)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPushHash = useRef<string>('')
  const isPulling = useRef(false)

  // ═══ PUSH — only push if data actually changed ═══
  const pushToCloud = useCallback(async () => {
    const auth = getAuth()
    if (!auth || !player) return

    // Guard: never push if quests are empty
    if (useSystem.getState().booted && (!quests || quests.length === 0)) return

    const data = {
      player: {
        ...player,
        hpMax: hpFromStats(player.stats, player.level),
        mpMax: mpFromStats(player.stats, player.level),
        fatigueMax: fatigueMaxFromStats(player.stats),
        updatedAt: new Date().toISOString(),
      },
      quests, shadows, inventory,
      skills: skills.map(s => ({ id: s.id, unlocked: s.unlocked })),
    }

    // Hash check — skip if nothing changed
    const hash = JSON.stringify(data)
    if (hash === lastPushHash.current) return
    lastPushHash.current = hash

    await apiPush(auth.token, data)
  }, [player, quests, shadows, inventory, skills])

  // Debounced push
  useEffect(() => {
    if (!player || !getAuth()) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => pushToCloud(), PUSH_DEBOUNCE)
    return () => { if (pushTimer.current) clearTimeout(pushTimer.current) }
  }, [player, quests, shadows, inventory, skills, pushToCloud])

  // ═══ PULL — timestamp-based merge (no overwrite of newer local data) ═══
  const pullFromCloud = useCallback(async () => {
    const auth = getAuth()
    if (!auth || isPulling.current) return
    isPulling.current = true

    try {
      const data = await apiPull(auth.token)
      if (!data || !data.player) { isPulling.current = false; return }

      const cloudPlayer = data.player
      const currentState = useSystem.getState()
      const localPlayer = currentState.player

      // ═══ PLAYER: merge by LEVEL + XP (not just timestamp) ═══
      // FIX: Phone had Level 2, desktop had Level 4. Timestamp comparison
      // was unreliable because phone's push refreshed updatedAt even with
      // stale data. Now we compare actual progression: higher level+xp wins.
      if (localPlayer) {
        const cloudProgress = (cloudPlayer.level || 1) * 100000 + (cloudPlayer.xp || 0)
        const localProgress = (localPlayer.level || 1) * 100000 + (localPlayer.xp || 0)

        if (cloudProgress > localProgress) {
          // Cloud has MORE progress — pull it (cloud wins)
          useSystem.setState({
            player: {
              ...localPlayer,
              ...cloudPlayer,
              xpToNext: xpForLevel(cloudPlayer.level || 1),
              hpMax: cloudPlayer.hpMax || hpFromStats(cloudPlayer.stats, cloudPlayer.level),
              mpMax: cloudPlayer.mpMax || mpFromStats(cloudPlayer.stats, cloudPlayer.level),
              fatigueMax: cloudPlayer.fatigueMax || fatigueMaxFromStats(cloudPlayer.stats),
            },
          })
        }
        // If local has MORE progress, do nothing — local wins, push will sync it
      }

      // ═══ QUESTS: merge by updatedAt — don't overwrite newer local quests ═══
      const cloudQuests = data.quests || []
      const localQuests = currentState.quests

      if (cloudQuests.length > 0) {
        // For each cloud quest, check if local has a newer version
        const mergedQuests = cloudQuests.map((cq: any) => {
          const localMatch = localQuests.find(lq => lq.id === cq.id)
          if (localMatch) {
            // Keep whichever is newer
            const cloudQ = new Date(cq.updatedAt || 0).getTime()
            const localQ = new Date(localMatch.updatedAt || 0).getTime()
            return localQ > cloudQ ? localMatch : cq
          }
          return cq // New quest from cloud
        })

        // Add local quests that don't exist in cloud
        for (const lq of localQuests) {
          if (!mergedQuests.find((mq: any) => mq.id === lq.id)) {
            mergedQuests.push(lq)
          }
        }

        useSystem.setState({ quests: mergedQuests })
      }

      // ═══ SHADOWS: merge by updatedAt ═══
      const cloudShadows = data.shadows || []
      if (cloudShadows.length > 0) {
        const mergedShadows = cloudShadows.map((cs: any) => {
          const localMatch = currentState.shadows.find(ls => ls.id === cs.id)
          if (localMatch) {
            const cloudS = new Date(cs.updatedAt || 0).getTime()
            const localS = new Date(localMatch.updatedAt || 0).getTime()
            return localS > cloudS ? localMatch : cs
          }
          return cs
        })
        for (const ls of currentState.shadows) {
          if (!mergedShadows.find((ms: any) => ms.id === ls.id)) mergedShadows.push(ls)
        }
        useSystem.setState({ shadows: mergedShadows })
      }

      // ═══ INVENTORY: simple replace (inventory changes are less frequent) ═══
      if (data.inventory && data.inventory.length >= 0) {
        const cloudInvHash = JSON.stringify(data.inventory)
        const localInvHash = JSON.stringify(currentState.inventory)
        if (cloudInvHash !== localInvHash) {
          useSystem.setState({ inventory: data.inventory })
        }
      }

      // ═══ SKILLS: merge ═══
      if (data.skills) {
        useSystem.setState({
          skills: currentState.skills.map(s => {
            const cs = data.skills.find((cs: any) => cs.id === s.id)
            return cs ? { ...s, unlocked: cs.unlocked } : s
          }),
        })
      }
    } catch (e) {
      console.error('[SYNC] Pull error:', e)
    } finally {
      isPulling.current = false
    }
  }, [])

  // Polling: every 15 seconds when tab visible
  useEffect(() => {
    if (!getAuth()) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') pullFromCloud()
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [pullFromCloud])

  // Focus-based: pull immediately on tab focus
  useEffect(() => {
    if (!getAuth()) return
    const onFocus = () => pullFromCloud()
    const onVisible = () => { if (document.visibilityState === 'visible') pullFromCloud() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pullFromCloud])
}

// ═══ AUTH ACTIONS ═══
export { registerAndBoot, loginAndPull, loginWithCredentials, generateAIQuestsNow, pushToCloudNow, logout, isLoggedIn } from './auth-helpers'
