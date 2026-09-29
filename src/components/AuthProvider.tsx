"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getMe, loginWithGoogle, logout as apiLogout, migrateGuestData } from "@/lib/api-client";
import { clearGuestData, getAllGuestData, hasGuestData } from "@/lib/guest-store";
import toast from "react-hot-toast";

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
  const migratingUser = useRef<string | null>(null);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user || user.email.startsWith("guest-") || !hasGuestData() || migratingUser.current === user.id) return;
    migratingUser.current = user.id;
    const guestData = getAllGuestData();
    migrateGuestData(guestData)
      .then(() => clearGuestData())
      .catch((error) => {
        migratingUser.current = null;
        console.error("Guest scorecard migration failed; local data was retained.", error);
        toast.error("Your guest scorecards are still saved on this device. We’ll retry migration when you sign in again.");
      });
  }, [user]);

  const isGuest = !loading && (!user || user.email?.startsWith("guest-"));

  const login = useCallback(async (credential: string) => {
    const data = await loginWithGoogle(credential);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
