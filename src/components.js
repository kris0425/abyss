const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const path = require("node:path");
const { CLASSES, CLASS_EMOJI, ITEM_DEFS, MAPS, SHOP_ITEMS, START_BUFFS, healthState, statusText } = require("./game");

function gameEmbed(title, text, player) {
  const state = healthState(player);
  const embed = new EmbedBuilder()
    .setColor(embedColor(player))
    .setTitle(`${state.icon} ${title}`)
    .setTimestamp();

  addStackedText(embed, "事件", text, 900);

  if (player) {
    addStackedText(embed, "目前狀態", statusText(player), 900);
  }

  const imageUrl = player?.combat?.imageUrl ?? player?.sceneImageUrl;
  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  return embed;
}

function addStackedText(embed, baseName, text, limit = 900) {
  const chunks = splitText(text || "無", limit);
  if (baseName === "事件" && chunks.length === 1) {
    embed.setDescription(chunks[0]);
    return;
  }

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: chunks.length === 1 ? baseName : `${baseName} ${index + 1}/${chunks.length}`,
      value: chunk
    });
  });
}

function splitText(text, limit) {
  const lines = String(text).split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (line.length <= limit) {
      current = line;
      continue;
    }

    for (let i = 0; i < line.length; i += limit) {
      chunks.push(line.slice(i, i + limit));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks.slice(0, 20) : ["無"];
}

function classMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("class_select")
      .setPlaceholder("選一個職業開始今天的倒楣冒險")
      .addOptions(
        Object.entries(CLASSES).map(([value, info]) => ({
          label: info.label,
          value,
          emoji: CLASS_EMOJI[value],
          description: info.description
        }))
      )
  );
}

function buffMenu(classKey) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`buff_select:${classKey}`)
      .setPlaceholder("選一個開局祝福")
      .addOptions(
        Object.entries(START_BUFFS).map(([value, info]) => ({
          label: info.label,
          value,
          emoji: info.icon,
          description: info.description
        }))
      )
  );
}

function mapMenu(classKey, buffKey) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`map_select:${classKey}:${buffKey}`)
      .setPlaceholder("選擇冒險地圖")
      .addOptions(
        Object.entries(MAPS).map(([value, info]) => ({
          label: info.label,
          value,
          emoji: info.icon,
          description: info.description
        }))
      )
  );
}

function actionButtons(disabled = false, ownerId = "global") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`explore:${ownerId}`)
      .setLabel("🚪 探索")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`rest:${ownerId}`)
      .setLabel("🍵 休息")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`shop:${ownerId}`)
      .setLabel("🛒 商店")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`inventory:${ownerId}`)
      .setLabel("🎒 背包")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`retire:${ownerId}`)
      .setLabel("🏳️ 撤退")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function combatButtons(disabled = false, ownerId = "global") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`attack:${ownerId}`)
      .setLabel("⚔️ 攻擊")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`defend:${ownerId}`)
      .setLabel("🛡️ 防禦")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`inventory:${ownerId}`)
      .setLabel("🎒 背包")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`status:${ownerId}`)
      .setLabel("❤️ 狀態")
      .setStyle(ButtonStyle.Secondary)
  );
}

function hiddenRoomButtons(disabled = false, ownerId = "global") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`hidden_enter:${ownerId}`)
      .setLabel("🚪 進入")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`hidden_leave:${ownerId}`)
      .setLabel("↩️ 離開")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function shopMenu(ownerId = "global") {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`shop_select:${ownerId}`)
      .setPlaceholder("選一個商品")
      .addOptions(
        Object.entries(SHOP_ITEMS).map(([value, item]) => ({
          label: `${item.label} - ${item.cost} 金幣`,
          value,
          emoji: item.icon,
          description: item.description
        }))
      )
  );
}

function shopQuantityMenu(itemId, ownerId = "global") {
  const item = SHOP_ITEMS[itemId];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`shop_quantity:${ownerId}:${itemId}`)
      .setPlaceholder(`選擇購買數量｜單價 ${item.cost} 金幣`)
      .addOptions(
        Array.from({ length: 10 }, (_, index) => {
          const quantity = index + 1;
          return {
            label: `${quantity} 個｜共 ${item.cost * quantity} 金幣`,
            value: String(quantity),
            emoji: item.icon,
            description: `${item.label} x${quantity}`
          };
        })
      )
  );
}

function inventoryMenu(player, ownerId = "global") {
  const entries = Object.entries(player?.items ?? {}).filter(([, amount]) => amount > 0);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`item_select:${ownerId}`)
    .setPlaceholder(entries.length ? "選一個道具使用" : "背包是空的")
    .setDisabled(entries.length === 0);

  if (entries.length === 0) {
    menu.addOptions([{ label: "沒有道具", value: "empty", description: "去商店買點東西。" }]);
  } else {
    menu.addOptions(
      entries.map(([value, amount]) => {
        const item = ITEM_DEFS[value];
        return {
          label: `${item?.label ?? value} x${amount}`,
          value,
          emoji: item?.icon,
          description: item?.description ?? "未知道具"
        };
      })
    );
  }

  return new ActionRowBuilder().addComponents(menu);
}

function embedColor(player) {
  if (!player) return 0x5865f2;
  if (!player.alive) return 0x8f1d1d;
  const ratio = player.hp / player.maxHp;
  if (ratio <= 0.25) return 0xd92d20;
  if (ratio <= 0.5) return 0xf97316;
  if (ratio <= 0.75) return 0xeab308;
  return 0x2f855a;
}

function gameFiles(player) {
  const imageFile = player?.combat?.imageFile ?? player?.sceneImageFile;
  if (!imageFile) return [];
  return [
    {
      attachment: path.join(__dirname, "..", "assets", "enemies", imageFile),
      name: imageFile
    }
  ];
}

module.exports = {
  actionButtons,
  buffMenu,
  classMenu,
  combatButtons,
  gameEmbed,
  gameFiles,
  hiddenRoomButtons,
  inventoryMenu,
  mapMenu,
  shopMenu,
  shopQuantityMenu
};
