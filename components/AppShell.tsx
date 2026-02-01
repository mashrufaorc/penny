"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store";

/**
 * Pages that require login.
 * (Adjust if you want /help public.)
 */
const PROTECTED_PREFIXES = ["/", "/play", "/statement"]; // "/" included means Bank Home is protected
const PUBLIC_PATHS = ["/login", "/signup"]; // add "/forgot" etc if needed

function isProtected(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return false;

  // Protect exact "/" and any of these prefixes
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some((p) => p !== "/" && pathname.startsWith(p));
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-penny-cream flex items-center justify-center px-6">
      <div className="penny-card max-w-md w-full p-6 text-center">
        <div className="text-2xl font-black">Loading Penny…</div>
        <p className="mt-2 text-sm text-penny-brown/70">
          Getting your bank account ready.
        </p>
        <div className="mt-5 h-2 w-full rounded-full bg-white/60 overflow-hidden border border-black/5">
          <div className="h-full w-1/2 bg-white animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, authLoaded, bootstrapAuth } = useGameStore((s) => ({
    user: s.user,
    authLoaded: s.authLoaded,
    bootstrapAuth: s.bootstrapAuth,
  }));

  // 1) Load auth once
  useEffect(() => {
    if (!authLoaded) bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded]);

  // 2) Route protection after auth is known
  useEffect(() => {
    if (!authLoaded) return;

    const needsAuth = isProtected(pathname);
    if (needsAuth && !user) {
      router.replace("/login");
    }
  }, [authLoaded, pathname, router, user]);

  // 3) Prevent flashes:
  // If auth not loaded, show loading.
  if (!authLoaded) return <LoadingScreen />;

  // If page is protected and user is not logged in,
  // show loading while router redirects (prevents flash).
  if (isProtected(pathname) && !user) return <LoadingScreen />;

  return <>{children}</>;
}
