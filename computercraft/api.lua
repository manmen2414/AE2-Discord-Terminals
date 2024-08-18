local function getFromEnv(key)
    local env = fs.open(".env", "r")
    local existNext = true;
    local foundvalue = "";
    while existNext do
        local text = env.readLine();
        local inner = text:match("^" .. key .. "=\"(.+)\"")
        if inner then
            foundvalue = inner;
            break;
        end
        if not text then
            existNext = false;
            break;
        end
    end
    if existNext then
        return foundvalue;
    else
        error(".env don't had key " .. key)
    end
end
local GET = "GET"; local POST = "POST"; local PUT = "PUT"; local DELETE = "DELETE";
local CTJson = { ["Content-Type"] = "application/json" }
local URL = getFromEnv("API_URL")
local Request = function(at, data, method)
    http.request { url = URL .. at, body = textutils.serialiseJSON(data), headers = CTJson, method = method }
    local sucessed = false;
    local returned = {};
    parallel.waitForAny(function()
        local event, url, handle = os.pullEvent("http_success")
        sucessed = true;
        returned = handle;
    end, function()
        local event, url, err = os.pullEvent("http_failure")
        sucessed = false;
        returned = err;
    end)
    if not sucessed then
        return nil, returned
    end
    local json = textutils.unserialiseJSON(returned.readAll());
    returned.close();
    return true, json;
end
---@return {items:table[],craftrequest:table,crafting:table[],craft_finished:table[]}|nil
local Get = function(at)
    local req = http.get(URL .. at)
    if req then
        local json = textutils.unserialiseJSON(req.readAll())
        req.close();
        return json;
    else
        return nil;
    end
end
return {
    URL = URL,
    Get = Get,
    Request = Request,
    ReplaceElements = function(items, fluids, craftableitems, craftablefluids)
        Request("/elements",
            { items = items, craftableitems = craftableitems, fluids = fluids, craftablefluids = craftablefluids }, POST);
    end,
    GetElements = function()
        return Get("/elements").data;
    end
}
