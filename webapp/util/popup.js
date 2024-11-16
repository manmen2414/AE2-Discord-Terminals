
class Popup {
    static showing = null;
    static HTMLTemplate =
        `
<div class="popup-title">
    <button style="color: black;" onclick="Popup.showing.close(false)">×</button>
    !!!title!!!
</div>
<div class="popup-text">
    !!!html!!!
</div>
`
    /**
     * @param {string} title 
     * @param {string} innerHTML 
     */
    constructor(title = "Popup", innerHTML = "") {
        /**@type {string} */
        this.title = title;
        /**@type {string} */
        this.innerHTML = innerHTML;
        /**@type {function} */
        this.callback = () => { };
    }

    /**
     * @param {string} title 
     */
    setTitle(title) {
        this.title = title;
        return this;
    }

    /**
     * @param {string} innerHTML
     */
    setInnerHTML(innerHTML) {
        this.innerHTML = innerHTML;
        return this;
    }

    show(callback) {
        if (!!Popup.showing) callback(false);
        const popup = document.querySelector("#popup");
        popup.innerHTML = Popup.HTMLTemplate
            .replace("!!!title!!!", this.title)
            .replace("!!!html!!!", this.innerHTML);
        popup.style.display = "block";
        document.querySelector("#main-document").inert = true;
        Popup.showing = this;
        this.callback = callback;
    }

    close(sucessed = true) {
        if (!Popup.showing) return false;
        const popup = document.querySelector("#popup");
        popup.style.display = "none";
        document.querySelector("#main-document").inert = false;
        Popup.showing = null;
        return this.callback(sucessed);
    }
}