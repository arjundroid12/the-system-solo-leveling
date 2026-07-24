// scripts/restore-quests.mjs
const TURSO_URL = "https://quirk-arjundroid12.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM3NDEwNjMsImlkIjoiMDE5ZjRkODAtM2QwMS03NjRiLWIwMGEtOTAxODY2OWEyZTdiIiwia2lkIjoiX0FobUptZDgtT2djTXN6REwtTjVHQ1hoSk1hdWdHQWpvWnlid2ZqSWtOWSIsInJpZCI6IjRiN2M2ZGIyLTc3MDQtNGUyYS1hZDcxLTQ2NTk2MzFlYzE1ZSJ9.epVC_1ZnCkhRXnu9E-1CDFYwVcQY7BuSnhqyVlr3tPIzIjIm_gRSRd6pMwbJVW8XFcUGB3VOOs5rLzg0LsgNCA";
const ARJUNA_ID = "mrn0ishgr8ul6sct";
const TODAY = new Date().toISOString().slice(0, 10);
const TS = new Date().toISOString();

// 5 fallback quests for Arjuna
const quests = [
  { title: "Push-ups", desc: "Complete push-ups to strengthen your body.", cat: "TRAINING", diff: "NORMAL", xp: 50, pp: 5, stat: { STR: 1 }, target: 50 },
  { title: "Read", desc: "Read pages of a book.", cat: "STUDY", diff: "NORMAL", xp: 60, pp: 6, stat: { INT: 1 }, target: 30 },
  { title: "Meditate", desc: "Meditate to clear your mind.", cat: "MINDFULNESS", diff: "EASY", xp: 40, pp: 4, stat: { INT: 1, PER: 1 }, target: 10 },
  { title: "Code Practice", desc: "Write code for personal practice.", cat: "STUDY", diff: "HARD", xp: 120, pp: 12, stat: { INT: 2 }, target: 60 },
  { title: "Stretching", desc: "Stretch to improve flexibility.", cat: "TRAINING", diff: "EASY", xp: 30, pp: 3, stat: { AGI: 1 }, target: 10 },
];

const requests = quests.map(q => ({
  type: "execute",
  stmt: {
    sql: "INSERT INTO sl_quests (id, player_id, title, description, category, difficulty, xp_reward, point_reward, stat_reward_json, target, progress, status, quest_date, is_daily, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      { type: "text", value: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) },
      { type: "text", value: ARJUNA_ID },
      { type: "text", value: q.title },
      { type: "text", value: q.desc },
      { type: "text", value: q.cat },
      { type: "text", value: q.diff },
      { type: "float", value: q.xp },
      { type: "float", value: q.pp },
      { type: "text", value: JSON.stringify(q.stat) },
      { type: "float", value: q.target },
      { type: "float", value: 0 },
      { type: "text", value: "PENDING" },
      { type: "text", value: TODAY },
      { type: "float", value: 1 },
      { type: "text", value: TS },
    ],
  },
}));

const res = await fetch(TURSO_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TURSO_TOKEN}` },
  body: JSON.stringify({ requests }),
});
const data = await res.json();
if (res.ok) {
  console.log(`✓ Restored ${quests.length} quests for Arjuna (${ARJUNA_ID})`);
} else {
  console.error("Failed:", JSON.stringify(data).slice(0, 300));
}
