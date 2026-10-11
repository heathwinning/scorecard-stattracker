"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getMe, loginWithGoogle, logout as apiLogout, migrateGuestData } from "@/lib/api-client";
import { clearGuestData, getAllGuestData, hasGuestData } from "@/lib/guest-store";
import toast from "react-hot-toast";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: unknown) => void) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

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
  signIn: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: true,
  login: async () => {},
  signIn: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const migratingUser = useRef<string | null>(null);
  const router = useRouter();

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

  const signIn = useCallback(() => {
    const google = window.google;
    if (!google?.accounts) {
      router.push("/login");
      return;
    }
    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      callback: async (response: { credential: string }) => {
        try {
          await login(response.credential);
          toast.success("Signed in!");
          router.push("/dashboard");
        } catch {
          toast.error("Sign in failed. Please try again.");
        }
      },
      auto_select: false,
    });
    google.accounts.id.prompt((notification) => {
      const status = notification as { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean };
      if (status.isNotDisplayed() || status.isSkippedMoment()) {
        router.push("/login");
      }
    });
  }, [login, router]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
