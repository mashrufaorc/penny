"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountType, LedgerEntry, MonthSummary, Task } from "./types";
import { uid, nowMs } from "./utils";

type GameState = {
  profileName: string;
  monthIndex: number;
  monthStartTs: number;

  chequingCents: number;
  savingsCents: number;

  ledger: LedgerEntry[];
  tasks: Task[];
  monthSummaries: MonthSummary[];

  narrationEnabled: boolean;
  voiceId: string;

  setProfileName: (name: string) => void;
  toggleNarration: () => void;
  setVoiceId: (voiceId: string) => void;

  deposit: (account: AccountType, amountCents: number, description: string, category?: LedgerEntry["category"]) => void;
  withdraw: (account: AccountType, amountCents: number, description: string, category?: LedgerEntry["category"]) => boolean;
  transfer: (from: AccountType, to: AccountType, amountCents: number) => boolean;

  upsertTasks: (tasks: Task[]) => void;
  markTask: (taskId: string, status: Task["status"]) => void;

  closeMonth: () => void;
  resetAll: () => void;
};

const MONTH_MS = 1000 * 60 * 5; // 5 minutes per "month"

function initialState() {
  const ts = nowMs();
  return {
    profileName: "Player",
    monthIndex: 1,
    monthStartTs: ts,
    chequingCents: 5000,
    savingsCents: 2000,
    ledger: [],
    tasks: [],
    monthSummaries: [],
    narrationEnabled: true,
    voiceId: "21m00Tcm4TlvDq8ikWAM"
  } as any;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...(initialState() as any),

      setProfileName: (name) => set({ profileName: name || "Player" }),
      toggleNarration: () => set({ narrationEnabled: !get().narrationEnabled }),
      setVoiceId: (voiceId) => set({ voiceId }),

      deposit: (account, amountCents, description, category = "income") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return;
        const e: LedgerEntry = { id: uid("tx"), ts: nowMs(), description, amountCents, account, category };
        set((s) => ({
          ledger: [e, ...s.ledger].slice(0, 300),
          chequingCents: account === "chequing" ? s.chequingCents + amountCents : s.chequingCents,
          savingsCents: account === "savings" ? s.savingsCents + amountCents : s.savingsCents
        }));
      },

      withdraw: (account, amountCents, description, category = "other") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return false;
        const bal = account === "chequing" ? get().chequingCents : get().savingsCents;
        if (bal < amountCents) return false;

        const e: LedgerEntry = { id: uid("tx"), ts: nowMs(), description, amountCents: -amountCents, account, category };
        set((s) => ({
          ledger: [e, ...s.ledger].slice(0, 300),
          chequingCents: account === "chequing" ? s.chequingCents - amountCents : s.chequingCents,
          savingsCents: account === "savings" ? s.savingsCents - amountCents : s.savingsCents
        }));
        return true;
      },

      transfer: (from, to, amountCents) => {
        if (from === to) return false;
        const ok = get().withdraw(from, amountCents, `Transfer to ${to}`, "transfer");
        if (!ok) return false;
        get().deposit(to, amountCents, `Transfer from ${from}`, "transfer");
        return true;
      },

      upsertTasks: (tasks) => {
        const existing = new Map(get().tasks.map((t) => [t.id, t]));
        const merged: Task[] = [...get().tasks];

        for (const t of tasks) {
          if (existing.has(t.id)) {
            const idx = merged.findIndex((x) => x.id === t.id);
            if (idx >= 0) merged[idx] = { ...existing.get(t.id)!, ...t };
          } else {
            merged.unshift(t);
          }
        }

        const monthStart = get().monthStartTs;
        const monthEnd = monthStart + MONTH_MS;
        const filtered = merged.filter((t) => t.createdAt >= monthStart && t.createdAt <= monthEnd);
        set({ tasks: filtered.slice(0, 30) });
      },

      markTask: (taskId, status) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) })),

      closeMonth: () => {
        const s = get();
        const monthStart = s.monthStartTs;
        const monthEnd = monthStart + MONTH_MS;

        const tasks = s.tasks.map((t) => (t.status === "open" && nowMs() > t.dueAt ? { ...t, status: "failed" as const } : t));
        const rent = tasks.find((t) => t.category === "rent");
        const rentPaid = rent ? rent.status === "paid" : false;

        const tasksPaid = tasks.filter((t) => t.status === "paid").length;
        const tasksFailed = tasks.filter((t) => t.status === "failed").length;

        const monthLedger = s.ledger.filter((e) => e.ts >= monthStart && e.ts <= monthEnd);
        const netCents = monthLedger.reduce((acc, e) => acc + e.amountCents, 0);

        const summary: MonthSummary = { monthIndex: s.monthIndex, startedAt: monthStart, endedAt: monthEnd, rentPaid, tasksPaid, tasksFailed, netCents };

        set({
          tasks,
          monthSummaries: [summary, ...s.monthSummaries].slice(0, 12),
          monthIndex: s.monthIndex + 1,
          monthStartTs: nowMs()
        });
      },

      resetAll: () => set(initialState() as any)
    }),
    { name: "penny_store_v1", version: 1 }
  )
);

export const MONTH_LENGTH_MS = MONTH_MS;
