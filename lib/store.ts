"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountType, LedgerEntry, MonthSummary, Task } from "./types";
import { uid, nowMs } from "./utils";

type AuthedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  ageGroup?: string | null;
};

type GameState = {
  // --- AUTH ---
  user: AuthedUser | null;
  hydrated: boolean;
  authLoaded: boolean;

  bootstrapAuth: () => Promise<void>;
  signOut: () => Promise<void>;

  // --- GAME ---
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

  // --- MONTH SYSTEM ---
  lastSpawnedMonthIndex: number; // prevents spawning tasks twice in same month
  spawnMonthlyTasks: () => void;
  tickMonth: () => void; // call every 1s from /play

  setProfileName: (name: string) => void;
  toggleNarration: () => void;
  setVoiceId: (voiceId: string) => void;

  deposit: (
    account: AccountType,
    amountCents: number,
    description: string,
    category?: LedgerEntry["category"]
  ) => void;

  withdraw: (
    account: AccountType,
    amountCents: number,
    description: string,
    category?: LedgerEntry["category"]
  ) => boolean;

  transfer: (from: AccountType, to: AccountType, amountCents: number) => boolean;

  upsertTasks: (tasks: Task[]) => void;
  markTask: (taskId: string, status: Task["status"]) => void;

  closeMonth: () => void;
  resetAll: () => void;
};

const MONTH_MS = 1000 * 60 * 5; 

function buildMonthlyTasks(monthStartTs: number): Task[] {
  const dueAt = monthStartTs + MONTH_MS;

  return [
    {
      id: uid("task"),
      title: "Pay Rent",
      category: "rent",
      costCents: 2500,
      status: "open",
      createdAt: monthStartTs,
      dueAt,
      prompt: "",
      hint: ""
    },
    {
      id: uid("task"),
      title: "Groceries (Food)",
      category: "food",
      costCents: 900,
      status: "open",
      createdAt: monthStartTs,
      dueAt,
      prompt: "",
      hint: ""
    },
    {
      id: uid("task"),
      title: "Transit / Gas",
      category: "transport",
      costCents: 450,
      status: "open",
      createdAt: monthStartTs,
      dueAt,
      prompt: "",
      hint: ""
    },
    {
      id: uid("task"),
      title: "Phone / Internet Bill",
      category: "bills",
      costCents: 600,
      status: "open",
      createdAt: monthStartTs,
      dueAt,
      prompt: "",
      hint: ""
    },
    {
      id: uid("task"),
      title: "Fun Purchase (Wants)",
      category: "wants",
      costCents: 500,
      status: "open",
      createdAt: monthStartTs,
      dueAt,
      prompt: "",
      hint: ""
    },
  ];
}

function initialState() {
  const ts = nowMs();
  return {
    // auth defaults
    user: null,
    hydrated: false,
    authLoaded: false,

    // game defaults
    profileName: "Player",
    monthIndex: 1,
    monthStartTs: ts,
    chequingCents: 5000,
    savingsCents: 2000,
    ledger: [],
    tasks: [],
    monthSummaries: [],
    narrationEnabled: true,
    voiceId: "SOYHLrjzK2X1ezoPC6cr",

    // month system defaults
    lastSpawnedMonthIndex: 0,
  } as any;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...(initialState() as any),

      // -------------------
      // AUTH
      // -------------------
      bootstrapAuth: async () => {
        try {
          const res = await fetch("/api/auth/me", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });

          if (!res.ok) {
            set({ user: null, authLoaded: true });
            return;
          }

          const data = await res.json().catch(() => ({} as any));
          const user = data?.user ?? null;

          set({
            user,
            profileName: user?.name || get().profileName || "Player",
            authLoaded: true,
          });
        } catch {
          set({ user: null, authLoaded: true });
        }
      },

      signOut: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        } finally {
          set({ user: null, authLoaded: true });
        }
      },

      // -------------------
      // MONTH SYSTEM
      // -------------------
      spawnMonthlyTasks: () => {
        const s = get();
        if (s.lastSpawnedMonthIndex === s.monthIndex) return; // already spawned this month
        const tasks = buildMonthlyTasks(s.monthStartTs);
        set({
          tasks,
          lastSpawnedMonthIndex: s.monthIndex,
        });
      },

      // Call every 1s in Play page.
      // Ensures tasks exist, fails overdue tasks, closes month when timer ends.
      tickMonth: () => {
        const s = get();
        const now = nowMs();
        const monthEnd = s.monthStartTs + MONTH_MS;

        // 1) Spawn tasks once per month (on first tick of that month)
        if (s.lastSpawnedMonthIndex !== s.monthIndex) {
          get().spawnMonthlyTasks();
          return;
        }

        // 2) Fail tasks that missed dueAt
        const updatedTasks = s.tasks.map((t) => {
          if (t.status === "open" && now > t.dueAt) return { ...t, status: "failed" as const };
          return t;
        });

        // 3) If month time is up, close month automatically
        if (now >= monthEnd) {
          set({ tasks: updatedTasks });
          get().closeMonth(); // monthIndex++, monthStartTs resets
          return;
        }

        // Save if anything changed
        const changed = updatedTasks.some((t, i) => t.status !== s.tasks[i]?.status);
        if (changed) set({ tasks: updatedTasks });
      },

      // -------------------
      // GAME ACTIONS
      // -------------------
      setProfileName: (name) => set({ profileName: name || "Player" }),
      toggleNarration: () => set({ narrationEnabled: !get().narrationEnabled }),
      setVoiceId: (voiceId) => set({ voiceId }),

      deposit: (account, amountCents, description, category = "income") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return;

        const e: LedgerEntry = {
          id: uid("tx"),
          ts: nowMs(),
          description,
          amountCents,
          account,
          category,
        };

        set((s) => ({
          ledger: [e, ...s.ledger].slice(0, 300),
          chequingCents:
            account === "chequing" ? s.chequingCents + amountCents : s.chequingCents,
          savingsCents:
            account === "savings" ? s.savingsCents + amountCents : s.savingsCents,
        }));
      },

      withdraw: (account, amountCents, description, category = "other") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return false;

        const bal =
          account === "chequing" ? get().chequingCents : get().savingsCents;
        if (bal < amountCents) return false;

        const e: LedgerEntry = {
          id: uid("tx"),
          ts: nowMs(),
          description,
          amountCents: -amountCents,
          account,
          category,
        };

        set((s) => ({
          ledger: [e, ...s.ledger].slice(0, 300),
          chequingCents:
            account === "chequing" ? s.chequingCents - amountCents : s.chequingCents,
          savingsCents:
            account === "savings" ? s.savingsCents - amountCents : s.savingsCents,
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
        const filtered = merged.filter(
          (t) => t.createdAt >= monthStart && t.createdAt <= monthEnd
        );
        set({ tasks: filtered.slice(0, 30) });
      },

      markTask: (taskId, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        })),

      closeMonth: () => {
        const s = get();
        const monthStart = s.monthStartTs;
        const monthEnd = monthStart + MONTH_MS;

        const tasks = s.tasks.map((t) =>
          t.status === "open" && nowMs() > t.dueAt
            ? { ...t, status: "failed" as const }
            : t
        );

        const rent = tasks.find((t) => t.category === "rent");
        const rentPaid = rent ? rent.status === "paid" : false;

        const tasksPaid = tasks.filter((t) => t.status === "paid").length;
        const tasksFailed = tasks.filter((t) => t.status === "failed").length;

        const monthLedger = s.ledger.filter(
          (e) => e.ts >= monthStart && e.ts <= monthEnd
        );
        const netCents = monthLedger.reduce((acc, e) => acc + e.amountCents, 0);

        const summary: MonthSummary = {
          monthIndex: s.monthIndex,
          startedAt: monthStart,
          endedAt: monthEnd,
          rentPaid,
          tasksPaid,
          tasksFailed,
          netCents,
        };

        set({
          tasks,
          monthSummaries: [summary, ...s.monthSummaries].slice(0, 12),
          monthIndex: s.monthIndex + 1,
          monthStartTs: nowMs(),
        });
      },

      resetAll: () => set(initialState() as any),
    }),
    {
      name: "penny_store_v2",
      version: 3,

      // don't persist auth/user (cookie + /api/auth/me is source of truth)
      partialize: (s) => {
        const { user, authLoaded, hydrated, ...rest } = s as any;
        return rest;
      },
    }
  )
);

export const MONTH_LENGTH_MS = MONTH_MS;
