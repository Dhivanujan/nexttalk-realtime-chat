import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(undefined);

const USER_KEY = "nexttalk-user";
const TOKEN_KEY = "nexttalk-token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to hydrate user data directly from the server using the http-only cookie
    const fetchUser = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch (err) {
        // Not authenticated, just clear
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  async function login(identifier, password) {
    const response = await api.post("/auth/login", { identifier, password });
    setUser(response.data.user);
  }

  async function register(name, identifier, password) {
    const payload = {
      name,
      password,
      ...(identifier.includes("@") ? { email: identifier } : { phone: identifier }),
    };
    await api.post("/auth/register", payload);
    await login(identifier, password); // log them in automatically
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch(e) {
      console.error(e);
    }
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
