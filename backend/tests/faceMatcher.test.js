const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyFaceMatch } = require('../src/utils/faceMatcher');

test('verifyFaceMatch should allow matching when anti-spoof telemetry is missing', async () => {
  const descriptor = Array(128).fill(0.1);
  const result = await verifyFaceMatch({
    descriptor,
    storedDescriptors: [descriptor],
    antiSpoofData: null,
  });

  assert.equal(result.verified, true);
  assert.equal(result.error, undefined);
});
