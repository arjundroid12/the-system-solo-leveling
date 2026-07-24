// scripts/migrate-v7-growth.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sl_growth_plans (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    path_id TEXT, path_name TEXT, path_icon TEXT,
    start_date TEXT, current_day INTEGER DEFAULT 1, total_days INTEGER DEFAULT 90,
    season INTEGER DEFAULT 1,
    milestones_json TEXT DEFAULT '[]',
    goals_json TEXT DEFAULT '[]',
    ai_notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS sl_chat_messages (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    actions_json TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES sl_players(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sl_growth_plans_player ON sl_growth_plans(player_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sl_chat_messages_player ON sl_chat_messages(player_id)`,
];

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({ requests: STATEMENTS.map(sql => ({ type: "execute", stmt: { sql } })) }),
});
console.log("✓ v7 growth tables created");
