
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
- {"StoreId":"Season1","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season2","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season3","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season4","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season5","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season6","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season7","CatalogVersion":"SeasonCatalog"}
- {"StoreId":"Season8","CatalogVersion":"SeasonCatalog"}
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
-> returns region server list (useless)

mcc-production.azurefd.net/api/ProgressionPurchaseAndUnlockContainer
- Content-Type:application/json
- X-343-Authorization-Spartan:
- x-auth-token:
- {"StoreId":"Season1","StoreItemId":"S1T02","EPlayFabItemPurchaseType":"UnlockableContainer"}
- {"StoreId":"Season1","StoreItemId":"S1T03","EPlayFabItemPurchaseType":"UnlockableContainer"}
-> returns basically a virtual receipt

mcc-production.azurefd.net/api/ProgressionPurchaseFreemiumStoreItem
- Content-Type:application/json
- X-343-Authorization-Spartan:
- x-auth-token:
- {"StoreId":"FreemiumStore","StoreItemId":"POSEBUNDLE_ONPATROL","EPlayFabItemPurchaseType":"FreemiumStoreItem","ClearanceId":""}
- {"StoreId":"FreemiumStore","StoreItemId":"CUSTOMIZATION_HR_Helmet_Mariner_MISTERCHIEF","EPlayFabItemPurchaseType":"FreemiumStoreItem","ClearanceId":""}
-> same return as the other

GET halostats.svc.halowaypoint.com/hmcc/players/xuid(2535430211370706)/decks
- Accept:Application/json
- X-343-Authorization-Spartan:
-> returns all challenges & their progress

PATCH halostats.svc.halowaypoint.com/hmcc/players/xuid(2535430211370706)/decks/Player_Deck_8584434784854775807_979f36de-ea11-5e2c-285c-5475dfb988b8/challenges/0b4b07ac-9b46-43af-b761-320adc730c89
- Accept:Application/json
- Content-Type:application/json
- X-343-Authorization-Spartan:
- { "Progress": 3, }
-> returns challenge info with updated progress and completed status

mcc-production.azurefd.net/api/ProgressionCachePlayerXPToPlayFab
- Accept:application/json, Application/json
- X-343-Authorization-Spartan:
- x-auth-token:
-> returns rank and XP data (although there should be a better API for this, including getting other players ranks)

GET gamecms-hacs.svc.halowaypoint.com/hmcc/progression/file/game/seasons_v2.json?flight=
- Accept:Application/json
- Accept-Language:en-US
- X-343-Authorization-Spartan:
-> returns {"Seasons":[{"SeasonId":"S1","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season1","Season":1,"StartDateUtc":"2019-12-03T00:00:00Z","SeasonName":"$SEASON_1_NAME","SeasonImage":"SeasonIcon_01"},{"SeasonId":"S2","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season2","Season":2,"StartDateUtc":"2020-07-16T00:00:00Z","SeasonName":"$SEASON_2_NAME","SeasonImage":"SeasonIcon_02"},{"SeasonId":"S3","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season3","Season":3,"StartDateUtc":"2020-09-22T00:00:00Z","SeasonName":"$SEASON_3_NAME","SeasonImage":"SeasonIcon_03"},{"SeasonId":"S4","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season4","Season":4,"StartDateUtc":"2020-10-08T00:00:00Z","SeasonName":"$SEASON_4_NAME","SeasonImage":"SeasonIcon_04"},{"SeasonId":"S5","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season5","Season":5,"StartDateUtc":"2020-11-23T00:00:00Z","SeasonName":"$SEASON_5_NAME","SeasonImage":"SeasonIcon_05"},{"SeasonId":"S6","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season6","Season":6,"StartDateUtc":"2021-02-23T00:00:00Z","SeasonName":"$SEASON_6_NAME","SeasonImage":"SeasonIcon_06"},{"SeasonId":"S7","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season7","Season":7,"StartDateUtc":"2021-05-27T00:00:00Z","SeasonName":"$SEASON_7_NAME","SeasonImage":"SeasonIcon_07"},{"SeasonId":"S8","PlayFabCatalogId":"SeasonCatalog","PlayFabStoreId":"Season8","Season":8,"StartDateUtc":"2021-09-08T00:00:00Z","SeasonName":"$SEASON_8_NAME","SeasonImage":"SeasonIcon_08"}]}



-- TO GET:
- get player rank/xp
- get player nameplate and other customizations


*/


async function Playfab_(){

}