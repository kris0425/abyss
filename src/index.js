require("dotenv").config();

const { Client, Events, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");
const path = require("node:path");
const {
  buyShopItem,
  combatTurn,
  createPlayer,
  deletePlayer,
  dockText,
  enterHiddenRoom,
  explore,
  getPlayer,
  inventoryText,
  leaveHiddenRoom,
  leaderboardText,
  rest,
  setPlayer,
  shopText,
  statusText,
  useItem
} = require("./game");
const { actionButtons, buffMenu, classMenu, combatButtons, dockButton, gameEmbed, gameFiles, hiddenRoomButtons, inventoryMenu, mapMenu, shopMenu, shopQuantityMenu } = require("./components");
const { startDashboard } = require("./dashboard");

const token = process.env.DISCORD_TOKEN;
const dashboardPort = process.env.DASHBOARD_PORT || 3000;
const gameplayGuideFile = {
  attachment: path.join(__dirname, "..", "assets", "tutorial", "gameplay-guide.png"),
  name: "gameplay-guide.png"
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
    await interaction.reply({
      embeds: [
        gameEmbed(
          "玩法",
          [
            "使用 `/start` 選職業開局，冒險面板會公開在頻道。",
            "開局可選攻擊、血量或幸運祝福，並會獲得職業初始武器。",
            "探索時會遇敵、寶箱、神龕或 Boss。遇敵時可攻擊、防禦或使用道具。",
            "擊敗敵人有機率掉落普通、稀有、史詩、傳奇武器。史詩以上有附加效果。",
            "每 5 層會遇到 Boss，擊敗 hAO 可獲得女僕照遺物。",
            "休息固定消耗 3 金幣。"
          ].join("\n")
        )
      ],
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
  return gameFiles(player)[0]?.name ?? null;
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
