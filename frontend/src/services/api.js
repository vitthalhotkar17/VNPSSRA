import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const resolveAssetUrl = (value) => {
  if (!value) return "";
  if (typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) {
    return api.defaults.baseURL.replace(/\/api$/, "") + value;
  }
  return value;
};

// Attach JWT token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("sams_user");

    if (user) {
      try {
        const { token } = JSON.parse(user);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Invalid user data in localStorage");
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Standardize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    return Promise.reject(new Error(message));
  }
);

const localStorageDbKey = "sams_mock_db";
const localStorageSettingsKey = "sams_settings";
const defaultSettings = {
  sessionDuration: 30,
  gpsRadius: 100,
  campusLat: null,
  campusLng: null,
};

const db = {
  get(key) {
    if (key === "settings") return this.getSettings();
    const stored = localStorage.getItem(localStorageDbKey);
    try {
      const data = stored ? JSON.parse(stored) : {};
      if (key === "users") return Array.isArray(data.users) ? data.users : [];
      return data[key] ?? null;
    } catch {
      return key === "users" ? [] : null;
    }
  },

  set(key, value) {
    const stored = localStorage.getItem(localStorageDbKey);
    let data = {};
    try {
      data = stored ? JSON.parse(stored) : {};
    } catch {
      data = {};
    }
    data[key] = value;
    localStorage.setItem(localStorageDbKey, JSON.stringify(data));
  },

  getSettings() {
    const stored = localStorage.getItem(localStorageSettingsKey);
    try {
      const settings = stored ? JSON.parse(stored) : null;
      return settings ? { ...defaultSettings, ...settings } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  setSettings(settings) {
    localStorage.setItem(localStorageSettingsKey, JSON.stringify(settings));
  },
};

export const settingsService = {
  async getSettings() {
    const { data } = await api.get("/admin/settings");
    return data.data?.settings || defaultSettings;
  },

  async saveSettings(settings) {
    const { data } = await api.put("/admin/settings", settings);
    return data.data?.settings || settings;
  },
};

// ✅ Named exports
export { api, db };

// ✅ Default export
export default api;