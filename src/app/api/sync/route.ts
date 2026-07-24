import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, tursoBatch, genId, now } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ═══ PULL — fetch all player data from cloud ═══
async function handlePull(playerId: string) {
  const players = await tursoQuery('SELECT * FROM sl_players WHERE id = ?', [playerId])
  if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const p = players[0]
  const stats = JSON.parse(p.stats_json || '{"STR":10,"AGI":10,"INT":10,"VIT":10,"PER":10}')

  // Fetch quests, shadows, inventory, skills
  const [quests, shadows, inventory, skills] = await Promise.all([
    tursoQuery('SELECT * FROM sl_quests WHERE player_id = ? ORDER BY created_at DESC', [playerId]),
    tursoQuery('SELECT * FROM sl_shadows WHERE player_id = ?', [playerId]),
    tursoQuery('SELECT * FROM sl_inventory WHERE player_id = ?', [playerId]),
    tursoQuery('SELECT * FROM sl_skills WHERE player_id = ?', [playerId]),
  ])

  return NextResponse.json({
    player: {
      id: p.id, name: p.username, level: p.level, xp: p.xp,
      hp: p.hp, hpMax: 225 + (stats.VIT || 10) * 10 + p.level * 5,
      mp: p.mp, mpMax: 30 + (stats.INT || 10) * 8 + p.level * 3,
      fatigue: p.fatigue, fatigueMax: 100 + (stats.VIT || 10) * 2,
      statPoints: p.stat_points, stats, job: p.job, jobUnlocked: p.job !== 'NONE',
      playerPoints: p.player_points, lastQuestDate: p.last_quest_date,
      createdAt: p.created_at, updatedAt: p.updated_at,
      totalQuestsCompleted: p.total_quests, totalDungeonsCleared: p.total_dungeons, totalShadowsExtracted: p.total_shadows,
      streak: p.streak || 0, bestStreak: p.best_streak || 0, lastStreakDate: p.last_streak_date,
      title: p.title || 'The Player', achievements: JSON.parse(p.achievements || '[]'),
      questMode: p.quest_mode || 'FIXED',
      combo: p.combo || 0, comboTimer: p.combo_timer || 0,
      xpBoostUntil: p.xp_boost_until || 0, xpBoostMultiplier: p.xp_boost_multiplier || 1,
      rebirthCount: p.rebirth_count || 0,
      loginDayCount: p.login_day_count || 0, loginBonusClaimed: !!p.login_bonus_claimed,
    },
    quests: quests.map((q: any) => ({
      id: q.id, title: q.title, description: q.description, category: q.category,
      difficulty: q.difficulty, xpReward: q.xp_reward, pointReward: q.point_reward,
      statReward: JSON.parse(q.stat_reward_json || '{}'),
      target: q.target, unit: q.unit || 'REPS', progress: q.progress,
      status: q.status, date: q.quest_date, isDaily: !!q.is_daily, updatedAt: q.updated_at || q.created_at,
    })),
    shadows: shadows.map((s: any) => ({
      id: s.id, name: s.name, originalName: s.original_name, rank: s.rank, level: s.level,
      attack: s.attack, defense: s.defense, description: s.description, extractedAt: s.extracted_at,
      xp: s.xp || 0, xpToNext: s.xp_to_next || 50, loyalty: s.loyalty || 50, deployed: !!s.deployed,
      ability: s.ability || 'Basic Strike', updatedAt: s.updated_at || s.extracted_at,
    })),
    inventory: inventory.map((i: any) => ({
      id: i.item_id, name: i.name, description: i.description, rarity: i.rarity, icon: i.icon,
      type: i.item_type, effect: i.effect, quantity: i.quantity,
    })),
    skills: skills.map((s: any) => ({ id: s.skill_id, unlocked: !!s.unlocked })),
  })
}

// ═══ PUSH — INCREMENTAL UPDATE (no DELETE ALL) ═══
async function handlePush(playerId: string, body: any) {
  const { player, quests, shadows, inventory, skills } = body
  const ts = now()

  // 1. Update player record (always)
  await tursoExecute(
    `UPDATE sl_players SET level=?, xp=?, hp=?, mp=?, fatigue=?, stat_points=?, stats_json=?, job=?, player_points=?, last_quest_date=?, updated_at=?, total_quests=?, total_dungeons=?, total_shadows=?, streak=?, best_streak=?, last_streak_date=?, title=?, achievements=?, quest_mode=?, combo=?, combo_timer=?, xp_boost_until=?, xp_boost_multiplier=?, rebirth_count=?, login_day_count=?, login_bonus_claimed=? WHERE id=?`,
    [
      player.level, player.xp, player.hp, player.mp, player.fatigue,
      player.statPoints, JSON.stringify(player.stats), player.job,
      player.playerPoints, player.lastQuestDate, ts,
      player.totalQuestsCompleted || 0, player.totalDungeonsCleared || 0, player.totalShadowsExtracted || 0,
      player.streak || 0, player.bestStreak || 0, player.lastStreakDate || null,
      player.title || 'The Player', JSON.stringify(player.achievements || []),
      player.questMode || 'FIXED',
      player.combo || 0, player.comboTimer || 0,
      player.xpBoostUntil || 0, player.xpBoostMultiplier || 1,
      player.rebirthCount || 0,
      player.loginDayCount || 0, player.loginBonusClaimed ? 1 : 0,
      playerId,
    ]
  )

  // 2. QUESTS — UPSERT (update if exists, insert if new) — NO DELETE ALL
  if (quests?.length) {
    for (const q of quests) {
      const existing = await tursoQuery('SELECT id FROM sl_quests WHERE id = ?', [q.id])
      if (existing.length > 0) {
        // Update existing quest
        await tursoExecute(
          `UPDATE sl_quests SET title=?, description=?, category=?, difficulty=?, xp_reward=?, point_reward=?, stat_reward_json=?, target=?, unit=?, progress=?, status=?, updated_at=? WHERE id=?`,
          [q.title, q.description || '', q.category, q.difficulty, q.xpReward, q.pointReward, JSON.stringify(q.statReward || {}), q.target, q.unit || 'REPS', q.progress || 0, q.status, q.updatedAt || ts, q.id]
        )
      } else {
        // Insert new quest
        await tursoExecute(
          `INSERT INTO sl_quests (id, player_id, title, description, category, difficulty, xp_reward, point_reward, stat_reward_json, target, unit, progress, status, quest_date, is_daily, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, playerId, q.title, q.description || '', q.category, q.difficulty, q.xpReward, q.pointReward, JSON.stringify(q.statReward || {}), q.target, q.unit || 'REPS', q.progress || 0, q.status, q.date, q.isDaily ? 1 : 0, ts, q.updatedAt || ts]
        )
      }
    }
  }

  // 3. SHADOWS — UPSERT
  if (shadows?.length) {
    for (const s of shadows) {
      const existing = await tursoQuery('SELECT id FROM sl_shadows WHERE id = ?', [s.id])
      if (existing.length > 0) {
        await tursoExecute(
          `UPDATE sl_shadows SET name=?, rank=?, level=?, attack=?, defense=?, xp=?, xp_to_next=?, loyalty=?, deployed=?, ability=?, updated_at=? WHERE id=?`,
          [s.name, s.rank, s.level, s.attack, s.defense, s.xp || 0, s.xpToNext || 50, s.loyalty || 50, s.deployed ? 1 : 0, s.ability || 'Basic Strike', s.updatedAt || ts, s.id]
        )
      } else {
        await tursoExecute(
          `INSERT INTO sl_shadows (id, player_id, name, original_name, rank, level, attack, defense, description, extracted_at, xp, xp_to_next, loyalty, deployed, ability, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, playerId, s.name, s.originalName || '', s.rank, s.level, s.attack, s.defense, s.description || '', s.extractedAt || ts, s.xp || 0, s.xpToNext || 50, s.loyalty || 50, s.deployed ? 1 : 0, s.ability || 'Basic Strike', s.updatedAt || ts]
        )
      }
    }
  }

  // 4. INVENTORY — UPSERT
  if (inventory?.length) {
    for (const i of inventory) {
      const existing = await tursoQuery('SELECT id FROM sl_inventory WHERE item_id = ? AND player_id = ?', [i.id, playerId])
      if (existing.length > 0) {
        await tursoExecute('UPDATE sl_inventory SET quantity=? WHERE item_id=? AND player_id=?', [i.quantity, i.id, playerId])
      } else {
        await tursoExecute(
          `INSERT INTO sl_inventory (id, player_id, item_id, name, description, rarity, icon, item_type, effect, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [genId(), playerId, i.id, i.name, i.description || '', i.rarity, i.icon, i.type, i.effect || '', i.quantity, ts]
        )
      }
    }
  }

  // 5. SKILLS — UPSERT
  if (skills?.length) {
    for (const s of skills) {
      const existing = await tursoQuery('SELECT id FROM sl_skills WHERE player_id = ? AND skill_id = ?', [playerId, s.id])
      if (existing.length > 0) {
        await tursoExecute('UPDATE sl_skills SET unlocked = ? WHERE player_id = ? AND skill_id = ?', [s.unlocked ? 1 : 0, playerId, s.id])
      } else {
        await tursoExecute('INSERT INTO sl_skills (id, player_id, skill_id, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?)', [genId(), playerId, s.id, s.unlocked ? 1 : 0, s.unlocked ? ts : null])
      }
    }
  }

  return NextResponse.json({ success: true, syncedAt: ts })
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId, password] = decoded.split(':')
    const players = await tursoQuery('SELECT password FROM sl_players WHERE id = ?', [playerId])
    if (players.length === 0 || players[0].password !== password) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json()
    if (body.action === 'pull') return await handlePull(playerId)
    if (body.action === 'push') return await handlePush(playerId, body.data)
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
