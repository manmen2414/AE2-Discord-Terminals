local function checkYes(ans)
    return ans ~= "n" and ans ~= "no" and ans ~= "No" and ans ~= "N" and ans ~= "NO"
end
term.setBackgroundColor(colors.white)
term.clear();
term.setCursorPos(1, 1);
term.setTextColor(colors.brown)
print("Hello! (-v-)/")
term.setTextColor(colors.black)
print("Do you want to install?")
term.setTextColor(colors.green)
print("AE2-Discord-Terminal")
term.setTextColor(colors.black)
term.blit("(Y/n): ", "fdfefff", "0000000")
local ans = read();
if checkYes(ans) then
    term.write("Can Use startup?")
    term.blit("(Y/n): ", "fdfefff", "0000000")
    ans = read();
    if checkYes(ans) then
        shell.run(
            "wget https://raw.githubusercontent.com/takoyakidath/AE2-Discord-Terminals/refs/heads/main/computercraft/startup.lua")
    else
        shell.run(
            "wget https://raw.githubusercontent.com/takoyakidath/AE2-Discord-Terminals/refs/heads/main/computercraft/startup.lua AE2DTerminal.lua")
    end
    shell.run(
        "wget https://raw.githubusercontent.com/manmen2414/AE2-Discord-Terminals/main/computercraft/everyEvents.lua")
    shell.run("wget https://raw.githubusercontent.com/manmen2414/AE2-Discord-Terminals/main/computercraft/api.lua")
    term.write("API URL: ")
    ans = read();
    local writeStream = fs.open(".env", "w")
    writeStream.write("API_URL=\"" .. ans .. "\"")
    writeStream.close();
    term.setTextColor(colors.magenta)
    print("Installed!")
    term.setTextColor(colors.black)
    for i = 1, 5, 1 do
        term.write("Restart in " .. 6 - i)
        sleep(1);
    end
    os.reboot();
else
    term.setBackgroundColor(colors.black)
    term.clear();
    term.setCursorPos(1, 1);
end
