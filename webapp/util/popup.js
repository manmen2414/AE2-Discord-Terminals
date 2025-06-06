class Popup {
  /**@type {Popup[]} */
  static showing = [];
  static DEFAULT_WAIT_TIME = 5;
  static FADEOUT_TIME = 2;
  static INTERVAL_MILLISECONDS = 200;
  static secondIntervalCounds = 1000 / Popup.INTERVAL_MILLISECONDS;
  /**
   * @param {string} innerHTML
   */
  constructor(innerHTML = "Popup") {
    /**@type {string} */
    this.innerHTML = innerHTML;
    /**@type {function} */
    this.callback = () => {};
    /**@type {number} 0だと削除しない。 */
    this.waitTime = Popup.DEFAULT_WAIT_TIME;
    /**@type {HTMLDivElement} */
    this.popupElement = null;
    /**@type {number} */
    this.popupId = -1;
    /**@type {number} */
    this.timeoutId = -1;
    /**@type {number} */
    this.intervalSecond = 0;
  }
  /**
   * @param {string} text
   * @param {number} time
   */
  static Popup(text, time = Popup.DEFAULT_WAIT_TIME) {
    return new Popup().setInnerText(text).setWaitTime(time).show();
  }
  /**
   * @param {string} innerHTML
   */
  setInnerHTML(innerHTML) {
    this.innerHTML = innerHTML;
    return this;
  }
  /**
   * @param {number} waitTime
   */
  setWaitTime(waitTime) {
    this.waitTime = waitTime;
    return this;
  }
  /**
   * @param {string} innerText
   */
  setInnerText(innerText) {
    this.innerHTML = EncodeHTMLText(innerText);
    return this;
  }

  movePopup() {
    const getPopupPosTop = () => {
      const heights = Popup.showing
        .filter((p) => p.popupId < this.popupId)
        .map((p) => p.popupElement.clientHeight);
      heights.push(0);
      return heights.reduce((p, c) => p + c + 2);
    };
    const popup = this.popupElement;
    const { clientWidth, clientHeight } = document.body;
    const left = (clientWidth - popup.clientWidth) / 2;
    popup.style.left = `${left < 0 ? 0 : left}px`;
    popup.style.right = `10px`;
    popup.style.top = `${clientHeight * 0.05 + getPopupPosTop()}px`;
  }

  show(callback = this.callback) {
    this.popupElement = null;
    this.popupId = -1;
    this.timeoutId = -1;
    this.intervalSecond = 0;
    //ポップアップ本体
    const popup = document.createElement("div");
    this.popupId = Popup.showing.push(this) - 1;
    this.callback = callback;
    this.popupElement = popup;
    popup.classList.add("popup");
    popup.style.display = "block";
    popup.style.opacity = 1;
    //ポップアップメッセージ
    const popupMessaege = document.createElement("div");
    popupMessaege.classList.add("popup-message");
    //削除ボタン
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("popup-delete");
    deleteButton.innerText = "×";
    deleteButton.onclick = () => this.close(false);
    //適用
    popupMessaege.innerHTML += "\n" + this.innerHTML;
    popupMessaege.insertAdjacentElement("afterbegin", deleteButton);
    popup.appendChild(popupMessaege);
    document
      .querySelector("header")
      .insertAdjacentElement("beforebegin", popup);
    this.movePopup();
    //表示後の待ち時間
    if (this.waitTime === 0) return this;
    this.timeoutId = setInterval(() => {
      this.intervalSecond += 1 / Popup.secondIntervalCounds;
      if (this.intervalSecond > this.waitTime)
        popup.style.opacity -=
          1 / (Popup.secondIntervalCounds * Popup.FADEOUT_TIME);
      if (this.intervalSecond > this.waitTime + Popup.FADEOUT_TIME)
        this.close(false);
    }, Popup.INTERVAL_MILLISECONDS);
    return this;
  }

  close(arg) {
    if (Popup.showing.length === 0) return false;
    clearInterval(this.timeoutId);
    const popup = this.popupElement;
    Popup.showing = Popup.showing.filter((p) => p.popupId !== this.popupId);
    //除外処理(自分以降の番号を-1する)
    Popup.showing
      .filter((p) => p.popupId > this.popupId)
      .forEach((p) => {
        p.popupId--;
        p.movePopup();
      });
    popup.remove();
    return this.callback(arg);
  }
}
class removeBackground {
  /**@type {removeBackground|null} */
  static instance = null;
  showing = false;
  /**
   * @param {(ev: MouseEvent)=>void} callback
   */
  constructor(callback) {
    if (!!removeBackground.instance) {
      removeBackground.instance.callbacks.push(callback);
      return removeBackground.instance;
    }
    /**@type {function[]} */
    this.callbacks = [callback];
    const div = document.createElement("div");
    /**@type {HTMLDivElement} */
    this.div = div;
    div.style.position = "fixed";
    div.style.left = `0px`;
    div.style.top = `0px`;
    div.style.width = `100%`;
    div.style.height = `100%`;
    div.style.zIndex = `0.1`;
    div.onclick = (ev) => this.deleteWithCallback(ev);
    document.body.appendChild(div);
    removeBackground.instance = this;
    this.showing = true;
  }
  _checkShowing() {
    if (!this.showing) throw new Error("This background is not showing");
  }

  /**
   * @param {MouseEvent} clickEvent
   */
  deleteWithCallback(clickEvent) {
    this._checkShowing();
    this.callbacks.forEach((f) => f(clickEvent));
    this.delete();
  }

  delete() {
    this._checkShowing();
    this.div.remove();
    this.showing = false;
    removeBackground.instance = null;
  }
}

class PopupCursor {
  showing = false;
  /**
   * @param {string|Element|null} html
   */
  constructor(html) {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = `${mouseX}px`;
    div.style.top = `${mouseY}px`;
    /**@type {HTMLDivElement} */
    this.div = div;

    if (!!html)
      if (typeof html === "string") div.innerHTML = html;
      else div.appendChild(html);
    document.body.appendChild(div);
    this.showing = true;
    new removeBackground(() => {
      this.close();
    });
  }
  close() {
    if (!this.showing) return;
    this.div.remove();
    this.showing = false;
  }
}
