const fs = require("node:fs");
const path = require("node:path");

const SAVE_PATH = path.join(__dirname, "..", "data", "players.json");
const LEADERBOARD_PATH = path.join(__dirname, "..", "data", "leaderboard.json");

const CLASSES = {
  blade: {
    label: "刀客",
    hp: 34,
    maxHp: 34,
    atk: 7,
    def: 2,
    gold: 0,
    relics: [],
    description: "穩定輸出，適合第一局。",
    starterWeapon: "blade"
  },
  spark: {
    label: "咒術師",
    hp: 26,
    maxHp: 26,
    atk: 10,
    def: 0,
    gold: 0,
    relics: [],
    description: "傷害高，但被打很痛。",
    starterWeapon: "spark"
  },
  rat: {
    label: "賭命賊",
    hp: 30,
    maxHp: 30,
    atk: 6,
    def: 1,
    gold: 3,
    luck: 5,
    relics: [],
    description: "初始幸運5%；攻擊可秒殺，敵人也有1%秒殺你。",
    starterWeapon: "rat"
  },
  ranger: {
    label: "遊俠",
    hp: 30,
    maxHp: 30,
    atk: 8,
    def: 1,
    gold: 0,
    relics: [],
    description: "初始武器攻擊+3；25%閃避敵人傷害並發動強力反擊。",
    starterWeapon: "ranger"
  }
};

const CLASS_EMOJI = {
  blade: "🗡️",
  spark: "🔮",
  rat: "🍀",
  ranger: "🏹"
};

const WEAPON_IMAGE_FILES = {
  "新手長劍": "starter-longsword.png",
  "新手法杖": "starter-staff.png",
  "新手短刀": "starter-dagger.png",
  "遊俠短弓": "ranger-shortbow.png",
  "加班終結者": "overtime-ender.png",
  "會議破壞刃": "meeting-breaker.png",
  "薪水追回斧": "salary-recovery-axe.png",
  "客訴切割器": "complaint-cutter.png",
  "hAO 震撼槌": "hao-shock-hammer.png"
};

const STARTER_WEAPONS = {
  blade: { name: "新手長劍", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 3, effects: [], imageFile: WEAPON_IMAGE_FILES["新手長劍"] },
  spark: { name: "新手法杖", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 4, effects: [], imageFile: WEAPON_IMAGE_FILES["新手法杖"] },
  rat: { name: "新手短刀", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 2, effects: [], imageFile: WEAPON_IMAGE_FILES["新手短刀"] },
  ranger: { name: "遊俠短弓", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 3, effects: [], imageFile: WEAPON_IMAGE_FILES["遊俠短弓"] }
};

const START_BUFFS = {
  attack: { label: "攻擊祝福", icon: "⚔️", description: "攻擊力 +2。", apply(player) { player.atk += 2; } },
  health: { label: "生命祝福", icon: "❤️", description: "最大 HP +8。", apply(player) { player.maxHp += 8; player.hp += 8; } },
  luck: { label: "幸運祝福", icon: "✨", description: "幸運 +3。", apply(player) { player.luck = (player.luck ?? 0) + 3; } }
};

const ITEM_DEFS = {
  potion: { label: "小補藥", icon: "🧪", description: "使用後回復 12 HP。" },
  feast: { label: "地城便當", icon: "🍱", description: "使用後回復 25 HP。" },
  bomb: { label: "裂片炸彈", icon: "💣", description: "戰鬥中造成 12 傷害。" },
  smoke: { label: "煙霧彈", icon: "💨", description: "戰鬥中逃離敵人，但不獲得獎勵。" },
  bait: { label: "魚餌", icon: "🪱", description: "釣魚時消耗 1 個。" }
};

const GEAR_QUALITIES = {
  common: { label: "普通", icon: "⚪", bonus: [1, 2], weight: 55 },
  rare: { label: "稀有", icon: "🔵", bonus: [2, 4], weight: 28 },
  epic: { label: "史詩", icon: "🟣", bonus: [4, 6], weight: 13 },
  legendary: { label: "傳奇", icon: "🟡", bonus: [6, 9], weight: 4 }
};

const ROD_QUALITIES = {
  common: { label: "普通", icon: "⚪", name: "木製釣竿", fishing: [1, 2], weight: 48, imageUrl: "https://lh3.googleusercontent.com/d/1SeZZ3RtSof94QTmmkY7lcEdhvr_-2K9y=w768" },
  uncommon: { label: "優良", icon: "🟢", name: "翠葉釣竿", fishing: [2, 3], weight: 27, imageUrl: "https://lh3.googleusercontent.com/d/1aXzQUX3LFdACOnZQr26QGkQmdjNYOnk5=w768" },
  rare: { label: "稀有", icon: "🔵", name: "星藍釣竿", fishing: [4, 5], weight: 16, imageUrl: "https://lh3.googleusercontent.com/d/1doSviv0KAiptPshVG5dfLhn5HR9LZKBW=w768" },
  epic: { label: "史詩", icon: "🟣", name: "深淵釣竿", fishing: [6, 8], weight: 7, imageUrl: "https://lh3.googleusercontent.com/d/1XAz-OdFm-iHU4DBJGqtmaZ8V72laTYOs=w768" },
  legendary: { label: "傳奇", icon: "🟡", name: "日輪釣竿", fishing: [9, 12], weight: 2, imageUrl: "https://lh3.googleusercontent.com/d/1_LZ4prY7ZSD2CGCLQQFzQQtpaFvrfgNE=w768" }
};

const SHIP_TYPES = {
  canoe: {
    name: "獨木舟",
    icon: "🛶",
    cost: 0,
    safety: 0.62,
    reward: 1,
    description: "免費的初始船，靈活但較怕風浪。"
  },
  raft: {
    name: "竹筏",
    icon: "🪵",
    cost: 24,
    safety: 0.76,
    reward: 1.25,
    description: "航行較穩定，海上收益略為提升。"
  },
  sailboat: {
    name: "普通帆船",
    icon: "⛵",
    cost: 55,
    safety: 0.9,
    reward: 1.6,
    description: "安全且載貨量高，能帶回更多戰利品。"
  }
};

const FISH_RARITIES = {
  common: { label: "普通", icon: "⚪" },
  rare: { label: "稀有", icon: "🔵" },
  epic: { label: "史詩", icon: "🟣" },
  legendary: { label: "傳奇", icon: "🟡" }
};

const FISH_TABLE = [
  { name: "珊瑚小丑魚", rarity: "common", gold: [3, 5], weight: 12, imageFile: "pixel-fish-01.jpg" },
  { name: "藍倒吊", rarity: "common", gold: [3, 6], weight: 12, imageFile: "pixel-fish-02.jpg" },
  { name: "赤焰鬥魚", rarity: "rare", gold: [7, 11], weight: 6, imageFile: "pixel-fish-03.jpg" },
  { name: "御庭錦鯉", rarity: "epic", gold: [14, 21], weight: 2.5, imageFile: "pixel-fish-04.jpg" },
  { name: "毒棘獅子魚", rarity: "rare", gold: [8, 12], weight: 6, imageFile: "pixel-fish-05.jpg" },
  { name: "黃金海馬", rarity: "rare", gold: [8, 13], weight: 6, imageFile: "pixel-fish-06.jpg" },
  { name: "深海鮟鱇", rarity: "epic", gold: [16, 24], weight: 2.5, imageFile: "pixel-fish-07.jpg" },
  { name: "星斑鯨鯊", rarity: "legendary", gold: [32, 48], weight: 0.7, imageFile: "pixel-fish-08.jpg" },
  { name: "蒼海旗魚", rarity: "epic", gold: [15, 23], weight: 2.5, imageFile: "pixel-fish-09.jpg" },
  { name: "黃金河豚", rarity: "rare", gold: [7, 12], weight: 6, imageFile: "pixel-fish-10.jpg" },
  { name: "迷紋七彩神仙", rarity: "common", gold: [4, 7], weight: 12, imageFile: "pixel-fish-11.jpg" },
  { name: "萬花麒麟魚", rarity: "epic", gold: [15, 22], weight: 2.5, imageFile: "pixel-fish-12.jpg" },
  { name: "雨林巨骨舌魚", rarity: "epic", gold: [17, 25], weight: 2.5, imageFile: "pixel-fish-13.jpg" },
  { name: "遠古腔棘魚", rarity: "legendary", gold: [35, 52], weight: 0.7, imageFile: "pixel-fish-14.jpg" },
  { name: "深藍鬼蝠魟", rarity: "epic", gold: [16, 24], weight: 2.5, imageFile: "pixel-fish-15.jpg" },
  { name: "雷光電鰻", rarity: "rare", gold: [9, 14], weight: 6, imageFile: "pixel-fish-16.jpg" },
  { name: "黃鰭鮪魚", rarity: "common", gold: [4, 7], weight: 12, imageFile: "pixel-fish-17.jpg" },
  { name: "血玉紅龍魚", rarity: "legendary", gold: [38, 55], weight: 0.7, imageFile: "pixel-fish-18.jpg" },
  { name: "沼澤鱷雀鱔", rarity: "rare", gold: [9, 15], weight: 6, imageFile: "pixel-fish-19.jpg" },
  { name: "霓虹蝦虎魚", rarity: "common", gold: [3, 6], weight: 12, imageFile: "pixel-fish-20.jpg" }
];

const FISH_BUFFS = {
  common: [
    { text: "回復 5 HP", apply(player) { heal(player, 5); } },
    { text: "額外獲得 2 金幣", apply(player) { player.gold += 2; } },
    { text: "魚餌返還 1 個", apply(player) { addItem(player, "bait", 1); } }
  ],
  rare: [
    { text: "最大 HP +1 並回復 6 HP", apply(player) { player.maxHp += 1; heal(player, 6); } },
    { text: "防禦力永久 +1", apply(player) { player.def += 1; } },
    { text: "幸運永久 +1", apply(player) { player.luck = (player.luck ?? 0) + 1; } }
  ],
  epic: [
    { text: "攻擊力永久 +1", apply(player) { player.atk += 1; } },
    { text: "最大 HP 永久 +3 並完全回復", apply(player) { player.maxHp += 3; player.hp = player.maxHp; } },
    { text: "幸運永久 +2", apply(player) { player.luck = (player.luck ?? 0) + 2; } }
  ],
  legendary: [
    { text: "攻擊力永久 +2", apply(player) { player.atk += 2; } },
    { text: "防禦力永久 +2", apply(player) { player.def += 2; } },
    { text: "最大 HP 永久 +6 並完全回復", apply(player) { player.maxHp += 6; player.hp = player.maxHp; } },
    { text: "幸運永久 +3", apply(player) { player.luck = (player.luck ?? 0) + 3; } }
  ]
};

const WEAPON_QUALITIES = {
  common: { label: "普通", icon: "⚪", bonus: [1, 2], effectCount: 0, weight: 55 },
  rare: { label: "稀有", icon: "🔵", bonus: [3, 4], effectCount: 0, weight: 28 },
  epic: { label: "史詩", icon: "🟣", bonus: [5, 7], effectCount: 1, weight: 13 },
  legendary: { label: "傳奇", icon: "🟡", bonus: [8, 11], effectCount: 2, weight: 4 }
};

const WEAPON_EFFECTS = {
  poison: { label: "中毒", icon: "☠️", text: "每回合受到 3 傷害。" },
  bleed: { label: "流血", icon: "🩸", text: "每回合受到 2 傷害。" },
  burn: { label: "灼燒", icon: "🔥", text: "每回合受到 4 傷害。" },
  leech: { label: "吸血", icon: "🦇", text: "攻擊命中時回復 2 HP。" },
  shatter: { label: "破甲", icon: "🛡️", text: "攻擊時降低敵人 1 攻擊。" }
};

const RELICS = {
  lucky_coin: {
    name: "好運開局",
    text: "戰鬥勝利時偶爾多拿 2 金幣。",
    applyReward(player) {
      if (Math.random() < 0.45) {
        player.gold += 2;
        return "🪙 好運開局發亮，多撿到 2 枚金幣。";
      }
      return null;
    }
  },
  vampire_tooth: {
    name: "吸血牙",
    text: "擊敗敵人時回復 3 HP。",
    onWin(player) {
      heal(player, 3);
      return "🦇 吸血牙回復 3 HP。";
    }
  },
  stone_skin: {
    name: "石皮",
    text: "防禦力 +1。",
    onPickup(player) {
      player.def += 1;
    }
  },
  ember_ring: {
    name: "餘燼戒指",
    text: "攻擊力 +1。",
    onPickup(player) {
      player.atk += 1;
    }
  },
  lunchbox: {
    name: "便當盒",
    text: "休息多回復 4 HP。"
  },
  maid_photo: {
    name: "女僕照",
    text: "攻擊 +10，防禦 +10，接下來 3 回合每回合回復 3 HP。",
    onPickup(player) {
      player.atk += 10;
      player.def += 10;
      player.regenTurns = Math.max(player.regenTurns ?? 0, 3);
    }
  }
};

const RELIC_EMOJI = {
  lucky_coin: "🪙",
  vampire_tooth: "🦇",
  stone_skin: "🪨",
  ember_ring: "🔥",
  lunchbox: "🍱",
  maid_photo: "🖼️"
};

const SHOP_ITEMS = {
  potion: { label: "小補藥", icon: "🧪", cost: 6, description: "放入背包，使用後回復 12 HP。" },
  feast: { label: "地城便當", icon: "🍱", cost: 16, description: "放入背包，使用後回復 25 HP。" },
  bomb: { label: "裂片炸彈", icon: "💣", cost: 13, description: "放入背包，戰鬥中造成 12 傷害。" },
  smoke: { label: "煙霧彈", icon: "💨", cost: 10, description: "放入背包，戰鬥中逃離敵人。" },
  bait: { label: "魚餌", icon: "🪱", cost: 3, description: "釣魚時消耗 1 個，預設購買 1 個。" },
  whetstone: { label: "磨刀石", icon: "⚔️", cost: 14, description: "永久攻擊 +1。" },
  armor: { label: "補丁護甲", icon: "🛡️", cost: 14, description: "永久防禦 +1。" },
  heart: { label: "心之碎片", icon: "❤️", cost: 18, description: "最大 HP +4，並回復 4 HP。" },
  relic: { label: "神秘遺物", icon: "✨", cost: 22, description: "隨機獲得一個遺物。" }
};

const MAPS = {
  dungeon: { label: "地下城", icon: "🏰", description: "經典地城與原本的敵人。" },
  night_city: { label: "夜城 Night City", icon: "🌃", description: "高科技都市，敵人會駭入並施加控制效果。" }
};

const ENEMIES = [
  { name: "地城史萊姆", hp: 14, atk: 4, gold: 4 },
  { name: "發票骷髏", hp: 18, atk: 5, gold: 6 },
  { name: "加班怨靈", hp: 22, atk: 7, gold: 8 },
  { name: "寶箱模仿怪", hp: 26, atk: 8, gold: 12 }
];

const NIGHT_CITY_ENEMIES = [
  { name: "街頭駭客", hp: 17, atk: 5, gold: 7, skills: ["hack", "blind"] },
  { name: "霓虹無人機", hp: 20, atk: 6, gold: 8, skills: ["blind", "paralyze"] },
  { name: "企業鎮暴兵", hp: 25, atk: 7, gold: 10, skills: ["stun", "paralyze"] },
  { name: "義體殺手", hp: 29, atk: 9, gold: 14, skills: ["hack", "blind", "stun"] },
  { name: "電磁寶箱怪", hp: 25, atk: 7, gold: 13, skills: ["hack", "blind"] },
  { name: "義體骷髏兵", hp: 27, atk: 8, gold: 12, skills: ["stun", "paralyze"] },
  { name: "數位怨靈", hp: 23, atk: 9, gold: 14, skills: ["hack", "blind", "paralyze"] }
];

const ELITE_ENEMIES = [
  { name: "女僕劍士", hp: 38, atk: 9, gold: 22, elite: true },
  { name: "深淵處刑者", hp: 44, atk: 10, gold: 26, elite: true }
];

const BOSSES = [
  { name: "慣老闆", icon: "💼", hp: 58, atk: 9, gold: 45 },
  { name: "雷同事", icon: "⚡", hp: 52, atk: 10, gold: 42 },
  { name: "難搞的客戶", icon: "📞", hp: 64, atk: 8, gold: 55 },
  { name: "hAO", icon: "🧨", hp: 72, atk: 11, gold: 88, specialRelic: "maid_photo" },
  { name: "地城守門人", icon: "🛡️", hp: 72, atk: 11, gold: 120, finalBoss: true }
];

const HIDDEN_ROOM_CHANCE = 0.12;
const MAX_FLOOR = 50;

const ENEMY_EMOJI = {
  "地城史萊姆": "🟢",
  "發票骷髏": "💀",
  "加班怨靈": "👻",
  "寶箱模仿怪": "📦",
  "女僕劍士": "🗡️",
  "慣老闆": "💼",
  "雷同事": "⚡",
  "難搞的客戶": "📞",
  hAO: "🧨",
  "地城守門人": "🛡️",
  "街頭駭客": "💻",
  "霓虹無人機": "🚁",
  "企業鎮暴兵": "🤖",
  "義體殺手": "🥷",
  "深淵處刑者": "⚔️",
  "電磁寶箱怪": "📦",
  "義體骷髏兵": "💀",
  "數位怨靈": "👻"
};

const ENEMY_ART = {
  "地城史萊姆": "🟢\n🫧🫧",
  "發票骷髏": "💀\n🦴🦴",
  "加班怨靈": "👻\n🌫️🌫️",
  "寶箱模仿怪": "📦\n👅🦷",
  "女僕劍士": "🗡️\n⚔️✨",
  "慣老闆": "💼\n📋😤",
  "雷同事": "⚡\n🧍💥",
  "難搞的客戶": "📞\n😠📑",
  hAO: "🧨\n😈💢"
};

function enemyImageFile(enemy) {
  const map = {
    "地城史萊姆": "enemy-slime.gif",
    "發票骷髏": "enemy-skeleton.gif",
    "加班怨靈": "enemy-ghost.gif",
    "寶箱模仿怪": "enemy-mimic.gif",
    "女僕劍士": "enemy-elite-maid.png",
    "深淵處刑者": "enemy-elite-executioner.gif",
    "街頭駭客": "enemy-night-hacker.gif",
    "霓虹無人機": "enemy-night-drone.gif",
    "企業鎮暴兵": "enemy-night-riot-trooper.gif",
    "義體殺手": "enemy-night-assassin.gif",
    "電磁寶箱怪": "enemy-night-chest.gif",
    "義體骷髏兵": "enemy-night-skeleton.gif",
    "數位怨靈": "enemy-night-ghost.gif",
    "慣老闆": "enemy-boss.gif",
    "雷同事": "enemy-coworker.gif",
    "難搞的客戶": "enemy-client.gif",
    hAO: "enemy-hao.gif",
    "地城守門人": "enemy-gatekeeper.gif"
  };
  const file = map[enemy.name] ?? "enemy-boss.png";
  const fullPath = path.join(__dirname, "..", "assets", "enemies", file);
  if (fs.existsSync(fullPath)) return file;
  if (file === "enemy-gatekeeper.gif") return "enemy-gatekeeper.mp4";
  return "enemy-boss.png";
}

function enemyImageUrl(enemy) {
  const file = enemyImageFile(enemy);
  if (file.endsWith(".mp4")) return null;
  return `attachment://${file}`;
}

let players = {};
let leaderboard = {};

function loadPlayers() {
  try {
    players = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
  } catch {
    players = {};
  }
  loadLeaderboard();
  syncLeaderboardFromPlayers();
}

function loadLeaderboard() {
  try {
    leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_PATH, "utf8"));
  } catch {
    leaderboard = {};
  }
}

function savePlayers() {
  fs.mkdirSync(path.dirname(SAVE_PATH), { recursive: true });
  fs.writeFileSync(SAVE_PATH, JSON.stringify(players, null, 2), "utf8");
}

function saveLeaderboard() {
  fs.mkdirSync(path.dirname(LEADERBOARD_PATH), { recursive: true });
  fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(leaderboard, null, 2), "utf8");
}

function leaderboardScore(player) {
  return (player.completed ? 100000 : 0)
    + (player.floor ?? 0) * 1000
    + (player.kills ?? 0) * 100
    + (player.gold ?? 0);
}

function recordLeaderboard(player, outcome = "冒險結束") {
  if (!player?.id) return;
  const score = leaderboardScore(player);
  const previous = leaderboard[player.id];
  if (previous && previous.score > score) return;
  leaderboard[player.id] = {
    id: player.id,
    score,
    floor: player.floor ?? 0,
    kills: player.kills ?? 0,
    gold: player.gold ?? 0,
    completed: Boolean(player.completed),
    outcome,
    updatedAt: new Date().toISOString()
  };
  saveLeaderboard();
}

function leaderboardText(limit = 10) {
  const rows = Object.values(leaderboard)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (!rows.length) return "目前還沒有排行榜紀錄。通關或倒下後會自動寫入。";
  return rows.map((row, index) => {
    const medal = ["🥇", "🥈", "🥉"][index] ?? `${index + 1}.`;
    const state = row.completed ? "🏁 通關" : "💀 倒下";
    return `${medal} <@${row.id}>｜${state}｜${row.floor} 層｜擊殺 ${row.kills}｜金幣 ${row.gold}`;
  }).join("\n");
}

function syncLeaderboardFromPlayers() {
  for (const player of Object.values(players)) {
    if (player?.completed) {
      recordLeaderboard(player, "通關");
    } else if (player && player.alive === false) {
      recordLeaderboard(player, "倒下");
    }
  }
}

function getPlayer(id) {
  const player = players[id] ?? null;
  if (player) ensureDock(player);
  return player;
}

function setPlayer(player) {
  ensureDock(player);
  players[player.id] = player;
  savePlayers();
}

function ensureDock(player) {
  if (!player) return player;
  if (!Array.isArray(player.ships)) player.ships = [];
  if (!Number.isInteger(player.dockCapacity) || player.dockCapacity < 1) {
    player.dockCapacity = 3;
  }
  player.ships = player.ships.map((ship) => {
    if (typeof ship === "string") {
      const type = Object.keys(SHIP_TYPES).find((key) => SHIP_TYPES[key].name === ship) ?? "canoe";
      return { type, name: SHIP_TYPES[type].name };
    }
    return ship;
  });
  if (!player.ships.some((ship) => ship?.type === "canoe")) {
    player.ships.unshift({ type: "canoe", name: SHIP_TYPES.canoe.name });
  }
  if (!player.activeShip || !player.ships.some((ship) => ship?.type === player.activeShip)) {
    player.activeShip = player.ships[0]?.type ?? "canoe";
  }
  player.equipment ??= {};
  player.equipment.armor ??= { name: "新手皮甲", slot: "armor", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 0, defense: 1 };
  player.equipment.rod ??= { name: "木製釣竿", slot: "rod", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", fishing: 1, imageUrl: ROD_QUALITIES.common.imageUrl };
  if (!player.equipment.rod.imageUrl) {
    const rodQuality = ROD_QUALITIES[player.equipment.rod.quality] ?? ROD_QUALITIES.common;
    player.equipment.rod.imageUrl = rodQuality.imageUrl;
  }
  if (!Array.isArray(player.equipmentBag)) player.equipmentBag = [];
  if (player.weapon && !player.weapon.imageFile) {
    player.weapon.imageFile = WEAPON_IMAGE_FILES[player.weapon.name] ?? null;
  }
  return player;
}

function deletePlayer(id) {
  delete players[id];
  savePlayers();
}

function roll(max) {
  return Math.floor(Math.random() * max) + 1;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function weightedPick(entries) {
  const total = entries.reduce((sum, item) => sum + item.weight, 0);
  let rollValue = Math.random() * total;
  for (const item of entries) {
    rollValue -= item.weight;
    if (rollValue <= 0) return item;
  }
  return entries[entries.length - 1];
}

function createPlayer(id, classKey, buffKey = "attack", mapKey = "dungeon") {
  const base = CLASSES[classKey] ?? CLASSES.blade;
  const player = {
    id,
    classKey,
    classLabel: base.label,
    hp: base.hp,
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    gold: base.gold ?? 0,
    luck: base.luck ?? 0,
    floor: 1,
    kills: 0,
    alive: true,
    relics: [...(base.relics ?? [])],
    items: { potion: 1, bait: 3 },
    ships: [{ type: "canoe", name: SHIP_TYPES.canoe.name }],
    activeShip: "canoe",
    dockCapacity: 3,
    equipment: {
      armor: { name: "新手皮甲", slot: "armor", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 0, defense: 1 },
      rod: { name: "木製釣竿", slot: "rod", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", fishing: 1, imageUrl: ROD_QUALITIES.common.imageUrl }
    },
    equipmentBag: [],
    weapon: { ...(STARTER_WEAPONS[base.starterWeapon] ?? STARTER_WEAPONS.blade) },
    startBuff: START_BUFFS[buffKey]?.label ?? START_BUFFS.attack.label,
    mapKey: MAPS[mapKey] ? mapKey : "dungeon",
    mapLabel: MAPS[mapKey]?.label ?? MAPS.dungeon.label
  };
  START_BUFFS[buffKey]?.apply(player);
  return player;
}

function healthState(player) {
  if (player?.completed) return { label: "通關", icon: "🏁" };
  if (!player?.alive) return { label: "倒下", icon: "⚫" };
  const ratio = player.hp / player.maxHp;
  if (ratio <= 0.25) return { label: "危急", icon: "🔴" };
  if (ratio <= 0.5) return { label: "受傷", icon: "🟠" };
  if (ratio <= 0.75) return { label: "穩住", icon: "🟡" };
  return { label: "健康", icon: "🟢" };
}

function heal(player, amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
}


function playerDebuffText(player) {
  const d = player?.debuffs ?? {};
  const parts = [];
  if (d.stun) parts.push(`💫暈眩${d.stun}`);
  if (d.paralyze) parts.push(`⚡麻痺${d.paralyze}`);
  if (d.burn) parts.push(`🔥燒傷${d.burn}`);
  if (d.poison) parts.push(`☠️中毒${d.poison}`);
  if (d.weak) parts.push(`🌀虛弱${d.weak}`);
  if (d.hack) parts.push(`💻駭入${d.hack}`);
  if (d.blind) parts.push(`🌫️致盲${d.blind}`);
  return parts.join(" ");
}

function tickPlayerDebuffDamage(player, lines) {
  const d = player.debuffs ?? {};
  if (d.burn > 0) {
    player.hp -= 4;
    d.burn -= 1;
    lines.push("🔥 燒傷造成 4 傷害。");
  }
  if (d.poison > 0) {
    player.hp -= 3;
    d.poison -= 1;
    lines.push("☠️ 中毒造成 3 傷害。");
  }
  if (d.hack > 0) d.hack -= 1;
  cleanupPlayerDebuffs(player);
}

function consumeActionDebuff(player, lines) {
  const d = player.debuffs ?? {};
  if (d.stun > 0) {
    d.stun -= 1;
    lines.push("💫 你被暈眩，這回合無法行動。");
    cleanupPlayerDebuffs(player);
    return true;
  }
  if (d.paralyze > 0) {
    d.paralyze -= 1;
    lines.push("⚡ 你被麻痺，這回合無法行動。");
    cleanupPlayerDebuffs(player);
    return true;
  }
  return false;
}

function consumeBlindDebuff(player, lines) {
  const d = player.debuffs ?? {};
  if (!(d.blind > 0)) return false;
  d.blind -= 1;
  const missed = Math.random() < 0.5;
  lines.push(missed ? "🌫️ 致盲干擾視線，你的攻擊落空。" : "🌫️ 你穿過視覺雜訊，勉強鎖定敵人。");
  cleanupPlayerDebuffs(player);
  return missed;
}

function applyNightCitySkill(player, enemy, lines) {
  if (player.mapKey !== "night_city" || !enemy?.skills?.length || !player.alive) return;
  if (Math.random() >= 0.4) return;

  const skill = pick(enemy.skills);
  player.debuffs ??= {};
  if (skill === "hack") {
    const damage = 3 + roll(4) - 1;
    const stolen = Math.min(player.gold, 1 + roll(3) - 1);
    player.hp -= damage;
    player.gold -= stolen;
    player.debuffs.hack = 1;
    lines.push(`💻 ${enemy.name} 駭入你的義體，造成 ${damage} 穿透傷害並竊取 ${stolen} 金幣。`);
  } else if (skill === "blind" && !player.debuffs.blind) {
    player.debuffs.blind = 1;
    lines.push(`🌫️ ${enemy.name} 釋放視覺病毒：你被致盲，下一次攻擊有 50% 機率落空。`);
  } else if (skill === "stun" && !player.debuffs.stun) {
    player.debuffs.stun = 1;
    lines.push(`💫 ${enemy.name} 發射震撼脈衝：你被暈眩一回合。`);
  } else if (skill === "paralyze" && !player.debuffs.paralyze) {
    player.debuffs.paralyze = 1;
    lines.push(`⚡ ${enemy.name} 施放電磁束縛：你被麻痺一回合。`);
  }
}

function tickWeakDebuff(player) {
  const d = player.debuffs ?? {};
  if (d.weak > 0) d.weak -= 1;
  cleanupPlayerDebuffs(player);
}

function cleanupPlayerDebuffs(player) {
  const d = player.debuffs;
  if (!d) return;
  for (const key of Object.keys(d)) {
    if (d[key] <= 0) delete d[key];
  }
  if (!Object.keys(d).length) delete player.debuffs;
}

function applyBossDebuff(player, enemy, lines) {
  if (!enemy?.boss || player.floor < 10 || !player.alive) return;
  const chance = enemy.hiddenBoss || enemy.finalBoss ? 0.65 : 0.45;
  if (Math.random() > chance) return;
  const debuffs = [
    { key: "stun", icon: "💫", label: "暈眩", turns: 1, text: "下回合無法行動" },
    { key: "paralyze", icon: "⚡", label: "麻痺", turns: 1, text: "下回合無法行動" },
    { key: "burn", icon: "🔥", label: "燒傷", turns: 3, text: "每回合扣血，持續 3 回合" },
    { key: "poison", icon: "☠️", label: "中毒", turns: 3, text: "每回合扣血，持續 3 回合" },
    { key: "weak", icon: "🌀", label: "虛弱", turns: 3, text: "攻擊力減半，持續 3 回合" }
  ];
  const debuff = pick(debuffs);
  player.debuffs ??= {};
  player.debuffs[debuff.key] = Math.max(player.debuffs[debuff.key] ?? 0, debuff.turns);
  lines.push(`${debuff.icon} ${enemy.name} 追加 ${debuff.label}：${debuff.text}。`);
}

function finishPlayerDeath(player, lines) {
  player.hp = 0;
  player.alive = false;
  player.sceneImageFile = "player-death.gif";
  player.sceneImageUrl = "attachment://player-death.gif";
  player.sceneImageFolder = "enemies";
  delete player.combat;
  recordLeaderboard(player, "倒下");
  setPlayer(player);
  lines.push("💀 你倒下了。可以用 /start 開新局。");
  return { title: "冒險失敗", text: lines.join("\n") };
}
function attackPower(player) {
  const base = player.atk + (player.weapon?.attack ?? 0) + equipmentAttackBonus(player);
  return player.debuffs?.weak > 0 ? Math.max(1, Math.floor(base / 2)) : base;
}

function equipmentAttackBonus(player) {
  return Object.values(player?.equipment ?? {}).reduce((sum, gear) => sum + (gear?.attack ?? 0), 0);
}

function equipmentDefenseBonus(player) {
  return Object.values(player?.equipment ?? {}).reduce((sum, gear) => sum + (gear?.defense ?? 0), 0);
}

function gamblerInstantKillChance(player) {
  if (player?.classKey !== "rat") return 0;
  return Math.min(0.25, Math.max(0, player.luck ?? 0) / 100);
}

function enemyInstantKillChance(enemy) {
  if (!enemy) return 0;
  return 0.01;
}

function addItem(player, itemId, amount = 1) {
  player.items ??= {};
  player.items[itemId] = (player.items[itemId] ?? 0) + amount;
}

function removeItem(player, itemId) {
  if (!player.items?.[itemId]) return false;
  player.items[itemId] -= 1;
  if (player.items[itemId] <= 0) delete player.items[itemId];
  return true;
}

function hasRelic(player, relicId) {
  return player.relics?.includes(relicId);
}

function addRelic(player, relicId) {
  if (!relicId || !RELICS[relicId]) return null;
  if (hasRelic(player, relicId)) {
    player.gold += 8;
    return `✨ 重複遺物轉成 8 金幣。`;
  }
  player.relics.push(relicId);
  RELICS[relicId].onPickup?.(player);
  return `${RELIC_EMOJI[relicId] ?? "✨"} 獲得遺物：${RELICS[relicId].name} - ${RELICS[relicId].text}`;
}

function combatLine(player) {
  const enemy = player.combat;
  if (!enemy) return "目前沒有敵人。";
  const statuses = statusSummary(enemy);
  return `${enemy.icon} ${enemy.name} HP：${enemy.hp}/${enemy.maxHp}｜第 ${enemy.round} 回合${statuses ? `｜${statuses}` : ""}`;
}

function statusSummary(enemy) {
  const s = enemy.statuses ?? {};
  const parts = [];
  if (s.poison) parts.push(`☠️中毒${s.poison}`);
  if (s.bleed) parts.push(`🩸流血${s.bleed}`);
  if (s.burn) parts.push(`🔥灼燒${s.burn}`);
  return parts.join(" ");
}

function completeRun(player, lines = []) {
  if (player.floor <= MAX_FLOOR) return null;
  player.completed = true;
  player.alive = false;
  delete player.combat;
  player.sceneImageFile = "victory-clear.png";
  player.sceneImageUrl = "attachment://victory-clear.png";
  player.sceneImageFolder = "enemies";
  lines.push("🎉 通喜通關");
  lines.push(`🏁 你突破了 ${MAX_FLOOR} 層上限，這場冒險正式完結。`);
  recordLeaderboard(player, "通關");
  setPlayer(player);
  return { title: "通喜通關", text: lines.filter(Boolean).join("\n") };
}

function shouldSpawnBoss(player) {
  return player.floor === MAX_FLOOR || (player.floor >= 8 && (player.floor - 8) % 5 === 0);
}

function pickBoss(player) {
  if (player.floor === MAX_FLOOR) return BOSSES.find((boss) => boss.name === "地城守門人");
  if ((player.floor - 8) % 10 === 0) return BOSSES.find((boss) => boss.name === "hAO");
  return pick(BOSSES.filter((boss) => boss.name !== "hAO" && !boss.finalBoss));
}

function bossAttackBonus(floor) {
  if (floor < 10) return 0;
  return 3 + Math.floor((floor - 10) / 5) * 2;
}
function startBossCombat(player) {
  const baseBoss = pickBoss(player);
  const normalHp = baseBoss.hp + player.floor * 4;
  const hp = baseBoss.finalBoss ? Math.ceil(normalHp * 1.5) : normalHp;
  const boss = {
    ...baseBoss,
    maxHp: hp,
    hp,
    atk: (() => {
      const value = Math.max(3, baseBoss.atk - 2 + Math.floor(player.floor / 5)) + bossAttackBonus(player.floor);
      return baseBoss.finalBoss ? Math.ceil(value * 1.5) : value;
    })(),
    gold: baseBoss.gold + player.floor * 4,
    icon: baseBoss.icon,
    art: ENEMY_ART[baseBoss.name] ?? baseBoss.icon,
    imageFile: enemyImageFile(baseBoss),
    imageUrl: enemyImageUrl(baseBoss),
    round: 1,
    boss: true
  };
  player.combat = boss;
  setPlayer(player);
  return {
    title: "Boss 來了",
    text: [
      `${boss.icon} 第 ${player.floor} 層的 Boss：${boss.name} 登場！`,
      boss.finalBoss ? "🏰 第 50 層最終 Boss，擊敗後即可通關。" : "👑 打敗可獲得大量金幣、遺物，以及保底史詩以上武器。",
      combatLine(player)
    ].join("\n")
  };
}

function shouldFindHiddenRoom(player) {
  return player.floor >= 5 && !player.hiddenRoom && Math.random() < HIDDEN_ROOM_CHANCE;
}

function findHiddenRoom(player) {
  player.hiddenRoom = { floor: player.floor };
  setPlayer(player);
  return {
    title: "發現隱藏房間",
    text: [
      "🚪 牆後傳來低沉的震動聲，你找到了一間隱藏房間。",
      "🎲 裡面可能有豐盛獎勵，也可能藏著隱藏 Boss。",
      "☠️ 也有可能是即死陷阱，踩到就直接出局。",
      "要進入嗎？"
    ].join("\n")
  };
}

function leaveHiddenRoom(player) {
  if (!player?.hiddenRoom) return { title: "沒有隱藏房間", text: "目前沒有可離開的隱藏房間。" };
  delete player.hiddenRoom;
  player.floor += 1;
  const completed = completeRun(player, ["🚪 你決定不冒這個風險，離開隱藏房間繼續前進。"]);
  if (completed) return completed;
  setPlayer(player);
  return { title: "離開隱藏房間", text: "🚪 你決定不冒這個風險，離開隱藏房間繼續前進。" };
}

function enterHiddenRoom(player) {
  if (!player?.hiddenRoom) return { title: "沒有隱藏房間", text: "目前沒有可進入的隱藏房間。" };
  delete player.hiddenRoom;

  const eventRoll = Math.random();
  if (eventRoll < 0.35) {
    return startHiddenBossEncounter(player);
  }

  if (eventRoll < 0.55) {
    return finishPlayerDeath(player, [
      "☠️ 你踏進隱藏房間，地板突然崩塌。",
      "🩸 即死陷阱觸發，這場冒險到此結束。"
    ]);
  }

  const gold = 45 + player.floor * 6 + roll(20);
  player.gold += gold;
  addItem(player, "feast", 1);
  const relicLine = addRelic(player, pick(Object.keys(RELICS)));
  const weapon = generateWeapon(player.floor, true);
  player.weapon = weapon;
  player.floor += 1;

  const lines = [
    "✨ 你在隱藏房間裡找到被封存的寶藏。",
    `🪙 獲得 ${gold} 金幣。`,
    "🍱 獲得 1 個地城便當。",
    relicLine,
    `🗡️ 獲得武器：${weaponLine(weapon)}，已自動裝備。`
  ];
  const completed = completeRun(player, lines);
  if (completed) return completed;
  setPlayer(player);
  return { title: "隱藏房間獎勵", text: lines.filter(Boolean).join("\n") };
}

function startHiddenBossEncounter(player) {
  const fleeChance = Math.min(0.55, 0.35 + (player.luck ?? 0) * 0.015);
  if (Math.random() < fleeChance) {
    player.floor += 1;
    const completed = completeRun(player, [
      "🌑 你感覺到牆後有一股超不妙的壓迫感。",
      "🏃 你把握唯一一次逃跑機會，成功溜走。",
      `🎲 逃跑成功率：${Math.round(fleeChance * 100)}%`
    ]);
    if (completed) return completed;
    setPlayer(player);
    return {
      title: "逃過隱藏 Boss",
      text: [
        "🌑 你感覺到牆後有一股超不妙的壓迫感。",
        "🏃 你把握唯一一次逃跑機會，成功溜走。",
        `🎲 逃跑成功率：${Math.round(fleeChance * 100)}%`
      ].join("\n")
    };
  }

  return startHiddenBossCombat(player, fleeChance);
}

function startHiddenBossCombat(player, fleeChance) {
  const baseBoss = pick(BOSSES.filter((boss) => !boss.finalBoss));
  const normalHp = baseBoss.hp + player.floor * 4;
  const normalAtk = Math.max(3, baseBoss.atk - 2 + Math.floor(player.floor / 5)) + bossAttackBonus(player.floor);
  const hiddenBoss = {
    ...baseBoss,
    name: `隱藏 ${baseBoss.name}`,
    icon: "🌑",
    maxHp: normalHp * 2,
    hp: normalHp * 2,
    atk: normalAtk * 2,
    gold: baseBoss.gold + player.floor * 8,
    art: ENEMY_ART[baseBoss.name] ?? baseBoss.icon,
    imageFile: enemyImageFile(baseBoss),
    imageUrl: enemyImageUrl(baseBoss),
    round: 1,
    boss: true,
    hiddenBoss: true
  };

  player.combat = hiddenBoss;
  setPlayer(player);
  return {
    title: "隱藏 Boss 強制戰鬥",
    text: [
      "🌑 隱藏 Boss 現身！你只有一次逃跑機會。",
      `💥 逃跑失敗（成功率 ${Math.round(fleeChance * 100)}%），被迫進入戰鬥。`,
      "⚠️ 隱藏 Boss 的 HP 與攻擊力都是一般 Boss 的 2 倍。",
      combatLine(player)
    ].join("\n")
  };
}

function shouldSpawnElite(player) {
  return player.mapKey !== "night_city" && player.floor >= 4 && Math.random() < 0.15;
}

function startEliteCombat(player) {
  const baseEnemy = pick(ELITE_ENEMIES);
  const hp = baseEnemy.hp + player.floor * 4;
  const enemy = {
    ...baseEnemy,
    maxHp: hp,
    hp,
    atk: baseEnemy.atk + Math.floor(player.floor / 3),
    gold: baseEnemy.gold + player.floor,
    icon: ENEMY_EMOJI[baseEnemy.name] ?? "🗡️",
    art: ENEMY_ART[baseEnemy.name] ?? "🗡️",
    imageFile: enemyImageFile(baseEnemy),
    imageUrl: enemyImageUrl(baseEnemy),
    round: 1,
    statuses: {},
    elite: true
  };
  player.combat = enemy;
  setPlayer(player);
  return {
    title: "遭遇精英怪",
    text: [
      `${enemy.icon} 精英怪 ${enemy.name} 擋住了去路！`,
      "⚠️ 她比普通怪更強，但還不到 Boss 的壓迫感。",
      combatLine(player)
    ].join("\n")
  };
}

function startCombat(player) {
  const enemyPool = player.mapKey === "night_city" ? NIGHT_CITY_ENEMIES : ENEMIES;
  const baseEnemy = pick(enemyPool);
  const hp = baseEnemy.hp + player.floor * 3;
  const enemy = {
    ...baseEnemy,
    maxHp: hp,
    hp,
    atk: baseEnemy.atk + Math.floor(player.floor / 4),
    gold: baseEnemy.gold + Math.floor(player.floor / 2),
    icon: ENEMY_EMOJI[baseEnemy.name] ?? "❓",
    art: ENEMY_ART[baseEnemy.name] ?? "❓",
    imageFile: enemyImageFile(baseEnemy),
    imageUrl: enemyImageUrl(baseEnemy),
    round: 1,
    statuses: {}
  };
  player.combat = enemy;
  setPlayer(player);
  return {
    title: player.mapKey === "night_city" ? "夜城遭遇" : "遭遇敵人",
    text: [
      `${enemy.icon} 你在${player.mapKey === "night_city" ? "夜城" : "地下城"}第 ${player.floor} 層撞見了 ${enemy.name}！`,
      player.mapKey === "night_city" ? "🌃 霓虹燈閃爍，敵人的戰鬥模組開始運作。" : "⚔️ 空氣突然變得很吵，戰鬥開始。",
      combatLine(player)
    ].join("\n")
  };
}

function explore(player) {
  if (player?.completed) return { title: "通喜通關", text: "🎉 通喜通關\n這場冒險已經完成。想重玩可以使用 /start。" };
  if (!player?.alive) return { title: "沒有進行中的冒險", text: "先使用 /start 開新局。" };
  if (player.sceneImageFolder?.startsWith("fishing")) {
    delete player.sceneImageFile;
    delete player.sceneImageUrl;
    delete player.sceneImageFolder;
  }
  if (player.hiddenRoom) {
    return {
      title: "發現隱藏房間",
      text: [
        "🚪 你正站在隱藏房間入口。",
        "🎲 裡面可能有豐盛獎勵、隱藏 Boss，或即死陷阱。",
        "請選擇要進入或離開。"
      ].join("\n")
    };
  }
  const completed = completeRun(player);
  if (completed) return completed;
  if (player.combat) return currentCombat(player);
  if (shouldSpawnBoss(player)) return startBossCombat(player);
  if (shouldFindHiddenRoom(player)) return findHiddenRoom(player);
  if (shouldSpawnElite(player)) return startEliteCombat(player);

  const eventRoll = Math.random();
  if (eventRoll < 0.58) return startCombat(player);
  if (eventRoll < 0.78) return treasure(player);
  if (eventRoll < 0.9) return shrine(player);
  return emptyRoom(player);
}

function currentCombat(player) {
  return {
    title: "戰鬥中",
    text: `你還在跟 ${player.combat.name} 纏鬥。\n${combatLine(player)}`
  };
}

function combatTurn(player, action) {
  if (!player?.alive) return { title: "冒險已結束", text: "使用 /start 重新開始。" };
  const enemy = player.combat;
  if (!enemy) return { title: "沒有敵人", text: "按探索繼續前進。" };

  const lines = [];
  tickPlayerDebuffDamage(player, lines);
  if (player.hp <= 0) return finishPlayerDeath(player, lines);

  const actionBlocked = consumeActionDebuff(player, lines);
  if (actionBlocked) {
    action = "blocked";
  } else if (action === "defend") {
    lines.push("🛡️ 你架起防禦，準備硬扛。");
  } else {
    const blindedMiss = consumeBlindDebuff(player, lines);
    if (blindedMiss) {
      // 敵人仍會反擊。
    } else if (Math.random() < gamblerInstantKillChance(player)) {
      enemy.hp = 0;
      lines.push(`🍀 賭命爆擊！你抓到命運破綻，直接秒殺 ${enemy.name}。`);
    } else {
      const playerDamage = Math.max(1, attackPower(player) + roll(5) - 1);
      enemy.hp -= playerDamage;
      lines.push(`⚔️ 你衝上去攻擊 ${enemy.name}，造成 ${playerDamage} 傷害。`);
      lines.push(...applyWeaponEffects(player, enemy));
    }
  }

  lines.push(...tickEnemyStatuses(enemy));
  if (enemy.hp <= 0) return finishCombatWin(player, enemy, lines);

  if (action === "defend" && Math.random() < 0.25) {
    const parryDamage = 20 + roll(31) - 1;
    enemy.hp -= parryDamage;
    lines.push(`✨ 完美格擋！你抓準破綻反擊，對 ${enemy.name} 造成 ${parryDamage} 傷害。`);
    if (enemy.hp <= 0) return finishCombatWin(player, enemy, lines);
    enemy.round += 1;
    setPlayer(player);
    return { title: "完美格擋", text: `${lines.join("\n")}\n${combatLine(player)}` };
  }

  const guard = action === "defend" ? 6 : 0;
  tickWeakDebuff(player);
  if (player.classKey === "ranger" && Math.random() < 0.25) {
    const counterDamage = Math.max(12, attackPower(player) * 2 + 8 + roll(8) - 1);
    enemy.hp -= counterDamage;
    lines.push(`🏹 遊俠本能觸發！你閃避了 ${enemy.name} 的攻擊並爆擊反擊，造成 ${counterDamage} 傷害。`);
    if (enemy.hp <= 0) return finishCombatWin(player, enemy, lines);
    enemy.round += 1;
    setPlayer(player);
    return { title: "閃避爆擊", text: `${lines.join("\n")}\n${combatLine(player)}` };
  }
  if (Math.random() < enemyInstantKillChance(enemy)) {
    return finishPlayerDeath(player, [
      ...lines,
      `💥 ${enemy.icon} ${enemy.name} 觸發 1% 爆擊，直接秒殺了你。`
    ]);
  }

  const counter = Math.max(1, enemy.atk + roll(3) - 2 - player.def - equipmentDefenseBonus(player) - guard);
  player.hp -= counter;
  lines.push(`${enemy.icon} ${enemy.name} 反擊，造成 ${counter} 傷害。`);
  applyBossDebuff(player, enemy, lines);
  applyNightCitySkill(player, enemy, lines);

  applyTurnRegen(player, lines);

  if (player.hp <= 0) return finishPlayerDeath(player, lines);

  enemy.round += 1;
  setPlayer(player);
  return { title: action === "defend" ? "防禦回合" : "攻擊回合", text: `${lines.join("\n")}\n${combatLine(player)}` };
}

function applyWeaponEffects(player, enemy) {
  const weapon = player.weapon;
  if (!weapon?.effects?.length) return [];
  const lines = [];
  enemy.statuses ??= {};
  for (const effect of weapon.effects) {
    if (effect === "poison") {
      enemy.statuses.poison = Math.max(enemy.statuses.poison ?? 0, 3);
      lines.push("☠️ 武器效果觸發：敵人中毒。");
    } else if (effect === "bleed") {
      enemy.statuses.bleed = Math.max(enemy.statuses.bleed ?? 0, 4);
      lines.push("🩸 武器效果觸發：敵人流血。");
    } else if (effect === "burn") {
      enemy.statuses.burn = Math.max(enemy.statuses.burn ?? 0, 2);
      lines.push("🔥 武器效果觸發：敵人被灼燒。");
    } else if (effect === "leech") {
      heal(player, 2);
      lines.push("🦇 武器效果觸發：你回復 2 HP。");
    } else if (effect === "shatter") {
      enemy.atk = Math.max(1, enemy.atk - 1);
      lines.push("🛡️ 武器效果觸發：敵人攻擊 -1。");
    }
  }
  return lines;
}

function tickEnemyStatuses(enemy) {
  if (!enemy.statuses) return [];
  const lines = [];
  const damageMap = { poison: 3, bleed: 2, burn: 4 };
  for (const [effect, damage] of Object.entries(damageMap)) {
    if (enemy.statuses[effect] > 0) {
      enemy.hp -= damage;
      enemy.statuses[effect] -= 1;
      lines.push(`${WEAPON_EFFECTS[effect].icon} ${WEAPON_EFFECTS[effect].label}造成 ${damage} 傷害。`);
    }
  }
  return lines;
}

function applyTurnRegen(player, lines) {
  if ((player.regenTurns ?? 0) <= 0 || !player.alive) return;
  heal(player, 3);
  player.regenTurns -= 1;
  lines.push(`🖼️ 女僕照效果：回復 3 HP，剩餘 ${player.regenTurns} 回合。`);
}

function finishCombatWin(player, enemy, lines) {
  player.kills += 1;
  player.floor += 1;
  player.gold += enemy.gold;
  delete player.combat;
  delete player.sceneImageFile;
  delete player.sceneImageUrl;
  delete player.sceneImageFolder;
  lines.push(`🏆 擊敗 ${enemy.name}，獲得 ${enemy.gold} 枚金幣。`);

  if (hasRelic(player, "vampire_tooth")) lines.push(RELICS.vampire_tooth.onWin(player));
  if (hasRelic(player, "lucky_coin")) {
    const bonus = RELICS.lucky_coin.applyReward(player);
    if (bonus) lines.push(bonus);
  }

  if (enemy.boss) {
    bossRewards(player, enemy, lines);
  } else {
    if (player.kills % 3 === 0) lines.push(addRelic(player, pick(Object.keys(RELICS))));
    const weaponLine = maybeDropWeapon(player);
    if (weaponLine) lines.push(weaponLine);
    const gearLine = maybeDropGear(player);
    if (gearLine) lines.push(gearLine);
  }

  const completed = completeRun(player, lines);
  if (completed) return completed;

  setPlayer(player);
  return { title: enemy.boss ? "Boss 擊破" : "戰鬥勝利", text: lines.filter(Boolean).join("\n") };
}

function bossRewards(player, enemy, lines) {
  const bonusGold = 80 + player.floor * 8;
  player.gold += bonusGold;
  lines.push(`👑 Boss 獎勵：額外獲得 ${bonusGold} 枚金幣。`);
  const relicId = enemy.specialRelic ?? pick(Object.keys(RELICS));
  lines.push(addRelic(player, relicId));
  const weapon = generateWeapon(player.floor, true);
  player.weapon = weapon;
  lines.push(`🗡️ Boss 掉落武器：${weaponLine(weapon)}，已自動裝備。`);
}

function maybeDropWeapon(player) {
  const chance = 0.18 + Math.min(0.18, (player.luck ?? 0) * 0.015);
  if (Math.random() > chance) return null;
  const weapon = generateWeapon(player.floor, false);
  const oldPower = player.weapon?.attack ?? 0;
  if (weapon.attack >= oldPower) {
    player.weapon = weapon;
    return `🗡️ 掉落武器：${weaponLine(weapon)}，已自動裝備。`;
  }
  player.gold += 5;
  return `🗡️ 掉落武器：${weaponLine(weapon)}，但較弱，轉賣成 5 金幣。`;
}

function generateWeapon(floor, epicOnly = false) {
  const qualityEntries = Object.entries(WEAPON_QUALITIES)
    .filter(([key]) => !epicOnly || key === "epic" || key === "legendary")
    .map(([key, value]) => ({ key, weight: value.weight }));
  const qualityKey = epicOnly && Math.random() < 0.25 ? "legendary" : weightedPick(qualityEntries).key;
  const quality = WEAPON_QUALITIES[qualityKey];
  const [min, max] = quality.bonus;
  const names = ["加班終結者", "會議破壞刃", "薪水追回斧", "客訴切割器", "hAO 震撼槌"];
  const name = pick(names);
  return {
    name,
    quality: qualityKey,
    qualityLabel: quality.label,
    qualityIcon: quality.icon,
    attack: min + roll(max - min + 1) + Math.floor(floor / 3),
    effects: pickEffects(quality.effectCount),
    imageFile: WEAPON_IMAGE_FILES[name]
  };
}

function generateGear(floor, forcedSlot = null) {
  if (forcedSlot === "rod") {
    const qualityKey = weightedPick(Object.entries(ROD_QUALITIES).map(([key, value]) => ({ key, weight: value.weight }))).key;
    const quality = ROD_QUALITIES[qualityKey];
    const [min, max] = quality.fishing;
    return {
      name: quality.name,
      slot: "rod",
      quality: qualityKey,
      qualityLabel: quality.label,
      qualityIcon: quality.icon,
      attack: 0,
      defense: 0,
      fishing: min + roll(max - min + 1) - 1 + Math.floor(floor / 15),
      imageUrl: quality.imageUrl
    };
  }
  const qualityKey = weightedPick(Object.entries(GEAR_QUALITIES).map(([key, value]) => ({ key, weight: value.weight }))).key;
  const quality = GEAR_QUALITIES[qualityKey];
  const slot = forcedSlot ?? pick(["armor", "accessory"]);
  const [min, max] = quality.bonus;
  const bonus = min + roll(max - min + 1) - 1 + Math.floor(floor / 10);
  const names = slot === "armor"
    ? ["拾荒者護甲", "霓虹戰術衣", "深淵重甲", "守門人外骨骼"]
    : ["幸運魚鉤", "駭客護符", "猩紅徽章", "深淵羅盤"];
  return {
    name: pick(names), slot, quality: qualityKey, qualityLabel: quality.label, qualityIcon: quality.icon,
    attack: slot === "accessory" ? Math.max(1, Math.floor(bonus / 2)) : 0,
    defense: slot === "armor" ? bonus : 0,
    fishing: slot === "rod" ? bonus : slot === "accessory" ? Math.max(1, Math.floor(bonus / 2)) : 0
  };
}

function gearPower(gear) {
  return (gear?.attack ?? 0) + (gear?.defense ?? 0) + (gear?.fishing ?? 0);
}

function gearText(gear) {
  if (!gear) return "無";
  const stats = [];
  if (gear.attack) stats.push(`攻擊 +${gear.attack}`);
  if (gear.defense) stats.push(`防禦 +${gear.defense}`);
  if (gear.fishing) stats.push(`釣魚幸運 +${gear.fishing}`);
  return `${gear.qualityIcon ?? "⚪"}${gear.qualityLabel ?? "普通"} ${gear.name}（${stats.join("、") || "無加成"}）`;
}

function storeOrEquipGear(player, gear) {
  ensureDock(player);
  const current = player.equipment[gear.slot];
  if (!current || gearPower(gear) > gearPower(current)) {
    if (current) player.equipmentBag.push(current);
    player.equipment[gear.slot] = gear;
    return `🧰 獲得裝備：${gearText(gear)}，已自動裝備。`;
  }
  player.equipmentBag.push(gear);
  return `🧰 獲得裝備：${gearText(gear)}，已放入裝備庫。`;
}

function maybeDropGear(player) {
  const chance = 0.12 + Math.min(0.12, (player.luck ?? 0) * 0.01);
  if (Math.random() > chance) return null;
  return storeOrEquipGear(player, generateGear(player.floor));
}

function fish(player) {
  if (!player?.alive) return { title: "無法釣魚", text: "目前沒有進行中的冒險。" };
  if (player.combat || player.hiddenRoom) return { title: "無法釣魚", text: "先離開目前的危險區域。" };
  if (player.lastFishedFloor === player.floor) return { title: "本層已釣過魚", text: "🎣 每一層只能釣一次，探索到下一層後再來。" };
  if (!removeItem(player, "bait")) return { title: "沒有魚餌", text: "🪱 魚餌用完了，請到商店購買。" };

  ensureDock(player);
  const fishingLuck = (player.luck ?? 0) + (player.equipment.rod?.fishing ?? 0) + (player.equipment.accessory?.fishing ?? 0);
  const lines = ["🎣 你在船塢放下釣線，消耗 1 個魚餌。"];
  const fishCatch = weightedPick(FISH_TABLE.map((entry) => ({ ...entry, weight: entry.weight * (entry.rarity === "common" ? 1 : 1 + fishingLuck * 0.025) })));
  const rarity = FISH_RARITIES[fishCatch.rarity];
  const [minGold, maxGold] = fishCatch.gold;
  const gold = minGold + roll(maxGold - minGold + 1) - 1 + Math.floor(fishingLuck / 5);
  const buff = pick(FISH_BUFFS[fishCatch.rarity]);
  player.gold += gold;
  player.fishCaught = (player.fishCaught ?? 0) + 1;
  player.lastFishedFloor = player.floor;
  buff.apply(player);
  player.sceneImageFile = fishCatch.imageFile;
  player.sceneImageUrl = `attachment://${fishCatch.imageFile}`;
  player.sceneImageFolder = "fishing";
  lines.push(`${rarity.icon}【${rarity.label}】釣到「${fishCatch.name}」，交給碼頭商人後獲得 ${gold} 金幣。`);
  lines.push(`✨ 魚類增益：${buff.text}。`);

  if (Math.random() < 0.12 + Math.min(0.2, fishingLuck * 0.01)) {
    const slot = Math.random() < 0.55 ? "rod" : "accessory";
    const gear = generateGear(player.floor, slot);
    if (slot === "rod") {
      delete player.sceneImageFile;
      delete player.sceneImageFolder;
      player.sceneImageUrl = gear.imageUrl;
    }
    lines.push(`🎁 額外收穫：${storeOrEquipGear(player, gear)}`);
  }
  setPlayer(player);
  return { title: "釣魚結果", text: lines.join("\n") };
}

function equipmentText(player) {
  if (!player) return "先使用 /start 開始冒險。";
  ensureDock(player);
  return [
    `🛡️ 防具：${gearText(player.equipment.armor)}`,
    `💍 飾品：${gearText(player.equipment.accessory)}`,
    `🎣 釣竿：${gearText(player.equipment.rod)}`,
    `📦 裝備庫：${player.equipmentBag.length} 件`,
    `🐟 累計釣魚：${player.fishCaught ?? 0} 次`
  ].join("\n");
}

function equipStoredGear(player, index) {
  ensureDock(player);
  const gear = player.equipmentBag[index];
  if (!gear) return { title: "裝備不存在", text: "這件裝備可能已經被換走了。" };
  const current = player.equipment[gear.slot];
  player.equipment[gear.slot] = gear;
  player.equipmentBag.splice(index, 1);
  if (current) player.equipmentBag.push(current);
  setPlayer(player);
  return { title: "更換裝備", text: `✅ 已裝備 ${gearText(gear)}。` };
}

function pickEffects(count) {
  const keys = Object.keys(WEAPON_EFFECTS);
  const effects = [];
  while (effects.length < count && keys.length) {
    const effect = pick(keys);
    if (!effects.includes(effect)) effects.push(effect);
  }
  return effects;
}

function weaponLine(weapon) {
  const effectText = weapon.effects?.length
    ? `，效果：${weapon.effects.map((effect) => `${WEAPON_EFFECTS[effect].icon}${WEAPON_EFFECTS[effect].label}`).join("、")}`
    : "";
  return `${weapon.qualityIcon}${weapon.qualityLabel} ${weapon.name}（攻擊 +${weapon.attack}${effectText}）`;
}

function treasure(player) {
  const gold = 5 + roll(6) + Math.floor(player.floor / 2);
  player.gold += gold;
  player.floor += 1;
  const completed = completeRun(player, [`📦 你撬開一個怪味寶箱。`, `🪙 裡面滾出 ${gold} 枚金幣。`]);
  if (completed) return completed;
  setPlayer(player);
  return { title: "寶箱房", text: `📦 你撬開一個怪味寶箱。\n🪙 裡面滾出 ${gold} 枚金幣。` };
}

function shrine(player) {
  const healAmount = 8 + roll(6);
  heal(player, healAmount);
  player.floor += 1;
  const completed = completeRun(player, [`✨ 你摸了一下發光的打卡鐘，回復 ${healAmount} HP。`]);
  if (completed) return completed;
  setPlayer(player);
  return { title: "休息神龕", text: `✨ 你摸了一下發光的打卡鐘，回復 ${healAmount} HP。` };
}

function emptyRoom(player) {
  player.floor += 1;
  const completed = completeRun(player, ["🚪 這裡只有冷掉的咖啡味。你繼續往前。"]);
  if (completed) return completed;
  setPlayer(player);
  return { title: "空房間", text: "🚪 這裡只有冷掉的咖啡味。你繼續往前。" };
}

function rest(player) {
  if (!player?.alive) return { title: "無法休息", text: "你目前沒有進行中的冒險。" };
  if (player.combat) return { title: "無法休息", text: "戰鬥中不能休息。" };
  if (player.gold < 3) return { title: "金幣不足", text: "休息固定需要 3 金幣。" };
  player.gold -= 3;
  const amount = 10 + (hasRelic(player, "lunchbox") ? 4 : 0);
  heal(player, amount);
  setPlayer(player);
  return { title: "休息", text: `🍱 你花 3 金幣休息，回復 ${amount} HP。` };
}

function useItem(player, itemId) {
  if (!player?.alive) return { title: "無法使用", text: "你目前沒有進行中的冒險。" };
  if (!ITEM_DEFS[itemId]) return { title: "未知道具", text: "這個道具不存在。" };
  if (!removeItem(player, itemId)) return { title: "沒有道具", text: "背包裡沒有這個道具。" };

  const lines = [];
  if (itemId === "potion") {
    heal(player, 12);
    lines.push("🧪 你喝下小補藥，回復 12 HP。");
  } else if (itemId === "feast") {
    heal(player, 25);
    lines.push("🍱 你吃掉地城便當，回復 25 HP。");
  } else if (itemId === "bomb") {
    if (!player.combat) {
      addItem(player, itemId);
      return { title: "現在不能用", text: "炸彈只能在戰鬥中使用。" };
    }
    player.combat.hp -= 12;
    lines.push(`💣 炸彈炸到 ${player.combat.name}，造成 12 傷害。`);
    if (player.combat.hp <= 0) return finishCombatWin(player, player.combat, lines);
  } else if (itemId === "smoke") {
    if (!player.combat) {
      addItem(player, itemId);
      return { title: "現在不能用", text: "煙霧彈只能在戰鬥中使用。" };
    }
    const enemyName = player.combat.name;
    delete player.combat;
    delete player.sceneImageFile;
    delete player.sceneImageUrl;
    delete player.sceneImageFolder;
    player.floor += 1;
    lines.push(`💨 你用煙霧彈逃離 ${enemyName}。`);
    const completed = completeRun(player, lines);
    if (completed) return completed;
  }
  setPlayer(player);
  return { title: "使用道具", text: lines.join("\n") };
}

function buyShopItem(player, itemId, quantity = 1) {
  if (!player?.alive) return { title: "無法購買", text: "你目前沒有進行中的冒險。" };
  if (player.combat) return { title: "無法購買", text: "戰鬥中不能逛商店。" };
  const item = SHOP_ITEMS[itemId];
  if (!item) return { title: "沒有商品", text: "商店沒有這個東西。" };
  quantity = Math.max(1, Math.min(10, Number.parseInt(quantity, 10) || 1));
  const totalCost = item.cost * quantity;
  if (player.gold < totalCost) return { title: "金幣不足", text: `${item.label} x${quantity} 需要 ${totalCost} 金幣。` };

  player.gold -= totalCost;
  let text = "";
  if (ITEM_DEFS[itemId]) {
    addItem(player, itemId, quantity);
    text = `${item.icon} ${item.label} x${quantity} 已放入背包。`;
  } else if (itemId === "whetstone") {
    player.atk += quantity;
    text = `⚔️ 使用 ${quantity} 個磨刀石，攻擊 +${quantity}。`;
  } else if (itemId === "armor") {
    player.def += quantity;
    text = `🛡️ 裝上 ${quantity} 件補丁護甲，防禦 +${quantity}。`;
  } else if (itemId === "heart") {
    player.maxHp += 4 * quantity;
    heal(player, 4 * quantity);
    text = `❤️ 使用 ${quantity} 個心之碎片，最大 HP +${4 * quantity}，回復 ${4 * quantity} HP。`;
  } else if (itemId === "relic") {
    const relicLines = [];
    for (let i = 0; i < quantity; i += 1) relicLines.push(addRelic(player, pick(Object.keys(RELICS))));
    text = relicLines.filter(Boolean).join("\n");
  }

  setPlayer(player);
  return { title: "購買成功", text: `${item.icon} 花費 ${totalCost} 金幣買下 ${item.label} x${quantity}。\n${text}` };
}

function shopText(player) {
  if (!player) return "先使用 /start 開始冒險。";
  return Object.entries(SHOP_ITEMS)
    .map(([, item]) => `${item.icon} ${item.label}｜${item.cost} 金幣｜${item.description}`)
    .join("\n");
}

function inventoryText(player) {
  if (!player) return "先使用 /start 開始冒險。";
  const entries = Object.entries(player.items ?? {}).filter(([, amount]) => amount > 0);
  if (!entries.length) return "🎒 背包是空的。";
  return entries.map(([id, amount]) => `${ITEM_DEFS[id]?.icon ?? "❔"} ${ITEM_DEFS[id]?.label ?? id} x${amount}`).join("\n");
}

function dockText(player) {
  if (!player) return "先使用 /start 開始冒險。";
  ensureDock(player);
  const slots = Array.from({ length: player.dockCapacity }, (_, index) => {
    const ship = player.ships[index];
    if (!ship) return `▫️ ${index + 1} 號泊位：空置`;
    const type = typeof ship === "string" ? "canoe" : ship.type;
    const info = SHIP_TYPES[type] ?? SHIP_TYPES.canoe;
    const active = player.activeShip === type ? "【使用中】" : "";
    return `${info.icon} ${index + 1} 號泊位：${ship.name || info.name}${active}`;
  });
  const shipyard = Object.entries(SHIP_TYPES).map(([type, info]) => {
    const owned = player.ships.some((ship) => ship?.type === type);
    const state = owned ? (player.activeShip === type ? "使用中" : "已擁有") : `${info.cost} 金幣`;
    return `${info.icon} ${info.name}｜${state}｜安全 ${Math.round(info.safety * 100)}%｜收益 x${info.reward}`;
  });
  return [
    `⚓ 船塢容量：${player.ships.length}/${player.dockCapacity}`,
    ...slots,
    "",
    "船隻商店",
    ...shipyard,
    "",
    "每一層可以出航一次；選單可購買或切換船隻。"
  ].join("\n");
}

function selectOrBuyShip(player, shipType) {
  if (!player?.alive) return { title: "無法整備船隻", text: "目前沒有進行中的冒險。" };
  ensureDock(player);
  const info = SHIP_TYPES[shipType];
  if (!info) return { title: "未知船隻", text: "找不到這種船。" };
  const owned = player.ships.some((ship) => ship?.type === shipType);
  if (owned) {
    player.activeShip = shipType;
    setPlayer(player);
    return { title: "已切換船隻", text: `${info.icon} 本次出航將使用 ${info.name}。` };
  }
  if (player.ships.length >= player.dockCapacity) {
    return { title: "船塢已滿", text: "沒有空泊位可以停放新船。" };
  }
  if (player.gold < info.cost) {
    return { title: "金幣不足", text: `${info.icon} ${info.name} 需要 ${info.cost} 金幣，你目前有 ${player.gold}。` };
  }
  player.gold -= info.cost;
  player.ships.push({ type: shipType, name: info.name });
  player.activeShip = shipType;
  setPlayer(player);
  return { title: "購買船隻成功", text: `${info.icon} 花費 ${info.cost} 金幣購買 ${info.name}，已設為使用中船隻。` };
}

function voyage(player) {
  if (!player?.alive) return { title: "無法出航", text: "目前沒有進行中的冒險。" };
  if (player.combat || player.hiddenRoom) return { title: "無法出航", text: "請先離開目前的危險區域。" };
  if (player.lastVoyageFloor === player.floor) {
    return { title: "本層已出航", text: "🌊 每一層只能出航一次，前往下一層後再來。" };
  }
  ensureDock(player);
  const info = SHIP_TYPES[player.activeShip] ?? SHIP_TYPES.canoe;
  player.lastVoyageFloor = player.floor;
  const eventRoll = Math.random();
  const lines = [`${info.icon} 你駕駛 ${info.name} 離開船塢，向未知海域出航。`];

  if (eventRoll > info.safety) {
    const damage = Math.max(2, Math.round((5 + roll(8) + Math.floor(player.floor / 8)) * (1.15 - info.safety / 2)));
    player.hp -= damage;
    lines.push(`🌩️ 突如其來的風暴襲擊船身，你受到 ${damage} 點傷害。`);
    if (player.hp <= 0) return finishPlayerDeath(player, lines);
  } else if (eventRoll < 0.18) {
    const gold = Math.round((8 + roll(10) + Math.floor(player.floor / 3)) * info.reward);
    player.gold += gold;
    lines.push(`🏝️ 你發現一座無名小島，帶回 ${gold} 枚金幣。`);
  } else if (eventRoll < 0.36) {
    const bait = Math.max(1, Math.round(info.reward));
    addItem(player, "bait", bait);
    lines.push(`🐟 你遇見魚群，收集到魚餌 x${bait}。`);
  } else if (eventRoll < 0.5) {
    lines.push(`📦 海面漂來一只補給箱。`);
    lines.push(storeOrEquipGear(player, generateGear(player.floor)));
  } else {
    const gold = Math.round((4 + roll(7)) * info.reward);
    player.gold += gold;
    heal(player, 3);
    lines.push(`🌅 航程平穩，你完成海圖委託並獲得 ${gold} 枚金幣，回復 3 HP。`);
  }

  setPlayer(player);
  return { title: "出航結果", text: lines.join("\n") };
}

function statusText(player) {
  if (!player) return "沒有進行中的冒險。";
  const state = healthState(player);
  const classIcon = CLASS_EMOJI[player.classKey] ?? "🎲";
  const relicNames = player.relics
    .map((id) => `${RELIC_EMOJI[id] ?? "✨"} ${RELICS[id]?.name ?? id}`)
    .join("、") || "無";
  const debuffs = playerDebuffText(player) || "無";
  return [
    `${classIcon} 職業：${player.classLabel}`,
    `${state.icon} 狀態：${state.label}`,
    `🗺️ 地圖：${player.mapLabel ?? MAPS.dungeon.label}`,
    `🚪 層數：${player.floor}`,
    player.combat ? `👹 戰鬥：${player.combat.name} ${player.combat.hp}/${player.combat.maxHp} HP` : "👹 戰鬥：無",
    `❤️ HP：${player.hp}/${player.maxHp}`,
    `⚔️ 攻擊 / 🛡️ 防禦：${attackPower(player)}/${player.def + equipmentDefenseBonus(player)}`,
    `🍀 幸運：${player.luck ?? 0}%`,
    `🧿 負面狀態：${debuffs}`,
    `🎁 開局祝福：${player.startBuff ?? "無"}`,
    `🗡️ 武器：${weaponText(player)}`,
    `🎒 道具：${Object.values(player.items ?? {}).reduce((sum, amount) => sum + amount, 0)} 件`,
    `⚓ 船塢：${player.ships?.length ?? 0}/${player.dockCapacity ?? 3}`,
    `🎣 釣魚：${player.fishCaught ?? 0} 次｜裝備庫：${player.equipmentBag?.length ?? 0} 件`,
    `🪙 金幣：${player.gold}`,
    `🏆 擊殺：${player.kills}`,
    `✨ 遺物：${relicNames}`
  ].join("\n");
}

function weaponText(player) {
  if (!player.weapon) return "無";
  const effects = player.weapon.effects?.length
    ? `｜${player.weapon.effects.map((effect) => `${WEAPON_EFFECTS[effect].icon}${WEAPON_EFFECTS[effect].label}`).join("、")}`
    : "";
  return `${player.weapon.qualityIcon}${player.weapon.qualityLabel} ${player.weapon.name} +${player.weapon.attack}${effects}`;
}

loadPlayers();

module.exports = {
  CLASSES,
  MAPS,
  CLASS_EMOJI,
  ITEM_DEFS,
  RELICS,
  START_BUFFS,
  STARTER_WEAPONS,
  WEAPON_EFFECTS,
  WEAPON_QUALITIES,
  SHOP_ITEMS,
  SHIP_TYPES,
  healthState,
  buyShopItem,
  combatTurn,
  createPlayer,
  deletePlayer,
  dockText,
  equipmentText,
  equipStoredGear,
  enterHiddenRoom,
  explore,
  fish,
  getPlayer,
  inventoryText,
  leaveHiddenRoom,
  leaderboardText,
  loadPlayers,
  rest,
  setPlayer,
  selectOrBuyShip,
  shopText,
  statusText,
  useItem,
  voyage
};
