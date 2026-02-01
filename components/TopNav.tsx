"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useGameStore } from "@/lib/store";

export function TopNav() {
  const p = usePathname();
  const r = useRouter();

  const { user, uiMode, authLoaded, bootstrapAuth, signOut } = useGameStore((s) => ({
    user: s.user,
    uiMode: s.uiMode,
    authLoaded: s.authLoaded,
    bootstrapAuth: s.bootstrapAuth,
    signOut: s.signOut,
  }));

  useEffect(() => {
    // Load /api/auth/me once per mount if not loaded yet
    if (!authLoaded) bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded]);

  const items = [
    { href: "/", label: "Bank Home" },
    { href: "/play", label: "Play World" },
    { href: "/statement", label: "Bank Statement" },
    { href: "/help", label: "Glossary" },
  ];

  const badge =
    uiMode === "teen"
      ? "Teen Mode"
      : "Kid Mode";

  return (
    <div className="sticky top-0 z-50 bg-penny-cream/90 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/assets/brand/penny_logo.png" alt="Penny" className="h-10 w-auto" />
        </Link>

        {/* Mode Badge */}
        <div className="hidden sm:flex items-center">
          <span className="px-3 py-1 rounded-xl2 text-xs font-extrabold border border-black/10 bg-white/70">
            {badge}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Nav items */}
          <div className="flex gap-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "px-3 py-2 rounded-xl2 font-semibold text-sm border border-black/5",
                  p === it.href ? "bg-white shadow-soft" : "bg-white/60 hover:bg-white"
                )}
              >
                {it.label}
              </Link>
            ))}
          </div>

          {/* Auth area */}
          <div className="ml-2 flex items-center gap-2">
            {!authLoaded ? (
              <span className="text-xs text-penny-brown/70 px-2">Loading…</span>
            ) : user ? (
              <>
                <div className="hidden md:flex flex-col leading-tight text-right">
                  <span className="text-xs font-extrabold">
                    {user.name || "Player"}
                  </span>
                  <span className="text-[11px] text-penny-brown/70">
                    {user.email || ""}
                  </span>
                </div>

                <button
                  className="penny-btn bg-white"
                  onClick={async () => {
                    await signOut();
                    r.push("/login");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link className="penny-btn bg-white" href="/login">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
