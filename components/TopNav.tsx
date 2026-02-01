"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TopNav() {
  const p = usePathname();
  const items = [
    { href: "/", label: "Bank Home" },
    { href: "/play", label: "Play World" },
    { href: "/statement", label: "Bank Statement" },
    { href: "/help", label: "Glossary" }
  ];

  return (
    <div className="sticky top-0 z-50 bg-penny-cream/90 backdrop-blur border-b border-black/5">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/assets/brand/penny_logo.png" alt="Penny" className="h-10 w-auto" />
        </Link>

        <div className="ml-auto flex gap-2">
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
      </div>
    </div>
  );
}
