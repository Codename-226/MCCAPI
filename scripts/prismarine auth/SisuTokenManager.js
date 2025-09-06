async function SisuStep2() {
	const myInput = document.getElementById('myInput');
    const inputValue = myInput.value;
    console.log(inputValue); // prints the current value of the input field
    Sisu_AuthCode(inputValue);
}

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

async function Sisu_BeginAuth(){
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
    console.log(payload);
    const body = JSON.stringify(payload);

    const signature = await sign('https://sisu.xboxlive.com/authenticate', '', body);
    const headers = {
        "Connection":"Keep-Alive",
        "Content-Type":"application/json; charset=utf-8",
        //"MS-CV":"XOjuYsE7X8zUuM5r.5.0",
        signature,
        "User-Agent":"XAL Win32 2020.11.20201204.001",
        "x-xbl-contract-version":"1",
    }
    const res = await fetch('https://sisu.xboxlive.com/authenticate', { method: 'post', headers, body })
    SisuSessionID = res.headers.get('X-SessionId');
    const data = await res.json();
    console.log(data);
    window.open(data.MsaOauthRedirect, '_blank');
}

async function Sisu_AuthCode(code){
        const payload = new URLSearchParams({
            client_id: clientId,
            code: code,
            code_verifier: PKCE_code_verifier,
            grant_type: 'authorization_code',
            redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
            scope: 'xboxlive.signin offline_access'
        });
        const headers = {
            "Connection":"Keep-Alive",
            "Content-Type":"application/x-www-form-urlencoded; charset=utf-8",
            //"MS-CV":"XOjuYsE7X8zUuM5r.5.2",
            "User-Agent":"XAL Win32 2020.11.20201204.001",
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
        //sisu_xbl_token_100 = {...token, expiresOn: new Date(Date.now() + token.expires_in)};
        //Storage_write_sisuxbl(sisu_xbl_token_100);

        await Sisu_AuthUser(token);


}








async function Sisu_AuthUser(sisu_xbl_tokens){
    const device_token = await Storage_GetDeviceToken();
    console.log(device_token)

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
        //"MS-CV":"XOjuYsE7X8zUuM5r.5.3",
        "Signature": signature,
        "User-Agent":"XAL Win32 2020.11.20201204.001",
    }
    console.log(body)
    const res = await fetch('https://sisu.xboxlive.com/authorize', {
        method: 'POST',
        headers,
        body: body
    });
    console.log(res);
    const ret = await res.json()
    //if (!res.ok) this.checkTokenError(parseInt(res.headers.get('x-err')), ret)
    console.log(ret)

}

