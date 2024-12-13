/**
 * @typedef {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}} rawMEElement
 */

function EncodeHTMLText(text) {
    const encodes = {
        "&": "&amp",
        "\"": "&quot",
        "'": "&apos",
        ":": "&#x3A",
        " ": "&nbsp",
        "<": "&lt",
        ">": "&gt",
    }
    const encodesArray = Object.entries(encodes);
    encodesArray.forEach((encode) => {
        text = text.replaceAll(encode[0], encode[1])
    });
    return text;
}

/**@type {MEElement[]} */
let Elements = [];
/**@type {MEElement[]} */
let Crafting = [];


class MEElement {
    /**@param {rawMEElement} rawData */
    constructor(rawData) {
        /**@type {"item"|"fluid"} */
        this.type = rawData.type;
        /**@type {string[]} */
        this.tags = rawData.tags;
        /**@type {string} */
        this.name = rawData.name;
        /**@type {number} */
        this.amount = rawData.amount;
        /**@type {string} */
        this.fingerprint = rawData.fingerprint;
        /**@type {boolean} */
        this.isCraftable = rawData.isCraftable;
        /**@type {object} */
        this.nbt = rawData.nbt;
        /**@type {string} */
        this.displayName = rawData.displayName;
        /**@type {"normal"|"request"|"finished"|"error"} */
        this.mode = "normal";
    }

    /**@param {string} format */
    toString(format = "%ax %N") {
        return format
            .replace(/%a/g, this.amount.toString())
            .replace(/%n/g, this.name)
            .replace(/%N/g, this.displayName)
            .replace(/%f/g, this.fingerprint)
    }

    toDisplay() {
        const showText = `${this.amount}${this.type === "item" ? "x" : "mB"} ` +
            `${this.displayName} (${Object.entries(this.nbt).length} NBTs)`;

        const HTMLObject = document.createElement("li");
        const craftButton = document.createElement("button");
        craftButton.innerText = "CRAFT"
        if (this.isCraftable)
            craftButton.onclick = () => {
                const count = prompt(`${this.displayName}をいくつクラフトする？`);
                if (/^[0-9]+$/.test(count))
                    this.craft(parseInt(count)).then(() => {
                        alert(this.displayName + "のクラフトが完了しました！")
                    }).catch((ex) => {
                        alert(`[${this.displayName}] Craft Error: ${ex}`)
                    })
                else alert(`入力値 ${count} は自然数ではありません！`)
            }
        else {
            craftButton.disabled = true
        };
        HTMLObject.innerHTML = EncodeHTMLText(showText);
        HTMLObject.insertAdjacentElement("afterbegin", craftButton)

        return HTMLObject;
    }

    toJson() {
        return JSON.stringify({
            type: this.type,
            tags: this.tags,
            name: this.name,
            amount: this.amount,
            fingerprint: this.fingerprint,
            isCraftable: this.isCraftable,
            nbt: this.nbt,
            displayName: this.displayName,
            mode: this.mode
        })
    }

    /**
     * @return {Promise}
     * @param {number} amount 
     */
    craft(amount) {
        return new Promise((resolve, reject) => {
            if (!this.isCraftable) reject("This is not Craftable");
            const actualAmount = this.amount;
            this.amount = amount;
            this.mode = "request"
            APIRequest("/craft", "POST", this.toJson()).then((answer) => {
                if (typeof answer === "string")
                    reject(answer);
                if ("error" in answer)
                    reject(answer.error)
                Crafting.push(this);
                const id = setInterval(() => {
                    if (this.mode === "finished") {
                        this.mode = "normal";
                        Crafting = Crafting.filter((v) => v.fingerprint !== this.fingerprint);
                        clearInterval(id);
                        resolve();
                    } else if (this.mode.startsWith("error")) {
                        this.mode = "normal";
                        Crafting = Crafting.filter((v) => v.fingerprint !== this.fingerprint);
                        clearInterval(id);
                        reject(this.mode.substring(5));
                    }
                }, 1000)
            })
            this.amount = actualAmount;
        })
    }
}

let requestEnable = true;
let online = false;
function reloadStatus() {
    document.querySelector("#status").innerHTML = requestEnable ? (online ? "Online" : "Offline") : "Pause";
    document.querySelector("#status").style.color = requestEnable ? (online ? "lightgreen" : "red") : "lightblue";
}

function toggleRequestEnable() {
    requestEnable = !requestEnable;
    reloadStatus()
}

setInterval(() => {
    if (!requestEnable) return;
    APIRequest("/craft").then((val) => {
        val.forEach((element) => {
            const meElement = Crafting.find((v) => v.fingerprint === element.fingerprint)
            if (!meElement) return;
            if (element.mode === "finished") {
                meElement.mode = "finished";
                APIRequest(`/craft/${element.id}`, "DELETE")
            } else if (element.mode === "error") {
                meElement.mode = `error${element.reason}`
                APIRequest(`/craft/${element.id}`, "DELETE")
            }
        })
    });
    GetElements().then((v) => {
        online = true;
        reloadStatus()
        const div = document.createElement("div");
        v.forEach(element => {
            const meElement = new MEElement(element);
            div.insertAdjacentElement("beforeend", meElement.toDisplay());
        });
        const elementsDiv = document.querySelector("#elements");
        elementsDiv.innerHTML = "";
        elementsDiv.insertAdjacentElement("beforeend", div);
        document.querySelector("#counts").innerHTML = `${v.length} elements`
    }).catch((ex) => {
        online = false;
        reloadStatus()
    })
}, 2500)