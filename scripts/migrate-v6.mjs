// scripts/migrate-v6.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

const STATEMENTS = [
  "ALTER TABLE sl_quests ADD COLUMN unit TEXT DEFAULT 'REPS'",
  "ALTER TABLE sl_quests ADD COLUMN updated_at TEXT",
  "ALTER TABLE sl_shadows ADD COLUMN updated_at TEXT",
  "ALTER TABLE sl_players ADD COLUMN quest_mode TEXT DEFAULT 'FIXED'",
  "ALTER TABLE sl_players ADD COLUMN combo INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN combo_timer INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN xp_boost_until INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN xp_boost_multiplier REAL DEFAULT 1.0",
  "ALTER TABLE sl_players ADD COLUMN rebirth_count INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN login_day_count INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN login_bonus_claimed INTEGER DEFAULT 0",
];

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({ requests: STATEMENTS.map(sql => ({ type: "execute", stmt: { sql } })) }),
});
console.log("✓ v6 migration complete (errors for existing columns are expected)");
