// scripts/wipe-and-check.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

async function exec(sql) {
  return fetch(TURSO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
    body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql } }] }),
  }).then(r => r.json());
}

async function query(sql) {
  const data = await exec(sql);
  const result = data.results?.[0]?.response?.result;
  if (!result?.rows) return [];
  return result.rows.map(row => {
    const o = {};
    result.cols.forEach((c, i) => { o[c.name] = row[i]?.type === "null" ? null : row[i]?.value; });
    return o;
  });
}

// Show current state
console.log("=== BEFORE WIPE ===");
const players = await query("SELECT id, username, level FROM sl_players");
console.log("Players:", players.length);
players.forEach(p => console.log(`  ${p.username} (LV ${p.level})`));

const quests = await query("SELECT COUNT(*) as c FROM sl_quests");
console.log(`Total quests: ${quests[0]?.c}`);

// WIPE EVERYTHING
console.log("\n=== WIPING ALL DATA ===");
await exec("DELETE FROM sl_chat_messages");
await exec("DELETE FROM sl_growth_plans");
await exec("DELETE FROM sl_boss_state");
await exec("DELETE FROM sl_push_subscriptions");
await exec("DELETE FROM sl_inventory");
await exec("DELETE FROM sl_skills");
await exec("DELETE FROM sl_shadows");
await exec("DELETE FROM sl_quests");
await exec("DELETE FROM sl_sync_log");
await exec("DELETE FROM sl_players");
console.log("✓ All tables wiped");

// Verify
console.log("\n=== AFTER WIPE ===");
const remaining = await query("SELECT COUNT(*) as c FROM sl_players");
console.log(`Players remaining: ${remaining[0]?.c}`);
const remainingQuests = await query("SELECT COUNT(*) as c FROM sl_quests");
console.log(`Quests remaining: ${remainingQuests[0]?.c}`);
console.log("\n✓ Fresh start ready. Register a new account at https://the-system-gilt.vercel.app");
