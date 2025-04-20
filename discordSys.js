const Discord = require("discord.js");
const fs = require("fs");
const api = require("./api");

class DiscordSys {
  running = false;
  /**@param {Express.Application} server  */
  constructor(server, serverEvents) {
    this.server = server;
    this.serverEvents = serverEvents;
    /**@type {Array} */
    this.commands = [];
    /**@type {Discord.Client} */
    this.client = new Discord.Client({
      intents: [Discord.GatewayIntentBits.MessageContent],
      partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.Reaction,
      ],
    });
    serverEvents.on("updateElements", (body) => {
      const items = (body.items.length ?? 0) + (body.fluids.length ?? 0);
      this.client.user.setActivity({
        name: `${items}要素数のMEネットワーク`,
        type: Discord.ActivityType.Playing,
      });
    });
    this.client.once("ready", async () => {
      await this.onBotReady();
    });

    this.client.on("interactionCreate", async (interaction) => {
      await this.onCommand(interaction);
    });
  }

  start() {
    console.log("Starting Discord Bot");
    this.client.login();
  }
  end() {
    this.running = false;
    this.client.destroy();
  }

  async onBotReady() {
    await this.registCommands();
    console.log("Discord bot is running on " + this.client.user?.username);
    this.running = true;
  }

  async registCommands() {
    const commandFiles = fs
      .readdirSync("./commands")
      .filter((file) => file.endsWith(".js"))
      .filter((file) => !file.startsWith("_"));
    let command = null;
    const data = [];
    for (const file in commandFiles) {
      command = require(`./commands/${commandFiles[file]}`);
      this.commands[command.data.name] = command;
    }
    for (const commandName in this.commands) {
      data.push(this.commands[commandName].data);
    }

    //@ts-ignore
    await this.client.application.commands.set(data);
  }

  /**
   * @param {Discord.Interaction} interaction
   */
  async onCommand(interaction) {
    const commandvalues = Object.values(this.commands);
    if (interaction.isCommand()) {
      const command = this.commands[interaction.commandName];
      try {
        //実行
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (error.message.match("2000")) {
          ErrorRep(interaction, "2000文字を超えました。");
        } else {
          ErrorRep(
            interaction,
            "コマンド実行中にエラーが発生しました。\r\n:x:エラー:実行したコマンドと共に管理者に伝えてください。"
          );
        }
      }
    } else if (interaction.isButton()) {
      const command = commandvalues.find(
        (c) => c.id === interaction.customId.substring(0, 4)
      );
      await command.Button(interaction, interaction.customId);
    } else if (interaction.isAnySelectMenu()) {
      const command = commandvalues.find(
        (c) => c.id === interaction.customId.substring(0, 4)
      );
      await command.SelMenu(interaction, interaction.customId);
    } else if (interaction.isModalSubmit()) {
      const command = commandvalues.find(
        (c) => c.id === interaction.customId.substring(0, 4)
      );
      await command.Modal(interaction, interaction.customId);
    } else if (interaction.isUserContextMenuCommand()) {
      //@ts-ignore
      const command = this.commands[interaction.id];
      await command.UserContent(interaction);
    }
  }
}

/**
 * @param {Discord.ChatInputCommandInteraction} interaction
 * @param {string} message
 */
function ErrorRep(interaction, message) {
  if (interaction.deferred)
    interaction.editReply({
      content: ":x:エラー:" + message,
    });
  else
    interaction.reply({
      content: ":x:エラー:" + message,
    });
}

module.exports = DiscordSys;
