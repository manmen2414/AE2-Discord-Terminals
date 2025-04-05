local config = {
    roopSecond = 2
}
term.clear();
term.setCursorPos(1, 1);
term.setTextColor(colors.yellow);
print("- AE2 on Discord -")
term.setTextColor(colors.white);

local api = require("api")
local everyEvents = require("everyEvents")
print("Get api and Events...")
local isValidURL = http.checkURL(api.URL)
local Response = http.get(api.URL .. "/ping")
if isValidURL and Response then
    print("API Check Sucess.")
elseif isValidURL then
    error("URL check is sucess,But don't response api.")
else
    error("URL is wrong.");
end

repeat
    pcall(everyEvents)
    --everyEvents()
    sleep(config.roopSecond)
until false
