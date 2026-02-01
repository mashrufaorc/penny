"use client";

import { TopNav } from "@/components/TopNav";
import { BankCard } from "@/components/BankCard";
import Link from "next/link";
import { useGameStore, MONTH_LENGTH_MS } from "@/lib/store";
import { fmtMoney } from "@/lib/utils";

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function HomePage() {
  const {
    profileName,
    setProfileName,
    chequingCents,
    savingsCents,
    monthIndex,
    monthStartTs,
    narrationEnabled,
    toggleNarration,
    resetAll,
  } = useGameStore();

  const monthEndsIn = Math.max(0, monthStartTs + MONTH_LENGTH_MS - Date.now());

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="penny-title">Welcome, {profileName} 👋</h1>
            <p className="penny-subtitle">
              Your bank dashboard + your life game. Keep your balances healthy
              and pay tasks before they’re due.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="penny-chip">Month #{monthIndex}</span>
              <span className="penny-chip">
                Month ends in {msToClock(monthEndsIn)}
              </span>
              <button className="penny-chip" onClick={toggleNarration}>
                Narration: {narrationEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div className="penny-card p-4 w-full md:w-[420px]">
            <div className="text-sm font-semibold">Profile</div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-xl2 border border-black/10 px-3 py-2"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
              />
              <button className="penny-btn bg-white" onClick={resetAll}>
                Reset
              </button>
            </div>
            <p className="mt-2 text-xs text-penny-brown/60">
              For judging: no auth needed — profiles are stored locally.
            </p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <BankCard
            title="Chequing"
            subtitle="For spending, paying rent & bills"
            cents={chequingCents}
            badge="Daily money"
          />
          <BankCard
            title="Savings"
            subtitle="For goals and emergencies"
            cents={savingsCents}
            badge="Safe stash"
          />
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="penny-card p-5 md:col-span-2">
            <h2 className="text-xl font-extrabold">Quick Actions</h2>
            <p className="text-sm text-penny-brown/70 mt-1">
              Move funds, then jump into the world to earn coins and pay tasks.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/transfer" className="penny-btn">
                Move Funds
              </Link>
              <Link href="/play" className="penny-btn">
                Play World 🎮
              </Link>
              <Link href="/statement" className="penny-btn bg-white">
                View Statement
              </Link>
              <Link href="/help" className="penny-btn bg-white">
                Glossary
              </Link>
            </div>

            <div className="mt-4 p-4 rounded-xl2 bg-penny-tan/30 border border-black/5">
              <div className="font-bold">How your coin “size” works</div>
              <div className="text-sm text-penny-brown/70 mt-1">
                Your coin grows when you earn money and pay tasks on time. Miss
                deadlines and Penny shrinks.
              </div>
              <div className="mt-2 text-sm">
                Total balance:{" "}
                <span className="font-extrabold">
                  {fmtMoney(chequingCents + savingsCents)}
                </span>
              </div>
            </div>
          </div>

          <div className="penny-card p-5">
            <h2 className="text-xl font-extrabold">Investment Info</h2>
            <p className="mt-2 text-sm text-penny-brown/80">
              Investing means putting some money aside now to try to grow it
              later. Over time, growth can “stack” (compounding), which is why
              starting early helps. It’s also smart to spread money across
              different options (diversify) so one bad day doesn’t hurt as much.
              In Penny, you’ll practice long-term thinking with small, safe
              decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
