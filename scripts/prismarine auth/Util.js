const nextUUID = () => UUID.v3({ namespace: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', name: Date.now().toString() })

async function checkStatus(res) {
	if (res.ok) { // res.status >= 200 && res.status < 300
		return res.json()
	} else {
		const resp = await res.text()
		console.log('Request fail', resp)
		throw Error(`${res.status} ${res.statusText} ${resp}`)
	}
}

async function generateECKeyPair() {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: "ECDSA", // or "ECDH" depending on your use case
			namedCurve: "P-256", // same curve as in Node.js
		},
		true, // extractable
		["sign", "verify"] // or ["deriveKey", "deriveBits"] for ECDH
	);

	return keyPair;
}

