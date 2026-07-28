"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMe, loginWithGoogle, logout as apiLogout } from "@/lib/api-client";
import { hasGuestData } from "@/lib/guest-store";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credential: string) => {
    const data = await loginWithGoogle(credential);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isGuest: !loading && !user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
