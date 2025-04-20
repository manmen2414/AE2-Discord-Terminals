/**@typedef {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}[]} Elements */

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
} = require("discord.js");
const http = require("http");
const api = require("../api");
let requested = [];
let sort = "displayName";
const terminals = [];
require("dotenv").config({ path: "../.env" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("terminal") //全て英語小文字
    .setDescription("ME遠隔Discordターミナル"),
  id: "gtel",
  /**@param {ChatInputCommandInteraction} interaction  */
  async execute(interaction) {
    terminals.push(new Terminal(interaction));
  },
  /**@param {ButtonInteraction} ButtonInteraction */
  async Button(ButtonInteraction, customId) {
    if (customId === "gtelsort") {
      sort = sort === "displayName" ? "amount" : "displayName";
      await terminals[0].CreateEmbed(ButtonInteraction);
    }
  },
  /**@param {StringSelectMenuInteraction} SSMInteraction */
  async SelMenu(SSMInteraction, customId) {
    const elements = await api.GetElements();
    const element = elements.find(
      (e) => e.name.split(":")[1] === SSMInteraction.values[0]
    );
    const modal = new ModalBuilder()
      .setCustomId("gtelcraftmodal" + SSMInteraction.values[0])
      .setTitle(element.displayName + "をクラフトする")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("amount")
            .setLabel(
              (element.type === "item" ? "いくつ" : "何mB") +
                "クラフトする？(半角数字のみ)"
            )
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        )
      );
    await SSMInteraction.showModal(modal);
  },
  /**@param {ModalSubmitInteraction}ModalInteraction */
  async Modal(ModalInteraction, customId) {
    await ModalInteraction.deferReply();
    const craftID = customId.split("gtelcraftmodal")[1];
    const Elements = await api.GetElements();
    const CraftElement = Elements.find((e) => e.name.split(":")[1] === craftID);
    if (!!CraftElement) {
      CraftElement.amount = (() => {
        const amountRaw = ModalInteraction.fields.getTextInputValue("amount");
        if (/[0-9]+/.test(amountRaw)) return parseInt(amountRaw);
        else {
          ModalInteraction.editReply("異常な値が入力されました：" + amountRaw);
          return -1;
        }
      })();
      if (CraftElement.amount === -1) return;
      CraftElement.mode = "request";
      const res = await api.Request("/craft", CraftElement, "POST");
      await ModalInteraction.editReply(
        CraftElement.displayName +
          "のクラフトは、内部ID" +
          res.id +
          "で申請されました。"
      );
      res.sendTo = ModalInteraction.channel;
      requested.push(res);
    }
  },
};

class Terminal {
  static CRAFTSELECT_LENGTH_PER_PAGE = 25;
  static EMBED_LENGTH_PER_PAGE = 16;
  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  constructor(interaction) {
    /**@type {ChatInputCommandInteraction } */
    this.interaction = interaction;
    /**@type {number}*/
    this.page = 0;
    /**@type {Elements} */
    this.elements = [];
    api.GetElements().then((elements) => {
      this.elements = elements;
      this.interaction.reply(this.createEmbed());
    });
  }
  createEmbed() {
    const FormatedItems = [];
    const FormatedFluids = [];
    const rawCraftselect = [];
    SortElements(this.elements).forEach((item, index) => {
      (item.type === "item" ? FormatedItems : FormatedFluids).push(
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
    });
    const sortButton = new ButtonBuilder({
      customId: "gtelsort",
      label:
        "ソート順を" +
        (sort === "displayName" ? "量が多い順" : "a-z順") +
        "に切り替える",
      style: ButtonStyle.Secondary,
    });
    const actionrows = [new ActionRowBuilder().addComponents(sortButton)];
    const slicedRawCraftSelect = rawCraftselect.slice(
      Terminal.CRAFTSELECT_LENGTH_PER_PAGE * this.page,
      Terminal.CRAFTSELECT_LENGTH_PER_PAGE * (this.page + 1)
    );
    if (slicedRawCraftSelect.length > 0) {
      actionrows.unshift(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("gtelcraftitems")
            .setPlaceholder("クラフトするアイテムを選択")
            .setOptions(...slicedRawCraftSelect)
        )
      );
    }
    const noMoreNull = (str) => (!str ? "None" : str);
    const embed = new EmbedBuilder()
      .setColor(0x8f5ccb)
      .setTitle("ME倉庫内のアイテム・液体")
      .setDescription(
        "下のドロップダウンを選択するとアイテムをクラフトできます。"
      )
      .setTimestamp();
    embed.addFields(
      {
        name: "Items 1",
        value: noMoreNull(
          FormatedItems.slice(
            Terminal.EMBED_LENGTH_PER_PAGE * this.page,
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 1)
          ).join("\n")
        ),
        inline: true,
      },
      {
        name: "Items 2",
        value: noMoreNull(
          FormatedItems.slice(
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 1),
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 2)
          ).join("\n")
        ),
        inline: true,
      },
      {
        name: "Fluids 1",
        value: noMoreNull(
          FormatedFluids.slice(
            Terminal.EMBED_LENGTH_PER_PAGE * this.page,
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 1)
          ).join("/n")
        ),
        inline: true,
      },
      {
        name: "Items 2",
        value: noMoreNull(
          FormatedFluids.slice(
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 1),
            Terminal.EMBED_LENGTH_PER_PAGE * (this.page + 2)
          ).join("\n")
        ),
        inline: true,
      }
    );
    return {
      embeds: [embed],
      components: actionrows,
    };
  }
}

setInterval(async () => {
  const crafted = await api.Get("/craft");
  crafted.forEach((e) => {
    const requestedElement = requested.find((f) => f.id === e.id);
    if (!!requestedElement && e.mode === "finished") {
      requestedElement.sendTo.send(
        `${requestedElement.displayName}のクラフトが完了しました！`
      );
      requested = requested.filter((n) => n.id !== e.id);
      api.Request("/craft/" + e.id, null, "DELETE");
    } else if (!!requestedElement && e.mode === "error") {
      requestedElement.sendTo.send(
        `${requestedElement.displayName}のクラフトに失敗しました...\n理由：${e.reason}`
      );
      requested = requested.filter((n) => n.id !== e.id);
      api.Request("/craft/" + e.id, null, "DELETE");
    }
  });
}, 5000);
const SortElements = (elements) => {
  elements.sort((a, b) => {
    if (a[sort] < b[sort]) return -1;
    if (a[sort] > b[sort]) return 1;
    return 0;
  });
  if (sort === "amount") elements.reverse();
  return elements;
};
