import { createContext, useContext, useEffect, useState } from "react";
import api, { setAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to silently restore a session using the refresh-token cookie.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await api.post("/auth/refresh-token");
        setAccessToken(data.accessToken);
        const me = await api.get("/auth/me");
        setUser(me.data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data;
  };

  const verifyOTP = async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const resendOTP = async (email) => {
    const { data } = await api.post("/auth/resend-otp", { email });
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, register, verifyOTP, resendOTP, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
