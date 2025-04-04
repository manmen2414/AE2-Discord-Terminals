class Popup {
  static showing = null;
  static HTMLTemplate = `
<div class="popup-message">
    <button class="popup-delete" onclick="Popup.showing.close(false)">×</button>
    !!!html!!!
</div>
`;
  /**
   * @param {string} innerHTML
   */
  constructor(innerHTML = "Popup") {
    /**@type {string} */
    this.innerHTML = innerHTML;
    /**@type {function} */
    this.callback = () => {};
  }
  /**
   * @param {string} innerHTML
   */
  setInnerHTML(innerHTML) {
    this.innerHTML = innerHTML;
    return this;
  }

  show(callback) {
    if (!!Popup.showing) {
      callback(false);
      return;
    }
    const popup = document.querySelector("#popup");
    popup.innerHTML = Popup.HTMLTemplate.replace("!!!html!!!", this.innerHTML);
    popup.style.display = "block";
    popup.style.left = `${
      (document.body.clientWidth - popup.clientWidth) / 2
    }px`;
    Popup.showing = this;
    this.callback = callback;
  }

  close(sucessed = true) {
    if (!Popup.showing) return false;
    const popup = document.querySelector("#popup");
    popup.style.display = "none";
    Popup.showing = null;
    return this.callback(sucessed);
  }
}
