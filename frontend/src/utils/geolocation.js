const DEFAULT_GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

const getLocationErrorMessage = (error) => {
  switch (error?.code) {
    case error.PERMISSION_DENIED:
      return "Location access was denied. Please allow location permission in your browser or device settings.";
    case error.POSITION_UNAVAILABLE:
      return "Your device could not provide a location right now. Please try again in an open area.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return error?.message || "Unable to fetch your current location.";
  }
};

const getIpFallbackLocation = async () => {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) {
    throw new Error("Unable to determine location from the network.");
  }

  const data = await response.json();
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    throw new Error("Location lookup did not return coordinates.");
  }

  return {
    lat: data.latitude,
    lng: data.longitude,
    accuracy: 5000,
    source: "ip",
  };
};

// export const getCurrentLocation = async (options = {}) => {
//   if (!navigator.geolocation) {
//     throw new Error("Geolocation is not supported by this browser.");
//   }

//   const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
//   if (!window.isSecureContext && !isLocalhost) {
//     throw new Error("Location access requires a secure connection (HTTPS or localhost).");
//   }

//   try {
//     return await new Promise((resolve, reject) => {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           resolve({
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//             accuracy: position.coords.accuracy,
//             source: "gps",
//           });
//         },
//         (error) => reject(new Error(getLocationErrorMessage(error))),
//         { ...DEFAULT_GEO_OPTIONS, ...options }
//       );
//     });
//   } catch (error) {
//     if (options.fallbackToIp !== false) {
//       try {
//         return await getIpFallbackLocation();
//       } catch {
//         throw error;
//       }
//     }
//     throw error;
//   }
// };

export const getCurrentLocation = async (options = {}) => {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) {
    throw new Error("Location access requires a secure connection (HTTPS or localhost).");
  }

  const { fallbackToIp, minAccuracy, ...geoOptions } = options;

  let result;
  try {
    result = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: "gps",
          });
        },
        (error) => reject(new Error(getLocationErrorMessage(error))),
        { ...DEFAULT_GEO_OPTIONS, ...geoOptions }
      );
    });
  } catch (error) {
    if (fallbackToIp !== false) {
      try {
        result = await getIpFallbackLocation();
      } catch {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (minAccuracy != null && result.accuracy > minAccuracy) {
    throw new Error(
      `Location accuracy (${Math.round(result.accuracy)}m) is too low for verification. Please move to an open area and try again.`
    );
  }

  return result;
};

export const watchLocation = (onSuccess, onError, options = {}) => {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolocation is not supported by this browser."));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess?.({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: "gps",
      });
    },
    (error) => onError?.(new Error(getLocationErrorMessage(error))),
    { ...DEFAULT_GEO_OPTIONS, ...options }
  );
};

export const clearLocationWatch = (watchId) => {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};
