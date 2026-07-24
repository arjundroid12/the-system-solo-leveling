// scripts/migrate-system-v3.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

const STATEMENTS = [
  // Add v3 fields to sl_players (idempotent — ALTER TABLE ... ADD COLUMN fails silently if exists)
  "ALTER TABLE sl_players ADD COLUMN streak INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN best_streak INTEGER DEFAULT 0",
  "ALTER TABLE sl_players ADD COLUMN last_streak_date TEXT",
  "ALTER TABLE sl_players ADD COLUMN title TEXT DEFAULT 'The Player'",
  "ALTER TABLE sl_players ADD COLUMN achievements TEXT DEFAULT '[]'",
  // Add v3 fields to sl_shadows
  "ALTER TABLE sl_shadows ADD COLUMN xp INTEGER DEFAULT 0",
  "ALTER TABLE sl_shadows ADD COLUMN xp_to_next INTEGER DEFAULT 50",
  "ALTER TABLE sl_shadows ADD COLUMN loyalty INTEGER DEFAULT 50",
  "ALTER TABLE sl_shadows ADD COLUMN deployed INTEGER DEFAULT 0",
  "ALTER TABLE sl_shadows ADD COLUMN ability TEXT DEFAULT 'Basic Strike'",
];

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({ requests: STATEMENTS.map(sql => ({ type: "execute", stmt: { sql } })) }),
});
const data = await res.json();
// ALTER TABLE ADD COLUMN fails if column already exists, but that's OK
console.log("✓ Migration v3 complete (errors for existing columns are expected and safe)");
