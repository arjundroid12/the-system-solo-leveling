// scripts/debug-quests.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({
    requests: [
      { type: "execute", stmt: { sql: "SELECT id, username, level, last_quest_date FROM sl_players" } },
      { type: "execute", stmt: { sql: "SELECT player_id, title, status, progress, target, quest_date FROM sl_quests ORDER BY created_at DESC LIMIT 30" } },
    ],
  }),
});
const data = await res.json();

console.log("=== PLAYERS ===");
const players = data.results?.[0]?.response?.result;
if (players?.rows) {
  players.rows.forEach(row => {
    const r = {};
    players.cols.forEach((c, i) => { r[c.name] = row[i]?.type === "null" ? null : row[i]?.value; });
    console.log(JSON.stringify(r));
  });
}

console.log("\n=== QUESTS ===");
const quests = data.results?.[1]?.response?.result;
if (quests?.rows) {
  console.log(`Total quests in DB: ${quests.rows.length}`);
  quests.rows.forEach(row => {
    const r = {};
    quests.cols.forEach((c, i) => { r[c.name] = row[i]?.type === "null" ? null : row[i]?.value; });
    console.log(JSON.stringify(r));
  });
} else {
  console.log("NO QUESTS IN DB AT ALL");
}
