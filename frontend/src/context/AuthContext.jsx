import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService.js";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore from localStorage and re-validate token
  useEffect(() => {
    const stored = localStorage.getItem("sams_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Silently refresh user data from server
        authService.getMe().then((freshUser) => {
          const updated = { ...parsed, ...freshUser };
          setUser(updated);
          localStorage.setItem("sams_user", JSON.stringify(updated));
        }).catch(() => {
          // Token expired — clear session
          localStorage.removeItem("sams_user");
          setUser(null);
        });
      } catch {
        localStorage.removeItem("sams_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const data = await authService.login(email, password, role);
    const session = { ...data.user, token: data.token };
    setUser(session);
    localStorage.setItem("sams_user", JSON.stringify(session));
    return session;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    const session = { ...data.user, token: data.token };
    setUser(session);
    localStorage.setItem("sams_user", JSON.stringify(session));
    return session;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("sams_user");
  };

  const updateUser = (patch) => {
    const next = { ...user, ...patch };
    setUser(next);
    localStorage.setItem("sams_user", JSON.stringify(next));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
