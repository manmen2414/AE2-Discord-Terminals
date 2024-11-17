const defaultHeaders = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'X-Header': 'X-Header',
}

function IsJsonParseable(text) {
    try { JSON.parse(text); return true }
    catch (ex) { return false }
}


/**
 * @param {string} url 
 * @param {string} method 
 * @param {string} data 
 * @param {object} headers
 * @returns {Promise<object|string>}
 */
function APIRequest(url, method = "GET", data = "", headers = defaultHeaders) {
    return new Promise((resolve, reject) => {
        //urlが/から始まるならhttp://~~~.comの部分を付け加える
        url = url.startsWith("/") ? location.href.split("/").slice(0, 3).join("/") + url : url;
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                const res = xhr.response.toString();
                if (IsJsonParseable(res))
                    resolve(JSON.parse(res));
                else resolve(res);
            }
        };
        xhr.addEventListener("error", (ex) => {
            reject(ex);
        });
        xhr.open(method, url);
        Object.entries(headers).forEach((header) => {
            xhr.setRequestHeader(...header);
        })
        xhr.send(data);
    })
}

/**
 * 
 * @returns {Promise<rawMEElement[]>}
 */
function GetElements() {
    return new Promise((s, r) => {
        APIRequest("/elements").then((json) => {
            let { items, fluids, craftableitems, craftablefluids } = json;
            if (!items.length) items = [];
            if (!fluids.length) fluids = [];
            if (!craftablefluids.length) craftablefluids = [];
            if (!craftableitems.length) craftableitems = [];
            craftableitems.forEach(CAitems => {
                if (items.findIndex((i) => i.name === CAitems.name) === -1 || CAitems.amount === 0) {
                    items.push(CAitems);
                }
            });
            craftablefluids.forEach(CAfluids => {
                if (fluids.findIndex((f) => f.name === CAfluids.name) === -1 || CAfluids.amount === 0) {
                    fluids.push(CAfluids);
                }
            });
            s(items.map(e => ({ type: "item", ...e })).concat(fluids.map(e => ({ type: "fluid", ...e }))))
        }).catch(e => r(e))
    })
}