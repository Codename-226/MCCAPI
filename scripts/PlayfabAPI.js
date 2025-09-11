
function FormatXSTS(uhs, xsts){
    return 'XBL3.0 x='+uhs+';'+xsts;
}

async function Playfab_RequestSessionTicket(){
    UI_PushJob("requesting 343 & Playfab XSTS...");
    playfab_xsts = await Storage_GetXSTSPlayfabToken();
    console.log("playfab xsts poodp")
    console.log(playfab_xsts)
    UI_PushJob("attempting to connect to 343 playfab api...");
    const payload = {'XboxToken':FormatXSTS(playfab_xsts.uhs, playfab_xsts.Token), "CreateAccount":true, "TitleId": "EE38"};
    const body = JSON.stringify(payload)
    const headers = {  'Content-Type': 'application/json', 'Accept':'application/json', /*'User-Agent':'cpprestsdk/2.9.0'*/ }

    console.log(body)
    console.log("playfab access check")
    const res = await fetch('https://ee38.playfabapi.com/Client/LoginWithXbox', { method: 'post', headers, body })
    const data = await res.json();
    data.data.expiresOn = new Date(data.data.EntityToken.TokenExpiration);
    return data.data;
}

/*


ee38.playfabapi.com/Client/GetStoreItems
- Content-Type:application/json
- Accept:application/json
- X-Authentication:
- {"StoreId":"Season4","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season8","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season6","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season1","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season5","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season7","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season3","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season2","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"FreemiumStore","CatalogVersion":"SeasonCatalog"}

ee38.playfabapi.com/Client/GetCatalogItems
- Content-Type:application/json
- Accept:application/json
- X-Authentication:
- {"CatalogVersion":"SeasonCatalog"}
-> returns every single purchaseable item with extended details

ee38.playfabapi.com/Client/GetUserInventory
- Content-Type:application/json
- Accept:application/json
- X-Authentication:
-> returns all unlocked customization items

mcc-production.azurefd.net/api/GetPlayFabUgcItems
- Accept:application/json
- CreatorEntityId: 
- UserEntityId:
-> returns fileshare items from specified creator (uses)

mcc-production.azurefd.net/api/CustomizationWritePlayFabEntityObject
- Accept:application/json, Application/json
- Content-Type:text/plain; charset=utf-8
- x-auth-token:
- {"PlayerCustomization":{"c0":2,"c1":3,"c2":1,"e0":49,"e1":505,"s":"JT0","c":"UNSC","a":6,"n":1}}

mcc-production.azurefd.net/api/ServerListListMultiplayerServers
- Accept:application/json
- Content-Type:application/json
- x-auth-token:
- {"BuildId":"2025.02.25.178468.1-Release","MaxResults":2000}
-> returns a list of all CGB sessions

mcc-production.azurefd.net/api/GetPlayFabUgcItem
- Accept:application/json
- Content-Type:application/json
- X-EntityToken:
- {"ItemId":"b47471ff-d42a-450e-858e-d4974ce7a7be"}
-> returns details about the item, name/desc etc, it provides a download url as well

mcc-production.azurefd.net/api/ProgressionGetUnlockableContainers
- Accept:application/json
- Content-Type:text/plain; charset=utf-8
- x-auth-token: (playfab session ticket)
-> returns {"PlayFabStoreIds":["Season1","Season2","Season3","Season4","Season5","Season6","Season7","Season8"]}

ee38.playfabapi.com/Profile/GetProfiles
- Accept:application/json
- Content-Type:application/json
- X-EntityToken:
- {"Entities" : [{"Id": "BF8D123F4B76B565","Type": "title_player_account"} ]}
-> returns stats and user customization (set by CustomizationWritePlayFabEntityObject)

ee38.playfabapi.com/Client/GetPlayFabIDsFromXboxLiveIDs
- Accept:application/json
- Content-Type:application/json
- X-Authentication:
- { "Sandbox" : "RETAIL", "XboxLiveAccountIDs" : [ "2535459205023857" ]}
-> returns playfab master ID (use with GetTitlePlayersFromMasterPlayerAccountIds) 

ee38.playfabapi.com/Profile/GetTitlePlayersFromMasterPlayerAccountIds
- Accept:application/json
- Content-Type:application/json
- X-EntityToken:
- { "TitleId" : "EE38", "MasterPlayerAccountIds" : [ "5B6477301A498DB" ]}
-> returns a playfab player title ID, can use with GetPlayFabUgcItems call

ee38.playfabapi.com/MultiplayerServer/ListQosServersForTitle
- Content-Type:application/json
- Accept:application/json
- X-Authentication
- {"IncludeAllRegions":"false"}
-> returns region server list




*/


async function Playfab_(){

}