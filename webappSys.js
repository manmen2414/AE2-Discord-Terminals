const fs = require("fs");
const jsonServer = require("json-server");
const api = require("./api");

class WebappSys {
  running = false;
  /**@param {Express.Application} server  */
  constructor(server, serverEvents) {
    this.server = server;
    this.serverEvents = serverEvents;
  }
  start() {
    console.log("Starting Web App");
    this.serverEvents.on("request", (req, res, url, cancelNext) => {
      if (req.method === "GET") this.onWebRequest(req, res, url, cancelNext);
    });
    this.running = true;
  }
  end() {
    this.running = false;
  }
  /**
   *
   * @param {Request} req
   * @param {Response} res
   * @param {()=>void} cancelNext
   * @param {string} url
   */
  onWebRequest(req, res, url, cancelNext) {
    if (!this.running) return;
    /**@type {string[]} */
    const sendFile = (path) => {
      const splitedFile = path.split(".");
      const type = splitedFile[splitedFile.length - 1];
      res.status(200);
      res.type(type);
      const stream = fs.createReadStream(path);
      stream.pipe(res);
    };
    if (url === "/") {
      sendFile("./webapp/index.html");
      cancelNext();
    } else if (fs.existsSync(`./webapp${url}`)) {
      sendFile(`./webapp${url}`);
      cancelNext();
    } else {
    }
  }
}

module.exports = WebappSys;
