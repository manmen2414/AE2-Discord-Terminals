const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helloworld") //全て英語小文字
    .setDescription("起動確認"),
  async execute(interaction) {
    interaction.reply("# Hello, World!\nAE2連携botは無事に起動しました！");
  },
};
