"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useGameStore } from "@/lib/store";

export function TopNav() {
  const p = usePathname();
  const router = useRouter();

  const {
    user,
    uiMode,
    authLoaded,
    bootstrapAuth,
    signOut,
  } = useGameStore();

  useEffect(() => {
    if (!authLoaded) bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded]);

  const items = [
    { href: "/", label: "Bank Home" },
    { href: "/play", label: "Play World" },
    { href: "/statement", label: "Bank Statement" },
    { href: "/help", label: "Glossary" },
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="sticky top-0 z-50 bg-penny-cream/90 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/assets/brand/penny_logo.png"
            alt="Penny"
            className="h-10 w-auto"
          />
        </Link>

        <div className="ml-2 flex items-center gap-2">
          {user?.name ? (
            <span className="text-sm font-semibold text-penny-brown/80">
              Hi, {user.name}!
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "px-3 py-2 rounded-xl2 font-semibold text-sm border border-black/5",
                p === it.href
                  ? "bg-white shadow-soft"
                  : "bg-white/60 hover:bg-white"
              )}
            >
              {it.label}
            </Link>
          ))}

          {authLoaded ? (
            user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-xl2 font-semibold text-sm border border-black/5 bg-white/60 hover:bg-white"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-xl2 font-semibold text-sm border border-black/5 bg-white/60 hover:bg-white"
              >
                Sign in
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
