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
  }
};

const CLASS_EMOJI = {
  blade: "🗡️",
  spark: "🔮",
  rat: "🍀"
};

const STARTER_WEAPONS = {
  blade: { name: "新手長劍", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 3, effects: [] },
  spark: { name: "新手法杖", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 4, effects: [] },
  rat: { name: "新手短刀", quality: "common", qualityLabel: "普通", qualityIcon: "⚪", attack: 2, effects: [] }
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
  smoke: { label: "煙霧彈", icon: "💨", description: "戰鬥中逃離敵人，但不獲得獎勵。" }
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
  whetstone: { label: "磨刀石", icon: "⚔️", cost: 14, description: "永久攻擊 +1。" },
  armor: { label: "補丁護甲", icon: "🛡️", cost: 14, description: "永久防禦 +1。" },
  heart: { label: "心之碎片", icon: "❤️", cost: 18, description: "最大 HP +4，並回復 4 HP。" },
  relic: { label: "神秘遺物", icon: "✨", cost: 22, description: "隨機獲得一個遺物。" }
};

const ENEMIES = [
  { name: "地城史萊姆", hp: 14, atk: 4, gold: 4 },
  { name: "發票骷髏", hp: 18, atk: 5, gold: 6 },
  { name: "加班怨靈", hp: 22, atk: 7, gold: 8 },
  { name: "寶箱模仿怪", hp: 26, atk: 8, gold: 12 }
];

const ELITE_ENEMIES = [
  { name: "女僕劍士", hp: 38, atk: 9, gold: 22, elite: true }
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
  "地城守門人": "🛡️"
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
  return players[id] ?? null;
}

function setPlayer(player) {
  players[player.id] = player;
  savePlayers();
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

function createPlayer(id, classKey, buffKey = "attack") {
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
    items: { potion: 1 },
    weapon: { ...(STARTER_WEAPONS[base.starterWeapon] ?? STARTER_WEAPONS.blade) },
    startBuff: START_BUFFS[buffKey]?.label ?? START_BUFFS.attack.label
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
  delete player.combat;
  recordLeaderboard(player, "倒下");
  setPlayer(player);
  lines.push("💀 你倒下了。可以用 /start 開新局。");
  return { title: "冒險失敗", text: lines.join("\n") };
}
function attackPower(player) {
  const base = player.atk + (player.weapon?.attack ?? 0);
  return player.debuffs?.weak > 0 ? Math.max(1, Math.floor(base / 2)) : base;
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
  return player.floor >= 4 && Math.random() < 0.12;
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
  const baseEnemy = pick(ENEMIES);
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
    title: "遭遇敵人",
    text: [
      `${enemy.icon} 你在第 ${player.floor} 層撞見了 ${enemy.name}！`,
      "⚔️ 空氣突然變得很吵，戰鬥開始。",
      combatLine(player)
    ].join("\n")
  };
}

function explore(player) {
  if (player?.completed) return { title: "通喜通關", text: "🎉 通喜通關\n這場冒險已經完成。想重玩可以使用 /start。" };
  if (!player?.alive) return { title: "沒有進行中的冒險", text: "先使用 /start 開新局。" };
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
    if (Math.random() < gamblerInstantKillChance(player)) {
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
  if (Math.random() < enemyInstantKillChance(enemy)) {
    return finishPlayerDeath(player, [
      ...lines,
      `💥 ${enemy.icon} ${enemy.name} 觸發 1% 爆擊，直接秒殺了你。`
    ]);
  }

  const counter = Math.max(1, enemy.atk + roll(3) - 2 - player.def - guard);
  player.hp -= counter;
  lines.push(`${enemy.icon} ${enemy.name} 反擊，造成 ${counter} 傷害。`);
  applyBossDebuff(player, enemy, lines);

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
  return {
    name: pick(names),
    quality: qualityKey,
    qualityLabel: quality.label,
    qualityIcon: quality.icon,
    attack: min + roll(max - min + 1) + Math.floor(floor / 3),
    effects: pickEffects(quality.effectCount)
  };
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
    player.floor += 1;
    lines.push(`💨 你用煙霧彈逃離 ${enemyName}。`);
    const completed = completeRun(player, lines);
    if (completed) return completed;
  }
  setPlayer(player);
  return { title: "使用道具", text: lines.join("\n") };
}

function buyShopItem(player, itemId) {
  if (!player?.alive) return { title: "無法購買", text: "你目前沒有進行中的冒險。" };
  if (player.combat) return { title: "無法購買", text: "戰鬥中不能逛商店。" };
  const item = SHOP_ITEMS[itemId];
  if (!item) return { title: "沒有商品", text: "商店沒有這個東西。" };
  if (player.gold < item.cost) return { title: "金幣不足", text: `${item.label} 需要 ${item.cost} 金幣。` };

  player.gold -= item.cost;
  let text = "";
  if (ITEM_DEFS[itemId]) {
    addItem(player, itemId);
    text = `${item.icon} ${item.label} 已放入背包。`;
  } else if (itemId === "whetstone") {
    player.atk += 1;
    text = "⚔️ 你用磨刀石擦出火花，攻擊 +1。";
  } else if (itemId === "armor") {
    player.def += 1;
    text = "🛡️ 你把補丁護甲扣上去，防禦 +1。";
  } else if (itemId === "heart") {
    player.maxHp += 4;
    heal(player, 4);
    text = "❤️ 你吞下心之碎片，最大 HP +4，回復 4 HP。";
  } else if (itemId === "relic") {
    text = addRelic(player, pick(Object.keys(RELICS)));
  }

  setPlayer(player);
  return { title: "購買成功", text: `${item.icon} 花費 ${item.cost} 金幣買下 ${item.label}。\n${text}` };
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
    `🚪 層數：${player.floor}`,
    player.combat ? `👹 戰鬥：${player.combat.name} ${player.combat.hp}/${player.combat.maxHp} HP` : "👹 戰鬥：無",
    `❤️ HP：${player.hp}/${player.maxHp}`,
    `⚔️ 攻擊 / 🛡️ 防禦：${attackPower(player)}/${player.def}`,
    `🍀 幸運：${player.luck ?? 0}%`,
    `🧿 負面狀態：${debuffs}`,
    `🎁 開局祝福：${player.startBuff ?? "無"}`,
    `🗡️ 武器：${weaponText(player)}`,
    `🎒 道具：${Object.values(player.items ?? {}).reduce((sum, amount) => sum + amount, 0)} 件`,
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
  CLASS_EMOJI,
  ITEM_DEFS,
  RELICS,
  START_BUFFS,
  STARTER_WEAPONS,
  WEAPON_EFFECTS,
  WEAPON_QUALITIES,
  SHOP_ITEMS,
  healthState,
  buyShopItem,
  combatTurn,
  createPlayer,
  deletePlayer,
  enterHiddenRoom,
  explore,
  getPlayer,
  inventoryText,
  leaveHiddenRoom,
  leaderboardText,
  loadPlayers,
  rest,
  setPlayer,
  shopText,
  statusText,
  useItem
};
