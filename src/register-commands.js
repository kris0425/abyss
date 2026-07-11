require("dotenv").config();

const { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("start")
    .setDescription("開始一場新的 roguelike 地城冒險"),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("查看你的冒險狀態"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("查看玩法說明"),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("打開冒險商店"),
  new SlashCommandBuilder()
    .setName("items")
    .setDescription("查看並使用背包道具"),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("查看地城冒險排行榜"),
  new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("取得本機圖形化介面網址"),
  new SlashCommandBuilder()
    .setName("adminfloor")
    .setDescription("管理員：把玩家跳到指定層數")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option
        .setName("floor")
        .setDescription("要跳到第幾層，1 到 50")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("player")
        .setDescription("要跳層的玩家，不填就是自己")
        .setRequired(false)
    )
].map((command) => command.toJSON());

async function main() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
  if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    throw new Error("請先在 .env 填入 DISCORD_TOKEN、CLIENT_ID、GUILD_ID。");
  }
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Slash commands registered.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
