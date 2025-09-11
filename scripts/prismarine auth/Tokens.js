// run local storage check on session start please

SisuXBLToken = undefined;
SisuAuthTokens = undefined;
DeviceToken = undefined;
XSTS343Token = undefined
XSTSPlayfabToken = undefined
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
    session_has_checked_storage = true;
}
function Storage_LogTokens(){
    console.log("Sisu XBL Token");
    console.log(Storage_ParseOrNull("SisuXBLToken"));
    console.log("Sisu Auth Token");
    console.log(Storage_ParseOrNull("SisuAuthTokens"));
    console.log("Device Token");
    console.log(Storage_ParseOrNull("DeviceToken"));
    console.log("XSTS 343 Token");
    console.log(Storage_ParseOrNull("XSTS343Token"));
    console.log("XSTS Playfab Token");
    console.log(Storage_ParseOrNull("XSTSPlayfabToken"));
}
function Storage_WipeTokens(){
    session_has_checked_storage = true;
    SisuXBLToken = undefined;
    SisuAuthTokens = undefined;
    DeviceToken = undefined;
    XSTS343Token = undefined;
    XSTSPlayfabToken = undefined;
    localStorage.clear();
}
function IsTokenValid(token, log_content) {
    if (!token) return false;
    console.log(log_content + " token was found in local storage!!1")
	const remainingMs = new Date(token.expiresOn) - Date.now();
	const valid = remainingMs > 1000;
    if (!valid) console.log(log_content + " token was expired.");
    else console.log(log_content + " token expires in " + (remainingMs/3600000).toFixed(2) + " hours");
	return valid;
}
// async function Storage_GetXblToken(){
//     if (IsTokenValid(XBLToken, "XBL")) return XBLToken;
//     // pass any existing non-valid tokens into the function so we can attempt to refresh them
//     const xbl_Token = await getXblToken(XBLToken);
//     localStorage.setItem("XBLToken", JSON.stringify(xbl_Token));
//     XBLToken = xbl_Token;
//     console.log("recieved XBL Token");
//     return XBLToken;
// }
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

// async function Storage_GetXSTSXBLToken(){
//     //await Storage_GetXblToken();
//     if (IsTokenValid(XSTSXBLToken, "XSTS XBL")) return XSTSXBLToken;
    
//     const xsts = await getXSTSXBLToken(await Storage_GetUserToken(), await Storage_GetDeviceToken(), await Storage_GetTitleToken());
//     localStorage.setItem("XSTSXBLToken", JSON.stringify(xsts));
//     XSTSXBLToken = xsts;
//     console.log("recieved XSTS XBL Token");
//     return XSTSXBLToken;
// }
async function Storage_GetXSTS343Token(){
    if (IsTokenValid(XSTS343Token, "XSTS XBL")) return XSTS343Token;
    
    XSTS343Token = await getXSTSXBLToken((await Storage_GetSISUAuth()).userToken, await Storage_GetDeviceToken(), (await Storage_GetSISUAuth()).titleToken, "https://prod.xsts.halowaypoint.com/");
    localStorage.setItem("XSTS343Token", JSON.stringify(XSTS343Token));
    console.log("recieved XSTS 343 Token");
    return XSTS343Token;
}
async function Storage_GetXSTSPlayfabToken(){
    if (IsTokenValid(XSTSPlayfabToken, "XSTS XBL")) return XSTSPlayfabToken;
    
    XSTSPlayfabToken = await getXSTSXBLToken((await Storage_GetSISUAuth()).userToken, await Storage_GetDeviceToken(), (await Storage_GetSISUAuth()).titleToken, "rp://playfabapi.com/");
    localStorage.setItem("XSTSPlayfabToken", JSON.stringify(XSTSPlayfabToken));
    console.log("recieved XSTS Playfab Token");
    return XSTSPlayfabToken;
}

async function getXboxToken() {
	try{
	    Storage_LoadTokens();
        Sisu_BeginAuth();
        //Sisu_AuthUser();
        return;
		PlayfabTicket();
	   //return Storage_GetXSTSXBLToken();
	}  catch (ex){
		console.log("Xbox access auth process failed." + ex)
	}
}
