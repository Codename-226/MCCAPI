
xbox_keypair = undefined;
xbox_jwk = undefined;
async function InitXboxCrypto(){
	xbox_keypair = await generateECKeyPair();
	const jwk = await crypto.subtle.exportKey("jwk", xbox_keypair.publicKey);
	xbox_jwk = { kty:jwk.kty, x:jwk.x, y:jwk.y, crv:jwk.crv, alg: "ES256", use: "sig" };
}
InitXboxCrypto()
const xbox_headers = { 'Cache-Control': 'no-store, must-revalidate, no-cache', 'x-xbl-contract-version': 1 };

function checkTokenError(errorCode, response) {
	switch (errorCode){
		case 2148916227: throw new Error('Your account was banned by Xbox for violating one or more Community Standards for Xbox and is unable to be used.');
		case 2148916229: throw new Error('Your account is currently restricted and your guardian has not given you permission to play online. Login to https://account.microsoft.com/family/ and have your guardian change your permissions.')
		case 2148916233: throw new Error('Your account currently does not have an Xbox profile. Please create one at https://signup.live.com/signup')
		case 2148916234: throw new Error("Your account has not accepted Xbox's Terms of Service. Please login and accept them.")
		case 2148916235: throw new Error('Your account resides in a region that Xbox has not authorized use from. Xbox has blocked your attempt at logging in.')
		case 2148916236: throw new Error('Your account requires proof of age. Please login to https://login.live.com/login.srf and provide proof of age.')
		case 2148916237: throw new Error('Your account has reached the its limit for playtime. Your account has been blocked from logging in.')
		case 2148916238: throw new Error('The account date of birth is under 18 years and cannot proceed unless the account is added to a family by an adult.')
		default:         throw new Error(`Xbox Live authentication failed to obtain a XSTS token. XErr: ${errorCode}\n${JSON.stringify(response)}`)
	}
}
async function sign(url, authorizationToken, payload, method = 'POST') {
	// Their backend servers use Windows epoch timestamps, account for that. The server is very picky,
	// bad percision or wrong epoch may fail the request.
	const windowsTimestamp = (BigInt((Date.now() / 1000) | 0) + 11644473600n) * 10000000n
	const pathAndQuery = new URL(url).pathname
	// Allocate the buffer for signature, TS, path, tokens and payload and NUL termination
	const allocSize = /* sig */ 5 + /* ts */ 9 +  /* POST */ method.length + 1 + pathAndQuery.length + 1 + authorizationToken.length + 1 + payload.length + 1

		const buffer = new ArrayBuffer(allocSize);
		const view = new DataView(buffer);
		const encoder1 = new TextEncoder();

		let offset = 0;
		// Write Int32BE (Policy Version)
		view.setInt32(offset, 1, false); // false = big-endian
		offset += 4;
		// Write UInt8
		view.setUint8(offset, 0);
		offset += 1;
		// Write BigUInt64BE
		const high = Number(windowsTimestamp >> 32n);
		const low = Number(windowsTimestamp & 0xFFFFFFFFn);
		view.setUint32(offset, high, false);
		offset += 4;
		view.setUint32(offset, low, false);
		offset += 4;
		// Write null terminator
		view.setUint8(offset, 0);
		offset += 1;
		// Helper to write null-terminated strings
		function writeStringNT(str) {
			const bytes = encoder1.encode(str);
			new Uint8Array(buffer, offset, bytes.length).set(bytes);
			offset += bytes.length;
			view.setUint8(offset, 0); // null terminator
			offset += 1;
		}
		writeStringNT(method);
		writeStringNT(pathAndQuery);
		writeStringNT(authorizationToken);
		writeStringNT(payload);

	const data = new Uint8Array(buffer);
	const signature = await crypto.subtle.sign(
		{ name: "ECDSA", hash: { name: "SHA-256" } }, 
		xbox_keypair.privateKey, // must be a CryptoKey
		data
	);

	const totalSize = signature.byteLength + 12;
	const header_buffer = new ArrayBuffer(totalSize);
	const header_view = new DataView(header_buffer);
	let header_offset = 0;
	// Write Int32BE (Policy Version = 1)
	header_view.setInt32(header_offset, 1, false); // false = big-endian
	header_offset += 4;
	// Write BigUInt64BE (manually split into two Uint32s)
	const haeder_high = Number(windowsTimestamp >> 32n);
	const header_low = Number(windowsTimestamp & 0xFFFFFFFFn);
	header_view.setUint32(header_offset, haeder_high, false);
	header_offset += 4;
	header_view.setUint32(header_offset, header_low, false);
	header_offset += 4;
	// Write signature bytes
	const uint8 = new Uint8Array(header_buffer, 12);
	uint8.set(new Uint8Array(signature));

	function _arrayBufferToBase64( buffer ) {
		var binary = '';
		var bytes = new Uint8Array( buffer );
		var len = bytes.byteLength;
		for (var i = 0; i < len; i++) {
			binary += String.fromCharCode( bytes[ i ] );
		}
		return window.btoa( binary );
	}

	return _arrayBufferToBase64(header_buffer);
}

async function getXSTSToken(user_token, device_token, title_token, relay='http://xboxlive.com') {
	const payload = {
		RelyingParty: relay,
		TokenType: 'JWT',
		Properties: {
			UserTokens: [user_token.Token],
			DeviceToken: device_token.Token,
			TitleToken: title_token.Token,
			//OptionalDisplayClaims: undefined,
			//ProofKey: xbox_jwk,
			SandboxId: 'RETAIL'
		}
	}
	const body = JSON.stringify(payload)
	//const signature = await this.sign('https://xsts.auth.xboxlive.com/xsts/authorize', '', body)
	const headers = xbox_headers; //{ ...xbox_headers, Signature: signature }
	const req = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', { method: 'post', headers, body })
	const ret = await req.json()
	if (!req.ok) this.checkTokenError(ret.XErr, ret);
	console.log("XSTS token recieved (using weird modified params!!)");
	console.log(ret);
	const xsts = {
		xid: ret.DisplayClaims.xui[0].xid || null,
		uhs: ret.DisplayClaims.xui[0].uhs,
		Token: ret.Token,
		expiresOn: new Date(ret.NotAfter)
	}
	return xsts
}

async function getDeviceToken() {
	const payload = {
		"RelyingParty":"http://auth.xboxlive.com",
		"TokenType":"JWT",
		"Properties":{
			"AuthMethod":"ProofOfPossession",
			"Id":`{${nextUUID()}}`,
			"DeviceType":"Win32",
			"Version":"10.0.19045",
			"ProofKey": xbox_jwk
		}
	}

	
	const body = JSON.stringify(payload)
	const signature = await this.sign('https://device.auth.xboxlive.com/device/authenticate', '', body)
	const headers = { ...xbox_headers, Signature: signature }
	const ret = await fetch('https://device.auth.xboxlive.com/device/authenticate', { method: 'post', headers, body }).then(checkStatus)
	return { ...ret, expiresOn: new Date(ret.NotAfter)};
}
