export class CryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private sessionKey: CryptoKey | null = null;

  // 1. Generate Ephemeral ECDH Key Pair
  public async generateKeyPair() {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      false,
      ['deriveKey', 'deriveBits']
    );
  }

  // 2. Export Public Key for Key Exchange
  public async exportPublicKey(): Promise<string> {
    if (!this.keyPair) throw new Error('Key pair not generated');
    const exported = await window.crypto.subtle.exportKey('raw', this.keyPair.publicKey);
    return this.bufferToBase64(exported);
  }

  // 3. Derive Session Key from Remote Public Key
  public async deriveSessionKey(remotePublicKeyBase64: string) {
    if (!this.keyPair) throw new Error('Key pair not generated');
    
    const rawPublicKey = this.base64ToBuffer(remotePublicKeyBase64);
    
    const remoteKey = await window.crypto.subtle.importKey(
      'raw',
      rawPublicKey,
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      []
    );

    this.sessionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: remoteKey,
      },
      this.keyPair.privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    console.log('Session key established!');
  }

  // 4. Encrypt Message
  public async encryptMessage(message: string): Promise<{ ciphertext: string, iv: string }> {
    if (!this.sessionKey) throw new Error('Session key not established');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.sessionKey,
      data
    );

    return {
      ciphertext: this.bufferToBase64(encryptedBuffer),
      iv: this.bufferToBase64(iv.buffer)
    };
  }

  // 5. Decrypt Message
  public async decryptMessage(ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (!this.sessionKey) throw new Error('Session key not established');
    
    const ciphertext = this.base64ToBuffer(ciphertextBase64);
    const iv = new Uint8Array(this.base64ToBuffer(ivBase64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.sessionKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  public isReady(): boolean {
    return this.sessionKey !== null;
  }

  // --- Utility Functions ---
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // --- 2026 Novelty Cryptography Functions ---

  // 5. Signal-style deterministic 60-digit Safety Number Fingerprint
  public async generateSafetyNumber(remotePublicKeyBase64: string): Promise<string> {
    const localPub = await this.exportPublicKey();
    const combined = [localPub, remotePublicKeyBase64].sort().join('::');
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(combined));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    let digits = '';
    for (let i = 0; i < hashArray.length && digits.length < 60; i += 2) {
      const num = (((hashArray[i] << 8) | (hashArray[i + 1] || 0)) % 100000);
      digits += num.toString().padStart(5, '0') + ' ';
    }
    return digits.trim();
  }

  // 6. Cryptographic Hash Chain block generation for Session Audit Ledger
  public static async calculateBlockHash(prevHash: string, sender: string, text: string, timestamp: number): Promise<string> {
    const payload = `${prevHash}|${sender}|${text}|${timestamp}`;
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(payload));
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
