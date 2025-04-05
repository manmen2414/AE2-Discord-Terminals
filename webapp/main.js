//@ts-check
/**
 * @typedef {{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}} rawMEElement
 */

function EncodeHTMLText(text) {
  const encodes = {
    "&": "&amp",
    '"': "&quot",
    "'": "&apos",
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
    this.nbt = rawData.nbt?.tag ?? {};
    /**@type {string} */
    this.displayName = rawData.displayName;
    /**@type {"normal"|"request"|"finished"|"error"} */
    this.mode = "normal";
    /**@type {number} */
    this.craftAmount = 0;
    /**@type {"x"|"mB"} */
    this.xOrMB = this.type === "item" ? "x" : "mB";
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
          //TODO: 作業台加工じゃないものにクラフトというのはちょっと変
          Popup.Popup("✅" + this.displayName + "のクラフトが完了しました！");
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
    //TODO: 同上
    const text = EncodeHTMLText(`${this.displayName}をいくつクラフトする？`);
    const popup = new Popup(`${text}<br>${popupDiv}`)
      .setWaitTime(0)
      .show((c) => this.craftRequest(c)); //@ts-ignore
    document.querySelector(`#cb-${id}`).onclick = () => {
      //@ts-ignore
      popup.close(document.querySelector(`#cv-${id}`).value ?? null);
    };
  }

  toDisplay(showActionButtons) {
    const HTMLObject = document.createElement("li");
    const buttons = [
      document.createElement("button"),
      document.createElement("button"),
      document.createElement("button"),
    ];
    buttons[0].classList.add("element-copy");
    buttons[0].onclick = () => {
      if (!navigator.clipboard) {
        Popup.Popup(this.name, 0);
        return;
      }
      navigator.clipboard.writeText(this.name).then(() => {
        Popup.Popup("IDをコピーしました！", 2);
      });
    };
    buttons[1].classList.add("element-info");
    buttons[1].onclick = () => this.showInfo();
    buttons[2].classList.add("craftbutton");
    if (this.isCraftable) buttons[2].onclick = () => this.craftPrompt();
    else buttons[2].disabled = true;

    const nbts = Object.entries(this.nbt ?? {}).length;
    /**@type {HTMLSpanElement[]} */
    const spans = [
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span"),
    ];

    spans[0].classList.add("element-count");
    spans[1].classList.add("element-count-crafting");
    if (!!this.craftAmount) {
      spans[0].innerText = `${this.amount} `;
      spans[1].innerText = `+ ${this.craftAmount}${this.xOrMB} `;
    } else {
      spans[0].innerText = `${this.amount}${this.xOrMB} `;
    }
    spans[2].innerText = this.displayName;
    if (nbts !== 0) {
      spans[3].classList.add("element-nbt");
      spans[3].innerText = `+${nbts}`;
      spans[3].title = JSON.stringify(this.nbt ?? {});
    }
    if (showActionButtons)
      buttons.forEach((span) => HTMLObject.appendChild(span));
    spans.forEach((span) => HTMLObject.appendChild(span));

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
      craftAmount: this.craftAmount,
    });
  }

  /**
   * @return {Promise}
   * @param {number} amount
   */
  craft(amount) {
    return new Promise((resolve, reject) => {
      if (!this.isCraftable) reject("This is not Craftable");
      this.craftAmount = amount;
      this.mode = "request";
      APIRequest("/craft", "POST", this.toJson()).then((answer) => {
        if (typeof answer === "string") reject(answer);
        if ("error" in answer) reject(answer.error);
        //HACK:Terminal.instance.craftingっていちいち書くの汚くない？
        Terminal.instance.crafting.push(this);
        Terminal.instance.reloadCraftingMonitor();
        const id = setInterval(() => {
          const mode = this.mode;
          if (mode === "finished" || mode === "error") {
            this.mode = "normal";
            this.craftAmount = 0;
            Terminal.instance.crafting = Terminal.instance.crafting.filter(
              (v) => v.fingerprint !== this.fingerprint
            );
            Terminal.instance.reloadCraftingMonitor();
            clearInterval(id);
          }
          if (mode === "finished") {
            resolve(false);
          } else if (mode === "error") {
            reject(this.mode.substring(5));
          }
        }, 1000);
      });
    });
  }
  showInfo() {
    const childs = [
      document.createElement("div"), //アイテム名
      document.createElement("div"), //ID
      document.createElement("div"), //fingerprint
      document.createElement("span"), //"Count: "
      document.createElement("span"), //個数
    ];
    childs[0].innerText = this.displayName;
    childs[0].style.textAlign = "center";
    childs[1].innerText = this.name;
    childs[1].style.fontSize = "80%";
    childs[2].innerText = this.fingerprint;
    childs[2].classList.add("element-nbt");
    childs[3].innerText = "Count: ";
    childs[4].innerText = this.amount.toString();
    childs[4].classList.add("element-count");
    const div = showDivToCursorPos(null);
    div.classList.add("item-info");
    childs.forEach((e) => div.appendChild(e));
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
/**@enum {number} */
const Sorting = {
  DEFAULT: 0,
  NAME_A_TO_Z: 1,
  NAME_Z_TO_A: 2,
  COUNT_1_TO_9: 3,
  COUNT_9_TO_1: 4,
};
class Terminal {
  /**@type {Terminal} */
  static instance = new Terminal();
  /**@type {MEElement[]} */
  gotElements = [];
  requestEnable = true;
  online = false;
  /**@type {MEElement[]} */
  crafting = [];

  constructor() {}
  tick() {
    if (!this.requestEnable) return;
    APIRequest("/craft").then((val) => {
      val.forEach((element) => {
        const meElement = this.crafting.find(
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
    const div = document.createElement("div"); //@ts-ignore
    const sorting = parseInt(document.querySelector("#sorting-selector").value);
    const searchedElementList = sortElements(
      filterByJEISearch(this.gotElements, search),
      sorting
    );
    searchedElementList.forEach((element) => {
      div.appendChild(element.toDisplay(true));
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
  showCraftingMonitor() {
    /**@type {HTMLDivElement} */ //@ts-ignore
    const monitor = document.querySelector("#crafting-monitor");
    const display = monitor.style.display === "block";
    monitor.style.display = display ? "none" : "block";
    this.reloadCraftingMonitor();
  }
  reloadCraftingMonitor() {
    /**@type {HTMLDivElement} */ //@ts-ignore
    const craftCount = document.querySelector("#crafting-count");
    craftCount.innerText = `Crafting ${this.crafting.length}`;
    /**@type {HTMLDivElement} */ //@ts-ignore
    const elements = document.querySelector("#crafting-monitor>div");
    elements.innerHTML = "";
    this.crafting.forEach((meElement) => {
      elements.appendChild(meElement.toDisplay(false));
    });
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
/**
 * @param {MEElement[]} elements
 * @param {number} sorting
 */
function sortElements(elements, sorting) {
  /**
   * @param {string} a
   * @param {string} b
   */
  function sortingByName(a, b, reverse = false) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    const r = reverse ? -1 : 1;
    if (a < b) return -1 * r;
    else if (a > b) return 1 * r;
    return 0;
  }
  return elements.sort((a, b) => {
    switch (sorting) {
      case Sorting.NAME_A_TO_Z:
        return sortingByName(a.displayName, b.displayName);
        break;
      case Sorting.NAME_Z_TO_A:
        return sortingByName(a.displayName, b.displayName, true);
        break;
      case Sorting.COUNT_1_TO_9:
        return a.amount - b.amount;
        break;
      case Sorting.COUNT_9_TO_1:
        return b.amount - a.amount;
        break;
      default:
        return 0;
        break;
    }
  });
}

function generateDivToCursor() {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `${mouseX}px`;
  div.style.top = `${mouseY}px`;
  return div;
}
/**
 *
 * @param {(ev: MouseEvent)=>void} callback
 * @returns
 */
function generateClickRemoveBg(callback) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `0px`;
  div.style.top = `0px`;
  div.style.width = `100%`;
  div.style.height = `100%`;
  div.style.zIndex = `0.1`;
  div.onclick = (ev) => {
    callback(ev);
    div.remove();
  };
  document.body.appendChild(div);
  return div;
}

/**
 * @param {string|Element|null} html
 */
function showDivToCursorPos(html) {
  const div = generateDivToCursor();
  if (!!html)
    if (typeof html === "string") div.innerHTML = html;
    else div.appendChild(html);
  document.body.appendChild(div);
  generateClickRemoveBg(() => {
    div.remove();
  });
  return div;
}

const TICK_TIME = 1000;

setInterval(() => {
  Terminal.instance.tick();
}, TICK_TIME);
document.addEventListener("DOMContentLoaded", () => {
  Terminal.instance.tick();
});
let { mouseX, mouseY } = { mouseX: 0, mouseY: 0 };

document.addEventListener("mousemove", (ev) => {
  mouseX = ev.clientX;
  mouseY = ev.clientY;
});
