const Discord = require("discord.js");
const fs = require("fs");
const dotenv = require("dotenv")
const jsonServer = require('json-server')
const startedService = {
    bot: false,
    jsonserver: false
}
const debug = true;

const server = jsonServer.create()
const router = jsonServer.router("api.json")
const middlewares = jsonServer.defaults()
server.use(middlewares)
server.use(router)
server.listen(3000, () => {
    console.log('JSON Server is running on 3000')
    startedService.jsonserver = true;
})

dotenv.config();
let commands = {};

const ErrorRep = (interaction, message) => {
    if (interaction.deferred)
        interaction.editReply({
            content:
                ":x:エラー:" + message,
        });
    else
        interaction.reply({
            content:
                ":x:エラー:" + message,
        });
}
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.MessageContent,
    ],
    partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.Reaction,
    ],
});

client.once("ready", async () => {
    const commandFiles = fs
        .readdirSync("./commands")
        .filter((file) => file.endsWith(".js"))
        .filter((file) => !file.startsWith("_"));
    let command = "";
    const data = [];
    for (const file in commandFiles) {
        command = require(`./commands/${commandFiles[file]}`);
        commands[command.data.name] = command;
    }
    for (const commandName in commands) {
        data.push(commands[commandName].data);
    }

    await client.application.commands.set(data);
    console.log("Discord bot is running on " + client.user.username);
    startedService.bot = true;
});
client.on("interactionCreate", async (interaction) => {
    const commandvalues = Object.values(commands)
    if (interaction.isCommand()) {
        const command = commands[interaction.commandName];
        try {
            //実行
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (error.message.match("2000")) {
                ErrorRep(interaction, "2000文字を超えました。")
            } else {
                ErrorRep(interaction, "コマンド実行中にエラーが発生しました。\r\n:x:エラー:実行したコマンドと共に管理者に伝えてください。")
            }
        }
    } else if (interaction.isButton()) {
        const command = commandvalues.find(c => c.id === interaction.customId.substring(0, 4));
        await command.Button(interaction, interaction.customId);
    } else if (interaction.isAnySelectMenu()) {
        const command = commandvalues.find(c => c.id === interaction.customId.substring(0, 4));
        await command.SelMenu(interaction, interaction.customId);
    } else if (interaction.isModalSubmit()) {
        const command = commandvalues.find(c => c.id === interaction.customId.substring(0, 4));
        await command.Modal(interaction, interaction.customId);
    } else if (interaction.isUserContextMenuCommand()) {
        const command = commands[interaction.id];
        await command.UserContent(interaction);
    }
});

client.login();
process.on('uncaughtException', console.error)