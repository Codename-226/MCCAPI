

SisuSessionID = undefined;

// wow epic, our current auth system doesn't replicate what MCC does, so we cant use the same client IDs and get proper auth on the playfab APIs!!!
PKCE_code_verifier = undefined
PKCE_code_challenge = undefined
PKCE_state = undefined

// WARNING: it just works, could be optimized but whatever
async function PKCE_generate(){
    function base64(uint8array) {
        // Convert Uint8Array to binary string
        const binary = String.fromCharCode(...uint8array);

        // Encode to Base64
        let base64 = btoa(binary);

        // Make it URL-safe (RFC 7636)
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    const state = new Uint8Array(64);
    crypto.getRandomValues(state);
    PKCE_state = base64(new Uint8Array(state));

    const length = 64;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += charset[array[i] % charset.length];
    }
    PKCE_code_verifier = result;

    const encoder = new TextEncoder();
    const data = encoder.encode(PKCE_code_verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    PKCE_code_challenge = base64url;
}

async function Sisu_BeginAuth(sisu_token){
    // if we had any expired tokens in storage, try to refresh them, otherwise generate new tokens 
	if (sisu_token){
		try {
			return await refreshTokens(sisu_token);
		} catch (e) {
			throw new Error("Failed to refresh XBL access token, likely expired. must clear cache and redo sign in. " + e);
	}}
    // NOTE: we have to clear all token caches when we generate a new sisu auth?? especially device token
    Storage_WipeTokens();

    UI_PushJob("beginning SISU auth...")
    const device_token = await Storage_GetDeviceToken();
    await PKCE_generate();
    const payload = {
        "AppId":clientId,
        "TitleId":"1144039928",
        "RedirectUri":"https://login.live.com/oauth20_desktop.srf",
        "DeviceToken":device_token.Token,
        "Sandbox":"RETAIL",
        "TokenType":"code",
        "Offers":["xboxlive.signin","offline_access"],
        "Query":{
            "code_challenge":PKCE_code_challenge,
            "code_challenge_method":"S256",
            "state":PKCE_state
        }
    }
    const body = JSON.stringify(payload);

    const signature = await sign('https://sisu.xboxlive.com/authenticate', '', body);
    const headers = {"Connection":"Keep-Alive","Content-Type":"application/json; charset=utf-8",
        "MS-CV":"XOjuYsE7X8zUuM5r.5.0",
        signature,
        //"User-Agent":"XAL Win32 2020.11.20201204.001",
        "x-xbl-contract-version":"1",
    }
    const res = await fetch('https://sisu.xboxlive.com/authenticate', { method: 'post', headers, body })
    SisuSessionID = res.headers.get('X-SessionId');
    const data = await res.json();
    window.open(data.MsaOauthRedirect, '_blank');


    // wait until user submits
    sisu_abort_code = false;
    sisu_submitted_code = undefined;
    UI_SisuCodePrompt(); 
    while (!sisu_submitted_code){
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms));}

        console.log("Waiting for user to give us our SISU code!")
        await sleep(1000);
        if (sisu_abort_code){
            console.log("sisu auth aborted.")
            return;
        }
    }

    {
        UI_PushJob("verifying SISU code...")
        const payload = new URLSearchParams({
            client_id: clientId,
            code: sisu_submitted_code,
            code_verifier: PKCE_code_verifier,
            grant_type: 'authorization_code',
            redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
            scope: 'xboxlive.signin offline_access'
        });
        const headers = {
            "Connection":"Keep-Alive",
            "Content-Type":"application/x-www-form-urlencoded; charset=utf-8",
            "MS-CV":"XOjuYsE7X8zUuM5r.5.2",
            //"User-Agent":"XAL Win32 2020.11.20201204.001",
        }
        const body = payload.toString();
        console.log(body)
        const res = await fetch('https://login.live.com/oauth20_token.srf', {
            method: 'POST',
            headers,
            body: body
        });
        const token = await res.json();
        console.log(token);
        return {...token, expiresOn: new Date(Date.now() + token.expires_in)};

    }
}
// this function just releases the spin lock 
sisu_abort_code = false;
sisu_submitted_code = undefined
function Sisu_SubmitCode(code){
    // DELIMIT: filter out the junk incase we ever get lazy and just paste the whole link in
    const match = code.match(/code=([^&]*)/);
    if (match) sisu_submitted_code = match[1];
    else       sisu_submitted_code = code;
}


async function Sisu_AuthUser(sisu_xbl_tokens){
    UI_PushJob("reqeusting SISU xsts token...");
    const device_token = await Storage_GetDeviceToken();

    const payload = {
        "AccessToken":'d=' +sisu_xbl_tokens.access_token,
        "AppId":clientId,
        "DeviceToken":device_token.Token,
        "Sandbox":"RETAIL",
        "UseModernGamertag":true,
        "SiteName":"user.auth.xboxlive.com",
        "RelyingParty":"http://xboxlive.com",
        "SessionId":SisuSessionID,
        "ProofKey":xbox_jwk
    }
    const body = JSON.stringify(payload);
    const signature = await sign('https://sisu.xboxlive.com/authorize', '', body);
    const headers = {
        "Content-Type":"application/json; charset=utf-8",
        "MS-CV":"XOjuYsE7X8zUuM5r.5.3",
        "Signature": signature,
        //"User-Agent":"XAL Win32 2020.11.20201204.001",
    }
    const res = await fetch('https://sisu.xboxlive.com/authorize', {
        method: 'POST',
        headers,
        body: body
    });
    const ret = await res.json()
    console.log(ret)
    // slap expiry date labels on just the base token
    // but we have to compute which when is the soonest that we have to expire our thing
    // so double check all our expiry dates to see when abouts is soonest and then slap that date on our main token
    

    //ret.userToken.expiresOn = new Date(ret.userToken.NotAfter);
    //ret.userToken.expiresOn = new Date(ret.NotAfter);
    return ret;


    // UI_PushJob("checking endpoint entitlements...");
    // xsts_token = ret.AuthorizationToken.Token;
    // xsts_userhash = ret.AuthorizationToken.DisplayClaims.xui[0].uhs;
    // {
    //     // we cant seem to get the signature right ??? and i know for a fact this relates to the 'get' part of this request, even though we're encoding it correctly
    //     // must be one of the other parameters being passed into the hash that im not sure aboutt
    //     const signature = await sign('https://title.mgt.xboxlive.com/titles/current/endpoints', '', '', 'GET');
    //     const headers = {
    //         'Authorization':'XBL3.0 x='+xsts_userhash+';'+xsts_token,
    //         "Connection":"Keep-Alive",
    //         "MS-CV":"KP1CPiLj5xBGOYE2.3.2",
    //         //"User-Agent":"XAL Win32 2020.11.20201204.001",
    //         "x-xbl-contract-version":"1",
    //         signature,
    //     }
    //     const res = await fetch('https://title.mgt.xboxlive.com/titles/current/endpoints', { method: 'get', headers })
    //     console.log("endpoint access check")
    //     console.log(res);
    //     const data = await res.text();
    //     console.log(data);
    // }

    UI_PushJob("requesting 343 & Playfab XSTS...");
    // get both 343 xsts &  playfab xsts
    _343_xsts = await Storage_GetXSTS343Token();
    playfab_xsts = await Storage_GetXSTSPlayfabToken();
    xsts_playfab_token = playfab_xsts.Token;
    xsts_playfab_userhash = playfab_xsts.uhs;
    {
        UI_PushJob("attempting to connect to 343 playfab api...");
        const payload = {'XboxToken':'XBL3.0 x='+xsts_playfab_userhash+';'+xsts_playfab_token, "CreateAccount":true, "TitleId": "EE38"};
        const body = JSON.stringify(payload)
        const headers = {  'Content-Type': 'application/json', 'Accept':'application/json', /*'User-Agent':'cpprestsdk/2.9.0'*/ }

        console.log(body)
        console.log("playfab access check")
        const res = await fetch('https://ee38.playfabapi.com/Client/LoginWithXbox', { method: 'post', headers, body })
        console.log(res);
        const data = await res.json();
        console.log(data);
    }
}

