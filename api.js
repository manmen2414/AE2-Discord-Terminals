require("dotenv").config();
const http = require("http");

/**
 * 
 * @param {string} at 
 * @param {object?} data 
 * @param {string} method
 */

const Request = (at, data, method) => new Promise(async (s, f) => {
    try {
        const res = await new Promise((resolve, reject) => {
            try {
                const content = !!data ? JSON.stringify(data) : ""
                const req = http.request(process.env.API_URL + at, { // <1>
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                        'Content-Length': '' + content.length,
                        'X-Header': 'X-Header',
                    },
                })

                req.on('response', resolve)
                req.on('error', reject)
                if (!!data)
                    req.write(content)
                req.end()
            } catch (err) {
                reject(err)
            }
        })

        const chunks = await new Promise((resolve, reject) => {
            try {
                const chunks = []

                res.on('data', (chunk) => chunks.push(chunk)) // <6>
                res.on('end', () => resolve(chunks)) // <7>
                res.on('error', reject) // <8>
            } catch (err) {
                reject(err)
            }
        })

        const buffer = Buffer.concat(chunks) // <9>
        const body = JSON.parse(buffer)

        s(body)
    } catch (e) {
        if (e.errno !== -4077)
            f(e)
    }
})
const Get = (at) => Request(at, null, "GET");
/**@returns {Promise<{"type":string,"tags":string[],"name":string,"amount":number,"fingerprint":string,"isCraftable":boolean,"nbt":object,"displayName":string}[]>} */
const GetElements = () => new Promise((s, r) => {
    Get("/elements").then((json) => {
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

module.exports = {
    Get: Get,
    GetElements: GetElements,
    Request: Request
}