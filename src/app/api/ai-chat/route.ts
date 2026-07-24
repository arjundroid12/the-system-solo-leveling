import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'
import { AI_SYSTEM_PROMPT } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const { message } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // ═══ Fetch player context ═══
    const players = await tursoQuery('SELECT * FROM sl_players WHERE id = ?', [playerId])
    if (players.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    const p = players[0]
    const stats = JSON.parse(p.stats_json || '{}')

    const quests = await tursoQuery('SELECT title, status, progress, target, category FROM sl_quests WHERE player_id = ? AND quest_date = ?', [playerId, new Date().toISOString().slice(0, 10)])
    const recentQuests = await tursoQuery('SELECT title, status, category FROM sl_quests WHERE player_id = ? AND status = ? ORDER BY created_at DESC LIMIT 10', [playerId, 'COMPLETE'])

    // Fetch growth plan if exists
    const plans = await tursoQuery('SELECT * FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1', [playerId])
    const plan = plans[0] || null

    // Fetch last 10 chat messages for context
    const chatHistory = await tursoQuery('SELECT role, content FROM sl_chat_messages WHERE player_id = ? ORDER BY timestamp DESC LIMIT 10', [playerId])
    const history = chatHistory.reverse().map((m: any) => ({ role: m.role, content: m.content }))

    // ═══ Build context for AI ═══
    const playerContext = `PLAYER CONTEXT:
- Name: ${p.username}
- Level: ${p.level}
- XP: ${p.xp}/${p.xpToNext || 100}
- Stats: STR ${stats.STR || 10}, AGI ${stats.AGI || 10}, INT ${stats.INT || 10}, VIT ${stats.VIT || 10}, PER ${stats.PER || 10}
- Streak: ${p.streak || 0} days (best: ${p.bestStreak || 0})
- Total quests completed: ${p.total_quests || 0}
- Total dungeons cleared: ${p.total_dungeons || 0}
- Shadows: ${p.total_shadows || 0}
- Title: "${p.title || 'The Player'}"
- Job: ${p.job || 'NONE'}
- Rebirth count: ${p.rebirth_count || 0}
- Combo: ${p.combo || 0}

TODAY'S QUESTS:
${quests.length > 0 ? quests.map((q: any) => `- [${q.status}] ${q.title} (${q.progress}/${q.target})`).join('\n') : 'No quests today'}

RECENT COMPLETED QUESTS:
${recentQuests.length > 0 ? recentQuests.map((q: any) => `- ${q.title} (${q.category})`).join('\n') : 'No completed quests yet'}

GROWTH PLAN:
${plan ? `Path: ${plan.path_name} ${plan.path_icon}\nDay ${plan.current_day}/${plan.total_days} (Season ${plan.season})\nMilestones: ${plan.milestones_json || '[]'}` : 'No growth plan selected yet'}`

    // ═══ Save user message ═══
    const userMsgId = genId()
    const ts = now()
    await tursoExecute(
      'INSERT INTO sl_chat_messages (id, player_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, playerId, 'user', message, ts]
    )

    // ═══ Call Z.AI ═══
    let aiResponse = 'The System is processing your request...'
    let actions: any[] = []

    try {
      const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions"
      const ZAI_KEY = process.env.ZAI_API_KEY
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000)

      const messages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'system', content: playerContext },
        ...history.slice(-6),
        { role: 'user', content: message },
      ]

      const res = await fetch(ZAI_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${ZAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "glm-4.5-flash",
          messages,
          max_tokens: 2000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        aiResponse = data.choices?.[0]?.message?.content || aiResponse

        // Parse ACTION blocks from response
        const actionMatch = aiResponse.match(/```ACTION\s*([\s\S]*?)```/)
        if (actionMatch) {
          try {
            const actionData = JSON.parse(actionMatch[1].trim())
            actions.push(actionData)
            // Remove the ACTION block from the displayed response
            aiResponse = aiResponse.replace(/```ACTION\s*[\s\S]*?```/, '').trim()
          } catch {}
        }
      }
    } catch (e) { console.error('Z.AI error:', e) }

    // ═══ Save AI response ═══
    const aiMsgId = genId()
    await tursoExecute(
      'INSERT INTO sl_chat_messages (id, player_id, role, content, actions_json, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [aiMsgId, playerId, 'assistant', aiResponse, JSON.stringify(actions), now()]
    )

    // ═══ Execute actions if any ═══
    const executedActions: any[] = []
    for (const action of actions) {
      try {
        if (action.type === 'CREATE_QUEST') {
          const q = action.data
          const qId = genId()
          const today = new Date().toISOString().slice(0, 10)
          await tursoExecute(
            `INSERT INTO sl_quests (id, player_id, title, description, category, difficulty, xp_reward, point_reward, stat_reward_json, target, unit, progress, status, quest_date, is_daily, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [qId, playerId, q.title, q.description || '', q.category || 'STUDY', q.difficulty || 'NORMAL', q.xpReward || 50, q.pointReward || 5, JSON.stringify(q.statReward || { INT: 1 }), q.target || 30, q.unit || 'MINUTES', 0, 'PENDING', today, 1, now(), now()]
          )
          executedActions.push({ type: 'CREATE_QUEST', success: true, questTitle: q.title })
        }
        else if (action.type === 'MODIFY_QUEST') {
          // Find quest by title (fuzzy) and update it
          const quests = await tursoQuery('SELECT id FROM sl_quests WHERE player_id = ? AND status = ? AND quest_date = ?', [playerId, 'PENDING', new Date().toISOString().slice(0, 10)])
          const match = quests.find((q: any) => q.title.toLowerCase().includes(action.data.questTitle?.toLowerCase() || ''))
          if (match) {
            const updates: string[] = []
            const args: any[] = []
            if (action.data.target) { updates.push('target = ?'); args.push(action.data.target) }
            if (action.data.xpReward) { updates.push('xp_reward = ?'); args.push(action.data.xpReward) }
            if (action.data.difficulty) { updates.push('difficulty = ?'); args.push(action.data.difficulty) }
            if (updates.length > 0) {
              args.push(match.id)
              await tursoExecute(`UPDATE sl_quests SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, [...args, now(), match.id])
              executedActions.push({ type: 'MODIFY_QUEST', success: true, questTitle: match.title })
            }
          }
        }
        else if (action.type === 'ADJUST_STATS') {
          // AI can directly modify player stats
          const statKey = action.data.stat  // STR, AGI, INT, VIT, PER
          const delta = action.data.delta   // +5 or -3
          const currentStats = JSON.parse(p.stats_json || '{}')
          currentStats[statKey] = (currentStats[statKey] || 10) + delta
          await tursoExecute('UPDATE sl_players SET stats_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(currentStats), now(), playerId])
          executedActions.push({ type: 'ADJUST_STATS', success: true, stat: statKey, delta })
        }
        else if (action.type === 'GRANT_XP') {
          const xp = action.data.amount
          await tursoExecute('UPDATE sl_players SET xp = xp + ?, updated_at = ? WHERE id = ?', [xp, now(), playerId])
          executedActions.push({ type: 'GRANT_XP', success: true, amount: xp })
        }
        else if (action.type === 'SET_QUEST_MODE') {
          const mode = action.data.mode  // FIXED, AI_STRUCTURED, USER_DEFINED
          await tursoExecute('UPDATE sl_players SET quest_mode = ?, updated_at = ? WHERE id = ?', [mode, now(), playerId])
          executedActions.push({ type: 'SET_QUEST_MODE', success: true, mode })
        }
        else if (action.type === 'SET_GOAL') {
          // Add a personal goal to growth plan
          const plans = await tursoQuery('SELECT id, goals_json FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1', [playerId])
          if (plans.length > 0) {
            const goals = JSON.parse(plans[0].goals_json || '[]')
            const newGoal = { id: genId(), title: action.data.title, description: action.data.description || '', type: action.data.type || 'CUSTOM', targetDate: action.data.targetDate || '', priority: action.data.priority || 'MEDIUM', progress: 0, createdAt: now() }
            goals.push(newGoal)
            await tursoExecute('UPDATE sl_growth_plans SET goals_json = ?, updated_at = ? WHERE id = ?', [JSON.stringify(goals), now(), plans[0].id])
            executedActions.push({ type: 'SET_GOAL', success: true, goalTitle: action.data.title })
          }
        }
        else if (action.type === 'ADJUST_PLAN') {
          // Update milestone or day count
          if (action.data.currentDay) {
            await tursoExecute('UPDATE sl_growth_plans SET current_day = ?, updated_at = ? WHERE player_id = (SELECT id FROM sl_growth_plans WHERE player_id = ? ORDER BY created_at DESC LIMIT 1)', [action.data.currentDay, now(), playerId])
            executedActions.push({ type: 'ADJUST_PLAN', success: true, currentDay: action.data.currentDay })
          }
        }
        else if (action.type === 'NOTIFY') {
          executedActions.push({ type: 'NOTIFY', success: true, title: action.data.title, message: action.data.message })
        }
        else if (action.type === 'COMPLETE_QUEST') {
          // AI can auto-complete a quest for the player
          const quests = await tursoQuery('SELECT id, title FROM sl_quests WHERE player_id = ? AND status = ? AND quest_date = ?', [playerId, 'PENDING', new Date().toISOString().slice(0, 10)])
          const match = quests.find((q: any) => q.title.toLowerCase().includes(action.data.questTitle?.toLowerCase() || ''))
          if (match) {
            await tursoExecute('UPDATE sl_quests SET status = ?, progress = target, updated_at = ? WHERE id = ?', ['COMPLETE', now(), match.id])
            executedActions.push({ type: 'COMPLETE_QUEST', success: true, questTitle: match.title })
          }
        }
        else if (action.type === 'DELETE_QUEST') {
          const quests = await tursoQuery('SELECT id, title FROM sl_quests WHERE player_id = ? AND status = ?', [playerId, 'PENDING'])
          const match = quests.find((q: any) => q.title.toLowerCase().includes(action.data.questTitle?.toLowerCase() || ''))
          if (match) {
            await tursoExecute('DELETE FROM sl_quests WHERE id = ?', [match.id])
            executedActions.push({ type: 'DELETE_QUEST', success: true, questTitle: match.title })
          }
        }
      } catch (e) { executedActions.push({ type: action.type, success: false, error: String(e) }) }
    }

    return NextResponse.json({
      response: aiResponse,
      actions: executedActions,
      messageId: aiMsgId,
    })
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}

// ═══ GET — fetch chat history ═══
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const messages = await tursoQuery(
      'SELECT id, role, content, actions_json, timestamp FROM sl_chat_messages WHERE player_id = ? ORDER BY timestamp ASC LIMIT 50',
      [playerId]
    )

    return NextResponse.json({
      messages: messages.map((m: any) => ({
        id: m.id, role: m.role, content: m.content,
        actions: m.actions_json ? JSON.parse(m.actions_json) : [],
        timestamp: m.timestamp,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
