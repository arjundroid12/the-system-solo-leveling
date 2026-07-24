// scripts/init-system-db.mjs
// Creates the Solo Leveling System tables in Turso
// Run with: DATABASE_URL=libsql://... LIBSQL_TOKEN=... node scripts/init-system-db.mjs

const TURSO_URL = process.env.DATABASE_URL?.replace("libsql://", "https://") + "/v2/pipeline";
const TURSO_TOKEN = process.env.LIBSQL_TOKEN;

if (!process.env.DATABASE_URL || !TURSO_TOKEN) {
  console.error("ERROR: DATABASE_URL and LIBSQL_TOKEN must be set.");
  process.exit(1);
}

const STATEMENTS = [
  // Players — synced across devices
  `CREATE TABLE IF NOT EXISTS sl_players (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    password     TEXT NOT NULL,
    level        INTEGER DEFAULT 1,
    xp           INTEGER DEFAULT 0,
    hp           INTEGER DEFAULT 225,
    mp           INTEGER DEFAULT 23,
    fatigue      INTEGER DEFAULT 0,
    stat_points  INTEGER DEFAULT 0,
    stats_json   TEXT DEFAULT '{"STR":10,"AGI":10,"INT":10,"VIT":10,"PER":10}',
    job          TEXT DEFAULT 'NONE',
    player_points INTEGER DEFAULT 0,
    last_quest_date TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    total_quests INTEGER DEFAULT 0,
    total_dungeons INTEGER DEFAULT 0,
    total_shadows INTEGER DEFAULT 0
  )`,

  // Quests — daily AI-generated quests
  `CREATE TABLE IF NOT EXISTS sl_quests (
    id           TEXT PRIMARY KEY,
    player_id    TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    category     TEXT,
    difficulty   TEXT,
    xp_reward    INTEGER,
    point_reward INTEGER,
    stat_reward_json TEXT,
    target       INTEGER,
    progress     INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'PENDING',
    quest_date   TEXT NOT NULL,
    is_daily     INTEGER DEFAULT 1,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,

  // Shadows — extracted from dungeons
  `CREATE TABLE IF NOT EXISTS sl_shadows (
    id           TEXT PRIMARY KEY,
    player_id    TEXT NOT NULL,
    name         TEXT NOT NULL,
    original_name TEXT,
    rank         TEXT,
    level        INTEGER,
    attack       INTEGER,
    defense      INTEGER,
    description  TEXT,
    extracted_at TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,

  // Inventory items
  `CREATE TABLE IF NOT EXISTS sl_inventory (
    id           TEXT PRIMARY KEY,
    player_id    TEXT NOT NULL,
    item_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    rarity       TEXT,
    icon         TEXT,
    item_type    TEXT,
    effect       TEXT,
    quantity     INTEGER DEFAULT 1,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,

  // Skills — unlock state per player
  `CREATE TABLE IF NOT EXISTS sl_skills (
    id           TEXT PRIMARY KEY,
    player_id    TEXT NOT NULL,
    skill_id     TEXT NOT NULL,
    unlocked     INTEGER DEFAULT 0,
    unlocked_at  TEXT,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE,
    UNIQUE (player_id, skill_id)
  )`,

  // Sync log — tracks last sync time per device
  `CREATE TABLE IF NOT EXISTS sl_sync_log (
    id           TEXT PRIMARY KEY,
    player_id    TEXT NOT NULL,
    device_type  TEXT,
    last_sync    TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_sl_quests_player ON sl_quests(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sl_quests_date ON sl_quests(quest_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sl_shadows_player ON sl_shadows(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sl_inventory_player ON sl_inventory(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sl_skills_player ON sl_skills(player_id)`,
];

async function main() {
  console.log("Initializing Solo Leveling System database...");
  console.log("URL:", TURSO_URL);

  const res = await fetch(TURSO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
    body: JSON.stringify({ requests: STATEMENTS.map(sql => ({ type: "execute", stmt: { sql } })) }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("FAILED:", JSON.stringify(data, null, 2).slice(0, 500));
    process.exit(1);
  }

  console.log(`\n✓ Executed ${STATEMENTS.length} statements.`);
  console.log("\n✓ Database initialized successfully.");
  console.log("Tables: sl_players, sl_quests, sl_shadows, sl_inventory, sl_skills, sl_sync_log");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
