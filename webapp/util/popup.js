class Popup {
  /**@type {Popup[]} */
  static showing = [];
  static WAIT_TIME = 5;
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
   * @param {string} innerHTML
   */
  setInnerHTML(innerHTML) {
    this.innerHTML = innerHTML;
    return this;
  }
  /**
   * @param {string} innerText
   */
  setInnerText(innerText) {
    const uniqueChars = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#39;",
      " ": "&nbsp;",
    };
    let repedInnerText = innerText;
    Object.entries(uniqueChars).forEach((arr) => {
      repedInnerText.replaceAll(arr[0], arr[1]);
    });
    this.innerHTML = repedInnerText;
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
    popup.style.left = `${(clientWidth - popup.clientWidth) / 2}px`;
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
      .querySelector("#main-document")
      .insertAdjacentElement("beforebegin", popup);
    this.movePopup();
    //表示後の待ち時間
    this.timeoutId = setInterval(() => {
      this.intervalSecond += 1 / Popup.secondIntervalCounds;
      if (this.intervalSecond > Popup.WAIT_TIME)
        popup.style.opacity -=
          1 / (Popup.secondIntervalCounds * Popup.FADEOUT_TIME);
      if (this.intervalSecond > Popup.WAIT_TIME + Popup.FADEOUT_TIME)
        this.close(false);
    }, Popup.INTERVAL_MILLISECONDS);
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
