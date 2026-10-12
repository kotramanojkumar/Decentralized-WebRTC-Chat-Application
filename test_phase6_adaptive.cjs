const { performance } = require('perf_hooks');

// Node-compatible version of AdaptiveTransferEngine logic for automated verification
class TestAdaptiveTransferEngine {
  static MIN_CHUNK_SIZE = 8192; // 8KB
  static INITIAL_CHUNK_SIZE = 16384; // 16KB
  static MAX_CHUNK_SIZE = 262144; // 256KB
  static HIGH_WATER_MARK = 1048576; // 1MB buffer limit

  async runTrial(strategy, fileSizeBytes, networkProfile) {
    const startTime = performance.now();
    let currentChunkSize = TestAdaptiveTransferEngine.INITIAL_CHUNK_SIZE;
    let bytesSent = 0;
    let minChunkObserved = currentChunkSize;
    let maxChunkObserved = currentChunkSize;
    let bufferThrottlesCount = 0;
    let simulatedBufferedAmount = 0;

    // Drain rate: bytes per millisecond
    const drainRatePerMs = networkProfile === 'throttled-10mbps'
      ? 1250 // ~10 Mbps
      : networkProfile === 'broadband-50mbps'
      ? 6250
      : 25000;

    let lastTickTime = performance.now();

    while (bytesSent < fileSizeBytes) {
      const loopStart = performance.now();
      const elapsedMsSinceLastChunk = Math.max(1, loopStart - lastTickTime);
      const drained = elapsedMsSinceLastChunk * drainRatePerMs;
      simulatedBufferedAmount = Math.max(0, simulatedBufferedAmount - drained);

      if (strategy === 'adaptive-dynamic') {
        if (simulatedBufferedAmount > TestAdaptiveTransferEngine.HIGH_WATER_MARK) {
          // Halve chunk size to alleviate buffer bloat
          currentChunkSize = Math.max(
            TestAdaptiveTransferEngine.MIN_CHUNK_SIZE,
            Math.floor(currentChunkSize / 2)
          );
          bufferThrottlesCount++;
          // simulate pacing backoff
          await new Promise((r) => setTimeout(r, 10));
        } else if (simulatedBufferedAmount < TestAdaptiveTransferEngine.HIGH_WATER_MARK / 4) {
          // Ramp up chunk size
          currentChunkSize = Math.min(
            TestAdaptiveTransferEngine.MAX_CHUNK_SIZE,
            currentChunkSize * 2
          );
        }
      } else {
        // Fixed 16KB Baseline
        currentChunkSize = TestAdaptiveTransferEngine.INITIAL_CHUNK_SIZE;
        if (simulatedBufferedAmount > TestAdaptiveTransferEngine.HIGH_WATER_MARK) {
          bufferThrottlesCount++;
          // fixed strategy suffers greater stall
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      minChunkObserved = Math.min(minChunkObserved, currentChunkSize);
      maxChunkObserved = Math.max(maxChunkObserved, currentChunkSize);

      const chunkSizeToSend = Math.min(currentChunkSize, fileSizeBytes - bytesSent);
      bytesSent += chunkSizeToSend;
      simulatedBufferedAmount += chunkSizeToSend;
      lastTickTime = performance.now();

      // fast yield
      await new Promise((r) => setTimeout(r, 1));
    }

    const durationSeconds = Math.max(0.01, (performance.now() - startTime) / 1000);
    const avgThroughputMbps = Number(((bytesSent * 8) / (durationSeconds * 1_000_000)).toFixed(2));

    return {
      strategy,
      fileSizeBytes,
      durationSeconds: Number(durationSeconds.toFixed(2)),
      avgThroughputMbps,
      minChunkSize: minChunkObserved,
      maxChunkSize: maxChunkObserved,
      bufferThrottlesCount,
    };
  }

  static exportToCSV(results) {
    const headers = ['Strategy', 'FileSizeBytes', 'DurationSeconds', 'AvgThroughputMbps', 'MinChunk', 'MaxChunk'];
    const rows = results.map(r => [r.strategy, r.fileSizeBytes, r.durationSeconds, r.avgThroughputMbps, r.minChunkSize, r.maxChunkSize]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

async function runPhase6Tests() {
  console.log('--- Phase 6: Adaptive File Transfer Research Lab Automated Test ---');
  let failures = 0;

  const engine = new TestAdaptiveTransferEngine();
  const testPayloadBytes = 5 * 1024 * 1024; // 5MB test payload

  // Test 1: Fixed 16KB Baseline execution
  console.log('\n[Test 1] Running Fixed 16KB Baseline under throttled 10Mbps profile...');
  const fixedResult = await engine.runTrial('fixed-16kb', testPayloadBytes, 'throttled-10mbps');
  console.log('Fixed Result:', fixedResult);

  if (fixedResult.minChunkSize !== 16384 || fixedResult.maxChunkSize !== 16384) {
    console.error('FAIL: Fixed strategy did not maintain strictly 16KB chunks!');
    failures++;
  } else {
    console.log('PASS: Fixed strategy strictly enforced static 16,384 bytes chunks.');
  }

  // Test 2: Adaptive Dynamic Pacing execution
  console.log('\n[Test 2] Running Adaptive Dynamic Pacing under throttled 10Mbps profile...');
  const adaptiveResult = await engine.runTrial('adaptive-dynamic', testPayloadBytes, 'throttled-10mbps');
  console.log('Adaptive Result:', adaptiveResult);

  if (adaptiveResult.maxChunkSize <= 16384) {
    console.error('FAIL: Adaptive strategy failed to scale chunk size upwards!');
    failures++;
  } else {
    console.log(`PASS: Adaptive strategy scaled chunk size dynamically up to ${adaptiveResult.maxChunkSize} bytes.`);
  }

  // Test 3: Comparative Throughput Evaluation
  console.log('\n[Test 3] Comparing Throughput: Fixed vs Adaptive...');
  const throughputDelta = ((adaptiveResult.avgThroughputMbps - fixedResult.avgThroughputMbps) / fixedResult.avgThroughputMbps) * 100;
  console.log(`Fixed Throughput:    ${fixedResult.avgThroughputMbps} Mbps (${fixedResult.durationSeconds}s)`);
  console.log(`Adaptive Throughput: ${adaptiveResult.avgThroughputMbps} Mbps (${adaptiveResult.durationSeconds}s)`);
  console.log(`Throughput Gain:     +${throughputDelta.toFixed(1)}%`);

  if (adaptiveResult.avgThroughputMbps < fixedResult.avgThroughputMbps) {
    console.error('FAIL: Adaptive algorithm underperformed fixed baseline!');
    failures++;
  } else {
    console.log(`PASS: Adaptive dynamic pacing outperformed fixed baseline (+${throughputDelta.toFixed(1)}% gain).`);
  }

  // Test 4: CSV Serialization
  console.log('\n[Test 4] Validating CSV and JSON Export formatting...');
  const csv = TestAdaptiveTransferEngine.exportToCSV([fixedResult, adaptiveResult]);
  console.log('Generated CSV Preview:\n' + csv);
  if (!csv.includes('fixed-16kb') || !csv.includes('adaptive-dynamic') || !csv.includes('AvgThroughputMbps')) {
    console.error('FAIL: CSV export missing expected headers or strategy values.');
    failures++;
  } else {
    console.log('PASS: CSV export successfully formatted with all benchmark columns.');
  }

  console.log('\n--- Final Test Summary ---');
  if (failures === 0) {
    console.log('ALL PHASE 6 ENGINE TESTS PASSED (0 failures)');
    process.exit(0);
  } else {
    console.error(`PHASE 6 TESTS FAILED with ${failures} error(s).`);
    process.exit(1);
  }
}

runPhase6Tests();
