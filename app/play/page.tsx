"use client";

import { TopNav } from "@/components/TopNav";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/LoadingScreen";

const Game = dynamic(() => import("@/components/game/Game"), { ssr: false });

export default function PlayPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {!mounted ? <LoadingScreen label="Preparing your world…" /> : <Game />}
      </main>
    </div>
  );
}
