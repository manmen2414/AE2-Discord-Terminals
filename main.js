const fs = require("fs");
const dotenv = require("dotenv")
const jsonServer = require('json-server')
const api = require("./api")

const server = jsonServer.create()
const middlewares = jsonServer.defaults()
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
    const url = req.url;
    if (url === "/ping") {
        console.log("Ping Client!");
        return res.send("Pong!");
    } else if (url === "/elements" || url === "/craft") {
        next();
    } else {
        /**@type {string[]} */
        const sendFile = (path) => {
            const splitedFile = path.split(".");
            const type = splitedFile[splitedFile.length - 1];
            res.status(200);
            res.type(type);
            const stream = fs.createReadStream(path);
            stream.pipe(res);
        }
        if (url === "/") {
            sendFile("./webapp/index.html")
        } else if (fs.existsSync(`./webapp${url}`)) {
            sendFile(`./webapp${url}`);
        } else {
            res.sendStatus(404);
        }
    }

});
server.use(jsonServer.router("api.json"))

server.listen(3000, () => {
    console.log('JSON Server is running on 3000')
})



dotenv.config();
process.on('uncaughtException', console.error)