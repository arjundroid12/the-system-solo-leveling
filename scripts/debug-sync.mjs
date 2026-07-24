// scripts/debug-sync.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({
    requests: [
      { type: "execute", stmt: { sql: "SELECT id, username, level, xp, updated_at FROM sl_players WHERE username = ?", args: [{ type: "text", value: "Arjuna" }] } },
      { type: "execute", stmt: { sql: "SELECT COUNT(*) as count FROM sl_growth_plans WHERE player_id = ?", args: [{ type: "text", value: "mrn0ishgr8ul6sct" }] } },
    ],
  }),
});
const data = await res.json();

console.log("=== PLAYER ===");
const p = data.results[0].response.result;
p.rows.forEach(row => {
  const o = {};
  p.cols.forEach((c, i) => { o[c.name] = row[i]?.type === "null" ? null : row[i]?.value; });
  console.log(JSON.stringify(o));
});

console.log("\n=== GROWTH PLANS ===");
const g = data.results[1].response.result;
g.rows.forEach(row => {
  const o = {};
  g.cols.forEach((c, i) => { o[c.name] = row[i]?.type === "null" ? null : row[i]?.value; });
  console.log(JSON.stringify(o));
});
