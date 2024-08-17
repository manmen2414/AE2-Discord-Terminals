local API = require("api")
local meBridge = peripheral.find("meBridge")
local requested = {};
return function()
    ---@type {type:string,tags:string[],name:string,amount:number,fingerprint:string,isCraftable:boolean,nbt:table,displayName:string,mode:string,reason:string?}[]|nil
    local RequestList = API.Get("/craft")
    if RequestList then
        for index, req in ipairs(RequestList) do
            if req.mode == "request" then
                local sucess, err = false, ""
                if req.type == "item" then
                    sucess, err = meBridge.craftItem({
                        fingerprint = req.fingerprint, count = req.amount
                    })
                else
                    sucess, err = meBridge.craftFluid({
                        fingerprint = req.fingerprint, count = req.amount
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
                    print("Resolve Craft " .. req.name .. " x" .. req.amount)
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
        if req.mode == "crafting" and not meBridge.isItemCrafting({ fingerprint = req.fingerprint }) then
            print("Fingerprint[" .. req.fingerprint .. "] craft is end.")
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

    return API.ReplaceElements(items, fluids, craftableitems, craftablefluids);
end