const http = require("node:http");
const { loadPlayers, RELICS } = require("./game");

const DEFAULT_PORT = 3000;

function startDashboard(client) {
  const port = Number(process.env.DASHBOARD_PORT || DEFAULT_PORT);

  const server = http.createServer(async (req, res) => {
    if (req.url === "/api/players") {
      sendJson(res, await playersPayload(client));
      return;
    }

    if (req.url === "/" || req.url === "/index.html") {
      sendHtml(res, pageHtml(port));
      return;
    }

    sendNotFound(res);
  });

  server.listen(port, () => {
    console.log(`Dashboard ready: http://localhost:${port}`);
  });

  server.on("error", (error) => {
    console.error(`Dashboard failed to start on port ${port}:`, error.message);
  });

  return server;
}

async function playersPayload(client) {
  const players = Object.values(loadPlayers());
  const rows = await Promise.all(
    players.map(async (player) => ({
      ...player,
      displayName: await resolveName(client, player.userId),
      relicNames: player.relics.map((id) => RELICS[id]?.name ?? id)
    }))
  );

  rows.sort((a, b) => {
    if (Number(b.alive) !== Number(a.alive)) return Number(b.alive) - Number(a.alive);
    if (b.floor !== a.floor) return b.floor - a.floor;
    return b.kills - a.kills;
  });

  return {
    updatedAt: new Date().toISOString(),
    players: rows,
    totals: {
      players: rows.length,
      alive: rows.filter((player) => player.alive).length,
      fallen: rows.filter((player) => !player.alive).length
    }
  };
}

async function resolveName(client, userId) {
  const cached = client.users.cache.get(userId);
  if (cached) return cached.globalName || cached.username || userId;

  try {
    const user = await client.users.fetch(userId);
    return user.globalName || user.username || userId;
  } catch {
    return userId;
  }
}

function sendJson(res, value) {
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(html);
}

function sendNotFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function pageHtml(port) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roguelike Bot Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #101113;
      --panel: #191b1f;
      --panel-2: #22252b;
      --line: #343842;
      --text: #f4f0e8;
      --muted: #aaa39a;
      --gold: #e7b84a;
      --green: #5dd69a;
      --red: #e06464;
      --blue: #72a7ff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)),
        var(--bg);
      color: var(--text);
      font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0;
      font-size: clamp(28px, 5vw, 48px);
      line-height: 1;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 15px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 10px;
      min-width: min(430px, 100%);
    }

    .stat {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
    }

    .stat span {
      color: var(--muted);
      display: block;
      font-size: 12px;
    }

    .stat strong {
      display: block;
      margin-top: 4px;
      font-size: 26px;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 13px;
    }

    button {
      border: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--text);
      border-radius: 8px;
      padding: 9px 12px;
      cursor: pointer;
      font: inherit;
    }

    button:hover {
      border-color: var(--blue);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }

    .card {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
      min-height: 220px;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
      margin-bottom: 12px;
    }

    .name {
      font-size: 20px;
      font-weight: 700;
      word-break: break-word;
    }

    .class {
      color: var(--muted);
      margin-top: 3px;
      font-size: 13px;
    }

    .badge {
      border-radius: 999px;
      padding: 5px 9px;
      font-size: 12px;
      color: #0d1114;
      background: var(--green);
      white-space: nowrap;
    }

    .badge.dead {
      background: var(--red);
      color: #fff;
    }

    .meter-label {
      display: flex;
      justify-content: space-between;
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 6px;
    }

    .meter {
      height: 10px;
      background: #0c0d10;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #2b2f36;
    }

    .meter > div {
      height: 100%;
      background: linear-gradient(90deg, var(--red), var(--gold), var(--green));
      width: var(--value);
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 14px 0;
    }

    .fact {
      background: #111317;
      border-radius: 8px;
      padding: 9px;
      min-width: 0;
    }

    .fact span {
      color: var(--muted);
      font-size: 11px;
      display: block;
    }

    .fact strong {
      margin-top: 3px;
      display: block;
      font-size: 16px;
    }

    .relics {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-height: 28px;
    }

    .relic {
      border: 1px solid #4a4130;
      background: rgba(231, 184, 74, 0.12);
      color: #f3d998;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 12px;
    }

    .empty {
      border: 1px dashed var(--line);
      color: var(--muted);
      padding: 28px;
      border-radius: 8px;
      text-align: center;
    }

    @media (max-width: 720px) {
      header {
        display: block;
      }

      .stats {
        margin-top: 16px;
      }

      .facts {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>地城觀戰台</h1>
        <p class="subtitle">Discord roguelike bot dashboard, localhost:${port}</p>
      </div>
      <section class="stats">
        <div class="stat"><span>玩家</span><strong id="total">0</strong></div>
        <div class="stat"><span>冒險中</span><strong id="alive">0</strong></div>
        <div class="stat"><span>已倒下</span><strong id="fallen">0</strong></div>
      </section>
    </header>

    <section class="toolbar">
      <span id="updated">等待資料...</span>
      <button id="refresh" type="button">刷新</button>
    </section>

    <section id="players" class="grid"></section>
  </main>

  <script>
    const playersEl = document.querySelector("#players");
    const updatedEl = document.querySelector("#updated");
    const totalEl = document.querySelector("#total");
    const aliveEl = document.querySelector("#alive");
    const fallenEl = document.querySelector("#fallen");
    const refreshButton = document.querySelector("#refresh");

    refreshButton.addEventListener("click", load);
    window.addEventListener("focus", load);
    load();
    setInterval(load, 5000);

    async function load() {
      const response = await fetch("/api/players", { cache: "no-store" });
      const data = await response.json();
      render(data);
    }

    function render(data) {
      totalEl.textContent = data.totals.players;
      aliveEl.textContent = data.totals.alive;
      fallenEl.textContent = data.totals.fallen;
      updatedEl.textContent = "最後更新 " + new Date(data.updatedAt).toLocaleTimeString();

      if (!data.players.length) {
        playersEl.innerHTML = '<div class="empty">還沒有玩家存檔。去 Discord 打 /start 開一局。</div>';
        return;
      }

      playersEl.innerHTML = data.players.map(playerCard).join("");
    }

    function playerCard(player) {
      const hpPercent = Math.max(0, Math.min(100, Math.round((player.hp / player.maxHp) * 100)));
      const relics = player.relicNames.length
        ? player.relicNames.map((name) => '<span class="relic">' + escapeHtml(name) + '</span>').join("")
        : '<span class="relic">無遺物</span>';

      return '<article class="card">' +
        '<div class="card-top">' +
          '<div><div class="name">' + escapeHtml(player.displayName) + '</div>' +
          '<div class="class">' + escapeHtml(player.classLabel) + '</div></div>' +
          '<span class="badge ' + (player.alive ? '' : 'dead') + '">' + (player.alive ? '冒險中' : '已倒下') + '</span>' +
        '</div>' +
        '<div class="meter-label"><span>HP</span><span>' + player.hp + '/' + player.maxHp + '</span></div>' +
        '<div class="meter" style="--value: ' + hpPercent + '%"><div></div></div>' +
        '<div class="facts">' +
          fact("層數", player.floor) +
          fact("擊殺", player.kills) +
          fact("金幣", player.gold) +
          fact("攻擊", player.atk) +
          fact("防禦", player.def) +
          fact("ID", shortId(player.userId)) +
        '</div>' +
        '<div class="relics">' + relics + '</div>' +
      '</article>';
    }

    function fact(label, value) {
      return '<div class="fact"><span>' + label + '</span><strong>' + escapeHtml(String(value)) + '</strong></div>';
    }

    function shortId(id) {
      return id.slice(0, 4) + "..." + id.slice(-4);
    }

    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));
    }
  </script>
</body>
</html>`;
}

module.exports = {
  startDashboard
};
