const CREDENTIAL_KEY = 'expense-tracker-device-credential';
const bytes = (length) => crypto.getRandomValues(new Uint8Array(length));

export async function verifyDevice() {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('Device verification is not supported in this browser.');
  let credentialId = localStorage.getItem(CREDENTIAL_KEY);
  if (!credentialId) {
    const credential = await navigator.credentials.create({ publicKey: {
      challenge: bytes(32), rp: { name: 'NYNET', id: window.location.hostname },
      user: { id: bytes(16), name: 'nynet-user', displayName: 'NYNET User' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000, attestation: 'none',
    }});
    if (!credential) throw new Error('Device verification was cancelled.');
    credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem(CREDENTIAL_KEY, credentialId);
  }
  const rawId = Uint8Array.from(atob(credentialId), (char) => char.charCodeAt(0));
  await navigator.credentials.get({ publicKey: { challenge: bytes(32), allowCredentials: [{ id: rawId, type: 'public-key' }], userVerification: 'required', timeout: 60000 } });
}
