/* Titles
  HaloMCC: '000000004825fc1f', 
  MinecraftNintendoSwitch: '00000000441cc96b',
  MinecraftPlaystation: '000000004827c78e',
  MinecraftAndroid: '0000000048183522',
  MinecraftJava: '00000000402b5328',
  MinecraftIOS: '000000004c17c01a',
  XboxAppIOS: '000000004c12ae6f',
  XboxGamepassIOS: '000000004c20a908'
*/
const clientId = '000000004825fc1f'
const scopes = ['service::user.auth.xboxlive.com::MBI_SSL']

async function refreshTokens(xbl_token) {
	const codeRequest = {
		method: 'post',
		body: new URLSearchParams({ scope: scopes, client_id: clientId, grant_type: 'refresh_token', refresh_token: xbl_token.refresh_token }).toString(),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		credentials: 'include' // This cookie handler does not work on node-fetch ...
	}
	console.log(codeRequest);
	const token = await fetch("https://login.live.com/oauth20_token.srf", codeRequest).then(checkStatus);

	return {...token, expiresOn: new Date(Date.now() + (token.expires_in * 1000))};
}

async function getXblToken(xbl_token) {
	// try to refresh if we already have a sign in token
	if (xbl_token){
		try {
			return await refreshTokens(xbl_token);
		} catch (e) {
			throw new Error("Failed to refresh XBL access token, likely expired. must clear cache and redo sign in. " + e);
	}}

	const ret = await authDeviceCode((response) => {
		console.info('[msa] First time signing in. Please authenticate now:')
		console.info(response.message)
	})
	if (ret.account) {
		console.info(`[msa] Signed in as ${ret.account.username}`)
	} else { // We don't get extra account data here per scope
		console.info('[msa] Signed in with Microsoft')
	}
	return ret
}

async function authDeviceCode(deviceCodeCallback) {
	const acquireTime = Date.now()
	const codeRequest = {
		method: 'post',
		body: new URLSearchParams({ scope: scopes, client_id: clientId, response_type: 'device_code' }).toString(),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		credentials: 'include' // This cookie handler does not work on node-fetch ...
	}
	const cookies = []
	const res = await fetch('https://login.live.com/oauth20_connect.srf', codeRequest)
		.then(res => {
			if (res.status !== 200) {
				res.text().then(console.warn)
				throw Error('Failed to request live.com device code')
			}
			if (res.headers.get('set-cookie')) {
				const cookie = res.headers.get('set-cookie')
				const [keyval] = cookie.split(';')
				cookies.push(keyval)
			}
			return res
		})
		.then(checkStatus).then(resp => {
			resp.message = `To sign in, use a web browser to open the page ${resp.verification_uri} and use the code ${resp.user_code} or visit http://microsoft.com/link?otc=${resp.user_code}`
			deviceCodeCallback(resp)
			return resp
		})
	const expireTime = acquireTime + (res.expires_in * 1000) - 100 /* for safety */

	polling = true
	while (polling && expireTime > Date.now()) {
		await new Promise(resolve => setTimeout(resolve, res.interval * 1000))
		try {
			const verifi = {
				method: 'post',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Cookie: cookies.join('; ')
				},
				body: new URLSearchParams({
					client_id: clientId,
					device_code: res.device_code,
					grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
				}).toString()
			}

			const token = await fetch("https://login.live.com/oauth20_token.srf" + '?client_id=' + clientId, verifi)
				.then(res => res.json()).then(res => {
					if (res.error) {
						if (res.error === 'authorization_pending') {
							console.log('[live] Still waiting:', res.error_description)
						} else {
							throw Error(`Failed to acquire authorization code from device token (${res.error}) - ${res.error_description}`)
						}
					} else {
						return res
					}
				})
			if (!token) continue

			polling = false
			
			return {...token, expiresOn: new Date(Date.now() + token.expires_in)};
		} catch (e) {
			console.log(e)
		}
	}
	polling = false
	throw Error('Authentication failed, timed out')
}

