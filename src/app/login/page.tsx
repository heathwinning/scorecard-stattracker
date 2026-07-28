"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
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

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        await login(response.credential);
        toast.success("Signed in!");
        router.push("/dashboard");
      } catch {
        toast.error("Sign in failed. Please try again.");
      }
    },
    [login, router]
  );

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
      return;
    }

    if (initialized.current || !buttonRef.current) return;

    const initGoogle = () => {
      if (!window.google || !buttonRef.current) return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        callback: handleCredentialResponse,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 280,
      });
    };

    // Google script may already be loaded
    if (window.google?.accounts) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(interval);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [user, router, handleCredentialResponse]);

  if (user) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 mx-auto mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1.5">Sign in to access your scorecards</p>
        </div>

        <div className="card p-6 flex flex-col items-center gap-4">
          <div ref={buttonRef} className="flex justify-center" />
          <p className="text-xs text-slate-400 text-center">
            We only use your name and email. No extra permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
