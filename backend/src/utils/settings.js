const DEFAULT_SETTINGS = Object.freeze({
  sessionDuration: 30,
  gpsRadius: 500,
  campusLat: null,
  campusLng: null,
});

const normalizeSettings = (settings = {}) => ({
  sessionDuration: Number(settings.sessionDuration) || DEFAULT_SETTINGS.sessionDuration,
  gpsRadius: Number(settings.gpsRadius) || DEFAULT_SETTINGS.gpsRadius,
  campusLat: settings.campusLat === "" || settings.campusLat == null ? null : Number(settings.campusLat),
  campusLng: settings.campusLng === "" || settings.campusLng == null ? null : Number(settings.campusLng),
});

const getGeofenceSettings = (settings = {}) => {
  const normalized = normalizeSettings(settings);
  return {
    radius: normalized.gpsRadius || DEFAULT_SETTINGS.gpsRadius,
    lat: normalized.campusLat,
    lng: normalized.campusLng,
  };
};

module.exports = {
  DEFAULT_SETTINGS,
  normalizeSettings,
  getGeofenceSettings,
};
