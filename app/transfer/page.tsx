"use client";

import { TopNav } from "@/components/TopNav";
import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { fmtMoney } from "@/lib/utils";
import { narrate } from "@/lib/narration";

export default function TransferPage() {
  const { chequingCents, savingsCents, transfer } = useGameStore();
  const [from, setFrom] = useState<"chequing"|"savings">("chequing");
  const [to, setTo] = useState<"chequing"|"savings">("savings");
  const [amount, setAmount] = useState("5.00");
  const [msg, setMsg] = useState("");

  function doTransfer() {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { setMsg("Enter a positive amount."); return; }
    if (from === to) { setMsg("Pick two different accounts."); return; }

    const ok = transfer(from, to, cents);
    if (!ok) { setMsg("Not enough money in the source account."); narrate("Oops! You don't have enough money in that account."); return; }

    setMsg("Transfer complete!");
    narrate("Transfer complete. Nice saving move!");
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="penny-title">Move Funds</h1>
        <p className="penny-subtitle">Practice moving money between Chequing and Savings.</p>

        <div className="mt-6 penny-card p-5">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl2 bg-penny-tan/30 border border-black/5">
              <div className="font-extrabold">Chequing</div>
              <div className="text-2xl font-black">{fmtMoney(chequingCents)}</div>
            </div>
            <div className="p-4 rounded-xl2 bg-penny-mint/30 border border-black/5">
              <div className="font-extrabold">Savings</div>
              <div className="text-2xl font-black">{fmtMoney(savingsCents)}</div>
            </div>
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm font-semibold">From</div>
              <select className="mt-1 w-full rounded-xl2 border border-black/10 px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value as any)}>
                <option value="chequing">Chequing</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <div className="text-sm font-semibold">To</div>
              <select className="mt-1 w-full rounded-xl2 border border-black/10 px-3 py-2" value={to} onChange={(e) => setTo(e.target.value as any)}>
                <option value="savings">Savings</option>
                <option value="chequing">Chequing</option>
              </select>
            </div>
            <div>
              <div className="text-sm font-semibold">Amount ($)</div>
              <input className="mt-1 w-full rounded-xl2 border border-black/10 px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button className="penny-btn" onClick={doTransfer}>Transfer</button>
            <div className="text-sm text-penny-brown/70">{msg}</div>
          </div>

          <div className="mt-4 p-4 rounded-xl2 bg-white border border-black/5">
            <div className="font-bold">Mini lesson</div>
            <p className="text-sm text-penny-brown/70 mt-1">Savings is for goals and emergencies. Chequing is for day-to-day spending. Moving money is a “transfer” on your statement.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
