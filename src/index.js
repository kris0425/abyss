require("dotenv").config();

const { Client, Events, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");
const path = require("node:path");
const {
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
  rest,
  selectOrBuyShip,
  setPlayer,
  shopText,
  statusText,
  useItem,
  voyage
} = require("./game");
const { actionButtons, buffMenu, classMenu, combatButtons, dockButton, equipmentMenu, gameEmbed, gameFiles, helpMenu, hiddenRoomButtons, inventoryMenu, mapMenu, shipMenu, shopMenu, shopQuantityMenu } = require("./components");
const { startDashboard } = require("./dashboard");
const { handleWorldBossButton, showWorldBoss, startWorldBossSystem } = require("./world-boss");

const token = process.env.DISCORD_TOKEN;
const dashboardPort = process.env.DASHBOARD_PORT || 3000;
const gameplayGuideFile = {
  attachment: path.join(__dirname, "..", "assets", "tutorial", "gameplay-guide.png"),
  name: "gameplay-guide.png"
};

const HELP_TOPICS = {
  overview: {
    title: "快速開始",
    text: [
      "1. 使用 `/start` 選擇職業、開局祝福與地圖。",
      "2. 按「探索」推進樓層，遇敵後選擇攻擊、防禦或使用道具。",
      "3. 善用休息、商店、裝備、釣魚與出航強化角色。",
      "4. 擊敗第 50 層地城守門人即可通關並登上排行榜。"
    ].join("\n")
  },
  adventure: {
    title: "探索與地圖",
    text: [
      "🚪 每次探索可能遇到敵人、寶箱、神龕、精英怪、Boss 或隱藏房間。",
      "🏰 地下城是經典冒險；夜城敵人會使用駭入、致盲、暈眩與麻痺。",
      "🍲 休息固定消耗 3 金幣並回復生命。",
      "🚩 冒險最高 50 層，死亡後需要使用 `/start` 重新開始。"
    ].join("\n")
  },
  combat: {
    title: "戰鬥系統",
    text: [
      "⚔️ 攻擊：依角色攻擊力與武器造成傷害。",
      "🛡️ 防禦：降低本回合傷害，並可能完美格擋後反擊。",
      "🎒 背包：戰鬥中可使用藥水、炸彈或煙霧彈。",
      "☠️ 中毒、流血與燒傷會持續扣血；暈眩與麻痺會使玩家一回合無法行動。"
    ].join("\n")
  },
  classes: {
    title: "職業與祝福",
    text: [
      "🗡️ 刀客：能力平均，適合第一次遊玩。",
      "🔮 咒術師：攻擊高，但生命與防禦較低。",
      "🍀 賭命賊：幸運較高，攻擊可能直接秒殺敵人，也有極低機率被秒殺。",
      "🏹 遊俠：初始攻擊較高，能閃避並發動強力反擊。",
      "🎁 開局可選擇攻擊、生命或幸運祝福。"
    ].join("\n")
  },
  equipment: {
    title: "裝備與商店",
    text: [
      "🗡️ 武器品質分為普通、稀有、史詩與傳奇；史詩以上會附加特殊效果。",
      "🧰 防具、飾品與釣竿可以在裝備庫中切換。",
      "🛒 商店可購買補血、戰鬥、永久強化道具與遺物。",
      "📦 擊敗敵人、釣魚與出航都有機會取得裝備。"
    ].join("\n")
  },
  sea: {
    title: "釣魚與出航",
    text: [
      "🎣 每層可釣魚一次，消耗 1 個魚餌；魚的稀有度會影響金幣與增益。",
      "⚓ 船塢可停放並切換獨木舟、竹筏與普通帆船。",
      "🌊 每層可出航一次，可能找到島嶼、魚群、補給箱，也可能遇到風暴。",
      "⛵ 越高級的船越安全，帶回的獎勵也越多。"
    ].join("\n")
  },
  boss: {
    title: "Boss、事件與通關",
    text: [
      "👑 第 8 層首次遇到 Boss，之後每 5 層再次遭遇。",
      "🚪 第 5 層後可能發現隱藏房間，裡面可能有隱藏 Boss 或即死陷阱。",
      "🛡️ 第 50 層固定迎戰地城守門人，擊敗後完成冒險。",
      "🐉 雷暴骨龍每天 11:00、19:00 現身，可直接從公告或冒險面板加入，不需要指令。",
      "🏆 使用 `/leaderboard` 查看最高樓層、擊殺數與通關紀錄。"
    ].join("\n")
  }
};

if (!token) {
  throw new Error("缺少 DISCORD_TOKEN，請複製 .env.example 成 .env 後填入。");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startDashboard(readyClient);
  startWorldBossSystem(readyClient, { getPlayer, setPlayer });
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "class_select") {
      await handleClassSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("buff_select:")) {
      await handleBuffSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("map_select:")) {
      await handleMapSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("shop_quantity:")) {
      await handleShopQuantity(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("shop_select:")) {
      await handleShopSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("item_select:")) {
      await handleItemSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("equipment_select:")) {
      await handleEquipmentSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("ship_select:")) {
      await handleShipSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("help_select:")) {
      await handleHelpSelect(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("wb:")) {
      await handleWorldBossButton(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (error) {
    console.error(error);
    const message = {
      content: "機器人腦袋打結了，請稍後再試。",
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(message);
    } else {
      await interaction.reply(message);
    }
  }
});

async function handleCommand(interaction) {
  if (interaction.commandName === "start") {
    const isFirstStart = !getPlayer(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({
      content: isFirstStart
        ? "第一次冒險先看這張玩法速查，再選職業。下一步會選開局祝福。"
        : "先選職業，下一步選一個開局祝福。每個人都有自己的存檔。",
      files: isFirstStart ? [gameplayGuideFile] : [],
      components: [classMenu()]
    });
    return;
  }

  if (interaction.commandName === "status") {
    const player = getPlayer(interaction.user.id);
    await interaction.reply({
      embeds: [gameEmbed("冒險狀態", statusText(player), player)],
      files: gameFiles(player),
      components: controlsFor(player, interaction.user.id),
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "items") {
    const player = getPlayer(interaction.user.id);
    await interaction.reply({
      embeds: [gameEmbed("背包", inventoryText(player), player)],
      files: gameFiles(player),
      components: player?.alive ? [inventoryMenu(player, interaction.user.id)] : [],
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "leaderboard") {
    await interaction.reply({
      embeds: [gameEmbed("排行榜", leaderboardText(), null)]
    });
    return;
  }

  if (interaction.commandName === "worldboss") {
    await showWorldBoss(interaction);
    return;
  }

  if (interaction.commandName === "shop") {
    const player = getPlayer(interaction.user.id);
    if (player?.combat) {
      await interaction.reply({ content: "戰鬥中不能逛商店，先攻擊或防禦。", ephemeral: true });
      return;
    }
    await interaction.reply({
      embeds: [gameEmbed("商店", shopText(player), player)],
      files: gameFiles(player),
      components: player?.alive ? [shopMenu(interaction.user.id)] : [],
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "help") {
    const topic = HELP_TOPICS.overview;
    await interaction.reply({
      embeds: [gameEmbed(topic.title, topic.text, null)],
      components: [helpMenu(interaction.user.id, "overview")],
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "dashboard") {
    await interaction.reply({
      content: `圖形化介面：http://localhost:${dashboardPort}`,
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === "adminfloor") {
    await handleAdminFloor(interaction);
  }
}

async function handleAdminFloor(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "這個指令只有管理員可以使用。", ephemeral: true });
    return;
  }

  const floor = interaction.options.getInteger("floor", true);
  const targetUser = interaction.options.getUser("player") ?? interaction.user;
  const player = getPlayer(targetUser.id);

  if (!player) {
    await interaction.reply({ content: `${targetUser} 還沒有冒險存檔，請先用 /start 開局。`, ephemeral: true });
    return;
  }

  player.floor = floor;
  player.alive = true;
  player.completed = false;
  player.hp = Math.max(1, Math.min(player.hp ?? player.maxHp, player.maxHp));
  delete player.combat;
  delete player.hiddenRoom;
  delete player.sceneImageFile;
  delete player.sceneImageUrl;
  delete player.sceneImageFolder;
  delete player.debuffs;
  setPlayer(player);

  const text = `🛠️ 管理員模式：已將 ${targetUser} 跳到第 ${floor} 層。`;
  await interaction.reply({ content: text, ephemeral: true });

  if (player.panelChannelId && player.panelMessageId) {
    await updateGamePanel(interaction, { title: "管理員跳層", text }, player);
  }
}

async function handleClassSelect(interaction) {
  const classKey = interaction.values[0];
  await interaction.update({
    content: "選一個開局祝福：攻擊、血量或幸運。",
    embeds: [],
    components: [buffMenu(classKey)]
  });
}

async function handleBuffSelect(interaction) {
  const [, classKey] = interaction.customId.split(":");
  const buffKey = interaction.values[0];
  await interaction.update({
    content: "選擇冒險地圖：經典地下城或霓虹夜城。",
    embeds: [],
    components: [mapMenu(classKey, buffKey)]
  });
}

async function handleMapSelect(interaction) {
  const [, classKey, buffKey] = interaction.customId.split(":");
  const mapKey = interaction.values[0];
  const player = createPlayer(interaction.user.id, classKey, buffKey, mapKey);
  setPlayer(player);
  await interaction.update({ content: "已開始冒險，公開面板已發到頻道。", embeds: [], components: [] });
  const panelMessage = await interaction.channel.send({
    content: `<@${interaction.user.id}> 開始了一場新的冒險。`,
    embeds: [gameEmbed("新冒險開始", statusText(player), player)],
    files: gameFiles(player),
    components: controlsFor(player, interaction.user.id)
  });
  player.panelChannelId = panelMessage.channel.id;
  player.panelMessageId = panelMessage.id;
  player.panelImageFile = currentImageFile(player);
  setPlayer(player);
}

async function handleButton(interaction) {
  const [action, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這是別人的冒險按鈕，請用 `/start` 開自己的局。", ephemeral: true });
    return;
  }

  const player = getPlayer(interaction.user.id);
  if (action === "status") {
    await interaction.reply({
      embeds: [gameEmbed("冒險狀態", statusText(player), player)],
      files: gameFiles(player),
      components: controlsFor(player, interaction.user.id),
      ephemeral: true
    });
    return;
  }

  if (action === "dock") {
    await interaction.reply({
      embeds: [gameEmbed("玩家船塢", dockText(player), player)],
      components: player?.alive ? [shipMenu(player, interaction.user.id)] : [],
      ephemeral: true
    });
    return;
  }

  if (action === "equipment") {
    const preview = equipmentPreview(player);
    await interaction.reply({
      embeds: [gameEmbed("裝備系統", equipmentText(player), preview)],
      components: [equipmentMenu(player, interaction.user.id)],
      files: gameFiles(preview),
      ephemeral: true
    });
    return;
  }

  if (!player?.alive) {
    await interaction.reply({ content: "你目前沒有活著的冒險。用 `/start` 再開一局。", ephemeral: true });
    return;
  }

  if (action === "explore") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = explore(player);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "fish") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = fish(player);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "voyage") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = voyage(player);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "attack" || action === "defend") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = combatTurn(player, action);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "hidden_enter" || action === "hidden_leave") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = action === "hidden_enter" ? enterHiddenRoom(player) : leaveHiddenRoom(player);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "rest") {
    await interaction.deferUpdate();
    player.panelChannelId = interaction.channelId;
    player.panelMessageId = interaction.message.id;
    setPlayer(player);
    const result = rest(player);
    const updated = getPlayer(interaction.user.id);
    await interaction.message.edit(panelEditOptions(result, updated, interaction.user.id));
    return;
  }

  if (action === "inventory") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({
      embeds: [gameEmbed("背包", inventoryText(player), null)],
      components: [inventoryMenu(player, interaction.user.id)]
    });
    return;
  }

  if (action === "shop") {
    if (player.combat) {
      await interaction.reply({ content: "戰鬥中不能逛商店。", ephemeral: true });
      return;
    }
    await interaction.reply({
      embeds: [gameEmbed("商店", shopText(player), player)],
      files: gameFiles(player),
      components: [shopMenu(interaction.user.id)],
      ephemeral: true
    });
    return;
  }

  if (action === "retire") {
    deletePlayer(interaction.user.id);
    await interaction.reply({ content: "🏳️ 你撤退了。想重來可以用 `/start`。", ephemeral: true });
  }
}

async function handleShopSelect(interaction) {
  const [, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的商店選單。", ephemeral: true });
    return;
  }
  const itemId = interaction.values[0];
  const item = require("./game").SHOP_ITEMS[itemId];
  await interaction.update({
    content: `${item.icon} ${item.label}｜單價 ${item.cost} 金幣｜請選擇數量。`,
    embeds: [],
    components: [shopQuantityMenu(itemId, interaction.user.id)]
  });
}

async function handleHelpSelect(interaction) {
  const [, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的玩法選單。", ephemeral: true });
    return;
  }
  const topicId = interaction.values[0];
  const topic = HELP_TOPICS[topicId] ?? HELP_TOPICS.overview;
  await interaction.update({
    embeds: [gameEmbed(topic.title, topic.text, null)],
    components: [helpMenu(interaction.user.id, topicId)]
  });
}

async function handleShopQuantity(interaction) {
  const [, ownerId = "global", itemId] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的商店選單。", ephemeral: true });
    return;
  }
  await interaction.deferUpdate();
  const player = getPlayer(interaction.user.id);
  const quantity = Number.parseInt(interaction.values[0], 10);
  const result = buyShopItem(player, itemId, quantity);
  const updated = getPlayer(interaction.user.id);
  await interaction.editReply({
    content: "",
    embeds: [gameEmbed(result.title, result.text, updated)],
    files: gameFiles(updated),
    components: updated?.alive ? [shopMenu(interaction.user.id)] : []
  });
}

async function handleItemSelect(interaction) {
  const [, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的背包選單。", ephemeral: true });
    return;
  }
  if (interaction.values[0] === "empty") {
    await interaction.update({ content: "背包是空的。", embeds: [], components: [] });
    return;
  }
  await interaction.deferUpdate();
  const player = getPlayer(interaction.user.id);
  const result = useItem(player, interaction.values[0]);
  const updated = getPlayer(interaction.user.id);
  await interaction.editReply({
    embeds: [gameEmbed(result.title, result.text, null)],
    components: updated?.alive ? [inventoryMenu(updated, interaction.user.id)] : []
  });
  await updateGamePanel(interaction, result, updated);
}

async function handleEquipmentSelect(interaction) {
  const [, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的裝備庫。", ephemeral: true });
    return;
  }
  if (interaction.values[0] === "empty") {
    await interaction.update({ content: "裝備庫目前是空的。", embeds: [], components: [] });
    return;
  }
  await interaction.deferUpdate();
  const player = getPlayer(interaction.user.id);
  const result = equipStoredGear(player, Number.parseInt(interaction.values[0], 10));
  const updated = getPlayer(interaction.user.id);
  const preview = equipmentPreview(updated);
  await interaction.editReply({
    embeds: [gameEmbed(result.title, `${result.text}\n\n${equipmentText(updated)}`, preview)],
    components: [equipmentMenu(updated, interaction.user.id)],
    attachments: [],
    files: gameFiles(preview)
  });
  await updateGamePanel(interaction, result, updated);
}

async function handleShipSelect(interaction) {
  const [, ownerId = "global"] = interaction.customId.split(":");
  if (ownerId !== "global" && ownerId !== interaction.user.id) {
    await interaction.reply({ content: "這不是你的船塢。", ephemeral: true });
    return;
  }
  await interaction.deferUpdate();
  const player = getPlayer(interaction.user.id);
  const result = selectOrBuyShip(player, interaction.values[0]);
  const updated = getPlayer(interaction.user.id);
  await interaction.editReply({
    embeds: [gameEmbed(result.title, `${result.text}\n\n${dockText(updated)}`, updated)],
    components: updated?.alive ? [shipMenu(updated, interaction.user.id)] : []
  });
  await updateGamePanel(interaction, result, updated);
}

async function updateGamePanel(interaction, result, player) {
  if (!player?.panelChannelId || !player?.panelMessageId) return false;
  const channel = await client.channels.fetch(player.panelChannelId).catch(() => null);
  if (!channel?.messages) return false;
  const message = await channel.messages.fetch(player.panelMessageId).catch(() => null);
  if (!message) return false;
  await message.edit(panelEditOptions(result, player, interaction.user.id));
  return true;
}

function currentImageFile(player) {
  return gameFiles(player).map((file) => file.name).join("|") || null;
}

function equipmentPreview(player) {
  const imageUrl = player?.equipment?.rod?.imageUrl;
  if (!imageUrl) return player;
  return {
    ...player,
    sceneImageFile: undefined,
    sceneImageUrl: imageUrl,
    sceneImageFolder: undefined
  };
}

function panelEditOptions(result, player, ownerId) {
  const options = {
    embeds: [gameEmbed(result.title, result.text, player)],
    components: controlsFor(player, ownerId)
  };

  const imageFile = currentImageFile(player);
  if (player && player.panelImageFile !== imageFile) {
    player.panelImageFile = imageFile;
    setPlayer(player);
    options.attachments = [];
    options.files = gameFiles(player);
  }

  return options;
}

function controlsFor(player, ownerId) {
  if (!player?.alive) return [];
  if (player.combat) return [combatButtons(false, ownerId)];
  if (player.hiddenRoom) return [hiddenRoomButtons(false, ownerId)];
  return [actionButtons(false, ownerId), dockButton(false, ownerId)];
}

client.login(token);
