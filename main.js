const fs = require("fs");
const jsonServer = require("json-server");
const api = require("./api");
const { EventEmitter } = require("events");
require("dotenv").config();

const DiscordSys = require("./discordSys");
const WebappSys = require("./webappSys");

if (!fs.existsSync("./api.json")) {
  fs.copyFileSync("./api.json.template", "./api.json");
  console.log("Copyed template json");
}

const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const serverEvents = new EventEmitter();
server.use((req, res, next) => {
  const url = req.url;
  if (url === "/ping") {
    console.log("Ping Client!");
    serverEvents.emit("ping");
    return res.send("Pong!");
  }
  let nextable = true;
  serverEvents.emit("request", req, res, url, () => (nextable = false));
  if (nextable) next();
});
server.use(jsonServer.router("api.json"));

if (process.env.USE_DISCORD === "true") {
  const discordSys = new DiscordSys(server, serverEvents);
  discordSys.start();
}
if (process.env.USE_WEBAPP === "true") {
  const webappSys = new WebappSys(server, serverEvents);
  webappSys.start();
}

server.listen(3000, () => {
  console.log("JSON Server is running on 3000");
});
process.on("uncaughtException", console.error);
