const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings, getGeofenceSettings } = require('../src/utils/settings');

test('normalizes persisted settings and applies fallback geofence values', () => {
  const normalized = normalizeSettings({
    sessionDuration: '45',
    gpsRadius: '120',
    campusLat: '18.5204',
    campusLng: '73.8567',
  });

  assert.equal(normalized.sessionDuration, 45);
  assert.equal(normalized.gpsRadius, 120);
  assert.equal(normalized.campusLat, 18.5204);
  assert.equal(normalized.campusLng, 73.8567);

  const fallback = getGeofenceSettings({ gpsRadius: null, campusLat: null, campusLng: null });
  assert.equal(fallback.radius, 500);
  assert.equal(fallback.lat, null);
  assert.equal(fallback.lng, null);
});
