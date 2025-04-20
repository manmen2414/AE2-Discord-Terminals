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
require("dotenv").config({ path: "../.env" });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("craft") //全て英語小文字
    .setDescription(
      "作業台クラフト※JEI?そんなのねえよ※プレビュー？そんなのねえよ"
    ),
  id: "crft",
  /**@param {ChatInputCommandInteraction} interaction  */
  async execute(interaction) {
    await CreateEmbed(interaction);
  },
  /**@param {ButtonInteraction} ButtonInteraction */
  async Button(ButtonInteraction, customId) {
    if (customId === "gtelsort") {
      sort = sort === "displayName" ? "amount" : "displayName";
      await CreateEmbed(ButtonInteraction);
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

/**
 *
 * @param {ChatInputCommandInteraction} interaction
 * @param {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}[]} requestedArr
 */
const CreateEmbed = async (interaction) => {
  await interaction.deferReply();
  api.GetElements().then((elements) => {
    const FormatedItems = [];
    const FormatedFluids = [];
    const craftselect = new StringSelectMenuBuilder()
      .setCustomId("gtelcraftitems")
      .setPlaceholder("クラフトするアイテムを選択");

    SortElements(elements).forEach((item, index) => {
      (item.type === "item" ? FormatedItems : FormatedFluids).push(
        `${item.amount}${item.type === "item" ? "x" : "mB"}${
          item.isCraftable ? "+" : ""
        } ${item.displayName}`
      );
      if (item.isCraftable)
        craftselect.addOptions(
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
    const embed = new EmbedBuilder()
      .setColor(0x8f5ccb)
      .setTitle("ME倉庫内のアイテム・液体")
      .setDescription(
        "下のドロップダウンを選択するとアイテムをクラフトできます。"
      )
      .addFields(
        { name: "Items", value: FormatedItems.join("\n"), inline: true },
        { name: "Fluids", value: FormatedFluids.join("\n"), inline: true }
      )
      .setTimestamp();
    const actionrows = [
      new ActionRowBuilder().addComponents(craftselect),
      new ActionRowBuilder().addComponents(sortButton),
    ];
    interaction.editReply({ embeds: [embed], components: actionrows });
  });
};
const SortElements = (elements) => {
  elements.sort((a, b) => {
    if (a[sort] < b[sort]) return -1;
    if (a[sort] > b[sort]) return 1;
    return 0;
  });
  if (sort === "amount") elements.reverse();
  return elements;
};
