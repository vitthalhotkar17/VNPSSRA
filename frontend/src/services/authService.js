import { api } from "./api.js";

export const authService = {
  async login(email, password, role) {
    const { data } = await api.post("/auth/login", { email, password, role });
    return data.data; // { token, user }
  },

  async register(payload) {
    const { data } = await api.post("/auth/register", payload);
    return data.data; // { token, user }
  },

  async getMe() {
    const { data } = await api.get("/auth/me");
    return data.data.user;
  },

  async forgotPassword(email) {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },

  async resetPassword(token, userId, password) {
    const { data } = await api.post("/auth/reset-password", { token, userId, password });
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
    return data;
  },
};
