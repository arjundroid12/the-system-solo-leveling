import { NextRequest, NextResponse } from 'next/server'
import { tursoQuery, tursoExecute, genId, now } from '@/lib/turso'
import { FALLBACK_QUESTS, generateFallbackQuests } from '@/lib/system'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = Buffer.from(auth.replace('Bearer ', ''), 'base64').toString()
    const [playerId] = decoded.split(':')

    const { level, stats, job, recentQuestTitles, timeOfDay } = await req.json()

    let aiQuests: any[] = []
    try {
      const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions"
      const ZAI_KEY = process.env.ZAI_API_KEY
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)

      const recentSection = recentQuestTitles?.length > 0
        ? `\n\nRECENT QUESTS (avoid repeating):\n${recentQuestTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`
        : ''

      const res = await fetch(ZAI_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${ZAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "glm-4.5-flash",
          messages: [
            { role: 'system', content: 'You are the System — an AI that generates personalized daily quests for a Player in a Solo Leveling-style real-life RPG. You output STRICT JSON only.' },
            { role: 'user', content: `Generate 5 personalized daily quests for this Player:
- Level: ${level}
- Date: ${new Date().toISOString().slice(0, 10)}
- Stats: STR ${stats.STR}, AGI ${stats.AGI}, INT ${stats.INT}, VIT ${stats.VIT}, PER ${stats.PER}
- Job: ${job}
- Time: ${timeOfDay}${recentSection}

Generate 5 DIVERSE quests across: TRAINING, STUDY, CREATE, MINDFULNESS, CHALLENGE.
Scale difficulty to level (Level 1-5: EASY/NORMAL, 6-15: NORMAL/HARD, 16-30: HARD/VERY HARD, 31+: VERY HARD/EXTREME).

Each quest: title (2-4 words), description (1 sentence), category, difficulty (EASY/NORMAL/HARD/VERY HARD/EXTREME), xpReward (EASY:30-50, NORMAL:50-80, HARD:80-150, VERY HARD:150-250, EXTREME:250-400), pointReward (xpReward/10), statReward (e.g. {"STR":1}), target (numeric).

Return JSON array of 5 objects. Output ONLY the JSON array.` }
          ],
          max_tokens: 3000, temperature: 0.8,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const raw = data.choices?.[0]?.message?.content || '[]'
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
        try { aiQuests = JSON.parse(cleaned) } catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) aiQuests = JSON.parse(m[0]) }
      }
    } catch (e) { console.error('Z.AI error:', e) }

    if (!aiQuests.length || aiQuests.length < 3) aiQuests = FALLBACK_QUESTS.slice(0, 5)
    aiQuests = aiQuests.slice(0, 5)
    while (aiQuests.length < 5) aiQuests.push(FALLBACK_QUESTS[aiQuests.length])

    const today = new Date().toISOString().slice(0, 10)
    const quests = aiQuests.map((q: any) => ({
      id: `${today}-${Math.random().toString(36).slice(2, 10)}`,
      title: q.title, description: q.description || '',
      category: q.category || 'TRAINING', difficulty: q.difficulty || 'NORMAL',
      xpReward: Number(q.xpReward) || 50, pointReward: Number(q.pointReward) || 5,
      statReward: q.statReward || { STR: 1 }, target: Number(q.target) || 10,
      progress: 0, status: 'PENDING', date: today, isDaily: true,
    }))

    const ts = now()
    await tursoExecute('DELETE FROM sl_quests WHERE player_id = ? AND quest_date != ? AND status = ?', [playerId, today, 'PENDING'])
    await Promise.all(quests.map(q =>
      tursoExecute(
        `INSERT INTO sl_quests (id, player_id, title, description, category, difficulty, xp_reward, point_reward, stat_reward_json, target, progress, status, quest_date, is_daily, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.id, playerId, q.title, q.description, q.category, q.difficulty, q.xpReward, q.pointReward, JSON.stringify(q.statReward), q.target, 0, 'PENDING', today, 1, ts]
      )
    ))
    await tursoExecute('UPDATE sl_players SET last_quest_date = ?, updated_at = ? WHERE id = ?', [today, ts, playerId])

    return NextResponse.json({ quests, generatedAt: ts })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
