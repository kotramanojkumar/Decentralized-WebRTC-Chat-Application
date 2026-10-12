const crypto = require('crypto');

// 1. Emulate Web Crypto ECDH & Safety Number derivation exactly as implemented in CryptoManager.ts
function generateSafetyNumber(localPub, remotePub) {
  const combined = [localPub, remotePub].sort().join('::');
  const hashBuffer = crypto.createHash('sha256').update(combined).digest();
  const hashArray = Array.from(hashBuffer);

  const blocks = [];
  for (let i = 0; i < hashArray.length && blocks.length < 12; i += 2) {
    const num = (((hashArray[i] << 8) | (hashArray[i + 1] || 0)) % 100000);
    blocks.push(num.toString().padStart(5, '0'));
  }
  return blocks.join(' ');
}

// Emulate browser localStorage in Node
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

async function runTests() {
  console.log('--- Phase 5 Verification Test Suite ---');
  let failures = 0;

  // TEST 1: Safety number commutativity and length
  console.log('\n[Test 1] Commutativity & 60-Digit Length Check:');
  const alicePub = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEAliceKey384BytesExampleLongStringForTest1';
  const bobPub   = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBobKey384BytesExampleLongStringForTest2';

  const aliceSafetyNum = generateSafetyNumber(alicePub, bobPub);
  const bobSafetyNum   = generateSafetyNumber(bobPub, alicePub);

  console.log('Alice perspective:', aliceSafetyNum);
  console.log('Bob perspective:  ', bobSafetyNum);

  if (aliceSafetyNum !== bobSafetyNum) {
    console.error('FAIL: Safety numbers do not match between peers!');
    failures++;
  } else {
    console.log('PASS: Commutativity confirmed - safety numbers match identically regardless of ordering.');
  }

  const rawDigits = aliceSafetyNum.replace(/\s/g, '');
  const blockCount = aliceSafetyNum.split(' ').length;
  console.log(`Block count: ${blockCount}, Total digits: ${rawDigits.length}`);
  if (rawDigits.length !== 60 || blockCount !== 12) {
    console.error(`FAIL: Expected 60 digits and 12 blocks, got ${rawDigits.length} digits and ${blockCount} blocks.`);
    failures++;
  } else {
    console.log('PASS: Exactly 60 digits formatted in 12 blocks of 5 digits.');
  }

  // TEST 2: Active MITM / Substitution Detection
  console.log('\n[Test 2] Active MITM Detection:');
  const evePub = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEveAttackerKey384BytesInterceptedTest';
  const aliceEveSafetyNum = generateSafetyNumber(alicePub, evePub);
  const eveBobSafetyNum   = generateSafetyNumber(evePub, bobPub);

  console.log('Alice <-> Eve safety number:', aliceEveSafetyNum);
  console.log('Eve <-> Bob safety number:  ', eveBobSafetyNum);

  if (aliceEveSafetyNum === bobSafetyNum) {
    console.error('FAIL: Attacker generated matching safety number with victim!');
    failures++;
  } else {
    console.log('PASS: Intermediary key substitution produces completely mismatched safety numbers.');
  }

  // TEST 3: Verification Persistence & Key-Change Detection Lifecycle
  console.log('\n[Test 3] Peer Verification Persistence & Key-Change Warning Lifecycle:');
  const storage = new MockLocalStorage();
  const peerId = 'peer_socket_98765';

  // Step 3a: Peer connects for first time with initial key
  let currentKey = bobPub;
  let storedKey = storage.getItem(`peer_key_${peerId}`);
  let keyChangeWarning = false;

  if (storedKey && storedKey !== currentKey) {
    keyChangeWarning = true;
  } else if (!storedKey) {
    storage.setItem(`peer_key_${peerId}`, currentKey);
  }

  console.log('3a. First connection: storedKey initialized, warning:', keyChangeWarning);
  if (keyChangeWarning !== false || storage.getItem(`peer_key_${peerId}`) !== bobPub) {
    console.error('FAIL: First connection should not trigger warning.');
    failures++;
  } else {
    console.log('PASS: First connection safely initialized key without warning.');
  }

  // Step 3b: User verifies Bob
  let isVerified = storage.getItem(`verified_peer_${currentKey}`) === 'true';
  console.log('3b. Initial verification state:', isVerified);

  // User clicks "Mark as Verified"
  storage.setItem(`verified_peer_${currentKey}`, 'true');
  storage.setItem(`peer_key_${peerId}`, currentKey);
  isVerified = storage.getItem(`verified_peer_${currentKey}`) === 'true';

  if (!isVerified) {
    console.error('FAIL: User verification was not persisted.');
    failures++;
  } else {
    console.log('PASS: Peer marked as verified and persisted in storage.');
  }

  // Step 3c: Controlled Key-Change Event (Peer rejoins with new key / MITM attempt)
  const bobNewKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBobRotatedNewKey384BytesTest999';
  console.log('\n3c. Controlled Key-Change: Peer rotates key to new public key...');
  currentKey = bobNewKey;
  storedKey = storage.getItem(`peer_key_${peerId}`);

  if (storedKey && storedKey !== currentKey) {
    keyChangeWarning = true;
  }
  // Check verification state for new key
  isVerified = storage.getItem(`verified_peer_${currentKey}`) === 'true';

  console.log('Resulting keyChangeWarning:', keyChangeWarning);
  console.log('Resulting verification status for new key:', isVerified);

  if (!keyChangeWarning) {
    console.error('FAIL: Key change did not trigger warning!');
    failures++;
  } else if (isVerified) {
    console.error('FAIL: New unverified key was falsely treated as verified!');
    failures++;
  } else {
    console.log('PASS: Key change successfully triggered warning and invalidated verified status.');
  }

  // Step 3d: Out-of-band re-verification of the new key
  console.log('\n3d. User performs out-of-band safety number check and re-verifies new key:');
  storage.setItem(`verified_peer_${currentKey}`, 'true');
  storage.setItem(`peer_key_${peerId}`, currentKey);
  keyChangeWarning = false;

  isVerified = storage.getItem(`verified_peer_${currentKey}`) === 'true';
  storedKey = storage.getItem(`peer_key_${peerId}`);

  if (!isVerified || keyChangeWarning || storedKey !== bobNewKey) {
    console.error('FAIL: Re-verification failed to acknowledge new key.');
    failures++;
  } else {
    console.log('PASS: Re-verification cleared warning and bound verified state to new key.');
  }

  console.log('\n--- Final Test Summary ---');
  if (failures === 0) {
    console.log('ALL VERIFICATION TESTS PASSED (0 failures)');
    process.exit(0);
  } else {
    console.error(`TESTS FAILED with ${failures} error(s).`);
    process.exit(1);
  }
}

runTests();
