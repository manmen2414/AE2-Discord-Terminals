/**@typedef {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}} Element */
/**@typedef {Element[]} Elements */

const {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonInteraction,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  User,
  TextChannel,
} = require("discord.js");
const http = require("http");
const api = require("../api");
const buttonCallbacks = [];
/**@type {Terminal[]} */
const terminals = [];
require("dotenv").config({ path: "../.env" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("terminal") //全て英語小文字
    .setDescription("ME遠隔Discordターミナル"),
  id: "gtel",
  /**@param {ChatInputCommandInteraction} interaction  */
  async execute(interaction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });
    terminals.push(new Terminal(interaction));
  },
  /**
   * @param {ButtonInteraction} interaction
   * @param {string} customId
   */
  async Button(interaction, customId) {
    if (customId.startsWith("gtelCALL")) {
      const id = unserializeEnglishChar(customId.split("gtelCALL")[1]);
      buttonCallbacks[id](interaction);
      return;
    }
    const terminal =
      terminals[parseInt(/ID: ([0-9])+/.exec(interaction.message.content)[1])];
    await terminal.button(interaction, customId);
  },
  /**@param {StringSelectMenuInteraction} interaction */
  async SelMenu(interaction, customId) {
    const terminal =
      terminals[parseInt(/ID: ([0-9])+/.exec(interaction.message.content)[1])];
    await terminal.menu(interaction, customId);
  },
  /**@param {ModalSubmitInteraction}interaction */
  async Modal(interaction, customId) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const terminal =
      terminals[parseInt(/ID: ([0-9])+/.exec(interaction.message.content)[1])];
    await terminal.modal(interaction, customId);
    /*
}*/
  },
};

class Terminal {
  static CRAFTSELECT_LENGTH_PER_PAGE = 25;
  static EMBED_LENGTH_PER_PAGE = 25;
  static TICK = 5000;
  sort = "displayName";
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  constructor(interaction) {
    /**@type {ChatInputCommandInteraction } */
    this.interaction = interaction;
    /**@type {number}*/
    this.page = 0;
    /**@type {number}*/
    this.maxPage = 0;
    /**@type {number}*/
    this.id = terminals.length;
    /**@type {Elements} */
    this.elements = [];
    /**@type {{element:Element,id:number,orderUser:User,inChannel:TextChannel}[]} */
    this.craftings = [];
    this.sendEmbed();
  }
  changeSort() {
    this.sort = this.sort === "displayName" ? "amount" : "displayName";
    return this;
  }
  async setPage(page) {
    await this.reloadElements();
    this.page = (page + this.maxPage) % this.maxPage;
    return this;
  }
  nextPage() {
    return this.setPage(this.page + 1);
  }
  backPage() {
    return this.setPage(this.page - 1);
  }
  async sendEmbed() {
    await this.reloadElements();
    await this.interaction.editReply(this.createEmbed());
  }
  /**
   *
   * @param {Elements} elements
   * @param {number} page
   */
  pageSlice(elements, page = this.page) {
    return elements.slice(
      Terminal.EMBED_LENGTH_PER_PAGE * page,
      Terminal.EMBED_LENGTH_PER_PAGE * (page + 1)
    );
  }
  async reloadElements() {
    const elements = await api.GetElements();
    this.elements = elements;
    const { formatedFluids: fluids, formatedItems: items } =
      this.formatElements(false);
    this.maxPage = Math.ceil(
      (items.length > fluids.length ? items.length : fluids.length) /
        Terminal.EMBED_LENGTH_PER_PAGE
    );
    return this;
  }
  formatElements(sort = true) {
    /**@type {Elements} */
    const formatedItems = [];
    /**@type {Elements} */
    const formatedFluids = [];
    /**@type {Elements} */
    const rawCraftselect = [];
    (sort ? this.SortElements(this.elements) : this.elements).forEach(
      (item, index) => {
        (item.type === "item" ? formatedItems : formatedFluids).push(
          `${item.amount}${item.type === "item" ? "x" : "mB"}${
            item.isCraftable ? "+" : ""
          } ${item.displayName}`
        );

        if (item.isCraftable)
          rawCraftselect.push(
            new StringSelectMenuOptionBuilder()
              .setLabel(item.displayName)
              .setValue(item.name.split(":")[1])
          );
      }
    );
    return {
      formatedItems: formatedItems,
      formatedFluids: formatedFluids,
      rawCraftselect: rawCraftselect,
    };
  }
  createEmbed() {
    const { formatedFluids, formatedItems, rawCraftselect } =
      this.formatElements();
    const actionRows = [];
    if (rawCraftselect.length > 0) {
      actionRows.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("gtelcraftitems")
            .setPlaceholder("クラフトするアイテムを選択")
            .setOptions(...rawCraftselect)
        )
      );
    }
    actionRows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder({
          customId: "gtelsort",
          label: "ソート:" + (this.sort === "displayName" ? "a-z順" : "多量順"),
          style: ButtonStyle.Secondary,
        }),
        new ButtonBuilder({
          customId: "gtelpagenext",
          label: "+1ページ",
          style: ButtonStyle.Primary,
        }),
        new ButtonBuilder({
          customId: "gtelpageback",
          label: "-1ページ",
          style: ButtonStyle.Primary,
        })
      )
    );
    const embed = new EmbedBuilder()
      .setColor(0x8f5ccb)
      .setTitle("ME倉庫内のアイテム・液体")
      .setDescription(
        "下のドロップダウンを選択するとアイテムをクラフトできます。\n" +
          `**Page ${this.page + 1}/${this.maxPage}** (1ページにつき${
            Terminal.EMBED_LENGTH_PER_PAGE
          }要素)`
      )
      .setTimestamp();
    embed.addFields(
      {
        name: "Items",
        value: nullToNone(this.pageSlice(formatedItems).join("\n")),
        inline: true,
      },
      {
        name: "Fluids",
        value: nullToNone(this.pageSlice(formatedFluids).join("\n")),
        inline: true,
      }
    );
    return {
      content: `ID: ${this.id}`,
      embeds: [embed],
      components: actionRows,
      flags: MessageFlags.Ephemeral,
      ephemeral: true,
    };
  }
  SortElements(elements) {
    elements.sort((a, b) => {
      if (a[this.sort] < b[this.sort]) return -1;
      if (a[this.sort] > b[this.sort]) return 1;
      return 0;
    });
    if (this.sort === "amount") elements.reverse();
    return elements;
  }
  /**@param {Elements} craft  */
  async tick(craft) {
    craft.forEach((e) => {
      const element = this.craftings.find((f) => f.id === e.id);
      if (!element) return;
      const deleteRequest = () => {
        this.craftings = this.craftings.filter((n) => n.id !== e.id);
        api.Request("/craft/" + e.id, null, "DELETE");
      };
      if (e.mode === "finished") {
        call(
          element.inChannel,
          `<@${element.orderUser.id}>\n` +
            `${element.element.displayName}の作成が完了しました。`
        );
        deleteRequest();
      }
      if (e.mode === "error") {
        call(
          element.inChannel,
          `<@${element.orderUser.id}>\n` +
            `${element.element.displayName}の作成が失敗しました。\n${e.reason}`
        );
        deleteRequest();
      }
    });
  }
  /**
   * @param {StringSelectMenuInteraction} interaction
   * @param {string} customId
   */
  async menu(interaction, customId) {
    const elements = await api.GetElements();
    const element = elements.find(
      (e) => e.name.split(":")[1] === interaction.values[0]
    );
    const modal = new ModalBuilder()
      .setCustomId("gtelcraftmodal" + interaction.values[0])
      .setTitle(element.displayName + "を作成")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("amount")
            .setLabel("要求量(半角数字のみ, 個数 or mB単位)")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        )
      );
    await interaction.showModal(modal);
  }
  /**
   * @param {ModalSubmitInteraction} interaction
   * @param {string} customId
   */
  async modal(interaction, customId) {
    const craftID = customId.split("gtelcraftmodal")[1];
    const CraftElement = this.elements.find(
      (e) => e.name.split(":")[1] === craftID
    );
    if (!!CraftElement) {
      CraftElement.craftAmount = (() => {
        const amountRaw = interaction.fields.getTextInputValue("amount");
        if (/[0-9]+/.test(amountRaw)) return parseInt(amountRaw);
        else {
          interaction.editReply("異常な値が入力されました：" + amountRaw);
          return -1;
        }
      })();
      if (CraftElement.craftAmount === -1) return;
      CraftElement.mode = "request";
      const res = await api.Request("/craft", CraftElement, "POST");
      await interaction.editReply(
        CraftElement.displayName +
          `の要求は、内部ID\`${res.id}\`で申請されました。`
      );
      this.craftings.push({
        element: res,
        id: res.id,
        orderUser: interaction.user,
        inChannel: interaction.channel,
      });
    }
  }
  /**
   * @param {ButtonInteraction} interaction
   * @param {string} customId
   */
  async button(interaction, customId) {
    if (customId === "gtelsort") {
      await this.changeSort().sendEmbed();
      await reloaded(interaction);
    } else if (customId === "gtelpagenext") {
      await this.nextPage();
      await this.sendEmbed();
      await reloaded(interaction);
    } else if (customId === "gtelpageback") {
      await this.backPage();
      await this.sendEmbed();
      await reloaded(interaction);
    }
  }
}
/**
 * @param {TextChannel} channel
 * @param {string} content
 */
async function call(channel, content) {
  const message = await channel.send({
    content: content,
    components: [
      new ActionRowBuilder({
        components: [
          new ButtonBuilder({
            customId: `gtelCALL${serializeEnglishChar(buttonCallbacks.length)}`,
            emoji: "🗑️",
            style: ButtonStyle.Danger,
          }),
        ],
      }),
    ],
  });
  buttonCallbacks.push((i) => {
    message.delete();
  });
}

setInterval(async () => {
  const craft = await api.Get("/craft");
  terminals.forEach((v) => v.tick(craft));
}, Terminal.TICK);

function nullToNone(str) {
  return !str ? "None" : str;
}
const A2Z = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
];

/**
 * @param {number} num
 */
function serializeEnglishChar(num) {
  const baseA2Z = num.toString(A2Z.length);
  let englishStr = "";
  baseA2Z.split("").forEach((char, index) => {
    let digit = parseInt(char, A2Z.length);
    //2桁以上ある場合の最初の桁は1始まりなので1減らす
    if (index === 0 && baseA2Z.length > 1) digit--;
    englishStr += A2Z[digit];
  });
  return englishStr;
}
/**
 * @param {string} str
 */
function unserializeEnglishChar(str) {
  let baseA2Z = "";
  str.split("").forEach((char, index) => {
    let a2zIndex = A2Z.findIndex((v) => v === char);
    //1桁目かつ2桁以上ある場合1少ない値なので大きくする
    if (index === 0 && str.length > 1) a2zIndex++;
    baseA2Z += a2zIndex.toString(A2Z.length);
  });
  const num = parseInt(baseA2Z, A2Z.length);
  return num;
}

async function reloaded(interaction) {
  await interaction.reply({
    content: "-# 更新しました。",
    flags: MessageFlags.Ephemeral,
  });
  await interaction.deleteReply();
}
