const fs = require("fs");
const dotenv = require("dotenv")
const jsonServer = require('json-server')
const api = require("./api")

const server = jsonServer.create()
const middlewares = jsonServer.defaults()
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
    const url = req.url;
    if (url === "/elements" && req.method === "POST") {
        console.log("Ping Client!");
        return res.send("Pong!");
    } else if (url.startsWith("/interface")) {
        res.status(200).sendFile("webapp/index.html")
    }
    next();
});
server.use(jsonServer.router("api.json"))

server.listen(3000, () => {
    console.log('JSON Server is running on 3000')
    startedService.jsonserver = true;
})



dotenv.config();
process.on('uncaughtException', console.error)