"use client";

import { TopNav } from "@/components/TopNav";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useGameStore } from "@/lib/store";

const Game = dynamic(() => import("@/components/game/Game"), { ssr: false });

export default function PlayPage() {
  const [mounted, setMounted] = useState(false);

  const tickMonth = useGameStore((s) => s.tickMonth);
  const bootstrapAuth = useGameStore((s) => s.bootstrapAuth);
  const authLoaded = useGameStore((s) => s.authLoaded);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!authLoaded) bootstrapAuth();
  }, [authLoaded]);

  useEffect(() => {
    if (!mounted) return;

    tickMonth();

    const id = setInterval(() => {
      tickMonth();
    }, 1000);

    return () => clearInterval(id);
  }, [mounted, tickMonth]);

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {!mounted ? <LoadingScreen label="Preparing your world…" /> : <Game />}
      </main>
    </div>
  );
}
