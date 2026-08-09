const fs = require("node:fs");
const path = require("node:path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const STATE_PATH = path.join(__dirname, "..", "data", "world-boss.json");
const IMAGE_PATH = path.join(__dirname, "..", "assets", "world-boss", "thunder-bone-dragon.jpeg");
const INTRO_PATH = path.join(__dirname, "..", "assets", "world-boss", "thunder-bone-dragon-intro.mp4");
const IDLE_PATH = path.join(__dirname, "..", "assets", "world-boss", "thunder-bone-dragon-idle.gif");
const IMAGE_NAME = "thunder-bone-dragon.jpeg";
const INTRO_NAME = "thunder-bone-dragon-intro.mp4";
const IDLE_NAME = "thunder-bone-dragon-idle.gif";
const TIME_ZONE = "Asia/Taipei";
const SPAWN_HOURS = [11, 19];
const DEFAULT_ANNOUNCEMENT_CHANNEL_ID = "978165305589239870";
const EVENT_DURATION_MS = 60 * 60 * 1000;
const ANNOUNCEMENT_RETRY_MS = 60 * 1000;
const INTRO_DURATION_MS = 12 * 1000;
const TEAM_BASE_HP = 800;
const TEAM_MEMBER_HP = 180;
const SOLO_BOSS_HP = 360;

let state = loadState();
let runtime = null;
let lastAnnouncementAttemptAt = 0;

function defaultState() {
  return {
    lastSpawnKey: null,
    spawnKey: null,
    status: "idle",
    activeUntil: 0,
    channelId: null,
    messageId: null,
    team: null,
    solos: {}
  };
}

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) };
  } catch {
    return defaultState();
  }
}

function saveState() {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const temporaryPath = `${STATE_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(temporaryPath, STATE_PATH);
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function playerAttack(player) {
  const equipmentAttack = Object.values(player?.equipment ?? {})
    .reduce((sum, gear) => sum + (gear?.attack ?? 0), 0);
  return Math.max(5, (player?.atk ?? 5) + (player?.weapon?.attack ?? 0) + equipmentAttack);
}

function playerDefense(player) {
  const equipmentDefense = Object.values(player?.equipment ?? {})
    .reduce((sum, gear) => sum + (gear?.defense ?? 0), 0);
  return Math.max(0, (player?.def ?? 0) + equipmentDefense);
}

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function currentSpawnSlot(date = new Date()) {
  const parts = zonedParts(date);
  const hour = Number(parts.hour);
  if (!SPAWN_HOURS.includes(hour)) return null;
  return {
    key: `${parts.year}-${parts.month}-${parts.day}-${String(hour).padStart(2, "0")}`,
    hour,
    minute: Number(parts.minute)
  };
}

function eventIsActive() {
  if (state.status !== "active") return false;
  if (Date.now() < state.activeUntil) return true;
  state.status = "expired";
  saveState();
  return false;
}

function createEvent(slot, channelId = null) {
  const remainingMinutes = Math.max(1, 60 - slot.minute);
  state = {
    ...defaultState(),
    lastSpawnKey: slot.key,
    spawnKey: slot.key,
    status: "active",
    activeUntil: Date.now() + Math.min(EVENT_DURATION_MS, remainingMinutes * 60 * 1000),
    channelId,
    team: {
      hp: TEAM_BASE_HP,
      maxHp: TEAM_BASE_HP,
      members: {},
      defeated: false,
      rewarded: false
    },
    solos: {}
  };
  saveState();
}

function eventButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wb:team_join:${state.spawnKey}`)
      .setLabel("加入討伐隊")
      .setEmoji("🤝")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wb:team_attack:${state.spawnKey}`)
      .setLabel("團隊攻擊")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wb:solo_start:${state.spawnKey}`)
      .setLabel("獨自挑戰")
      .setEmoji("🗡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wb:status:${state.spawnKey}`)
      .setLabel("查看戰況")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
  );
}

function soloButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wb:solo_attack:${state.spawnKey}`)
      .setLabel("攻擊雷暴骨龍")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`wb:status:${state.spawnKey}`)
      .setLabel("世界戰況")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
  );
}

function bossEmbed(title, description, color = 0x7c3aed, includeImage = true) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🐉 ${title}`)
    .setDescription(description)
    .setFooter({ text: "世界 Boss｜每天 11:00、19:00（UTC+8）現身" })
    .setTimestamp();
  if (includeImage) embed.setImage(`attachment://${IMAGE_NAME}`);
  return embed;
}

function teamStatusText() {
  const team = state.team;
  if (!team) return "目前沒有團隊討伐資料。";
  const members = Object.entries(team.members ?? {});
  const ranking = members
    .sort(([, a], [, b]) => (b.damage ?? 0) - (a.damage ?? 0))
    .slice(0, 10)
    .map(([id, member], index) =>
      `${index + 1}. <@${id}>｜傷害 ${member.damage ?? 0}｜HP ${Math.max(0, member.hp)}/${member.maxHp}`
    );
  return [
    `**雷暴骨龍 HP：${Math.max(0, team.hp)}/${team.maxHp}**`,
    `討伐人數：${members.length}`,
    ranking.length ? `\n**傷害排名**\n${ranking.join("\n")}` : "\n尚未有玩家加入討伐。"
  ].join("\n");
}

function bossFiles({ includeIntro = false, includeIdle = false } = {}) {
  const files = [];
  if (includeIdle) files.unshift({ attachment: IDLE_PATH, name: IDLE_NAME });
  if (includeIntro) files.unshift({ attachment: INTRO_PATH, name: INTRO_NAME });
  if (!includeIntro && !includeIdle) files.push({ attachment: IMAGE_PATH, name: IMAGE_NAME });
  return files;
}

function announcementPayload({ includeIntro = false, includeIdle = false } = {}) {
  const active = eventIsActive();
  const description = active
    ? [
        "雷雲撕裂天空，遠古骨龍降臨世界。",
        "選擇加入討伐隊共享血量，或建立單人挑戰副本。",
        "",
        teamStatusText(),
        "",
        `活動結束：<t:${Math.floor(state.activeUntil / 1000)}:R>`
      ].join("\n")
    : "本次世界 Boss 活動已經結束。下一次將在每日 11:00 或 19:00 現身。";
  return {
    content: includeIntro ? "⚡ **世界 Boss「雷暴骨龍」現身！**" : undefined,
    embeds: [bossEmbed(
      active ? "雷暴骨龍現身" : "世界 Boss 已離去",
      description,
      active ? 0x7c3aed : 0x475569,
      !includeIntro && !includeIdle
    )],
    components: [eventButtons(!active || state.team?.defeated)],
    files: bossFiles({ includeIntro, includeIdle })
  };
}

function scheduleIdleVideo(client, channelId, messageId) {
  const timer = setTimeout(async () => {
    if (!eventIsActive()) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    const message = await channel?.messages?.fetch(messageId).catch(() => null);
    if (!message) return;
    const payload = announcementPayload({ includeIdle: true });
    await message.edit({ ...payload, attachments: [] }).catch((error) => {
      console.error("World boss idle video update failed; keeping the intro attachment.", error);
    });
  }, INTRO_DURATION_MS);
  timer.unref?.();
}

async function chooseAnnouncementChannel(client) {
  const requiredPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles
  ];
  const canAnnounce = (channel) => {
    if (!channel?.isTextBased?.() || typeof channel.send !== "function") return false;
    const permissions = channel.permissionsFor?.(client.user);
    return !permissions || permissions.has(requiredPermissions);
  };
  const preferredIds = [
    process.env.WORLD_BOSS_CHANNEL_ID,
    DEFAULT_ANNOUNCEMENT_CHANNEL_ID,
    state.channelId
  ].filter(Boolean);

  for (const channelId of [...new Set(preferredIds)]) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (canAnnounce(channel)) return channel;
  }

  for (const guild of client.guilds.cache.values()) {
    const lobby = guild.channels.cache.find((channel) =>
      channel?.name?.includes("自由大廳") && canAnnounce(channel)
    );
    if (lobby) return lobby;
    if (canAnnounce(guild.systemChannel)) return guild.systemChannel;
    const fallback = guild.channels.cache.find(canAnnounce);
    if (fallback) return fallback;
  }
  return null;
}

async function announceEvent(client) {
  const channel = await chooseAnnouncementChannel(client);
  if (!channel) {
    console.warn("World boss spawned, but no announcement channel was available.");
    return false;
  }
  try {
    const message = await channel.send(announcementPayload({ includeIntro: true }));
    state.channelId = channel.id;
    state.messageId = message.id;
    saveState();
    scheduleIdleVideo(client, channel.id, message.id);
    console.log(`World boss announced in #${channel.name ?? channel.id} (${channel.id}).`);
    return true;
  } catch (error) {
    console.error("World boss intro upload failed, retrying with the idle video.", error);
    try {
      const fallback = announcementPayload({ includeIdle: true });
      const message = await channel.send(fallback);
      state.channelId = channel.id;
      state.messageId = message.id;
      saveState();
      console.log(`World boss announced without video in #${channel.name ?? channel.id} (${channel.id}).`);
      return true;
    } catch (fallbackError) {
      console.error(`World boss announcement failed in channel ${channel.id}; it will retry.`, fallbackError);
      return false;
    }
  }
}

async function refreshAnnouncement(client) {
  if (!state.channelId || !state.messageId) return;
  const channel = await client.channels.fetch(state.channelId).catch(() => null);
  if (!channel?.messages) return;
  const message = await channel.messages.fetch(state.messageId).catch(() => null);
  if (!message) return;
  const payload = announcementPayload({ includeIdle: true });
  delete payload.files;
  await message.edit(payload).catch((error) => console.error("World boss message update failed.", error));
}

function joinTeam(userId, player) {
  const team = state.team;
  let member = team.members[userId];
  if (member) return member;
  const maxHp = Math.max(60, (player.maxHp ?? 30) * 2);
  const existingCount = Object.keys(team.members).length;
  if (existingCount > 0) {
    team.maxHp += TEAM_MEMBER_HP;
    team.hp += TEAM_MEMBER_HP;
  }
  member = {
    hp: maxHp,
    maxHp,
    damage: 0,
    joinedAt: Date.now(),
    lastAttackAt: 0,
    downUntil: 0
  };
  team.members[userId] = member;
  saveState();
  return member;
}

function rewardPlayer(player, mode) {
  player.items ??= {};
  if (mode === "solo") {
    player.gold = (player.gold ?? 0) + 180;
    player.luck = (player.luck ?? 0) + 2;
    player.items.bait = (player.items.bait ?? 0) + 5;
    return "獲得 180 金幣、魚餌 x5、永久幸運 +2。";
  }
  player.gold = (player.gold ?? 0) + 100;
  player.luck = (player.luck ?? 0) + 1;
  player.items.bait = (player.items.bait ?? 0) + 3;
  return "獲得 100 金幣、魚餌 x3、永久幸運 +1。";
}

function teamAttack(userId, player) {
  const team = state.team;
  const member = team.members[userId];
  if (!member) return { error: "你尚未加入討伐隊，請先按「加入討伐隊」。" };
  if (team.defeated) return { error: "雷暴骨龍已被討伐隊擊敗。" };
  const now = Date.now();
  if (member.downUntil > now) {
    return { error: `你受到重創，<t:${Math.floor(member.downUntil / 1000)}:R>才能重新行動。` };
  }
  if (member.downUntil && member.downUntil <= now) {
    member.hp = Math.max(1, Math.ceil(member.maxHp / 2));
    member.downUntil = 0;
  }
  if (now - member.lastAttackAt < 2500) return { error: "攻擊準備中，請稍等幾秒。" };
  member.lastAttackAt = now;

  const critical = Math.random() < 0.12;
  const damage = Math.max(5, playerAttack(player) + randomBetween(-2, 6)) * (critical ? 2 : 1);
  team.hp = Math.max(0, team.hp - damage);
  member.damage += damage;
  const lines = [`⚔️ 你對雷暴骨龍造成 **${damage}** 點傷害${critical ? "（爆擊）" : ""}。`];

  if (team.hp <= 0) {
    team.defeated = true;
    state.status = "defeated";
    for (const memberId of Object.keys(team.members)) {
      const rewardedPlayer = runtime.getPlayer(memberId);
      if (!rewardedPlayer) continue;
      rewardPlayer(rewardedPlayer, "team");
      runtime.setPlayer(rewardedPlayer);
    }
    team.rewarded = true;
    lines.push("🏆 討伐隊成功擊敗雷暴骨龍！所有成員都已取得團隊獎勵。");
  } else {
    const counter = Math.max(1, randomBetween(11, 21) - playerDefense(player));
    member.hp = Math.max(0, member.hp - counter);
    lines.push(`🔥 雷暴骨龍噴出雷焰反擊，你受到 **${counter}** 點傷害。`);
    if (member.hp <= 0) {
      member.downUntil = Date.now() + 60 * 1000;
      lines.push("💀 你受到重創，60 秒後會以一半生命重返戰場。");
    }
  }
  saveState();
  return { lines, damage, member };
}

function getOrCreateSolo(userId, player) {
  let solo = state.solos[userId];
  if (!solo) {
    const maxHp = Math.max(100, (player.maxHp ?? 30) * 3);
    solo = {
      hp: maxHp,
      maxHp,
      bossHp: SOLO_BOSS_HP,
      bossMaxHp: SOLO_BOSS_HP,
      damage: 0,
      defeated: false,
      rewarded: false,
      lastAttackAt: 0
    };
    state.solos[userId] = solo;
    saveState();
  }
  return solo;
}

function soloStatusText(solo) {
  return [
    `雷暴骨龍 HP：${Math.max(0, solo.bossHp)}/${solo.bossMaxHp}`,
    `你的挑戰 HP：${Math.max(0, solo.hp)}/${solo.maxHp}`,
    `累計傷害：${solo.damage}`
  ].join("\n");
}

function soloAttack(userId, player) {
  const solo = getOrCreateSolo(userId, player);
  if (solo.defeated) return { error: "你已經完成本次單人討伐。" };
  if (solo.hp <= 0) return { error: "你的單人挑戰已失敗，本次活動無法再次挑戰。" };
  const now = Date.now();
  if (now - solo.lastAttackAt < 2500) return { error: "攻擊準備中，請稍等幾秒。" };
  solo.lastAttackAt = now;

  const critical = Math.random() < 0.15;
  const damage = Math.max(6, playerAttack(player) + randomBetween(1, 8)) * (critical ? 2 : 1);
  solo.bossHp = Math.max(0, solo.bossHp - damage);
  solo.damage += damage;
  const lines = [`🗡️ 你對雷暴骨龍造成 **${damage}** 點傷害${critical ? "（爆擊）" : ""}。`];

  if (solo.bossHp <= 0) {
    solo.defeated = true;
    if (!solo.rewarded) {
      lines.push(`🏆 你獨自擊敗雷暴骨龍！${rewardPlayer(player, "solo")}`);
      runtime.setPlayer(player);
      solo.rewarded = true;
    }
  } else {
    const counter = Math.max(2, randomBetween(13, 24) - playerDefense(player));
    solo.hp = Math.max(0, solo.hp - counter);
    lines.push(`⚡ 雷暴骨龍從高空降下雷焰，你受到 **${counter}** 點傷害。`);
    if (solo.hp <= 0) lines.push("💀 單人挑戰失敗，你仍可加入團隊討伐。");
  }
  saveState();
  return { lines, solo };
}

function unavailableText() {
  return [
    "雷暴骨龍目前尚未現身。",
    "固定出場時間：**每天 11:00 與 19:00（UTC+8）**。",
    "活動開始後持續 1 小時，可選擇團隊討伐或單人挑戰。"
  ].join("\n");
}

async function showWorldBoss(interaction) {
  if (!eventIsActive()) {
    await interaction.reply({
      embeds: [bossEmbed("世界 Boss 預告", unavailableText(), 0x475569, false)],
      files: bossFiles({ includeIdle: true }),
      ephemeral: true
    });
    return;
  }
  await interaction.reply({
    ...announcementPayload({ includeIdle: true }),
    content: undefined,
    ephemeral: true
  });
}

async function replyWithBoss(interaction, title, text, components, color = 0x7c3aed) {
  await interaction.editReply({
    embeds: [bossEmbed(title, text, color, false)],
    components,
    files: bossFiles({ includeIdle: true })
  });
}

function getOrCreateParticipant(userId) {
  const existing = runtime.getPlayer(userId);
  if (existing) return { player: existing, created: false };
  if (typeof runtime.createPlayer !== "function") return { player: null, created: false };

  const player = runtime.createPlayer(userId, "blade", "health", "dungeon");
  player.worldBossGuest = true;
  runtime.setPlayer(player);
  return { player, created: true };
}

async function handleWorldBossButton(interaction) {
  const [, action, spawnKey] = interaction.customId.split(":");
  if (action === "open") {
    await showWorldBoss(interaction);
    return;
  }
  if (spawnKey !== state.spawnKey || !eventIsActive()) {
    await interaction.reply({ content: "本次世界 Boss 活動已經結束。", ephemeral: true });
    return;
  }
  const participant = action === "status"
    ? { player: null, created: false }
    : getOrCreateParticipant(interaction.user.id);
  const player = participant.player;
  const newcomerText = participant.created
    ? "系統已為你建立基礎刀客角色；之後可使用 `/start` 重新選擇正式職業。\n\n"
    : "";
  await interaction.deferReply({ ephemeral: true });

  if (action === "team_join") {
    const existed = Boolean(state.team.members[interaction.user.id]);
    const member = joinTeam(interaction.user.id, player);
    await refreshAnnouncement(runtime.client);
    await replyWithBoss(
      interaction,
      existed ? "你已在討伐隊中" : "加入討伐隊成功",
      `${newcomerText}${teamStatusText()}\n\n你的團隊戰 HP：${member.hp}/${member.maxHp}`,
      [eventButtons(state.team.defeated)]
    );
    return;
  }

  if (action === "team_attack") {
    const result = teamAttack(interaction.user.id, player);
    await refreshAnnouncement(runtime.client);
    await replyWithBoss(
      interaction,
      result.error ? "無法攻擊" : state.team.defeated ? "團隊討伐成功" : "團隊攻擊",
      result.error ?? `${result.lines.join("\n")}\n\n${teamStatusText()}`,
      [eventButtons(state.team.defeated)],
      result.error ? 0xdc2626 : state.team.defeated ? 0xeab308 : 0x7c3aed
    );
    return;
  }

  if (action === "solo_start") {
    const solo = getOrCreateSolo(interaction.user.id, player);
    await replyWithBoss(
      interaction,
      "單人挑戰",
      `${newcomerText}你獨自踏入雷暴領域。\n\n${soloStatusText(solo)}`,
      [soloButtons(solo.defeated || solo.hp <= 0)]
    );
    return;
  }

  if (action === "solo_attack") {
    const result = soloAttack(interaction.user.id, player);
    const solo = state.solos[interaction.user.id];
    await replyWithBoss(
      interaction,
      result.error ? "無法攻擊" : solo.defeated ? "單人討伐成功" : solo.hp <= 0 ? "單人挑戰失敗" : "單人攻擊",
      result.error ?? `${result.lines.join("\n")}\n\n${soloStatusText(solo)}`,
      [soloButtons(solo.defeated || solo.hp <= 0)],
      result.error || solo.hp <= 0 ? 0xdc2626 : solo.defeated ? 0xeab308 : 0x2563eb
    );
    return;
  }

  await replyWithBoss(
    interaction,
    "世界 Boss 戰況",
    `${teamStatusText()}\n\n活動結束：<t:${Math.floor(state.activeUntil / 1000)}:R>`,
    [eventButtons(state.team.defeated)]
  );
}

async function schedulerTick() {
  const slot = currentSpawnSlot();
  if (!slot) {
    eventIsActive();
    return;
  }

  if (slot.key !== state.lastSpawnKey) {
    createEvent(slot, process.env.WORLD_BOSS_CHANNEL_ID || DEFAULT_ANNOUNCEMENT_CHANNEL_ID);
  }
  if (!eventIsActive() || state.messageId) return;

  const now = Date.now();
  if (now - lastAnnouncementAttemptAt < ANNOUNCEMENT_RETRY_MS) return;
  lastAnnouncementAttemptAt = now;
  await announceEvent(runtime.client);
}

function startWorldBossSystem(client, helpers) {
  runtime = { client, ...helpers };
  schedulerTick().catch((error) => console.error("World boss scheduler failed.", error));
  const timer = setInterval(() => {
    schedulerTick().catch((error) => console.error("World boss scheduler failed.", error));
  }, 20 * 1000);
  timer.unref?.();
  console.log("World boss scheduler ready: 11:00 / 19:00 Asia/Taipei.");
}

module.exports = {
  handleWorldBossButton,
  showWorldBoss,
  startWorldBossSystem
};
