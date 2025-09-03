// run local storage check on session start please
XBLToken = undefined; // access/refresh token
UserToken = undefined;
DeviceToken = undefined;
TitleToken = undefined;
XSTSToken = undefined;
session_has_checked_storage = false;
function Storage_ParseOrNull(item){
    let temp = localStorage.getItem(item);
    if (temp) return JSON.parse(temp);
    return undefined;
}
function Storage_LoadTokens(){
    if (session_has_checked_storage !== false) return; // no point trying to load this data twice
    XBLToken = Storage_ParseOrNull("XBLToken");
    UserToken = Storage_ParseOrNull("UserToken");
    DeviceToken = Storage_ParseOrNull("DeviceToken");
    TitleToken = Storage_ParseOrNull("TitleToken");
    XSTSToken = Storage_ParseOrNull("XSTSToken");
    session_has_checked_storage = true;
}
function Storage_LogTokens(){
    console.log("XBL Token");
    console.log(Storage_ParseOrNull("XBLToken"));
    console.log("User Token");
    console.log(Storage_ParseOrNull("UserToken"));
    console.log("Device Token");
    console.log(Storage_ParseOrNull("DeviceToken"));
    console.log("Title Token");
    console.log(Storage_ParseOrNull("TitleToken"));
    console.log("XSTS Token");
    console.log(Storage_ParseOrNull("XSTSToken"));
}
function Storage_WipeTokens(){
    session_has_checked_storage = true;
    XBLToken = undefined // access/refresh token
    UserToken = undefined
    DeviceToken = undefined
    TitleToken = undefined
    XSTSToken = undefined
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
async function Storage_GetXblToken(){
    if (IsTokenValid(XBLToken, "XBL")) return XBLToken;
    // pass any existing non-valid tokens into the function so we can attempt to refresh them
    const xbl_Token = await getXblToken(XBLToken);
    localStorage.setItem("XBLToken", JSON.stringify(xbl_Token));
    XBLToken = xbl_Token;
    console.log("recieved XBL Token");
    return XBLToken;
}
async function Storage_GetUserToken(){
    if (IsTokenValid(UserToken, "USER")) return UserToken;

    const user_token = await getUserToken(await Storage_GetXblToken());
    localStorage.setItem("UserToken", JSON.stringify(user_token));
    UserToken = user_token;
    console.log("recieved User Token");
    return UserToken;
}
async function Storage_GetDeviceToken(){
    if (IsTokenValid(DeviceToken, "DEVICE")) return DeviceToken;

    const device_token = await getDeviceToken();
    localStorage.setItem("DeviceToken", JSON.stringify(device_token));
    DeviceToken = device_token;
    console.log("recieved Device Token");
    return DeviceToken;
}
async function Storage_GetTitleToken(){
    if (IsTokenValid(TitleToken, "TITLE")) return TitleToken;

    const title_token = await getTitleToken(await Storage_GetXblToken(), await Storage_GetDeviceToken());
    localStorage.setItem("TitleToken", JSON.stringify(title_token));
    TitleToken = title_token;
    console.log("recieved Title Token");
    return TitleToken;
}
async function Storage_GetXSTSToken(){
    // not quite sure how this works, but we will want to refresh our XBL token constantly i believe??
    await Storage_GetXblToken();
    if (IsTokenValid(XSTSToken, "XSTS")) return XSTSToken;

    const xsts = await getXSTSToken(await Storage_GetUserToken(), await Storage_GetDeviceToken(), await Storage_GetTitleToken());
    localStorage.setItem("XSTSToken", JSON.stringify(xsts));
    XSTSToken = xsts;
    console.log("recieved XSTS Token");
    return XSTSToken;
}

async function getXboxToken() {
	try{
		await InitXboxCrypto();  // just generates keys and stuff
		Storage_LoadTokens();
		PlayfabTicket();
	   //return Storage_GetXSTSToken();
	}  catch (ex){
		console.log("Xbox access auth process failed." + ex)
	}
}
