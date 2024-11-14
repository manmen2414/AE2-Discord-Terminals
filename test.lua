local meBridge = peripheral.find("meBridge")
local printer = peripheral.find("printer")
local tagsFix = function(arr)
    local newarr = {}
    for index, value in ipairs(arr) do
        if #value.tags == 0 then
            value.tags = {};
        end
        newarr[#newarr + 1] = value
    end
    return newarr;
end
local items = meBridge.listItems();
local fluids = meBridge.listFluid();
items = tagsFix(items)
fluids = tagsFix(fluids)

local itemstr = textutils.serialiseJSON(items);
local repeatCount = math.ceil(#itemstr / 25);
local writedLine = 1
local nowpage = 1;
printer.newPage()
printer.setPageTitle("" .. nowpage)
for i = 1, repeatCount, 1 do
    printer.setCursorPos(1, writedLine)
    printer.write(itemstr:sub((i - 1) * 25 + 1, i * 25))
    writedLine = writedLine + 1
    if writedLine == 22 then
        if not printer.endPage() then read() end
        if not printer.newPage() then read() end
        writedLine = 1;
        nowpage = nowpage + 1;
        printer.setPageTitle("" .. nowpage)
    end
end
