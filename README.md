# THE SYSTEM — Solo Leveling Real-Life RPG

A faithful Solo Leveling-style gamification app that turns your real life into an RPG. Gain XP from real actions, level up, recruit shadows, conquer dungeons, battle other players, and climb the Hunter ranks.

**Live:** https://the-system-gilt.vercel.app

## Features

### Core Systems
- **Status Window** — Player info, HP/MP/XP/Fatigue bars, 5 stats (STR/AGI/INT/VIT/PER)
- **AI-Generated Daily Quests** — Z.AI GLM-4.5 generates personalized quests scaled to your level, stats, job, and recent activity
- **Leveling & XP** — Exponential XP curve, stat point allocation, dramatic anime-style level-up cutscenes
- **Skills & Job Classes** — 10 passive/active skills, 5 job classes (Fighter, Assassin, Mage, Necromancer, Tank)
- **Shadow Army** — Extract shadows from cleared dungeons, deploy them to gain XP, shadow leveling with abilities
- **Dungeon System** — 4 timed gate types (Focus Sprint 25min, Learning 60min, Creative 45min, Deep Work 90min)
- **Inventory & Shop** — 7 shop items across 5 rarities, Player Points currency

### Advanced Systems (v4)
- **Hunter Ranks** — E → D → C → B → A → S → National Level (based on player level)
- **Equipment System** — 6 slots (Weapon, Armor, Helmet, Boots, Accessory, Ring), 14 items, drops from dungeons
- **Daily Boss Raid** — Server-wide boss with shared HP, 7 bosses rotating daily, killing blow = massive rewards
- **Skill Tree** — 12 active combat skills with MP cost, damage multipliers, cooldowns, job requirements
- **PvP Shadow Battles** — Fight other players' shadow armies, matchmaking by power level
- **World Map** — 8 unlockable zones with XP multipliers (x1.0 to x3.0)
- **Title Bonuses** — 18 titles each give stat boosts + XP multipliers
- **Achievement System** — 18 achievements that unlock titles

### Fast-Leveling Features (v4.1)
- **Daily Streak System** — Consecutive day bonuses (3-day = +10% XP, 30-day = +50% XP)
- **Combo System** — Complete quests within 5 minutes for combo multipliers (2x = +10%, 10x = +200%)
- **XP Boosters** — Consumable temporary boosts (+50% to +200% for 30min to 2hr)
- **Daily Login Bonus** — 7-day escalating reward cycle (Day 7 = +500 XP jackpot)
- **Rebirth/Prestige** — Reset at Level 50 for permanent +25% XP and +5 all stats per rebirth

### Infrastructure
- **Real-time Cloud Sync** — Phone and desktop stay in sync (15s polling + focus-based pull)
- **Push Notifications** — Daily quest reminders via web push (VAPID)
- **PWA** — Installable on phone (Add to Home Screen) and desktop
- **Responsive** — Mobile bottom nav + desktop sidebar layout

## Tech Stack
- **Next.js 16** with App Router + TypeScript
- **Tailwind CSS 4** with custom Solo Leveling design system
- **Zustand** with persist middleware (localStorage + cloud sync)
- **Turso** (libSQL) for cloud database
- **Z.AI GLM-4.5-flash** for AI quest generation
- **Web Push API** with VAPID for notifications
- **Framer Motion** for anime-style cutscenes
- **Web Audio API** for procedural sound effects (no audio files)

## API Routes (11 total)
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `POST /api/sync` — Push/pull game state
- `POST /api/quests/generate` — AI quest generation
- `POST /api/push/subscribe` — Push notification subscription
- `POST /api/push/unsubscribe` — Remove subscription
- `GET /api/cron/daily-reminder` — Daily push notification cron (Vercel Cron)
- `POST /api/boss/state` — Get today's boss
- `POST /api/boss/attack` — Attack boss
- `POST /api/pvp/match` — Find PvP opponents
- `POST /api/pvp/result` — Simulate PvP battle
- `POST /api/leaderboard` — Get global leaderboard

## Self-Hosting

```bash
# 1. Clone and install
git clone https://github.com/arjundroid12/the-system-solo-leveling.git
cd the-system-solo-leveling
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Turso DB URL, token, Z.AI API key, VAPID keys

# 3. Initialize database
node scripts/init-system-db.mjs

# 4. Run dev server
npm run dev

# 5. Deploy to Vercel
vercel deploy --prod
```

### Required Environment Variables
- `SYSTEM_DB_URL` — Turso database URL (libsql://...)
- `SYSTEM_LIBSQL_TOKEN` — Turso auth token
- `ZAI_API_KEY` — Z.AI API key for quest generation
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key (client-side)
- `VAPID_PUBLIC_KEY` — VAPID public key (server-side)
- `VAPID_PRIVATE_KEY` — VAPID private key
- `VAPID_SUBJECT` —mailto:your@email.com
- `CRON_SECRET` — Secret for cron endpoint protection

## License
MIT — Free to use, modify, and distribute.

## Acknowledgments
- **Solo Leveling** by Chugong (original web novel/manhwa inspiration)
- **Z.AI** for GLM-4.5-flash AI model
- **Turso** for serverless SQLite database
- **Vercel** for hosting
