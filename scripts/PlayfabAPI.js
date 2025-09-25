
function FormatXSTS(xsts){
    return 'XBL3.0 x='+xsts.uhs+';'+xsts.Token;
}
async function Playfab_RequestSessionTicket(){
    UI_PushJob("requesting playfab XSTS...");
    playfab_xsts = await Storage_GetXSTSPlayfabToken();
    UI_PushJob("attempting to connect to 343 playfab api...");
    const body = JSON.stringify({'XboxToken':FormatXSTS(playfab_xsts), "CreateAccount":true, "TitleId": "EE38"});
    const headers = {  'Content-Type': 'application/json', 'Accept':'application/json' }
    const res = await fetch('https://ee38.playfabapi.com/Client/LoginWithXbox', { method: 'post', headers, body })
    const data = (await res.json()).data;
    data.expiresOn = new Date(data.EntityToken.TokenExpiration);
    return data;
}
async function Waypoint_RequestSpartanToken(){
    waypoint_xsts = await Storage_GetXSTS343Token();
    UI_PushJob("requesting spartan token...");
    const body = JSON.stringify({"Audience": "urn:343:s3:services","MinVersion": 4, "Proof": [{ "TokenType": "Xbox_XSTSv3", "Token": waypoint_xsts.Token }] });
    const headers = {  'Content-Type': 'application/json', 'Accept':'application/json'}
    const res = await fetch('https://settings.svc.halowaypoint.com/spartan-token', { method: 'post', headers, body })
    const data = await res.json();
    data.expiresOn = new Date(data.ExpiresUtc.ISO8601Date);
    return data;
}
clearance = undefined; // this seems to be a static value, so we'll only fetch it once per session, without expiry!!!
async function Waypoint_RequestClearance(){
    if (clearance) return clearance;
    const sisu_auth = await Storage_GetSISUAuth();
    const spartan_token = await Storage_GetSpartanToken(); // .SpartanToken
    UI_PushJob("requesting spartan token...");
    const headers = { 'Accept':'application/json', 'X-343-Authorization-Spartan':spartan_token.SpartanToken}
    const res = await fetch('https://settings.svc.halowaypoint.com/oban/flight-configurations/titles/hmcc/audiences/RETAIL/players/xuid('+sisu_auth.AuthorizationToken.xid+')/active', { method: 'get', headers })
    const data = await res.json();
    clearance = data.FlightConfigurationId;
    return clearance;
}



async function API_Get_CGBList(){
    playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting CGB server list...");
    const body = JSON.stringify({"BuildId":"2025.02.25.178468.1-Release","MaxResults":2000});
    const headers = {'Content-Type':'application/json', 'Accept':'application/json', 'x-auth-token':playfab_auth.SessionTicket}
    const res = await fetch('https://mcc-production.azurefd.net/api/ServerListListMultiplayerServers', { method: 'post', headers, body })
    const cgb_list = (await res.json()).data;
    // decode data for easy access
    for (let i = 0; i < cgb_list.Games.length; i++)
        cgb_list.Games[i].GameServerData = JSON.parse(decodeAndDecompress(cgb_list.Games[i].GameServerData));
    return cgb_list;
}

// NOTE: challenge details can be found with this url: gamecms-hacs.svc.halowaypoint.com/hmcc/progression/file + /game/challenges/ClientChallengeDefinitions/WeeklyPVE/ChallengeFinishedWeeklyPVEChallenge.json
async function API_Get_Challenges(){
    const sisu_auth = await Storage_GetSISUAuth();
    const spartan_token = await Storage_GetSpartanToken(); // .SpartanToken
    const clearance = await Waypoint_RequestClearance();
    UI_PushJob("requesting player challenges...");
    const headers = {'Accept':'application/json', 'X-343-Authorization-Spartan':spartan_token.SpartanToken}
    // NOTE: xuid must match owner of spartan token !!!! so we cant lookup other players challenges
    const res = await fetch('https://halostats.svc.halowaypoint.com/hmcc/players/xuid('+ sisu_auth.AuthorizationToken.xid + ')/decks', { method: 'get', headers })
    const ret = await res.json();
    async function convert_challenge_url(object){
        try{
        target_url = 'https://gamecms-hacs.svc.halowaypoint.com/hmcc/progression/file/' + object.Path + "?flight=" + clearance;
        const res = await fetch(target_url, { method: 'get', headers:{'Accept':'application/json'} })
        object.data = await res.json();
        } catch (ex){object.data=undefined; console.log("challenge details fetch encountered error: " + ex)} // NOTE: setting to undefined is placeholder logic??
    }
    function makeStatusAware(object) {
        let isPending = true;
        const result = convert_challenge_url(object).then((value) => {isPending = false; return value;});
        result.isPending = () => isPending;
        return result;
    }
    let fetch_list = [];
    for (let i = 0; i < ret.AssignedDecks.length; i++){
        curr_deck = ret.AssignedDecks[i];
        fetch_list.push(makeStatusAware(curr_deck));
        for (let j = 0; j < curr_deck.ActiveChallenges.length; j++)
            fetch_list.push(makeStatusAware(curr_deck.ActiveChallenges[j]));
        for (let j = 0; j < curr_deck.CompletedChallenges.length; j++)
            fetch_list.push(makeStatusAware(curr_deck.CompletedChallenges[j]));
    }
    let total_fetches = fetch_list.length;
    while (fetch_list.length > 0){
        UI_PushJob("awaiting challenge details return (" + (total_fetches-fetch_list.length)  + "/" + total_fetches + ")");
        await sleep(300);
        for (let i = 0; i < fetch_list.length; i++){
            if (!fetch_list[i].isPending()){
                fetch_list.splice(i, 1);
                i--;
            }
        }
    }
    return ret;
}
async function API_Update_Challenges(deck_id, challenge_id, progress_state){
    const sisu_auth = await Storage_GetSISUAuth();
    const spartan_token = await Storage_GetSpartanToken(); // .SpartanToken
    UI_PushJob("patching player challenge...");
    const body = JSON.stringify({ "Progress": progress_state, });
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-343-Authorization-Spartan':spartan_token.SpartanToken}
    const res = await fetch('https://halostats.svc.halowaypoint.com/hmcc/players/xuid('+sisu_auth.AuthorizationToken.xid+')/decks/'+deck_id+'/challenges/'+challenge_id, { method: 'patch', headers, body })
    return await res.json();
}

async function API_Get_MOTD(){
    UI_PushJob("requesting message of the day...");
    const res = await fetch('https://gamecms-hacs.svc.halowaypoint.com/hmcc/Community/file/meld/json/allpivots.json', { method: 'get', headers:{'Accept-Language':'en-US'} })
    const motd = await res.json();
    const vers_res = await fetch('https://gamecms-hacs.svc.halowaypoint.com/hmcc/Community/file/meld/json/meldbase.json', { method: 'get', headers:{'Accept-Language':'en-US'} })
    const vers_motd = await vers_res.json();
    return {...vers_motd, 'motd_data':motd};
}

async function API_Get_XUID(gamertag){
    const sisu_auth = await Storage_GetSISUAuth();
    UI_PushJob("requesting player xuid...");
    const headers = {'Content-Type':'application/json', 'Authorization':FormatXSTS(sisu_auth.AuthorizationToken), 'x-xbl-client-type':'Console', 'x-xbl-contract-version':'3'}
    const res = await fetch('https://profile.xboxlive.com/users/gt('+ gamertag + ')/profile/settings?settings=Gamertag', { method: 'get', headers })
    if (res.status != 200) return;
    const ret = await res.json();
    if (ret.profileUsers.length == 0) return;
    return ret.profileUsers[0].id;
}
async function API_Get_PlayfabID(xuid){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("fetching xuid playfab master id...");
    const body = JSON.stringify({ "Sandbox" : "RETAIL", "XboxLiveAccountIDs" : [ "" + xuid ]});
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-Authentication':playfab_auth.SessionTicket}
    const res = await fetch('https://ee38.playfabapi.com/Client/GetPlayFabIDsFromXboxLiveIDs', { method: 'post', headers, body })
    const ret =  (await res.json()).data.Data[0].PlayFabId;
    UI_PushJob("fetching xuid playfab id...");
    const _body = JSON.stringify({ "TitleId" : "EE38", "MasterPlayerAccountIds" : [ ret ]});
    const _headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-EntityToken':playfab_auth.EntityToken.EntityToken}
    const _res = await fetch('https://ee38.playfabapi.com/Profile/GetTitlePlayersFromMasterPlayerAccountIds', { method: 'post', headers:_headers, body:_body })
    return (await _res.json()).data.TitlePlayerAccounts[ret].Id;
}
async function API_Get_LocalPlayfabID(){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    return playfab_auth.EntityToken.Entity.Id;
}

async function API_Get_PlayerDetails(playfabID){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting player details...");
    const body = JSON.stringify({"Entities" : [{"Id": playfabID,"Type": "title_player_account"} ]});
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-EntityToken':playfab_auth.EntityToken.EntityToken}
    const res = await fetch('https://ee38.playfabapi.com/Profile/GetProfiles', { method: 'post', headers, body })
    return (await res.json()).data.Profiles[0];
    // NOTE: we should be decoding the player customization stuff??
}

async function API_Get_PlayerFileshare(playfabID){
    UI_PushJob("requesting player fileshare...");
    const headers = {'Accept':'application/json', 'UserEntityId':await API_Get_LocalPlayfabID(), 'CreatorEntityId':playfabID}
    const res = await fetch('https://mcc-production.azurefd.net/api/GetPlayFabUgcItems', { method: 'post', headers })
    return (await res.json()).data;
}
async function API_Get_FileshareDetails(fileshare_item_id){ // this literally just gives the same thing as above but with a download url; // input .Id values from entries from above function
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting player details...");
    const body = JSON.stringify({"ItemId":fileshare_item_id});
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-EntityToken':playfab_auth.EntityToken.EntityToken}
    const res = await fetch('https://mcc-production.azurefd.net/api/GetPlayFabUgcItem', { method: 'post', headers, body })
    return (await res.json()).data.Item;
}

// NOTE: if this is failing, then either no profile or you need to refresh your basic sisu accesscode/refresh token
async function API_Get_ProfileFromXUID(xuid){
    const sisu_auth = await Storage_GetSISUAuth();
    UI_PushJob("getting profile from XUID...");
    const body = JSON.stringify({"userIds":["" + xuid],"settings":["AppDisplayName","AppDisplayPicRaw","GameDisplayName","GameDisplayPicRaw","Gamerscore","Gamertag","ModernGamertag","ModernGamertagSuffix","UniqueModernGamertag"]});
    // NOTE: MCC provides a signature param here, but doesnt seem to need it
    const headers = {'Accept-Language':'en-US,en', 'Content-Type':'application/json; charset=utf-8', 'x-xbl-contract-version':'2', 'Authorization':FormatXSTS(sisu_auth.AuthorizationToken)}
    const res = await fetch('https://profile.xboxlive.com/users/batch/profile/settings', { method: 'post', headers, body })
    return (await res.json()).profileUsers[0];
}
async function API_Get_ProfileFromXUIDs(xuids){
    const sisu_auth = await Storage_GetSISUAuth();
    UI_PushJob("getting profile from XUID...");
    const body = JSON.stringify({"userIds":xuids,"settings":["AppDisplayName","AppDisplayPicRaw","GameDisplayName","GameDisplayPicRaw","Gamerscore","Gamertag","ModernGamertag","ModernGamertagSuffix","UniqueModernGamertag"]});
    // NOTE: MCC provides a signature param here, but doesnt seem to need it
    const headers = {'Accept-Language':'en-US,en', 'Content-Type':'application/json; charset=utf-8', 'x-xbl-contract-version':'2', 'Authorization':FormatXSTS(sisu_auth.AuthorizationToken)}
    const res = await fetch('https://profile.xboxlive.com/users/batch/profile/settings', { method: 'post', headers, body })
    return (await res.json());
}


async function API_Get_Unlocks(){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting player unlocks...");
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-Authentication':playfab_auth.SessionTicket}
    const res = await fetch('https://ee38.playfabapi.com/Client/GetUserInventory', { method: 'post', headers })
    return (await res.json()).data;
}
async function API_Get_UnlockDatabase(){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting all unlockables...");
    const body = JSON.stringify({"CatalogVersion":"SeasonCatalog"});
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-Authentication':playfab_auth.SessionTicket}
    const res = await fetch('https://ee38.playfabapi.com/Client/GetCatalogItems', { method: 'post', headers, body })
    return (await res.json()).data.Catalog;
}
// input stores: "Season1", "Season2", "Season3", "Season4", "Season5", "Season6", "Season7", "Season8", "FreemiumStore"
async function API_Get_StoreDatabase(store_id){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("requesting purchaseable store unlocks...");
    const body = JSON.stringify({"StoreId":store_id,"CatalogVersion":"SeasonCatalog"});
    const headers = {'Accept':'application/json', 'Content-Type':'application/json', 'X-Authentication':playfab_auth.SessionTicket}
    const res = await fetch('https://ee38.playfabapi.com/Client/GetStoreItems', { method: 'post', headers, body })
    return (await res.json()).data;
}
// returns status 500 (internal server error) when:
// - purchasing already owned item
// - purchasing item that you dont have permission to unlock (must own all previous items in season)
// - mismatch betwen item id and store id (must indicate correct store ID)
// - purchasing freemium items?? (needs verifying, but seems like this functionality would be useless regardless)
async function API_PurchaseSeasonal(store_id, item_id){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    const spartan_token = await Storage_GetSpartanToken();
    UI_PushJob("purchasing seasonal item...");
    const body = JSON.stringify({"StoreId":store_id,"StoreItemId":item_id,"EPlayFabItemPurchaseType":"UnlockableContainer"});
    const headers = {'Content-Type':'application/json', 'x-auth-token':playfab_auth.SessionTicket, 'X-343-Authorization-Spartan':spartan_token.SpartanToken}
    const res = await fetch('https://mcc-production.azurefd.net/api/ProgressionPurchaseAndUnlockContainer', { method: 'post', headers, body })
    return (await res.json());
}
// returns status 500 (internal server error) when:
// - purchasing already owned item
// - purchasing item not on the freemium store database
// - purchasing an item listed on the freemium database thats actually a part of a bundle IE. POSEBUNDLE_PEACE succeeds, but CUSTOMIZATION_H4_POSE_PEACESIGN fails
// - purchasing an item thats not in the current rotation (NOTE: need an api to even figure out whats for sale??)
async function API_PurchaseFreemium(item_id){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    const spartan_token = await Storage_GetSpartanToken();
    UI_PushJob("purchasing freemium item...");
    const body = JSON.stringify({"StoreId":"FreemiumStore","StoreItemId":item_id,"EPlayFabItemPurchaseType":"FreemiumStoreItem","ClearanceId":await Waypoint_RequestClearance()});
    const headers = {'Content-Type':'application/json', 'x-auth-token':playfab_auth.SessionTicket, 'X-343-Authorization-Spartan':spartan_token.SpartanToken}
    const res = await fetch('https://mcc-production.azurefd.net/api/ProgressionPurchaseFreemiumStoreItem', { method: 'post', headers, body })
    return (await res.json());
}

// NOTE: this is pretty much useless as this api is constantly called ingame and overwrites whatever you set it to externally
// notably you can use this for accounts that you dont play on. IE inactive accounts or fileshare alts, since you'll never log in to overwrite the data
// seems like a neat thing to set essential bio text in your player details section
async function API_UploadCustomizations(){
    const playfab_auth = await Storage_GetPlayfabSessionToken();
    UI_PushJob("uploading customizations...");
    const body = JSON.stringify({"PlayerCustomization":{"c0":31,"c1":32,"c2":33,"e0":1,"e1":1,"s":"Epic !!!!!!","c":"Welcome to my epic profile. Many epic characters in this string. Status: Epic","a":34,"n":154}});
    const headers = {'Accept':'application/json, Application/json', 'Content-Type':'text/plain; charset=utf-8', 'x-auth-token':playfab_auth.SessionTicket}
    const res = await fetch('https://mcc-production.azurefd.net/api/CustomizationWritePlayFabEntityObject', { method: 'post', headers, body })
    return (await res.json());
    // max c character count: 139 characters or 356 base64 characters?
    // max s character count: no idea, but looks funny "Epic !!!!!!"
}

/*




/////////> USELESS ONES

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

ee38.playfabapi.com/MultiplayerServer/ListQosServersForTitle
- Content-Type:application/json
- Accept:application/json
- X-Authentication
- {"IncludeAllRegions":"false"}
-> returns region server list (useless)

mcc-production.azurefd.net/api/ProgressionGetUnlockableContainers
- Accept:application/json
- Content-Type:text/plain; charset=utf-8
- x-auth-token: (playfab session ticket)
-> returns {"PlayFabStoreIds":["Season1","Season2","Season3","Season4","Season5","Season6","Season7","Season8"]}



to get:
upload file to fileshare

*/