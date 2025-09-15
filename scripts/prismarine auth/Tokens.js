// run local storage check on session start please

SisuXBLToken = undefined;
SisuAuthTokens = undefined;
DeviceToken = undefined;
XSTS343Token = undefined;
XSTSPlayfabToken = undefined;
PlayfabSessionToken = undefined;
SpartanToken = undefined;
session_has_checked_storage = false;
function Storage_ParseOrNull(item){
    let temp = localStorage.getItem(item);
    if (temp) return JSON.parse(temp);
    return undefined;
}
function Storage_LoadTokens(){
    if (session_has_checked_storage !== false) return; // no point trying to load this data twice
    SisuXBLToken = Storage_ParseOrNull("SisuXBLToken");
    SisuAuthTokens = Storage_ParseOrNull("SisuAuthTokens");
    DeviceToken = Storage_ParseOrNull("DeviceToken");
    XSTS343Token = Storage_ParseOrNull("XSTS343Token");
    XSTSPlayfabToken = Storage_ParseOrNull("XSTSPlayfabToken");
    PlayfabSessionToken = Storage_ParseOrNull("PlayfabSessionToken");
    SpartanToken = Storage_ParseOrNull("SpartanToken");
    session_has_checked_storage = true;
}
Storage_LoadTokens();
function Storage_LogToken(token_name){
    const token = Storage_ParseOrNull(token_name);
    if (token){
        IsTokenValid(token, token_name);
        console.log(token);
    } else console.log(token_name + " is null");
}
function Storage_LogTokens(){
    Storage_LogToken("SisuXBLToken");
    Storage_LogToken("SisuAuthTokens");
    Storage_LogToken("DeviceToken");
    Storage_LogToken("XSTS343Token");
    Storage_LogToken("XSTSPlayfabToken");
    Storage_LogToken("PlayfabSessionToken");
    Storage_LogToken("SpartanToken");
}
function Storage_WipeTokens(){
    session_has_checked_storage = true;
    SisuXBLToken = undefined;
    SisuAuthTokens = undefined;
    DeviceToken = undefined;
    XSTS343Token = undefined;
    XSTSPlayfabToken = undefined;
    PlayfabSessionToken = undefined;
    SpartanToken = undefined;
    localStorage.clear();
}
function IsTokenValid(token, log_content) {
    if (!token) return false;
	const remainingMs = new Date(token.expiresOn) - Date.now();
	const valid = remainingMs > 1000;
    if (!valid) console.log(log_content + " found in local storage! token was expired.");
    else console.log(log_content + " found in local storage! token expires in " + (remainingMs/3600000).toFixed(2) + " hours");
	return valid;
}

async function Storage_GetSISUXblToken(){
    if (IsTokenValid(SisuXBLToken, "SISU XBL")) return SisuXBLToken;
    // pass any existing non-valid tokens into the function so we can attempt to refresh them
    SisuXBLToken = await Sisu_BeginAuth(SisuXBLToken);
    localStorage.setItem("SisuXBLToken", JSON.stringify(SisuXBLToken));
    console.log("recieved SISU xbl Token");
    return SisuXBLToken;
}
async function Storage_GetSISUAuth(){
    // double check the expiry on the sisu xbl token anyway
    if (IsTokenValid(SisuAuthTokens, "SISU Auth")) return SisuAuthTokens;

    SisuAuthTokens = await Sisu_AuthUser(await Storage_GetSISUXblToken());
    localStorage.setItem("SisuAuthTokens", JSON.stringify(SisuAuthTokens));
    console.log("recieved SISU Auth Tokens");
    return SisuAuthTokens;
}
async function Storage_GetDeviceToken(){
    if (IsTokenValid(DeviceToken, "DEVICE")) return DeviceToken;

    DeviceToken = await getDeviceToken();
    localStorage.setItem("DeviceToken", JSON.stringify(DeviceToken));
    console.log("recieved Device Token");
    return DeviceToken;
}
async function Storage_GetXSTS343Token(){
    if (IsTokenValid(XSTS343Token, "XSTS 343")) return XSTS343Token;
    
    XSTS343Token = await getXSTSToken((await Storage_GetSISUAuth()).UserToken, await Storage_GetDeviceToken(), (await Storage_GetSISUAuth()).TitleToken, "https://prod.xsts.halowaypoint.com/");
    localStorage.setItem("XSTS343Token", JSON.stringify(XSTS343Token));
    console.log("recieved XSTS 343 Token");
    return XSTS343Token;
}
async function Storage_GetXSTSPlayfabToken(){
    if (IsTokenValid(XSTSPlayfabToken, "XSTS Playfab")) return XSTSPlayfabToken;
    
    XSTSPlayfabToken = await getXSTSToken((await Storage_GetSISUAuth()).UserToken, await Storage_GetDeviceToken(), (await Storage_GetSISUAuth()).TitleToken, "rp://playfabapi.com/");
    localStorage.setItem("XSTSPlayfabToken", JSON.stringify(XSTSPlayfabToken));
    console.log("recieved XSTS Playfab Token");
    return XSTSPlayfabToken;
}
async function Storage_GetPlayfabSessionToken(){
    if (IsTokenValid(PlayfabSessionToken, "Playfab Session Token")) return PlayfabSessionToken;
    
    PlayfabSessionToken = await Playfab_RequestSessionTicket();
    localStorage.setItem("PlayfabSessionToken", JSON.stringify(PlayfabSessionToken));
    console.log("recieved Playfab session Token");
    return PlayfabSessionToken;
}
async function Storage_GetSpartanToken(){
    if (IsTokenValid(SpartanToken, "Spartan Token")) return SpartanToken;
    
    SpartanToken = await Waypoint_RequestSpartanToken();
    localStorage.setItem("SpartanToken", JSON.stringify(SpartanToken));
    console.log("recieved Playfab session Token");
    return SpartanToken;
}

async function getXboxToken() {
	try{
        // putting these here so any console log outputs are out of the way
        await Storage_GetSpartanToken();
        await Storage_GetPlayfabSessionToken();
        //await API_Get_CGBList();

        // console.log(await API_Get_Challenges());
        // console.log(await API_Update_Challenges("", "", 10));
        // console.log(await API_Update_Challenges("", "", 90));
        // console.log(await API_Get_Challenges());

        // await API_Get_MOTD();
        //await Waypoint_RequestClearance();
        //await API_AccessResource(); // deprecated ??

        //console.log("Gamergotten's XUID: " + await API_Get_XUID("Gamergotten"));
        //console.log("Invalid GT XUID: " + await API_Get_XUID("sdf7bmas92ds91")); // returns undefined

        //console.log(await API_Get_PlayfabID(2535459205023857)); // gamergottens XUID
        //console.log(await API_Get_LocalPlayfabID());

        // console.log("local user's stats")
        // console.log(await API_Get_PlayerDetails(await API_Get_LocalPlayfabID()));
        // console.log("Gamergotten's stats")
        // console.log(await API_Get_PlayerDetails(await API_Get_PlayfabID(2535459205023857)));

        //console.log(await API_Get_PlayerFileshare(await API_Get_PlayfabID(2535459205023857)));
        //console.log(await API_Get_FileshareDetails("b47471ff-d42a-450e-858e-d4974ce7a7be"));

        //console.log(await API_Get_ProfileFromXUID(2535459205023857)); //returns gamertag + profile picture url + gamerscore
        return;
	}  catch (ex){
		console.log("Xbox access auth process failed." + ex)
	}
}
