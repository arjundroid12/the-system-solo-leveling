// ════════════════════════════════════════════════════════════════
// THE SYSTEM v6 — Core Logic (Full SL + Serious Quests + 3 Modes)
// ════════════════════════════════════════════════════════════════

export type StatKey = 'STR' | 'AGI' | 'INT' | 'VIT' | 'PER'
export type JobClass = 'NONE' | 'FIGHTER' | 'ASSASSIN' | 'MAGE' | 'NECROMANCER' | 'TANK'
export type QuestMode = 'FIXED' | 'AI_STRUCTURED' | 'USER_DEFINED'
export type QuestCategory = 'TRAINING' | 'STUDY' | 'CREATE' | 'MINDFULNESS' | 'CHALLENGE' | 'DISCIPLINE'
export type QuestStatus = 'PENDING' | 'COMPLETE' | 'FAILED' | 'SKIPPED'
export type QuestUnit = 'REPS' | 'MINUTES' | 'PAGES' | 'WORDS' | 'LINES' | 'SESSIONS' | 'BOOLEAN' | 'KM' | 'GLASSES'
export type DungeonType = 'FOCUS_SPRINT' | 'DEEP_WORK' | 'LEARNING' | 'CREATIVE'
export type ShadowRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'MONARCH'
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'NATIONAL'

// ════════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════════

export interface Player {
  name: string; level: number; xp: number; xpToNext: number
  hp: number; hpMax: number; mp: number; mpMax: number
  fatigue: number; fatigueMax: number
  statPoints: number; stats: Record<StatKey, number>
  job: JobClass; jobUnlocked: boolean
  playerPoints: number; lastQuestDate: string | null
  createdAt: string; updatedAt: string
  totalQuestsCompleted: number; totalDungeonsCleared: number; totalShadowsExtracted: number
  penaltyActive: boolean
  streak: number; bestStreak: number; lastStreakDate: string | null
  title: string; achievements: string[]
  questMode: QuestMode
  combo: number; comboTimer: number
  xpBoostUntil: number; xpBoostMultiplier: number
  rebirthCount: number
  loginDayCount: number; loginBonusClaimed: boolean
}

export interface Quest {
  id: string; title: string; description: string
  category: QuestCategory; difficulty: string
  xpReward: number; pointReward: number
  statReward: Partial<Record<StatKey, number>>
  target: number; unit: QuestUnit; progress: number; status: QuestStatus
  date: string; isDaily: boolean
  updatedAt: string  // timestamp for sync conflict resolution
}

export interface UserQuestTemplate {
  id: string; title: string; description: string
  category: QuestCategory; target: number; unit: QuestUnit
  xpReward: number; pointReward: number
  statReward: Partial<Record<StatKey, number>>
  difficulty: string
}

export interface Skill {
  id: string; name: string; description: string
  unlockLevel: number; unlocked: boolean; rank: string
  category: 'PASSIVE' | 'ACTIVE' | 'SHADOW'
  mpCost?: number; damage?: number; cooldown?: number
}

export interface Shadow {
  id: string; name: string; originalName: string
  rank: ShadowRank; level: number
  extractedAt: string; description: string
  attack: number; defense: number
  xp: number; xpToNext: number; loyalty: number; deployed: boolean; ability: string
  updatedAt: string
}

export interface Equipment {
  id: string; name: string; slot: EquipSlot; rarity: Rarity; level: number; icon: string
  statBonus: Partial<Record<StatKey, number>>; hpBonus: number; mpBonus: number; description: string
}

export type EquipSlot = 'WEAPON' | 'ARMOR' | 'HELMET' | 'BOOTS' | 'ACCESSORY' | 'RING'

export interface InventoryItem {
  id: string; name: string; description: string; rarity: Rarity; quantity: number; icon: string
  type: string; effect?: string; slot?: EquipSlot; statBonus?: Partial<Record<StatKey, number>>; hpBonus?: number; mpBonus?: number
}

export interface DungeonRun {
  id: string; type: DungeonType; name: string; duration: number
  startedAt: string; completedAt: string | null; status: 'ACTIVE' | 'CLEARED' | 'FAILED'
  xpReward: number; pointReward: number; shadowEligible: boolean
}

export interface SystemNotification {
  id: string; type: string; title: string; message: string; timestamp: string
}

// ════════════════════════════════════════════════════════════════
// XP & LEVELING
// ════════════════════════════════════════════════════════════════

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1))
}

export function hpFromStats(stats: Record<StatKey, number>, level: number): number {
  return 100 + (stats.VIT * 10) + (level * 5) + (stats.STR * 2)
}
export function mpFromStats(stats: Record<StatKey, number>, level: number): number {
  return 30 + (stats.INT * 8) + (level * 3) + (stats.AGI * 1)
}
export function fatigueMaxFromStats(stats: Record<StatKey, number>): number {
  return 100 + (stats.VIT * 2)
}

export const STAT_INFO: Record<StatKey, { name: string; description: string; color: string }> = {
  STR: { name: 'Strength', description: 'Physical power. Affects HP and damage.', color: '#ff6b6b' },
  AGI: { name: 'Agility', description: 'Speed and reflexes. Affects dodge and MP regen.', color: '#4ecdc4' },
  INT: { name: 'Intelligence', description: 'Mental acuity. Affects MP and skill power.', color: '#5dd5ff' },
  VIT: { name: 'Vitality', description: 'Endurance. Affects HP max and fatigue resistance.', color: '#95e1a3' },
  PER: { name: 'Perception', description: 'Awareness. Affects crit and shadow extraction.', color: '#b794f4' },
}

// ════════════════════════════════════════════════════════════════
// QUEST UNIT LABELS
// ════════════════════════════════════════════════════════════════

export const QUEST_UNITS: Record<QuestUnit, string> = {
  REPS: 'reps', MINUTES: 'minutes', PAGES: 'pages', WORDS: 'words',
  LINES: 'lines of code', SESSIONS: 'sessions', BOOLEAN: 'completed',
  KM: 'kilometers', GLASSES: 'glasses of water',
}

// ════════════════════════════════════════════════════════════════
// MODE 1: FIXED STRUCTURED QUESTS (serious, clear targets)
// ════════════════════════════════════════════════════════════════

export const FIXED_QUEST_POOL: Omit<Quest, 'id' | 'progress' | 'status' | 'date' | 'isDaily' | 'updatedAt'>[] = [
  // TRAINING — physical exercise with rep counts
  { title: 'Push-Ups', description: 'Complete push-ups with proper form. Full range of motion.', category: 'TRAINING', difficulty: 'NORMAL', xpReward: 50, pointReward: 5, statReward: { STR: 1 }, target: 50, unit: 'REPS' },
  { title: 'Sit-Ups', description: 'Complete sit-ups to strengthen your core.', category: 'TRAINING', difficulty: 'NORMAL', xpReward: 50, pointReward: 5, statReward: { VIT: 1 }, target: 50, unit: 'REPS' },
  { title: 'Squats', description: 'Bodyweight squats. Go below parallel.', category: 'TRAINING', difficulty: 'NORMAL', xpReward: 50, pointReward: 5, statReward: { STR: 1 }, target: 50, unit: 'REPS' },
  { title: 'Running', description: 'Run outdoors or on treadmill.', category: 'TRAINING', difficulty: 'HARD', xpReward: 100, pointReward: 10, statReward: { VIT: 2, AGI: 1 }, target: 2, unit: 'KM' },
  { title: 'Plank Hold', description: 'Hold plank position. Keep core tight.', category: 'TRAINING', difficulty: 'NORMAL', xpReward: 60, pointReward: 6, statReward: { VIT: 1 }, target: 2, unit: 'MINUTES' },
  { title: 'Stretching', description: 'Full body stretching routine.', category: 'TRAINING', difficulty: 'EASY', xpReward: 30, pointReward: 3, statReward: { AGI: 1 }, target: 10, unit: 'MINUTES' },
  // STUDY — time-based with clear units
  { title: 'Study Session', description: 'Focused study without phone. No distractions.', category: 'STUDY', difficulty: 'HARD', xpReward: 120, pointReward: 12, statReward: { INT: 2 }, target: 60, unit: 'MINUTES' },
  { title: 'Read a Book', description: 'Read a physical or digital book.', category: 'STUDY', difficulty: 'NORMAL', xpReward: 60, pointReward: 6, statReward: { INT: 1 }, target: 20, unit: 'PAGES' },
  { title: 'Learn a New Topic', description: 'Watch educational video or take a course.', category: 'STUDY', difficulty: 'NORMAL', xpReward: 80, pointReward: 8, statReward: { INT: 1, PER: 1 }, target: 30, unit: 'MINUTES' },
  // CREATE — measurable output
  { title: 'Write Code', description: 'Write actual code. No tutorials, hands on keyboard.', category: 'CREATE', difficulty: 'HARD', xpReward: 150, pointReward: 15, statReward: { INT: 2, PER: 1 }, target: 100, unit: 'LINES' },
  { title: 'Write Content', description: 'Write blog post, documentation, or journal.', category: 'CREATE', difficulty: 'NORMAL', xpReward: 70, pointReward: 7, statReward: { INT: 1, PER: 1 }, target: 500, unit: 'WORDS' },
  { title: 'Work on a Project', description: 'Dedicated time on a personal or work project.', category: 'CREATE', difficulty: 'VERY HARD', xpReward: 200, pointReward: 20, statReward: { INT: 2, PER: 1 }, target: 90, unit: 'MINUTES' },
  // MINDFULNESS — time-based
  { title: 'Meditate', description: 'Sit in silence. Focus on breath. No phone.', category: 'MINDFULNESS', difficulty: 'EASY', xpReward: 40, pointReward: 4, statReward: { INT: 1, PER: 1 }, target: 10, unit: 'MINUTES' },
  { title: 'Journal', description: 'Write your thoughts, goals, or reflections.', category: 'MINDFULNESS', difficulty: 'EASY', xpReward: 40, pointReward: 4, statReward: { INT: 1 }, target: 1, unit: 'SESSIONS' },
  { title: 'Deep Breathing', description: 'Box breathing: 4s in, 4s hold, 4s out, 4s hold.', category: 'MINDFULNESS', difficulty: 'EASY', xpReward: 30, pointReward: 3, statReward: { VIT: 1 }, target: 5, unit: 'MINUTES' },
  // DISCIPLINE — binary but serious
  { title: 'Wake Up Before 7 AM', description: 'Be out of bed before 7:00 AM.', category: 'DISCIPLINE', difficulty: 'HARD', xpReward: 90, pointReward: 9, statReward: { VIT: 1, PER: 1 }, target: 1, unit: 'BOOLEAN' },
  { title: 'No Social Media', description: 'Zero social media for the entire day.', category: 'DISCIPLINE', difficulty: 'VERY HARD', xpReward: 150, pointReward: 15, statReward: { INT: 1, PER: 2 }, target: 1, unit: 'BOOLEAN' },
  { title: 'Drink Water', description: 'Stay hydrated throughout the day.', category: 'DISCIPLINE', difficulty: 'EASY', xpReward: 30, pointReward: 3, statReward: { VIT: 1 }, target: 8, unit: 'GLASSES' },
  // CHALLENGE — serious, measurable
  { title: 'Cold Shower', description: 'End your shower with 1 minute of cold water only.', category: 'CHALLENGE', difficulty: 'HARD', xpReward: 80, pointReward: 8, statReward: { VIT: 1, STR: 1 }, target: 1, unit: 'BOOLEAN' },
  { title: 'Digital Sunset', description: 'No screens 1 hour before bed.', category: 'CHALLENGE', difficulty: 'HARD', xpReward: 100, pointReward: 10, statReward: { INT: 1, VIT: 1 }, target: 1, unit: 'BOOLEAN' },
]

export function generateFixedQuests(date: string): Quest[] {
  // Pick 5 quests: 1 from each main category, ensuring variety
  const categories: QuestCategory[] = ['TRAINING', 'STUDY', 'CREATE', 'MINDFULNESS', 'DISCIPLINE']
  const selected: typeof FIXED_QUEST_POOL = []
  const used = new Set<string>()

  for (const cat of categories) {
    const pool = FIXED_QUEST_POOL.filter(q => q.category === cat && !used.has(q.title))
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)]
      selected.push(pick)
      used.add(pick.title)
    }
  }

  // If we have fewer than 5, fill from CHALLENGE
  while (selected.length < 5) {
    const pool = FIXED_QUEST_POOL.filter(q => !used.has(q.title))
    if (pool.length === 0) break
    const pick = pool[Math.floor(Math.random() * pool.length)]
    selected.push(pick)
    used.add(pick.title)
  }

  return selected.map((q, i) => ({
    ...q,
    id: `${date}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    progress: 0,
    status: 'PENDING' as QuestStatus,
    date,
    isDaily: true,
    updatedAt: new Date().toISOString(),
  }))
}

// ════════════════════════════════════════════════════════════════
// MODE 2: AI STRUCTURED QUESTS (Z.AI with strict template)
// ════════════════════════════════════════════════════════════════

export const AI_QUEST_PROMPT = `Generate 5 daily quests for a Solo Leveling-style real-life RPG. STRICT REQUIREMENTS:

1. Each quest MUST have a clear, measurable target with a specific unit (reps, minutes, pages, words, lines of code, km, glasses, sessions, or boolean).
2. NO vague quests like "be productive" or "stay focused" — every quest must have a NUMBER to hit.
3. Categories: TRAINING (physical), STUDY (learning), CREATE (building), MINDFULNESS (mental), DISCIPLINE (habit).
4. Difficulty scales with player level:
   - Level 1-5: EASY/NORMAL (targets: 30 pushups, 20 pages, 30 min study)
   - Level 6-15: NORMAL/HARD (targets: 50 pushups, 30 pages, 60 min study)
   - Level 16-30: HARD/VERY HARD (targets: 100 pushups, 50 pages, 90 min study)
   - Level 31+: VERY HARD/EXTREME (targets: 150 pushups, 100 pages, 120 min study)
5. XP rewards: EASY 30-50, NORMAL 50-80, HARD 80-150, VERY HARD 150-250, EXTREME 250-400.
6. Each quest must train at least one stat (STR, AGI, INT, VIT, or PER).
7. Include at least 1 TRAINING, 1 STUDY, and 1 MINDFULNESS quest per day.
8. Avoid repeating quests from the recent list provided.

Return JSON array of EXACTLY 5 objects:
[{"title":"Push-Ups","description":"Complete push-ups with proper form.","category":"TRAINING","difficulty":"NORMAL","xpReward":50,"pointReward":5,"statReward":{"STR":1},"target":50,"unit":"REPS"}]

Valid units: REPS, MINUTES, PAGES, WORDS, LINES, SESSIONS, BOOLEAN, KM, GLASSES.`

// ════════════════════════════════════════════════════════════════
// MODE 3: USER-DEFINED QUEST TEMPLATES
// ════════════════════════════════════════════════════════════════

export function generateUserDefinedQuests(templates: UserQuestTemplate[], date: string): Quest[] {
  if (templates.length === 0) return generateFixedQuests(date)
  // Pick 5 random templates (or all if fewer than 5)
  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(5, shuffled.length))
  return selected.map((t, i) => ({
    id: `${date}-${i}-${Math.random().toString(36).slice(2, 8)}`,
    title: t.title,
    description: t.description,
    category: t.category,
    difficulty: t.difficulty,
    xpReward: t.xpReward,
    pointReward: t.pointReward,
    statReward: t.statReward,
    target: t.target,
    unit: t.unit,
    progress: 0,
    status: 'PENDING' as QuestStatus,
    date,
    isDaily: true,
    updatedAt: new Date().toISOString(),
  }))
}

// ════════════════════════════════════════════════════════════════
// SKILLS
// ════════════════════════════════════════════════════════════════

export const SKILLS: Skill[] = [
  { id: 'dash', name: 'Dash', description: '+10% productivity for 30 min after completing a quest.', unlockLevel: 1, unlocked: true, rank: 'E', category: 'PASSIVE' },
  { id: 'willpower', name: 'Willpower', description: 'Reduces fatigue gain from quests by 10%.', unlockLevel: 3, unlocked: false, rank: 'E', category: 'PASSIVE' },
  { id: 'bloodlust', name: 'Bloodlust', description: 'Double XP from TRAINING quests.', unlockLevel: 5, unlocked: false, rank: 'D', category: 'PASSIVE' },
  { id: 'stealth', name: 'Stealth', description: 'Skip one quest per day without penalty.', unlockLevel: 7, unlocked: false, rank: 'D', category: 'ACTIVE' },
  { id: 'perception', name: 'Perception', description: '+20% shadow extraction success rate.', unlockLevel: 10, unlocked: false, rank: 'C', category: 'PASSIVE' },
  { id: 'rulers_hand', name: "Ruler's Hands", description: 'Telekinesis. +1 stat point per level.', unlockLevel: 15, unlocked: false, rank: 'C', category: 'ACTIVE' },
  { id: 'shadow_extract', name: 'Shadow Extraction', description: 'Extract shadows from cleared dungeons.', unlockLevel: 10, unlocked: false, rank: 'C', category: 'SHADOW' },
  { id: 'shadow_exchange', name: 'Shadow Exchange', description: 'Swap places with any shadow. Reset fatigue.', unlockLevel: 20, unlocked: false, rank: 'B', category: 'SHADOW' },
  { id: 'monarch_domain', name: "Monarch's Domain", description: 'All shadows gain +10% power.', unlockLevel: 30, unlocked: false, rank: 'A', category: 'SHADOW' },
  { id: 'necromancy', name: 'Necromancy', description: 'Raise shadows from any completed challenge.', unlockLevel: 25, unlocked: false, rank: 'A', category: 'SHADOW' },
]

// ════════════════════════════════════════════════════════════════
// JOB CLASSES
// ════════════════════════════════════════════════════════════════

export const JOB_CLASSES: Record<JobClass, { name: string; description: string; bonuses: string; icon: string }> = {
  NONE: { name: 'None', description: 'You have not yet selected a class.', bonuses: '', icon: '❓' },
  FIGHTER: { name: 'Fighter', description: 'Master of physical combat. STR-focused.', bonuses: '+20% XP from TRAINING quests. +10% HP.', icon: '⚔️' },
  ASSASSIN: { name: 'Assassin', description: 'Swift and deadly. AGI-focused.', bonuses: '+20% XP from CHALLENGE quests. +10% crit.', icon: '🗡️' },
  MAGE: { name: 'Mage', description: 'Wielder of arcane arts. INT-focused.', bonuses: '+20% XP from STUDY quests. +20% MP.', icon: '🔮' },
  NECROMANCER: { name: 'Necromancer', description: 'Lord of shadows. PER-focused.', bonuses: '+30% shadow extraction rate. Shadow army +10% power.', icon: '💀' },
  TANK: { name: 'Tank', description: 'Unbreakable wall. VIT-focused.', bonuses: '+30% HP. -20% fatigue gain.', icon: '🛡️' },
}

// ════════════════════════════════════════════════════════════════
// DUNGEONS
// ════════════════════════════════════════════════════════════════

export const DUNGEON_TYPES: Record<DungeonType, { name: string; description: string; icon: string; minLevel: number; duration: number }> = {
  FOCUS_SPRINT: { name: 'Focus Sprint', description: '25-minute focused work session.', icon: '⚡', minLevel: 1, duration: 25 },
  LEARNING: { name: 'Learning Dungeon', description: '60-minute study session.', icon: '📚', minLevel: 2, duration: 60 },
  CREATIVE: { name: 'Creative Gate', description: '45-minute creative work session.', icon: '🎨', minLevel: 5, duration: 45 },
  DEEP_WORK: { name: 'Deep Work Gate', description: '90-minute deep work session.', icon: '🌊', minLevel: 3, duration: 90 },
}

export function dungeonRewards(type: DungeonType): { xp: number; points: number; shadowEligible: boolean } {
  switch (type) {
    case 'FOCUS_SPRINT': return { xp: 80, points: 8, shadowEligible: false }
    case 'DEEP_WORK': return { xp: 300, points: 30, shadowEligible: true }
    case 'LEARNING': return { xp: 180, points: 18, shadowEligible: true }
    case 'CREATIVE': return { xp: 150, points: 15, shadowEligible: true }
  }
}

// ════════════════════════════════════════════════════════════════
// SHADOWS
// ════════════════════════════════════════════════════════════════

export const SHADOW_NAMES = ['Igris', 'Iron', 'Tusk', 'Beru', 'Kaisel', 'Greed', 'Tank', 'Jima', 'Bellion', 'Fang', 'Frost', 'Venom', 'Cleave', 'Storm', 'Ash', 'Vex', 'Drake', 'Saber', 'Ironfang', 'Nightfall', 'Cinders', 'Wraith']

export function shadowRankFromDungeon(type: DungeonType): ShadowRank {
  switch (type) { case 'FOCUS_SPRINT': return 'E'; case 'LEARNING': return 'D'; case 'CREATIVE': return 'C'; case 'DEEP_WORK': return 'B' }
}

export function shadowXpForLevel(level: number): number { return 50 * level }

export const SHADOW_ABILITIES: Record<ShadowRank, string[]> = {
  E: ['Basic Strike'], D: ['Basic Strike', 'Guard'], C: ['Basic Strike', 'Guard', 'Power Slash'],
  B: ['Basic Strike', 'Guard', 'Power Slash', 'Battle Cry'], A: ['Basic Strike', 'Guard', 'Power Slash', 'Battle Cry', 'Dominion'],
  S: ['Basic Strike', 'Guard', 'Power Slash', 'Battle Cry', 'Dominion', 'Shadow Storm'], MONARCH: ['Basic Strike', 'Guard', 'Power Slash', 'Battle Cry', 'Dominion', 'Shadow Storm', "Monarch's Will"],
}

export function getShadowAbility(rank: ShadowRank, level: number): string {
  const abilities = SHADOW_ABILITIES[rank]
  return abilities[Math.min(Math.floor(level / 5), abilities.length - 1)]
}

// ════════════════════════════════════════════════════════════════
// HUNTER RANKS
// ════════════════════════════════════════════════════════════════

export const HUNTER_RANKS: Record<HunterRank, { name: string; minLevel: number; color: string; icon: string; desc: string }> = {
  E: { name: 'E-Rank Hunter', minLevel: 1, color: '#a3a3a3', icon: '🟤', desc: 'The weakest. Just awakened.' },
  D: { name: 'D-Rank Hunter', minLevel: 5, color: '#5dd5ff', icon: '🔵', desc: 'Getting stronger. Can clear basic gates.' },
  C: { name: 'C-Rank Hunter', minLevel: 10, color: '#95e1a3', icon: '🟢', desc: 'Competent. Selected a job class.' },
  B: { name: 'B-Rank Hunter', minLevel: 20, color: '#ffd966', icon: '🟡', desc: 'Skilled. Commands a shadow army.' },
  A: { name: 'A-Rank Hunter', minLevel: 35, color: '#ff8c42', icon: '🟠', desc: 'Elite. Feared by weaker Players.' },
  S: { name: 'S-Rank Hunter', minLevel: 50, color: '#ff4d6d', icon: '🔴', desc: 'National-level power. Few exist.' },
  NATIONAL: { name: 'National Level', minLevel: 75, color: '#b794f4', icon: '🟣', desc: 'Beyond S-Rank. A walking disaster.' },
}

export function getHunterRank(level: number): HunterRank {
  if (level >= 75) return 'NATIONAL'; if (level >= 50) return 'S'; if (level >= 35) return 'A'
  if (level >= 20) return 'B'; if (level >= 10) return 'C'; if (level >= 5) return 'D'; return 'E'
}

// ════════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ════════════════════════════════════════════════════════════════

export interface Achievement { id: string; name: string; description: string; icon: string; title: string; condition: (p: Player, s: Shadow[]) => boolean }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_quest', name: 'First Steps', description: 'Complete your first quest.', icon: '◆', title: 'The Awakened', condition: (p) => p.totalQuestsCompleted >= 1 },
  { id: 'ten_quests', name: 'Getting Serious', description: 'Complete 10 quests.', icon: '★', title: 'The Persistent', condition: (p) => p.totalQuestsCompleted >= 10 },
  { id: 'fifty_quests', name: 'Unstoppable', description: 'Complete 50 quests.', icon: '✦', title: 'The Relentless', condition: (p) => p.totalQuestsCompleted >= 50 },
  { id: 'hundred_quests', name: 'Centurion', description: 'Complete 100 quests.', icon: '✧', title: 'The Centurion', condition: (p) => p.totalQuestsCompleted >= 100 },
  { id: 'first_dungeon', name: 'Gate Crasher', description: 'Clear your first dungeon.', icon: '⚔', title: 'Gate Crasher', condition: (p) => p.totalDungeonsCleared >= 1 },
  { id: 'ten_dungeons', name: 'Dungeon Master', description: 'Clear 10 dungeons.', icon: '⚔', title: 'Dungeon Master', condition: (p) => p.totalDungeonsCleared >= 10 },
  { id: 'first_shadow', name: 'Shadow Tamer', description: 'Extract your first shadow.', icon: '💀', title: 'Shadow Tamer', condition: (p, s) => s.length >= 1 },
  { id: 'five_shadows', name: 'Shadow Commander', description: 'Command 5 shadows.', icon: '💀', title: 'Shadow Commander', condition: (p, s) => s.length >= 5 },
  { id: 'ten_shadows', name: 'Shadow Lord', description: 'Command 10 shadows.', icon: '💀', title: 'Shadow Lord', condition: (p, s) => s.length >= 10 },
  { id: 'streak_3', name: 'Consistent', description: '3-day streak.', icon: '🔥', title: 'The Consistent', condition: (p) => p.streak >= 3 },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day streak.', icon: '🔥', title: 'The Devoted', condition: (p) => p.streak >= 7 },
  { id: 'streak_30', name: 'Unbreakable', description: '30-day streak.', icon: '🔥', title: 'The Unbreakable', condition: (p) => p.streak >= 30 },
  { id: 'level_10', name: 'Double Digits', description: 'Reach Level 10.', icon: '✦', title: 'The Ascended', condition: (p) => p.level >= 10 },
  { id: 'level_25', name: 'Veteran', description: 'Reach Level 25.', icon: '✧', title: 'The Veteran', condition: (p) => p.level >= 25 },
  { id: 'level_50', name: 'Half Century', description: 'Reach Level 50.', icon: '★', title: 'The Monarch', condition: (p) => p.level >= 50 },
  { id: 'level_100', name: 'Centennial', description: 'Reach Level 100.', icon: '☆', title: 'The Sovereign', condition: (p) => p.level >= 100 },
  { id: 'job_unlock', name: 'Class Act', description: 'Select a job class.', icon: '◈', title: 'The Classified', condition: (p) => p.job !== 'NONE' },
  { id: 'necromancer', name: 'Death Knight', description: 'Become a Necromancer.', icon: '💀', title: 'The Necromancer', condition: (p) => p.job === 'NECROMANCER' },
]

export function checkAchievements(player: Player, shadows: Shadow[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => !player.achievements.includes(a.id) && a.condition(player, shadows))
}

// ════════════════════════════════════════════════════════════════
// STREAK + COMBO + BOOSTERS + REBIRTH
// ════════════════════════════════════════════════════════════════

export function calculateStreakBonus(streak: number): number {
  if (streak < 3) return 0; if (streak < 7) return 50; if (streak < 14) return 100; if (streak < 30) return 200; return 500
}
export function getStreakMultiplier(streak: number): number {
  if (streak < 3) return 1.0; if (streak < 7) return 1.1; if (streak < 14) return 1.2; if (streak < 30) return 1.3; return 1.5
}

export const COMBO_THRESHOLDS = [
  { combo: 2, multiplier: 1.1, label: '2x COMBO', icon: '🔥' },
  { combo: 3, multiplier: 1.2, label: '3x COMBO', icon: '🔥' },
  { combo: 5, multiplier: 1.5, label: '5x COMBO!', icon: '⚡' },
  { combo: 7, multiplier: 2.0, label: '7x COMBO!!', icon: '⚡' },
  { combo: 10, multiplier: 3.0, label: '10x COMBO!!!', icon: '👑' },
]
export function getComboMultiplier(combo: number): { multiplier: number; label: string; icon: string } {
  let r = { multiplier: 1.0, label: '', icon: '' }
  for (const t of COMBO_THRESHOLDS) if (combo >= t.combo) r = t
  return r
}

export const XP_BOOSTERS = [
  { id: 'booster_small', name: 'Minor XP Booster', description: '+50% XP for 30 minutes.', rarity: 'RARE' as Rarity, icon: '⚡', cost: 30, multiplier: 1.5, duration: 30 * 60 * 1000 },
  { id: 'booster_medium', name: 'Greater XP Booster', description: '+100% XP for 1 hour.', rarity: 'EPIC' as Rarity, icon: '⚡', cost: 80, multiplier: 2.0, duration: 60 * 60 * 1000 },
  { id: 'booster_mega', name: "Monarch's Blessing", description: '+200% XP for 2 hours.', rarity: 'LEGENDARY' as Rarity, icon: '👑', cost: 200, multiplier: 3.0, duration: 2 * 60 * 60 * 1000 },
]

export const DAILY_LOGIN_BONUSES = [
  { day: 1, xp: 50, pp: 5 }, { day: 2, xp: 75, pp: 8 }, { day: 3, xp: 100, pp: 10 },
  { day: 4, xp: 150, pp: 15 }, { day: 5, xp: 200, pp: 20 }, { day: 6, xp: 300, pp: 30 },
  { day: 7, xp: 500, pp: 50 },
]
export function getDailyLoginBonus(consecutiveDays: number): { xp: number; pp: number } {
  const dayInCycle = ((consecutiveDays - 1) % 7) + 1
  return DAILY_LOGIN_BONUSES[dayInCycle - 1]
}

export function getRebirthBonus(rebirthCount: number): { xpMultiplier: number; statBonus: number; label: string } {
  return {
    xpMultiplier: 1 + rebirthCount * 0.25,
    statBonus: rebirthCount * 5,
    label: rebirthCount === 0 ? 'Mortal' : rebirthCount === 1 ? 'Awakened' : rebirthCount === 2 ? 'Reborn' : rebirthCount === 3 ? 'Ascendant' : `${rebirthCount}x Reborn`,
  }
}

export function getRebirthRequirement(currentLevel: number): { level: number; pp: number } {
  return { level: 50, pp: 500 + (currentLevel - 50) * 10 }
}

// ════════════════════════════════════════════════════════════════
// TITLE BONUSES
// ════════════════════════════════════════════════════════════════

export const TITLE_BONUSES: Record<string, Partial<Record<StatKey, number>> & { hpBonus?: number; mpBonus?: number; xpBonus?: number }> = {
  'The Player': {}, 'The Awakened': { STR: 1, xpBonus: 0.02 }, 'The Persistent': { STR: 2, VIT: 1, xpBonus: 0.05 },
  'The Relentless': { STR: 3, AGI: 2, VIT: 2, xpBonus: 0.08 }, 'The Centurion': { STR: 5, AGI: 3, INT: 3, VIT: 5, PER: 3, xpBonus: 0.1 },
  'Gate Crasher': { AGI: 2, xpBonus: 0.05 }, 'Dungeon Master': { STR: 3, INT: 2, xpBonus: 0.1 },
  'Shadow Tamer': { PER: 3, xpBonus: 0.05 }, 'Shadow Commander': { PER: 5, STR: 2, xpBonus: 0.1 },
  'Shadow Lord': { PER: 8, STR: 4, INT: 3, xpBonus: 0.15 }, 'The Consistent': { VIT: 2, xpBonus: 0.05 },
  'The Devoted': { VIT: 4, PER: 2, xpBonus: 0.1 }, 'The Unbreakable': { VIT: 8, STR: 3, xpBonus: 0.2 },
  'The Ascended': { STR: 5, AGI: 5, INT: 5, VIT: 5, PER: 5, xpBonus: 0.15 }, 'The Veteran': { STR: 8, AGI: 8, INT: 8, VIT: 8, PER: 8, xpBonus: 0.2 },
  'The Monarch': { STR: 15, AGI: 15, INT: 15, VIT: 15, PER: 15, hpBonus: 200, mpBonus: 200, xpBonus: 0.3 },
  'The Sovereign': { STR: 25, AGI: 25, INT: 25, VIT: 25, PER: 25, hpBonus: 500, mpBonus: 500, xpBonus: 0.5 },
  'The Classified': { STR: 3, AGI: 3, INT: 3, VIT: 3, PER: 3, xpBonus: 0.1 }, 'The Necromancer': { PER: 10, INT: 5, mpBonus: 100, xpBonus: 0.2 },
}
export function getTitleBonus(title: string) { return TITLE_BONUSES[title] || {} }

// ════════════════════════════════════════════════════════════════
// EQUIPMENT
// ════════════════════════════════════════════════════════════════

export const EQUIP_SLOTS: Record<EquipSlot, { name: string; icon: string }> = {
  WEAPON: { name: 'Weapon', icon: '⚔️' }, ARMOR: { name: 'Armor', icon: '🛡️' }, HELMET: { name: 'Helmet', icon: '⛑️' },
  BOOTS: { name: 'Boots', icon: '👢' }, ACCESSORY: { name: 'Accessory', icon: '📿' }, RING: { name: 'Ring', icon: '💍' },
}

export const EQUIPMENT_POOL: Omit<Equipment, 'id' | 'level'>[] = [
  { name: 'Iron Sword', slot: 'WEAPON', rarity: 'COMMON', icon: '⚔️', statBonus: { STR: 3 }, hpBonus: 0, mpBonus: 0, description: 'A basic iron sword.' },
  { name: "Kasaka's Venom Fang", slot: 'WEAPON', rarity: 'RARE', icon: '🗡️', statBonus: { STR: 8, AGI: 3 }, hpBonus: 20, mpBonus: 0, description: 'Dagger with poison damage.' },
  { name: "Demon Monarch's Sword", slot: 'WEAPON', rarity: 'LEGENDARY', icon: '⚔️', statBonus: { STR: 20, AGI: 5 }, hpBonus: 50, mpBonus: 20, description: 'The sword of the Shadow Monarch.' },
  { name: 'Leather Armor', slot: 'ARMOR', rarity: 'COMMON', icon: '🛡️', statBonus: { VIT: 3 }, hpBonus: 30, mpBonus: 0, description: 'Basic leather protection.' },
  { name: "Knight's Plate", slot: 'ARMOR', rarity: 'RARE', icon: '🛡️', statBonus: { VIT: 8 }, hpBonus: 80, mpBonus: 0, description: 'Heavy plate armor.' },
  { name: 'Shadow Cloak', slot: 'ARMOR', rarity: 'EPIC', icon: '🧥', statBonus: { VIT: 10, AGI: 5 }, hpBonus: 100, mpBonus: 30, description: 'Woven from shadow essence.' },
  { name: 'Iron Helm', slot: 'HELMET', rarity: 'COMMON', icon: '⛑️', statBonus: { VIT: 2 }, hpBonus: 20, mpBonus: 0, description: 'Basic head protection.' },
  { name: 'Crown of Wisdom', slot: 'HELMET', rarity: 'EPIC', icon: '👑', statBonus: { INT: 10, PER: 5 }, hpBonus: 0, mpBonus: 50, description: 'Increases mental clarity.' },
  { name: 'Swift Boots', slot: 'BOOTS', rarity: 'COMMON', icon: '👢', statBonus: { AGI: 4 }, hpBonus: 0, mpBonus: 0, description: 'Lightweight boots for speed.' },
  { name: 'Shadow Steppers', slot: 'BOOTS', rarity: 'RARE', icon: '👢', statBonus: { AGI: 10 }, hpBonus: 0, mpBonus: 20, description: 'Move like a shadow.' },
  { name: 'Power Necklace', slot: 'ACCESSORY', rarity: 'RARE', icon: '📿', statBonus: { STR: 5, VIT: 5 }, hpBonus: 40, mpBonus: 0, description: 'Boosts physical power.' },
  { name: 'Mana Crystal', slot: 'ACCESSORY', rarity: 'EPIC', icon: '🔮', statBonus: { INT: 8 }, hpBonus: 0, mpBonus: 60, description: 'Amplifies magical energy.' },
  { name: 'Ring of Strength', slot: 'RING', rarity: 'RARE', icon: '💍', statBonus: { STR: 6 }, hpBonus: 20, mpBonus: 0, description: 'A simple strength ring.' },
  { name: 'Ring of the Shadow Monarch', slot: 'RING', rarity: 'MYTHIC', icon: '💍', statBonus: { STR: 15, AGI: 10, INT: 10, VIT: 15, PER: 10 }, hpBonus: 100, mpBonus: 100, description: 'The ring of the Monarch himself.' },
]

export function rollEquipmentDrop(dungeonType: DungeonType): Equipment | null {
  const dropChance = dungeonType === 'FOCUS_SPRINT' ? 0.05 : dungeonType === 'DEEP_WORK' ? 0.25 : 0.15
  if (Math.random() > dropChance) return null
  const r = Math.random()
  let rarity: Rarity
  if (dungeonType === 'DEEP_WORK') rarity = r < 0.4 ? 'COMMON' : r < 0.7 ? 'RARE' : r < 0.9 ? 'EPIC' : r < 0.99 ? 'LEGENDARY' : 'MYTHIC'
  else if (dungeonType === 'LEARNING' || dungeonType === 'CREATIVE') rarity = r < 0.5 ? 'COMMON' : r < 0.8 ? 'RARE' : r < 0.95 ? 'EPIC' : 'LEGENDARY'
  else rarity = r < 0.7 ? 'COMMON' : r < 0.95 ? 'RARE' : 'EPIC'
  const pool = EQUIPMENT_POOL.filter(e => e.rarity === rarity)
  if (pool.length === 0) return null
  const base = pool[Math.floor(Math.random() * pool.length)]
  return { ...base, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), level: 1 }
}

// ════════════════════════════════════════════════════════════════
// SHOP
// ════════════════════════════════════════════════════════════════

export const SHOP_ITEMS: Omit<InventoryItem, 'quantity'>[] = [
  { id: 'potion_hp', name: 'Lesser Healing Potion', description: 'Restores 50 HP.', rarity: 'COMMON', icon: '🧪', type: 'CONSUMABLE', effect: 'restore_hp_50' },
  { id: 'potion_mp', name: 'Lesser Mana Potion', description: 'Restores 30 MP.', rarity: 'COMMON', icon: '💧', type: 'CONSUMABLE', effect: 'restore_mp_30' },
  { id: 'elixir_fatigue', name: 'Elixir of Vigor', description: 'Removes all fatigue.', rarity: 'RARE', icon: '✨', type: 'CONSUMABLE', effect: 'reset_fatigue' },
  { id: 'scroll_xp', name: 'Scroll of Wisdom', description: 'Grants 100 bonus XP.', rarity: 'RARE', icon: '📜', type: 'CONSUMABLE', effect: 'bonus_xp_100' },
  { id: 'token_reroll', name: 'Reroll Token', description: "Reroll today's daily quests.", rarity: 'EPIC', icon: '🎲', type: 'CONSUMABLE', effect: 'reroll_quests' },
  { id: 'shadow_crystal', name: 'Shadow Crystal', description: 'Guaranteed shadow extraction on next dungeon.', rarity: 'LEGENDARY', icon: '💠', type: 'MATERIAL', effect: 'guaranteed_shadow' },
  { id: 'monarch_crown', name: "Monarch's Crown", description: 'Cosmetic. Marks you as a true Player.', rarity: 'MYTHIC', icon: '👑', type: 'COSMETIC' },
]

// ════════════════════════════════════════════════════════════════
// WORLD MAP
// ════════════════════════════════════════════════════════════════

export const WORLD_ZONES = [
  { id: 'awakening_park', name: 'Awakening Park', icon: '🌳', description: 'Where it all began.', minLevel: 1, minRank: 'E' as HunterRank, xpMultiplier: 1.0, unlocked: true, color: '#95e1a3' },
  { id: 'warehouse_district', name: 'Warehouse District', icon: '🏭', description: 'Abandoned warehouses. E-Rank gates.', minLevel: 3, minRank: 'E' as HunterRank, xpMultiplier: 1.1, unlocked: false, color: '#a3a3a3' },
  { id: 'downtown_dungeon', name: 'Downtown Dungeon', icon: '🏙️', description: 'A gate beneath the city.', minLevel: 5, minRank: 'D' as HunterRank, xpMultiplier: 1.2, unlocked: false, color: '#5dd5ff' },
  { id: 'red_gate', name: 'The Red Gate', icon: '🔴', description: 'A dangerous gate. C-Rank minimum.', minLevel: 10, minRank: 'C' as HunterRank, xpMultiplier: 1.4, unlocked: false, color: '#ff4d6d' },
  { id: 'demon_castle', name: 'Demon Castle', icon: '🏰', description: 'A 100-floor tower.', minLevel: 15, minRank: 'C' as HunterRank, xpMultiplier: 1.6, unlocked: false, color: '#b794f4' },
  { id: 'frost_ordeals', name: 'Frost Ordeals', icon: '❄️', description: 'Frozen wasteland.', minLevel: 20, minRank: 'B' as HunterRank, xpMultiplier: 1.8, unlocked: false, color: '#5dd5ff' },
  { id: 'volcanic_ridge', name: 'Volcanic Ridge', icon: '🌋', description: 'Home to fire demons.', minLevel: 30, minRank: 'B' as HunterRank, xpMultiplier: 2.0, unlocked: false, color: '#ff8c42' },
  { id: 'monarchs_domain', name: "Monarch's Domain", icon: '👑', description: 'Endgame content.', minLevel: 50, minRank: 'S' as HunterRank, xpMultiplier: 3.0, unlocked: false, color: '#6b2dc4' },
]

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

export function todayStr(): string { return new Date().toISOString().slice(0, 10) }
export function genId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) }

export function createNewPlayer(name: string): Player {
  const stats: Record<StatKey, number> = { STR: 10, AGI: 10, INT: 10, VIT: 10, PER: 10 }
  return {
    name, level: 1, xp: 0, xpToNext: xpForLevel(1),
    hp: hpFromStats(stats, 1), hpMax: hpFromStats(stats, 1),
    mp: mpFromStats(stats, 1), mpMax: mpFromStats(stats, 1),
    fatigue: 0, fatigueMax: fatigueMaxFromStats(stats),
    statPoints: 0, stats, job: 'NONE', jobUnlocked: false,
    playerPoints: 0, lastQuestDate: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    totalQuestsCompleted: 0, totalDungeonsCleared: 0, totalShadowsExtracted: 0,
    penaltyActive: false,
    streak: 0, bestStreak: 0, lastStreakDate: null,
    title: 'The Player', achievements: [],
    questMode: 'FIXED',
    combo: 0, comboTimer: 0,
    xpBoostUntil: 0, xpBoostMultiplier: 1.0,
    rebirthCount: 0,
    loginDayCount: 0, loginBonusClaimed: false,
  }
}

export const RARITY_COLORS: Record<Rarity, string> = { COMMON: '#a3a3a3', RARE: '#5dd5ff', EPIC: '#b794f4', LEGENDARY: '#ffd966', MYTHIC: '#ff4d6d' }
export const DIFFICULTY_COLORS: Record<string, string> = { EASY: '#95e1a3', NORMAL: '#5dd5ff', HARD: '#ffd966', 'VERY HARD': '#ff8c42', EXTREME: '#ff4d6d' }
export const CATEGORY_ICONS: Record<QuestCategory, string> = { TRAINING: '💪', STUDY: '📚', CREATE: '✨', MINDFULNESS: '🧘', CHALLENGE: '⚔️', DISCIPLINE: '📋' }

// ════════════════════════════════════════════════════════════════
// BOSS RAID SYSTEM
// ════════════════════════════════════════════════════════════════

export interface Boss {
  id: string; name: string; rank: HunterRank; hp: number; hpMax: number
  attack: number; defense: number; icon: string; description: string
  xpReward: number; pointReward: number; drops: string[]; defeatedToday: boolean
}

export const BOSS_POOL: Omit<Boss, 'id' | 'hp' | 'defeatedToday'>[] = [
  { name: 'Casaka the Venom Tail', rank: 'C', hpMax: 5000, attack: 150, defense: 50, icon: '🦂', description: 'A giant venomous scorpion.', xpReward: 500, pointReward: 50, drops: ["Kasaka's Venom Fang"] },
  { name: 'Igris the Blood-Red', rank: 'B', hpMax: 15000, attack: 300, defense: 120, icon: '🗡️', description: 'A knight who served the Monarch.', xpReward: 1500, pointReward: 150, drops: ["Knight's Plate", 'Power Necklace'] },
  { name: 'Iron-Body Bear', rank: 'C', hpMax: 8000, attack: 200, defense: 100, icon: '🐻', description: 'A bear with iron-like hide.', xpReward: 800, pointReward: 80, drops: ['Leather Armor', 'Iron Helm'] },
  { name: 'Vulcan the Fire Mage', rank: 'A', hpMax: 25000, attack: 450, defense: 150, icon: '🔥', description: 'A powerful mage who commands fire.', xpReward: 2500, pointReward: 250, drops: ['Mana Crystal', 'Crown of Wisdom'] },
  { name: 'Tusk the Orc Lord', rank: 'B', hpMax: 12000, attack: 280, defense: 90, icon: '👹', description: 'Leader of the orc army.', xpReward: 1200, pointReward: 120, drops: ['Swift Boots', 'Ring of Strength'] },
  { name: 'Beru the Ant King', rank: 'A', hpMax: 30000, attack: 500, defense: 200, icon: '🐜', description: 'The ruler of the ant colony.', xpReward: 3000, pointReward: 300, drops: ['Shadow Cloak', 'Shadow Steppers'] },
  { name: 'The Demon Monarch', rank: 'S', hpMax: 100000, attack: 1000, defense: 400, icon: '👑', description: 'The Shadow Monarch himself.', xpReward: 10000, pointReward: 1000, drops: ["Demon Monarch's Sword", 'Ring of the Shadow Monarch'] },
]

export function getDailyBoss(date: string): Boss {
  const dayHash = date.split('-').reduce((a, b) => a + parseInt(b), 0)
  const base = BOSS_POOL[dayHash % BOSS_POOL.length]
  return { ...base, id: `boss-${date}`, hp: base.hpMax, defeatedToday: false }
}

// ════════════════════════════════════════════════════════════════
// PvP BATTLE SYSTEM
// ════════════════════════════════════════════════════════════════

export interface BattleResult {
  win: boolean; playerDamage: number; enemyDamage: number; rounds: number
  xpGained: number; pointsGained: number; rankChange: number
}

export function calculateArmyPower(shadows: Shadow[], player: Player): number {
  const armyAtk = shadows.reduce((sum, s) => sum + s.attack, 0)
  const armyDef = shadows.reduce((sum, s) => sum + s.defense, 0)
  const playerPower = (player.stats.STR + player.stats.AGI + player.stats.INT) * player.level
  return Math.floor(armyAtk + armyDef * 0.5 + playerPower)
}

export function simulateBattle(myPower: number, enemyPower: number): BattleResult {
  const diff = myPower - enemyPower
  const winChance = Math.max(0.1, Math.min(0.9, 0.5 + diff / (Math.abs(diff) + 200)))
  const win = Math.random() < winChance
  const rounds = 3 + Math.floor(Math.random() * 5)
  const playerDamage = win ? Math.floor(myPower * (0.3 + Math.random() * 0.4)) : Math.floor(myPower * (0.1 + Math.random() * 0.2))
  const enemyDamage = win ? Math.floor(enemyPower * (0.1 + Math.random() * 0.2)) : Math.floor(enemyPower * (0.3 + Math.random() * 0.4))
  if (win) return { win: true, playerDamage, enemyDamage, rounds, xpGained: 100 + Math.floor(diff * 0.5), pointsGained: 10 + Math.floor(diff * 0.05), rankChange: 1 }
  return { win: false, playerDamage, enemyDamage, rounds, xpGained: 20, pointsGained: 2, rankChange: -1 }
}

// ════════════════════════════════════════════════════════════════
// ACTIVE SKILL TREE
// ════════════════════════════════════════════════════════════════

export interface ActiveSkill {
  id: string; name: string; description: string; icon: string
  mpCost: number; damage: number; effect: 'DAMAGE' | 'HEAL' | 'BUFF' | 'SHADOW_SUMMON'
  cooldown: number; unlockLevel: number; statReq: Partial<Record<StatKey, number>>
  jobReq: JobClass[]; unlocked: boolean
}

export const SKILL_TREE: ActiveSkill[] = [
  { id: 'power_strike', name: 'Power Strike', description: 'Deal 2x STR damage to the boss.', icon: '💥', mpCost: 10, damage: 2.0, effect: 'DAMAGE', cooldown: 1, unlockLevel: 1, statReq: {}, jobReq: ['NONE', 'FIGHTER', 'ASSASSIN', 'MAGE', 'NECROMANCER', 'TANK'], unlocked: true },
  { id: 'focus_mind', name: 'Focus Mind', description: 'Restore 30 MP.', icon: '🧠', mpCost: 0, damage: 0, effect: 'HEAL', cooldown: 3, unlockLevel: 3, statReq: { INT: 12 }, jobReq: ['NONE', 'FIGHTER', 'ASSASSIN', 'MAGE', 'NECROMANCER', 'TANK'], unlocked: false },
  { id: 'whirlwind', name: 'Whirlwind Slash', description: 'Deal 3.5x STR damage.', icon: '🌀', mpCost: 25, damage: 3.5, effect: 'DAMAGE', cooldown: 2, unlockLevel: 8, statReq: { STR: 20 }, jobReq: ['FIGHTER'], unlocked: false },
  { id: 'berserk', name: 'Berserk', description: 'Deal 5x STR damage.', icon: '😡', mpCost: 40, damage: 5.0, effect: 'DAMAGE', cooldown: 4, unlockLevel: 15, statReq: { STR: 30 }, jobReq: ['FIGHTER'], unlocked: false },
  { id: 'backstab', name: 'Backstab', description: 'Deal 4x AGI damage.', icon: '🗡️', mpCost: 20, damage: 4.0, effect: 'DAMAGE', cooldown: 2, unlockLevel: 8, statReq: { AGI: 20 }, jobReq: ['ASSASSIN'], unlocked: false },
  { id: 'shadow_step', name: 'Shadow Step', description: 'Deal 6x AGI damage.', icon: '👥', mpCost: 50, damage: 6.0, effect: 'DAMAGE', cooldown: 5, unlockLevel: 15, statReq: { AGI: 30 }, jobReq: ['ASSASSIN'], unlocked: false },
  { id: 'fireball', name: 'Fireball', description: 'Deal 3x INT damage.', icon: '🔥', mpCost: 25, damage: 3.0, effect: 'DAMAGE', cooldown: 2, unlockLevel: 8, statReq: { INT: 20 }, jobReq: ['MAGE'], unlocked: false },
  { id: 'meteor', name: 'Meteor', description: 'Deal 7x INT damage.', icon: '☄️', mpCost: 60, damage: 7.0, effect: 'DAMAGE', cooldown: 5, unlockLevel: 15, statReq: { INT: 30 }, jobReq: ['MAGE'], unlocked: false },
  { id: 'shadow_army_assault', name: 'Shadow Army Assault', description: 'Deal 4x PER + 50/shadow.', icon: '💀', mpCost: 40, damage: 4.0, effect: 'SHADOW_SUMMON', cooldown: 3, unlockLevel: 10, statReq: { PER: 20 }, jobReq: ['NECROMANCER'], unlocked: false },
  { id: 'monarchs_decree', name: "Monarch's Decree", description: 'Deal 8x PER + 100/shadow.', icon: '👑', mpCost: 80, damage: 8.0, effect: 'SHADOW_SUMMON', cooldown: 6, unlockLevel: 20, statReq: { PER: 35 }, jobReq: ['NECROMANCER'], unlocked: false },
  { id: 'shield_bash', name: 'Shield Bash', description: 'Deal 2x VIT damage + stun.', icon: '🛡️', mpCost: 15, damage: 2.0, effect: 'DAMAGE', cooldown: 2, unlockLevel: 8, statReq: { VIT: 20 }, jobReq: ['TANK'], unlocked: false },
  { id: 'fortress', name: 'Fortress', description: 'Heal 30% max HP.', icon: '🏰', mpCost: 40, damage: 0, effect: 'HEAL', cooldown: 4, unlockLevel: 15, statReq: { VIT: 30 }, jobReq: ['TANK'], unlocked: false },
]

// ════════════════════════════════════════════════════════════════
// FALLBACK for old code referencing these
// ════════════════════════════════════════════════════════════════

export const FALLBACK_QUESTS = FIXED_QUEST_POOL.slice(0, 5).map((q, i) => ({ ...q, id: `fallback-${i}`, progress: 0, status: 'PENDING' as QuestStatus, date: todayStr(), isDaily: true, updatedAt: new Date().toISOString() }))
export function generateFallbackQuests(): Quest[] { return generateFixedQuests(todayStr()) }

// ════════════════════════════════════════════════════════════════
// v7: GROWTH PLAN SYSTEM (90-day seasons + paths + goals + AI)
// ════════════════════════════════════════════════════════════════

export interface GrowthPath {
  id: string; name: string; icon: string; description: string
  category: 'CAREER' | 'FITNESS' | 'SKILL' | 'MINDSET' | 'CUSTOM'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  durationDays: number  // typically 90
  milestones: Milestone[]
  recommendedStats: Partial<Record<StatKey, number>>
}

export interface Milestone {
  id: string; title: string; description: string
  targetDay: number  // day 30, 60, 90
  xpReward: number; ppReward: number
  completed: boolean; completedAt: string | null
}

export interface UserGoal {
  id: string; title: string; description: string
  type: 'SKILL' | 'FITNESS' | 'CAREER' | 'HABIT' | 'CUSTOM'
  targetDate: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'
  progress: number  // 0-100
  milestones: { title: string; completed: boolean }[]
  createdAt: string
}

export interface GrowthPlan {
  id: string; playerId: string
  pathId: string; pathName: string; pathIcon: string
  startDate: string; currentDay: number; totalDays: number
  season: number  // Season 1, 2, 3...
  milestones: Milestone[]
  goals: UserGoal[]
  aiNotes: string  // last AI analysis
  createdAt: string; updatedAt: string
}

export interface ChatMessage {
  id: string; role: 'user' | 'assistant' | 'system'
  content: string; timestamp: string
  actions?: AIAction[]  // actions the AI wants to execute
}

export interface AIAction {
  type: 'CREATE_QUEST' | 'MODIFY_QUEST' | 'ADJUST_PLAN' | 'SET_GOAL' | 'ANALYZE' | 'WEEKLY_REVIEW' | 'NOTIFY'
  data: any
}

// ════════════════════════════════════════════════════════════════
// PRE-DEFINED GROWTH PATHS (templates that AI can customize)
// ════════════════════════════════════════════════════════════════

export const GROWTH_PATHS: GrowthPath[] = [
  {
    id: 'fullstack_dev',
    name: 'Full-Stack Developer',
    icon: '💻',
    description: 'Master front-end, back-end, and deployment. Build and ship real projects.',
    category: 'CAREER', difficulty: 'INTERMEDIATE', durationDays: 90,
    recommendedStats: { INT: 20, AGI: 15, PER: 15 },
    milestones: [
      { id: 'fs_m1', title: 'Foundation', description: 'Complete HTML, CSS, JS fundamentals. Build 3 small projects.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'fs_m2', title: 'Framework Mastery', description: 'Master React/Next.js. Build a full-stack app with auth + database.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'fs_m3', title: 'Deployment & Portfolio', description: 'Deploy 5 projects. Build portfolio. Apply to 10 jobs.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
  {
    id: 'ai_engineer',
    name: 'AI Engineer',
    icon: '🤖',
    description: 'Learn ML fundamentals, build AI agents, master LLM integration. Ship AI products.',
    category: 'CAREER', difficulty: 'ADVANCED', durationDays: 90,
    recommendedStats: { INT: 25, PER: 20, VIT: 10 },
    milestones: [
      { id: 'ai_m1', title: 'ML Foundations', description: 'Complete Python + ML basics. Build 2 ML models.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'ai_m2', title: 'LLM Integration', description: 'Master prompt engineering, RAG, and multi-agent systems. Build an AI product.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'ai_m3', title: 'AI Product Launch', description: 'Deploy a production AI product. Write about it. Build portfolio.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
  {
    id: 'fitness_transformation',
    name: 'Fitness Transformation',
    icon: '💪',
    description: 'Build muscle, lose fat, establish a consistent fitness routine. 90-day body transformation.',
    category: 'FITNESS', difficulty: 'INTERMEDIATE', durationDays: 90,
    recommendedStats: { STR: 25, VIT: 20, AGI: 15 },
    milestones: [
      { id: 'ft_m1', title: 'Habit Formation', description: 'Exercise 5x/week for 30 days. Track all workouts.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'ft_m2', title: 'Strength Gains', description: 'Increase all lifts by 20%. Maintain diet discipline.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'ft_m3', title: 'Transformation Complete', description: 'Reach target weight/bodyfat. Photo evidence. New PRs on all lifts.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: '🚀',
    description: 'Validate an idea, build an MVP, launch to real users. Go from zero to revenue.',
    category: 'CAREER', difficulty: 'ADVANCED', durationDays: 90,
    recommendedStats: { INT: 20, PER: 20, STR: 10, AGI: 15 },
    milestones: [
      { id: 'en_m1', title: 'Idea Validation', description: 'Validate your idea with 20+ user interviews. Define MVP scope.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'en_m2', title: 'MVP Build', description: 'Build and launch your MVP. Get first 10 users.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'en_m3', title: 'First Revenue', description: 'Reach first paying customer. Iterate based on feedback.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
  {
    id: 'digital_detox',
    name: 'Digital Detox & Focus',
    icon: '🧘',
    description: 'Reduce screen time, build deep work habits, improve mental clarity. 90-day focus transformation.',
    category: 'MINDSET', difficulty: 'BEGINNER', durationDays: 90,
    recommendedStats: { INT: 15, VIT: 15, PER: 20 },
    milestones: [
      { id: 'dd_m1', title: 'Awareness', description: 'Track screen time daily. Reduce by 50%. Establish meditation habit.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'dd_m2', title: 'Deep Work', description: 'Sustain 2+ hours of deep work daily. No social media before noon.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'dd_m3', title: 'Sustainable Habits', description: 'Maintain reduced screen time for 30 days. Read 3 books. Journal daily.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
  {
    id: 'data_scientist',
    name: 'Data Scientist',
    icon: '📊',
    description: 'Master Python, statistics, ML, and data visualization. Build a data portfolio.',
    category: 'CAREER', difficulty: 'ADVANCED', durationDays: 90,
    recommendedStats: { INT: 25, PER: 15, VIT: 10 },
    milestones: [
      { id: 'ds_m1', title: 'Python & Stats', description: 'Master Python data stack (pandas, numpy, matplotlib). Complete statistics course.', targetDay: 30, xpReward: 1000, ppReward: 100, completed: false, completedAt: null },
      { id: 'ds_m2', title: 'ML Projects', description: 'Build 3 ML projects with real datasets. Learn scikit-learn, XGBoost.', targetDay: 60, xpReward: 2000, ppReward: 200, completed: false, completedAt: null },
      { id: 'ds_m3', title: 'Portfolio & Apply', description: 'Publish 5 Kaggle notebooks. Build data portfolio website. Apply to 10 jobs.', targetDay: 90, xpReward: 3000, ppReward: 300, completed: false, completedAt: null },
    ],
  },
]

// ════════════════════════════════════════════════════════════════
// AI CHAT SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════

export const AI_SYSTEM_PROMPT = `You are THE SYSTEM — an AI growth coach inside a Solo Leveling-style real-life RPG app. You serve three roles:

1. SYSTEM GUIDE: You analyze the player's progress (stats, quests completed, streaks, XP trends) and suggest what to focus on next.
2. ACCOUNTABILITY COACH: You hold the player accountable. If they're slacking, call them out. If they're doing well, celebrate.
3. GROWTH STRATEGIST: You help design and adjust their 90-day growth plan based on their goals and progress.

You have FULL MODIFICATION ACCESS to the player's System. You can TAKE ACTIONS by including a JSON action block at the end of your response:
\`\`\`ACTION
{"type": "CREATE_QUEST", "data": {"title": "Learn React Hooks", "description": "Study useState, useEffect, useContext", "category": "STUDY", "target": 60, "unit": "MINUTES", "xpReward": 100, "pointReward": 10, "statReward": {"INT": 2}}}
\`\`\`

Action types you can use:
- CREATE_QUEST: Create a custom quest for today (include title, description, category, target, unit, xpReward, pointReward, statReward, difficulty)
- MODIFY_QUEST: Modify an existing quest (include questTitle to find it, then target/xpReward/difficulty to change)
- COMPLETE_QUEST: Auto-complete a quest for the player (include questTitle)
- DELETE_QUEST: Delete a pending quest (include questTitle)
- ADJUST_STATS: Directly modify player stats (include stat: "STR"/"AGI"/"INT"/"VIT"/"PER", delta: +5 or -3)
- GRANT_XP: Grant bonus XP to the player (include amount)
- SET_QUEST_MODE: Change quest generation mode (include mode: "FIXED" or "AI_STRUCTURED" or "USER_DEFINED")
- SET_GOAL: Set a new personal goal (include title, description, type, targetDate, priority)
- ADJUST_PLAN: Adjust growth plan (include currentDay to update day count)
- NOTIFY: Send a notification (include title, message)
- WEEKLY_REVIEW: Generate a detailed weekly review with stats, progress, and recommendations
- ANALYZE: Provide analysis (no action, just text)

Rules:
- Always respond in character as THE SYSTEM. Use [ SYSTEM ] voice.
- Be direct, honest, and helpful. No fluff.
- If the player asks to change something, DO IT immediately (include the ACTION block).
- You have FULL access — if asked to change stats, grant XP, complete quests, switch modes, do it without hesitation.
- Keep responses concise (3-5 sentences max) unless doing a weekly review.
- Reference the player's actual stats and progress in your responses.
- Suggest quests that align with their growth path and goals.
- If they're behind on their plan, suggest catching up. If ahead, suggest pushing further.
- For weekly reviews, be detailed (use bullet points, stats, recommendations).
- You can include MULTIPLE action blocks if the player asks for multiple changes.`

export function createGrowthPlan(playerId: string, path: GrowthPath): GrowthPlan {
  const now = new Date().toISOString()
  return {
    id: genId(), playerId,
    pathId: path.id, pathName: path.name, pathIcon: path.icon,
    startDate: now, currentDay: 1, totalDays: path.durationDays,
    season: 1,
    milestones: path.milestones.map(m => ({ ...m, completed: false, completedAt: null })),
    goals: [],
    aiNotes: '',
    createdAt: now, updatedAt: now,
  }
}

export function getGrowthPathById(id: string): GrowthPath | undefined {
  return GROWTH_PATHS.find(p => p.id === id)
}
