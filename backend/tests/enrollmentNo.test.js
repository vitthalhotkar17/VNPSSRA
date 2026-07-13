const test = require('node:test');
const assert = require('node:assert/strict');
const { getNextEnrollmentNo } = require('../src/utils/enrollmentNo');

test('returns the starting enrollment number when none exists', () => {
  assert.equal(getNextEnrollmentNo(), '24212620101');
});

test('increments the next enrollment number sequentially', () => {
  assert.equal(getNextEnrollmentNo('24212620101'), '24212620102');
  assert.equal(getNextEnrollmentNo('24212620102'), '24212620103');
});

test('falls back to the starting number for invalid values', () => {
  assert.equal(getNextEnrollmentNo('invalid'), '24212620101');
});
