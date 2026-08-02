const state = {
  config: null,
  player: null,
  event: null,
  selectedClass: "blade",
  selectedBuff: "attack",
  selectedMap: "dungeon",
  activeTab: "status",
  quantities: {},
  busy: false
};

const elements = {
  loading: document.querySelector("#loading"),
  startScreen: document.querySelector("#start-screen"),
  gameScreen: document.querySelector("#game-screen"),
  startForm: document.querySelector("#start-form"),
  classOptions: document.querySelector("#class-options"),
  buffOptions: document.querySelector("#buff-options"),
  mapOptions: document.querySelector("#map-options"),
  playerName: document.querySelector("#player-name"),
  newRun: document.querySelector("#new-run"),
  mapName: document.querySelector("#map-name"),
  floor: document.querySelector("#floor-value"),
  gold: document.querySelector("#gold-value"),
  kills: document.querySelector("#kill-value"),
  sceneImage: document.querySelector("#scene-image"),
  enemyHud: document.querySelector("#enemy-hud"),
  enemyName: document.querySelector("#enemy-name"),
  enemyRound: document.querySelector("#enemy-round"),
  enemyHealthBar: document.querySelector("#enemy-health-bar"),
  enemyHealthText: document.querySelector("#enemy-health-text"),
  enemyAttack: document.querySelector("#enemy-attack"),
  eventTitle: document.querySelector("#event-title"),
  eventText: document.querySelector("#event-text"),
  eventKicker: document.querySelector("#event-kicker"),
  classPortrait: document.querySelector("#class-portrait"),
  playerClass: document.querySelector("#player-class"),
  playerNameDisplay: document.querySelector("#player-name-display"),
  condition: document.querySelector("#condition-label"),
  healthText: document.querySelector("#health-text"),
  healthBar: document.querySelector("#health-bar"),
  attack: document.querySelector("#attack-value"),
  defense: document.querySelector("#defense-value"),
  luck: document.querySelector("#luck-value"),
  tabs: document.querySelector(".panel-tabs"),
  tabContent: document.querySelector("#tab-content"),
  actionBar: document.querySelector("#action-bar"),
  toast: document.querySelector("#toast")
};

boot();

async function boot() {
  try {
    const [config, saved] = await Promise.all([api("/api/web/config"), api("/api/web/state")]);
    state.config = config;
    state.player = saved.player;
    renderSetup();
    elements.loading.classList.add("hidden");
    if (state.player) {
      state.event = { title: "遠征續行", text: "你的網頁存檔已載入，可以繼續行動。" };
      showGame();
    } else {
      showSetup();
    }
  } catch (error) {
    elements.loading.querySelector("p").textContent = error.message;
  }
}

function renderSetup() {
  elements.classOptions.innerHTML = state.config.classes.map((item) => `
    <button class="class-choice ${item.id === state.selectedClass ? "selected" : ""}" type="button" data-class="${item.id}">
      <img src="${item.image}" alt="${escapeHtml(item.label)}職業形象">
      <span class="class-copy">
        <strong>${item.icon} ${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.description)}</p>
        <span class="class-stats"><span>HP ${item.hp}</span><span>ATK ${item.attack}</span><span>DEF ${item.defense}</span></span>
      </span>
    </button>`).join("");

  elements.buffOptions.innerHTML = state.config.buffs.map((item) => `
    <button class="option-button ${item.id === state.selectedBuff ? "selected" : ""}" type="button" data-buff="${item.id}">
      <strong>${item.icon} ${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small>
    </button>`).join("");

  elements.mapOptions.innerHTML = state.config.maps.map((item) => `
    <button class="map-button ${item.id === state.selectedMap ? "selected" : ""}" type="button" data-map="${item.id}">
      <strong>${item.icon} ${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small>
    </button>`).join("");
}

elements.classOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-class]");
  if (!button) return;
  state.selectedClass = button.dataset.class;
  renderSetup();
});

elements.buffOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buff]");
  if (!button) return;
  state.selectedBuff = button.dataset.buff;
  renderSetup();
});

elements.mapOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-map]");
  if (!button) return;
  state.selectedMap = button.dataset.map;
  renderSetup();
});

elements.startForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.busy) return;
  await request("/api/web/start", {
    classKey: state.selectedClass,
    buffKey: state.selectedBuff,
    mapKey: state.selectedMap,
    name: elements.playerName.value
  });
  if (state.player) showGame();
});

elements.newRun.addEventListener("click", () => {
  if (!window.confirm("建立新角色會覆蓋目前的網頁遠征，確定繼續？")) return;
  elements.playerName.value = state.player?.name ?? "";
  showSetup();
});

elements.tabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  state.activeTab = button.dataset.tab;
  renderTabs();
});

elements.tabContent.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === "use_item") await gameAction(action, { itemId: actionButton.dataset.id });
    if (action === "buy_item") await gameAction(action, { itemId: actionButton.dataset.id, quantity: state.quantities[actionButton.dataset.id] ?? 1 });
    if (action === "ship") await gameAction(action, { shipType: actionButton.dataset.id });
    if (action === "equip_gear") await gameAction(action, { index: Number(actionButton.dataset.index) });
    return;
  }
  const quantityButton = event.target.closest("[data-quantity]");
  if (quantityButton) {
    const id = quantityButton.dataset.id;
    const next = (state.quantities[id] ?? 1) + Number(quantityButton.dataset.quantity);
    state.quantities[id] = Math.max(1, Math.min(10, next));
    renderTabs();
  }
});

elements.actionBar.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action], [data-ui-tab]");
  if (!actionButton || state.busy) return;
  if (actionButton.dataset.uiTab) {
    state.activeTab = actionButton.dataset.uiTab;
    renderTabs();
    return;
  }
  await gameAction(actionButton.dataset.action);
});

async function gameAction(action, payload = {}) {
  await request("/api/web/action", { action, payload });
}

async function request(url, body) {
  setBusy(true);
  try {
    const data = await api(url, { method: "POST", body: JSON.stringify(body) });
    state.player = data.player;
    state.event = data.event;
    if (state.player) renderGame();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(false);
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "連線失敗，請稍後再試。");
  return data;
}

function showSetup() {
  elements.loading.classList.add("hidden");
  elements.gameScreen.classList.add("hidden");
  elements.startScreen.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function showGame() {
  elements.startScreen.classList.add("hidden");
  elements.gameScreen.classList.remove("hidden");
  renderGame();
  window.scrollTo(0, 0);
}

function renderGame() {
  const player = state.player;
  if (!player) return;
  elements.mapName.textContent = player.mapLabel;
  elements.floor.textContent = `${Math.min(player.floor, 50)} / 50`;
  elements.gold.textContent = player.gold;
  elements.kills.textContent = player.kills;
  elements.sceneImage.src = player.sceneImage || player.classImage;
  elements.sceneImage.alt = player.combat ? `${player.combat.name} 戰鬥形象` : `${player.classLabel}職業形象`;
  elements.sceneImage.onerror = () => { elements.sceneImage.src = player.classImage; };
  elements.classPortrait.src = player.classImage;
  elements.playerClass.textContent = player.classLabel;
  elements.playerNameDisplay.textContent = player.name;
  elements.condition.textContent = conditionText(player);
  elements.healthText.textContent = `${Math.max(0, player.hp)} / ${player.maxHp}`;
  elements.healthBar.style.width = `${percentage(player.hp, player.maxHp)}%`;
  elements.attack.textContent = player.attack;
  elements.defense.textContent = player.defense;
  elements.luck.textContent = player.luck;
  elements.eventKicker.textContent = player.combat ? "戰鬥紀錄" : `第 ${player.floor} 層紀錄`;
  elements.eventTitle.textContent = state.event?.title ?? "遠征狀態";
  elements.eventText.textContent = state.event?.text ?? "選擇下方操作繼續前進。";
  renderEnemy(player.combat);
  renderTabs();
  renderActions();
}

function renderEnemy(enemy) {
  elements.enemyHud.classList.toggle("hidden", !enemy);
  if (!enemy) return;
  const prefix = enemy.boss ? "BOSS" : enemy.elite ? "ELITE" : "ENEMY";
  elements.enemyName.textContent = `${prefix} // ${enemy.name}`;
  elements.enemyRound.textContent = `回合 ${enemy.round}`;
  elements.enemyHealthBar.style.width = `${percentage(enemy.hp, enemy.maxHp)}%`;
  elements.enemyHealthText.textContent = `HP ${enemy.hp} / ${enemy.maxHp}`;
  elements.enemyAttack.textContent = `攻擊 ${enemy.attack}`;
}

function renderTabs() {
  elements.tabs.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  const renderers = { status: statusTab, inventory: inventoryTab, shop: shopTab, equipment: equipmentTab };
  elements.tabContent.innerHTML = (renderers[state.activeTab] ?? statusTab)();
}

function statusTab() {
  const player = state.player;
  const debuffs = Object.entries(player.debuffs).filter(([, turns]) => turns > 0);
  const ship = player.ships.find((item) => item.active);
  return `<div class="data-list">
    ${dataRow("開局祝福", player.startBuff)}
    ${dataRow("地圖", player.mapLabel)}
    ${dataRow("目前船隻", ship?.name ?? "獨木舟")}
    ${dataRow("釣魚紀錄", `${player.fishCaught} 次`)}
    ${dataRow("負面狀態", debuffs.length ? debuffs.map(([id, turns]) => `${id} ${turns}回合`).join("、") : "無")}
    ${dataRow("遺物", player.relics.length ? player.relics.map((item) => item.name).join("、") : "無")}
  </div>`;
}

function inventoryTab() {
  const items = state.player.items;
  if (!items.length) return `<div class="empty-state">背包目前是空的。</div>`;
  return `<div class="data-list">${items.map((item) => `
    <div class="data-row"><div><strong>${item.icon} ${escapeHtml(item.label)} x${item.quantity}</strong><small>${escapeHtml(item.description)}</small></div>
    <button type="button" data-action="use_item" data-id="${item.id}">使用</button></div>`).join("")}</div>`;
}

function shopTab() {
  return `<div class="data-list">${state.config.shop.map((item) => {
    const quantity = state.quantities[item.id] ?? 1;
    return `<div class="data-row"><div><strong>${item.icon} ${escapeHtml(item.label)} · ${item.cost * quantity} 金</strong><small>${escapeHtml(item.description)}</small></div>
      <div class="quantity-control"><button type="button" data-quantity="-1" data-id="${item.id}">−</button><span>${quantity}</span><button type="button" data-quantity="1" data-id="${item.id}">+</button><button type="button" data-action="buy_item" data-id="${item.id}">購買</button></div></div>`;
  }).join("")}</div>`;
}

function equipmentTab() {
  const player = state.player;
  const effects = player.weapon?.effects?.length ? player.weapon.effects.join("、") : "無附加效果";
  const bag = player.equipmentBag.length
    ? player.equipmentBag.map((item, index) => `<div class="data-row"><div><strong>${escapeHtml(item.qualityLabel ?? "普通")} ${escapeHtml(item.name)}</strong><small>${gearStats(item)}</small></div><button type="button" data-action="equip_gear" data-index="${index}">裝備</button></div>`).join("")
    : `<div class="empty-state">裝備庫目前沒有備用品。</div>`;
  const ships = state.config.ships.map((ship) => {
    const owned = player.ships.some((item) => item.type === ship.id);
    const active = player.activeShip === ship.id;
    return `<div class="data-row"><div><strong>${ship.icon} ${escapeHtml(ship.name)}</strong><small>安全 ${Math.round(ship.safety * 100)}% · 收益 x${ship.reward}${owned ? " · 已擁有" : ` · ${ship.cost} 金`}</small></div><button type="button" data-action="ship" data-id="${ship.id}" ${active ? "disabled" : ""}>${active ? "使用中" : owned ? "切換" : "購買"}</button></div>`;
  }).join("");
  return `${player.weaponImage ? `<div class="weapon-preview"><img src="${player.weaponImage}" alt="武器"><div><strong>${escapeHtml(player.weapon?.qualityLabel ?? "普通")} ${escapeHtml(player.weapon?.name ?? "無武器")}</strong><small>攻擊 +${player.weapon?.attack ?? 0} · ${escapeHtml(effects)}</small></div></div>` : ""}
    <div class="data-list">${dataRow("防具", gearName(player.equipment.armor))}${dataRow("飾品", gearName(player.equipment.accessory))}${dataRow("釣竿", gearName(player.equipment.rod))}</div>
    <div class="tag-list"><span class="tag">裝備庫 ${player.equipmentBag.length}</span><span class="tag">船塢 ${player.ships.length}/${player.dockCapacity}</span></div>
    ${bag}<div class="data-list">${ships}</div>`;
}

function renderActions() {
  const player = state.player;
  if (!player) {
    elements.actionBar.innerHTML = "";
    return;
  }
  let actions;
  if (!player.alive || player.completed) {
    actions = [{ label: "建立新遠征", detail: player.completed ? "已完成五十層" : "角色已倒下", ui: "new" }];
  } else if (player.hiddenRoom) {
    actions = [
      { action: "enter_hidden", label: "進入房間", detail: "高風險高報酬", primary: true },
      { action: "leave_hidden", label: "離開", detail: "前往下一層" }
    ];
  } else if (player.combat) {
    actions = [
      { action: "attack", label: "攻擊", detail: "造成武器傷害", primary: true },
      { action: "defend", label: "防禦", detail: "可能完美格擋", style: "defend" },
      { label: "背包", detail: "使用戰鬥道具", tab: "inventory" }
    ];
  } else {
    actions = [
      { action: "explore", label: "探索", detail: "推進目前樓層", primary: true },
      { action: "rest", label: "休息", detail: "消耗 3 金幣" },
      { action: "fish", label: "釣魚", detail: "每層一次" },
      { action: "voyage", label: "出航", detail: "每層一次" },
      { label: "商店", detail: "補給與永久強化", tab: "shop" },
      { label: "背包", detail: "查看持有道具", tab: "inventory" }
    ];
  }
  elements.actionBar.innerHTML = actions.map((item) => `
    <button type="button" class="action-button ${item.primary ? "primary" : ""} ${item.style ?? ""}" ${state.busy ? "disabled" : ""}
      ${item.action ? `data-action="${item.action}"` : ""} ${item.tab ? `data-ui-tab="${item.tab}"` : ""} ${item.ui === "new" ? "data-new-run=\"true\"" : ""}>
      ${escapeHtml(item.label)}<small>${escapeHtml(item.detail)}</small>
    </button>`).join("");
  const newButton = elements.actionBar.querySelector("[data-new-run]");
  if (newButton) newButton.addEventListener("click", () => elements.newRun.click(), { once: true });
}

function setBusy(value) {
  state.busy = value;
  document.querySelectorAll("button").forEach((button) => { button.disabled = value; });
  if (!value && state.player) {
    renderTabs();
    renderActions();
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.setTimeout(() => elements.toast.classList.add("hidden"), 3200);
}

function conditionText(player) {
  if (player.completed) return "遠征完成";
  if (!player.alive) return "已倒下";
  if (player.combat) return `與 ${player.combat.name} 交戰中`;
  if (player.hp / player.maxHp <= .25) return "生命危急";
  if (player.hp / player.maxHp <= .5) return "負傷";
  return "狀態穩定";
}

function dataRow(label, value) {
  return `<div class="data-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value ?? "無"))}</span></div>`;
}

function gearName(gear) {
  if (!gear) return "無";
  return `${gear.qualityLabel ?? "普通"} ${gear.name} · ${gearStats(gear)}`;
}

function gearStats(gear) {
  const stats = [];
  if (gear.attack) stats.push(`攻擊 +${gear.attack}`);
  if (gear.defense) stats.push(`防禦 +${gear.defense}`);
  if (gear.fishing) stats.push(`釣魚 +${gear.fishing}`);
  return stats.join(" · ") || "無能力加成";
}

function percentage(value, max) {
  return Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
