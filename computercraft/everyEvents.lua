local API = require("api")
local meBridge = peripheral.find("meBridge")
local requested = {};
return function()
    ---@type {type:string,tags:string[],name:string,amount:number,fingerprint:string,isCraftable:boolean,nbt:table,displayName:string,mode:string,reason:string?,craftAmount:number?}[]|nil
    local RequestList = API.Get("/craft")
    if RequestList then
        for index, req in ipairs(RequestList) do
            if req.mode == "request" then
                local sucess, err = false, ""
                if req.type == "item" then
                    sucess, err = meBridge.craftItem({
                        fingerprint = req.fingerprint, count = req.craftAmount
                    })
                else
                    sucess, err = meBridge.craftFluid({
                        name = req.name, count = req.craftAmount
                    })
                end
                if sucess then
                    req.mode = "crafting";
                    local sucessed, res = API.Request("/craft/" .. req.id, req, "PUT");
                    if sucessed == nil then
                        print(res)
                        print(API.URL .. "/craft/" .. req.id)
                        return;
                    end
                    requested[#requested + 1] = req
                    print("Resolve Craft " .. req.name .. " x" .. req.craftAmount)
                else
                    if err then
                        req.reason = err;
                        req.mode = "error";
                    end
                    API.Request("/craft/" .. req.id, req, "PUT")
                end
            end
        end
    end
    for index, req in ipairs(requested) do
        local crafting = true;
        if req.type == "item" then
            crafting = meBridge.isItemCrafting({ fingerprint = req.fingerprint });
        elseif req.type == "fluid" then
            crafting = meBridge.isFluidCrafting({ name = req.name });
        end
        if req.mode == "crafting" and not crafting then
            req.mode = "finished";
            local sucessed, res = API.Request("/craft/" .. req.id, req, "PUT")
            if not sucessed then return end
            print("Request Complete: " .. req.name);
        end
    end
    local items = meBridge.listItems();
    local craftableitems = meBridge.listCraftableItems();
    local fluids = meBridge.listFluid();
    local craftablefluids = meBridge.listCraftableFluid();

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
    items = tagsFix(items)
    craftablefluids = tagsFix(craftablefluids)
    craftableitems = tagsFix(craftableitems)
    fluids = tagsFix(fluids)

    API.ReplaceElements(items, fluids, craftableitems, craftablefluids);
end
