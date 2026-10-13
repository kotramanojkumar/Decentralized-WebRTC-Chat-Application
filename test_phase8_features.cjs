const http = require('http');
const https = require('https');
const { io } = require('./client/node_modules/socket.io-client');

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const bodyData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = { ...(options.headers || {}) };
    if (bodyData) {
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const finalOptions = { ...options, headers };

    const req = lib.request(url, finalOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.setTimeout(15000);
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${url}`));
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runPhase8Verification() {
  console.log('================================================================');
  console.log(' P2PConnect Phase 8 Verification: Profile Photo, OTP & Signaling');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Authenticate / Register a Test User
  console.log('--- TEST 1: User Registration & Authentication ---');
  const timestamp = Date.now();
  const testEmail = `test_phase8_${timestamp}@p2pconnect.internal`;
  const testPassword = 'Password123!Secure';
  const testDisplayName = `Phase8 Tester ${timestamp}`;
  let token = null;
  let userId = null;

  try {
    const regRes = await httpRequest('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: testEmail,
      password: testPassword,
      displayName: testDisplayName,
    });

    if (regRes.statusCode === 201 || regRes.statusCode === 200) {
      token = regRes.json.token;
      userId = regRes.json.user.id;
      console.log(`✓ PASS: Test user registered successfully (ID: ${userId}).`);
      passed++;
    } else {
      console.error(`✗ FAIL: Registration failed with status ${regRes.statusCode}: ${regRes.data}`);
      failed++;
    }
  } catch (err) {
    console.error(`✗ FAIL: Registration error: ${err.message}`);
    failed++;
  }

  // 2. Profile Photo Large Base64 Persistence (>100KB to test 10MB limit)
  console.log('\n--- TEST 2: Profile Photo Large Payload & Persistence ---');
  if (userId) {
    try {
      // Generate synthetic 250KB base64 image data URI (exceeds old 100KB default)
      const dummyBase64Data = 'data:image/png;base64,' + 'A'.repeat(250 * 1024);
      const updateRes = await httpRequest('http://localhost:5000/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        avatarUrl: dummyBase64Data,
        displayName: `${testDisplayName} (Updated)`,
      });

      if (updateRes.statusCode === 200 && updateRes.json.user.avatarUrl) {
        console.log('✓ PASS: Server accepted 250KB+ base64 profile image without HTTP 413 Payload Too Large.');
        passed++;
      } else {
        console.error(`✗ FAIL: Profile update failed with status ${updateRes.statusCode}: ${updateRes.data}`);
        failed++;
      }

      // Verify persistence via GET /api/user/:userId/profile
      const getRes = await httpRequest(`http://localhost:5000/api/user/${userId}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (getRes.statusCode === 200 && getRes.json.user && getRes.json.user.avatarUrl === dummyBase64Data) {
        console.log('✓ PASS: GET /api/user/:userId/profile restored exact durable avatarUrl.');
        passed++;
      } else {
        console.error(`✗ FAIL: Profile fetch did not return persisted avatarUrl: ${getRes.statusCode}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ FAIL: Profile persistence test error: ${err.message}`);
      failed++;
    }
  }

  // 3. Dual-OTP Email Change Workflow & Security Enforcements
  console.log('\n--- TEST 3: Secure Email Change OTP Workflow ---');
  if (userId) {
    try {
      // 3.1 Request Email Change
      const newEmailTarget = `new_email_${timestamp}@p2pconnect.internal`;
      const reqEmailRes = await httpRequest('http://localhost:5000/api/user/request-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        newEmail: newEmailTarget,
      });

      if (reqEmailRes.statusCode === 200) {
        console.log('✓ PASS: Email change request accepted and OTP dispatched to registered email.');
        passed++;
      } else {
        console.error(`✗ FAIL: Email change request rejected: ${reqEmailRes.statusCode} - ${reqEmailRes.data}`);
        failed++;
      }

      // 3.2 Rate-limiting check (cooldown enforcement)
      const spamRes = await httpRequest('http://localhost:5000/api/user/request-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        newEmail: newEmailTarget,
      });

      if (spamRes.statusCode === 429) {
        console.log('✓ PASS: Email change rate-limiting successfully enforced 45s cooldown (HTTP 429).');
        passed++;
      } else {
        console.error(`✗ FAIL: Rate limiting failed, got status ${spamRes.statusCode}`);
        failed++;
      }

      // 3.3 Invalid OTP rejection
      const badOtpRes = await httpRequest('http://localhost:5000/api/user/verify-email-change-current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        otp: '000000',
      });

      if (badOtpRes.statusCode === 400) {
        console.log('✓ PASS: Current email verification rejected invalid OTP with HTTP 400.');
        passed++;
      } else {
        console.error(`✗ FAIL: Invalid OTP was not properly rejected: ${badOtpRes.statusCode}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ FAIL: Email change workflow error: ${err.message}`);
      failed++;
    }
  }

  // 4. Secure Username Change OTP Workflow & Validation
  console.log('\n--- TEST 4: Secure Username Change OTP Workflow ---');
  if (userId) {
    try {
      // 4.1 Invalid username format rejection
      const invalidUsernameRes = await httpRequest('http://localhost:5000/api/user/request-username-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        newUsername: 'inv@lid user!!',
      });

      if (invalidUsernameRes.statusCode === 400) {
        console.log('✓ PASS: Username change request rejected invalid format with HTTP 400.');
        passed++;
      } else {
        console.error(`✗ FAIL: Invalid username format not rejected: ${invalidUsernameRes.statusCode}`);
        failed++;
      }

      // 4.2 Valid username request
      const validUsername = `usr_${timestamp % 100000}`;
      const validUsernameRes = await httpRequest('http://localhost:5000/api/user/request-username-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        newUsername: validUsername,
      });

      if (validUsernameRes.statusCode === 200) {
        console.log('✓ PASS: Valid username change request accepted and OTP dispatched.');
        passed++;
      } else {
        console.error(`✗ FAIL: Valid username change request failed: ${validUsernameRes.statusCode} - ${validUsernameRes.data}`);
        failed++;
      }

      // 4.3 Invalid OTP rejection for username change
      const badUserOtpRes = await httpRequest('http://localhost:5000/api/user/confirm-username-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }, {
        userId,
        otp: '111111',
      });

      if (badUserOtpRes.statusCode === 400) {
        console.log('✓ PASS: Username confirmation rejected invalid OTP with HTTP 400.');
        passed++;
      } else {
        console.error(`✗ FAIL: Invalid OTP not rejected for username: ${badUserOtpRes.statusCode}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ FAIL: Username change test error: ${err.message}`);
      failed++;
    }
  }

  // 5. Socket.IO Signaling: Call Recording & Screenshot Notifications
  console.log('\n--- TEST 5: Socket.IO Call Recording & Screenshot Notifications ---');
  await new Promise((resolve) => {
    try {
      const testRoomId = `phase8-signaling-room-${timestamp}`;
      const socketA = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 4000,
      });
      const socketB = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 4000,
      });

      let recordingReceived = false;
      let screenshotReceived = false;

      socketB.on('call-recording-status', (data) => {
        if (data.isRecording === true && data.recorderName === 'Alice' && data.mediaType === 'video') {
          recordingReceived = true;
          console.log('✓ PASS: Remote peer received call-recording-status broadcast.');
          passed++;
        }
      });

      socketB.on('call-screenshot-alert', (data) => {
        if (data.senderName === 'Alice') {
          screenshotReceived = true;
          console.log('✓ PASS: Remote peer received call-screenshot-alert broadcast.');
          passed++;
        }
      });

      let socketsReady = 0;
      const onReady = () => {
        socketsReady++;
        if (socketsReady === 2) {
          socketA.emit('join-room', testRoomId, 'alice-peer');
          socketB.emit('join-room', testRoomId, 'bob-peer');

          setTimeout(() => {
            // Socket A broadcasts recording status
            socketA.emit('call-recording-status', {
              roomId: testRoomId,
              isRecording: true,
              recorderName: 'Alice',
              mediaType: 'video',
            });

            // Socket A broadcasts screenshot alert
            socketA.emit('call-screenshot-alert', {
              roomId: testRoomId,
              senderName: 'Alice',
            });

            setTimeout(() => {
              if (!recordingReceived) {
                console.error('✗ FAIL: Did not receive call-recording-status in Bob socket.');
                failed++;
              }
              if (!screenshotReceived) {
                console.error('✗ FAIL: Did not receive call-screenshot-alert in Bob socket.');
                failed++;
              }
              socketA.disconnect();
              socketB.disconnect();
              resolve();
            }, 1000);
          }, 600);
        }
      };

      socketA.on('connect', onReady);
      socketB.on('connect', onReady);
    } catch (err) {
      console.error(`✗ FAIL: Socket.IO signaling test exception: ${err.message}`);
      failed++;
      resolve();
    }
  });

  // Summary
  console.log('\n================================================================');
  console.log(` Phase 8 Test Suite Completed: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runPhase8Verification();
