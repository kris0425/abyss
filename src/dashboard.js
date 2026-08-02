const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  CLASSES,
  CLASS_EMOJI,
  ITEM_DEFS,
  MAPS,
  RELICS,
  SHIP_TYPES,
  SHOP_ITEMS,
  START_BUFFS,
  buyShopItem,
  combatTurn,
  createPlayer,
  enterHiddenRoom,
  equipStoredGear,
  explore,
  fish,
  getPlayer,
  leaveHiddenRoom,
  rest,
  selectOrBuyShip,
  setPlayer,
  useItem,
  voyage
} = require("./game");

const DEFAULT_PORT = 3000;
const WEB_ROOT = path.join(__dirname, "..", "web");
const ASSET_ROOT = path.join(__dirname, "..", "assets");
const COOKIE_NAME = "abyss_web_session";
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png"
};

function startDashboard(client) {
  const port = Number(process.env.DASHBOARD_PORT || DEFAULT_PORT);
  const server = http.createServer((req, res) => route(req, res, client));

  server.listen(port, () => {
    console.log(`Web game ready: http://localhost:${port}`);
  });

  server.on("error", (error) => {
    console.error(`Web game failed to start on port ${port}:`, error.message);
  });

  return server;
}

async function route(req, res, client) {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/players") {
      sendJson(res, await playersPayload(client));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/web/config") {
      webPlayerId(req, res);
      sendJson(res, webConfig());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/web/state") {
      const id = webPlayerId(req, res);
      sendJson(res, { player: serializePlayer(getPlayer(id)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/web/start") {
      await startWebRun(req, res);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/web/action") {
      await performWebAction(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      sendStatic(res, ASSET_ROOT, url.pathname.slice("/assets/".length), true);
      return;
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      sendStatic(res, WEB_ROOT, "index.html");
      return;
    }
    if (req.method === "GET" && (url.pathname === "/app.js" || url.pathname === "/styles.css")) {
      sendStatic(res, WEB_ROOT, url.pathname.slice(1));
      return;
    }
    if (req.method === "GET" && url.pathname === "/favicon.ico") {
      res.writeHead(204, { "cache-control": "public, max-age=86400" });
      res.end();
      return;
    }
    sendError(res, 404, "找不到這個頁面。");
  } catch (error) {
    console.error("Web game request failed:", error);
    if (!res.headersSent) sendError(res, 500, "伺服器暫時無法處理這個操作。");
  }
}

async function startWebRun(req, res) {
  const id = webPlayerId(req, res);
  const body = await readJson(req);
  const classKey = CLASSES[body.classKey] ? body.classKey : "blade";
  const buffKey = START_BUFFS[body.buffKey] ? body.buffKey : "attack";
  const mapKey = MAPS[body.mapKey] ? body.mapKey : "dungeon";
  const player = createPlayer(id, classKey, buffKey, mapKey);
  player.webName = cleanName(body.name);
  setPlayer(player);
  sendJson(res, {
    event: { title: "遠征開始", text: `${player.webName} 進入了${player.mapLabel}。` },
    player: serializePlayer(player)
  });
}

async function performWebAction(req, res) {
  const id = webPlayerId(req, res);
  const player = getPlayer(id);
  if (!player) {
    sendError(res, 409, "請先建立角色。");
    return;
  }

  const body = await readJson(req);
  const payload = body.payload ?? {};
  let event;
  switch (body.action) {
    case "explore": event = explore(player); break;
    case "attack": event = combatTurn(player, "attack"); break;
    case "defend": event = combatTurn(player, "defend"); break;
    case "rest": event = rest(player); break;
    case "fish": event = fish(player); break;
    case "voyage": event = voyage(player); break;
    case "use_item": event = useItem(player, String(payload.itemId ?? "")); break;
    case "buy_item": event = buyShopItem(player, String(payload.itemId ?? ""), payload.quantity); break;
    case "enter_hidden": event = enterHiddenRoom(player); break;
    case "leave_hidden": event = leaveHiddenRoom(player); break;
    case "ship": event = selectOrBuyShip(player, String(payload.shipType ?? "")); break;
    case "equip_gear": event = equipStoredGear(player, Number.parseInt(payload.index, 10)); break;
    default:
      sendError(res, 400, "未知的遊戲操作。");
      return;
  }

  sendJson(res, { event, player: serializePlayer(getPlayer(id)) });
}

function webConfig() {
  return {
    classes: Object.entries(CLASSES).map(([id, value]) => ({
      id,
      label: value.label,
      icon: CLASS_EMOJI[id] ?? "🎲",
      description: value.description,
      hp: value.hp,
      attack: value.atk,
      defense: value.def,
      image: `/assets/players/${value.imageFile}`
    })),
    buffs: Object.entries(START_BUFFS).map(([id, value]) => ({
      id,
      label: value.label,
      icon: value.icon,
      description: value.description
    })),
    maps: Object.entries(MAPS).map(([id, value]) => ({ id, ...value })),
    shop: Object.entries(SHOP_ITEMS).map(([id, value]) => ({ id, ...value })),
    ships: Object.entries(SHIP_TYPES).map(([id, value]) => ({ id, ...value }))
  };
}

function serializePlayer(player) {
  if (!player) return null;
  const sceneImage = localSceneImage(player);
  const classImage = player.classImageFile ? `/assets/players/${player.classImageFile}` : null;
  const weaponImage = player.weapon?.imageFile ? `/assets/weapons/${player.weapon.imageFile}` : null;
  return {
    name: player.webName ?? "網頁冒險者",
    classKey: player.classKey,
    classLabel: player.classLabel,
    classImage,
    sceneImage: player.combat?.imageFile
      ? `/assets/enemies/${player.combat.imageFile}`
      : sceneImage ?? classImage,
    weaponImage,
    hp: player.hp,
    maxHp: player.maxHp,
    attack: player.atk,
    defense: player.def,
    luck: player.luck ?? 0,
    gold: player.gold,
    floor: player.floor,
    kills: player.kills,
    alive: Boolean(player.alive),
    completed: Boolean(player.completed),
    mapKey: player.mapKey,
    mapLabel: player.mapLabel,
    startBuff: player.startBuff,
    combat: player.combat ? {
      name: player.combat.name,
      icon: player.combat.icon,
      hp: Math.max(0, player.combat.hp),
      maxHp: player.combat.maxHp,
      attack: player.combat.atk,
      round: player.combat.round,
      boss: Boolean(player.combat.boss),
      elite: Boolean(player.combat.elite),
      statuses: player.combat.statuses ?? {}
    } : null,
    hiddenRoom: Boolean(player.hiddenRoom),
    items: Object.entries(player.items ?? {}).map(([id, quantity]) => ({
      id,
      quantity,
      label: ITEM_DEFS[id]?.label ?? id,
      icon: ITEM_DEFS[id]?.icon ?? "❔",
      description: ITEM_DEFS[id]?.description ?? ""
    })).filter((item) => item.quantity > 0),
    weapon: player.weapon ?? null,
    equipment: player.equipment ?? {},
    equipmentBag: player.equipmentBag ?? [],
    relics: (player.relics ?? []).map((id) => ({ id, name: RELICS[id]?.name ?? id, text: RELICS[id]?.text ?? "" })),
    ships: (player.ships ?? []).map((ship) => ({
      ...ship,
      active: ship.type === player.activeShip,
      info: SHIP_TYPES[ship.type] ?? null
    })),
    activeShip: player.activeShip,
    dockCapacity: player.dockCapacity ?? 3,
    fishCaught: player.fishCaught ?? 0,
    debuffs: player.debuffs ?? {}
  };
}

function localSceneImage(player) {
  if (player.sceneImageFile) {
    const folder = player.sceneImageFolder ?? "enemies";
    return `/assets/${folder}/${player.sceneImageFile}`;
  }
  if (player.sceneImageUrl && !player.sceneImageUrl.startsWith("attachment://")) {
    return player.sceneImageUrl;
  }
  return null;
}

async function playersPayload(client) {
  const { loadPlayers } = require("./game");
  const players = Object.values(loadPlayers());
  const rows = await Promise.all(players.map(async (player) => ({
    ...player,
    displayName: player.id?.startsWith("web:")
      ? player.webName ?? "網頁冒險者"
      : await resolveName(client, player.id ?? player.userId),
    relicNames: (player.relics ?? []).map((id) => RELICS[id]?.name ?? id)
  })));
  rows.sort((a, b) => (b.floor ?? 0) - (a.floor ?? 0));
  return { updatedAt: new Date().toISOString(), players: rows };
}

async function resolveName(client, userId) {
  if (!userId) return "未知玩家";
  const cached = client.users.cache.get(userId);
  if (cached) return cached.globalName || cached.username || userId;
  try {
    const user = await client.users.fetch(userId);
    return user.globalName || user.username || userId;
  } catch {
    return userId;
  }
}

function webPlayerId(req, res) {
  const cookies = Object.fromEntries(String(req.headers.cookie ?? "").split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  let token = cookies[COOKIE_NAME];
  if (!/^[a-f0-9-]{36}$/.test(token ?? "")) {
    token = crypto.randomUUID();
    res.setHeader("set-cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  }
  return `web:${token}`;
}

function cleanName(value) {
  const name = String(value ?? "").trim().replace(/[<>]/g, "").slice(0, 20);
  return name || "無名冒險者";
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 65536) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function sendStatic(res, root, relativePath, longCache = false) {
  const clean = decodeURIComponent(relativePath).replace(/\\/g, "/");
  if (!clean || clean.split("/").includes("..")) {
    sendError(res, 404, "找不到檔案。");
    return;
  }
  const filePath = path.join(root, ...clean.split("/"));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendError(res, 404, "找不到檔案。");
    return;
  }
  res.writeHead(200, {
    "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "cache-control": longCache ? "public, max-age=86400" : "no-cache"
  });
  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, value, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function sendError(res, status, message) {
  sendJson(res, { error: message }, status);
}

module.exports = { startDashboard };
