//@ts-check
/**
 * @typedef {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}} rawMEElement
 */

function EncodeHTMLText(text) {
  const encodes = {
    "&": "&amp",
    '"': "&quot",
    "'": "&apos",
    ":": "&#x3A",
    " ": "&nbsp",
    "<": "&lt",
    ">": "&gt",
  };
  const encodesArray = Object.entries(encodes);
  encodesArray.forEach((encode) => {
    text = text.replaceAll(encode[0], encode[1]);
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
    /**@type {string} */
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
      .replace(/%f/g, this.fingerprint);
  }

  craftRequest(count) {
    if (!count) return;
    if (/^[0-9]+$/.test(count))
      this.craft(parseInt(count))
        .then(() => {
          Popup.Popup("✔" + this.displayName + "のクラフトが完了しました！");
        })
        .catch((ex) => {
          alert(`[${this.displayName}] Craft Error: ${ex}`);
        });
    else {
      Popup.Popup(`入力値 ${count} は自然数ではありません！`);
      return;
    }
    Popup.Popup(`リクエストしました！`, 3);
  }

  craftPrompt() {
    const id = this.name.replace(":", "-");
    const popupInput = `<input id="cv-${id}" type="number">`;
    const popupButton = `<button id="cb-${id}">Enter</button>`;
    const popupDiv = `<div class="craft-request">${popupInput}${popupButton}</div>`;
    const text = EncodeHTMLText(`${this.displayName}をいくつクラフトする？`);
    const popup = new Popup(`${text}<br>${popupDiv}`)
      .setWaitTime(0)
      .show((c) => this.craftRequest(c)); //@ts-ignore
    document.querySelector(`#cb-${id}`).onclick = () => {
      //@ts-ignore
      popup.close(document.querySelector(`#cv-${id}`).value ?? null);
    };
  }

  toDisplay() {
    const showText =
      `${this.amount}${this.type === "item" ? "x" : "mB"} ` +
      `${this.displayName} (${Object.entries(this.nbt ?? {}).length} NBTs)`;

    const HTMLObject = document.createElement("li");
    const craftButton = document.createElement("button");
    craftButton.classList.add("craftbutton");
    if (this.isCraftable) craftButton.onclick = () => this.craftPrompt();
    else {
      craftButton.disabled = true;
    }
    HTMLObject.innerHTML = EncodeHTMLText(showText);
    HTMLObject.insertAdjacentElement("afterbegin", craftButton);

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
      mode: this.mode,
    });
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
      this.mode = "request";
      APIRequest("/craft", "POST", this.toJson()).then((answer) => {
        if (typeof answer === "string") reject(answer);
        if ("error" in answer) reject(answer.error);
        Crafting.push(this);
        const id = setInterval(() => {
          if (this.mode === "finished") {
            this.mode = "normal";
            Crafting = Crafting.filter(
              (v) => v.fingerprint !== this.fingerprint
            );
            clearInterval(id);
            resolve(false);
          } else if (this.mode.startsWith("error")) {
            this.mode = "normal";
            Crafting = Crafting.filter(
              (v) => v.fingerprint !== this.fingerprint
            );
            clearInterval(id);
            reject(this.mode.substring(5));
          }
        }, 1000);
      });
      this.amount = actualAmount;
    });
  }
}

/**
 * @param {MEElement[]} elementList
 * @param {string} search
 */
function filterByJEISearch(elementList, search = "") {
  const searchFilters = search.split(" ");
  if (searchFilters[0].length === 0) return elementList;
  const searchMod = [];
  const searchName = [];
  searchFilters.forEach((e) => {
    if (e.startsWith("@")) searchMod.push(e.substring(1));
    else searchName.push(e);
  });
  return elementList.filter((e) => {
    const [modid, id] = e.name.split(":");
    const name = e.displayName;
    //大文字小文字関係なくするため小文字に統一
    return (
      searchName.every(
        (sn) =>
          //アイテムIDまたは名前に合致すればおｋ
          id.toLowerCase().includes(sn.toLowerCase()) ||
          name.toLowerCase().includes(sn.toLowerCase())
      ) &&
      searchMod.every((sm) => modid.toLowerCase().includes(sm.toLowerCase()))
    );
  });
}

/**@enum {number} */
const Statuses = {
  ONLINE: 0,
  OFFLINE: 1,
  PAUSED: 2,
};
class Terminal {
  /**@type {Terminal} */
  static instance = new Terminal();
  /**@type {MEElement[]} */
  gotElements = [];
  requestEnable = true;
  online = false;
  constructor() {}
  tick() {
    if (!this.requestEnable) return;
    APIRequest("/craft").then((val) => {
      val.forEach((element) => {
        const meElement = Crafting.find(
          (v) => v.fingerprint === element.fingerprint
        );
        if (!meElement) return;
        if (element.mode === "finished") {
          meElement.mode = "finished";
          APIRequest(`/craft/${element.id}`, "DELETE");
        } else if (element.mode === "error") {
          meElement.mode = `error`;
          APIRequest(`/craft/${element.id}`, "DELETE");
        }
      });
    });
    GetElements()
      .then((v) => {
        this.online = true;
        this.gotElements = v.map((e) => new MEElement(e));
        this.reloadStatus();
        this.display();
      })
      .catch((ex) => {
        this.online = false;
        this.reloadStatus();
      });
  }

  getStatus() {
    return this.requestEnable
      ? this.online
        ? Statuses.ONLINE
        : Statuses.OFFLINE
      : Statuses.PAUSED;
  }
  reloadStatus() {
    /**@type {Element} */ //@ts-ignore
    const status = document.querySelector("#status");
    status.innerHTML = [
      `<div class="status-online">Online</div>`,
      `<div class="status-offline">Offline</div>`,
      `<div class="status-paused">Paused</div>`,
    ][this.getStatus()];
  }
  toggleRequestEnable() {
    this.requestEnable = !this.requestEnable;
    this.reloadStatus();
  }
  display() {
    //@ts-ignore
    const search = document.querySelector("#search").value;
    const div = document.createElement("div");
    const searchedElementList = filterByJEISearch(this.gotElements, search);
    searchedElementList.forEach((element) => {
      div.appendChild(element.toDisplay());
    });
    /**@type {Element} */ //@ts-ignore
    const elementsDiv = document.querySelector("#elements");
    elementsDiv.innerHTML = "";
    elementsDiv.appendChild(div);
    //@ts-ignore
    document.querySelector(
      "#counts"
    ).innerHTML = `Found ${searchedElementList.length}`;
  }
}
function toggleMenu() {
  const deactiveMenu = document.querySelector("#hamburger-menu");
  const activedMenu = document.querySelector("#hamburger-menu-active");
  /**@type {Element} */ //@ts-ignore
  const sidepanel = document.querySelector("#sidepanel");
  if (!!deactiveMenu) {
    deactiveMenu.id = "hamburger-menu-active";
    sidepanel.className = "";
  }
  if (!!activedMenu) {
    activedMenu.id = "hamburger-menu";
    sidepanel.className = "sidepanel-closed";
  }
}

setInterval(() => {
  Terminal.instance.tick();
}, 2500);
document.addEventListener("DOMContentLoaded", () => {
  Terminal.instance.tick();
});
