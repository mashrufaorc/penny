"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountType, LedgerEntry, MonthSummary, Task } from "./types";
import { uid, nowMs } from "./utils";

/* ---------------- TYPES ---------------- */

export type UiMode = "kid" | "teen";

type AuthedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  ageGroup?: UiMode | null; // <-- comes from backend
};

type GameState = {
  /* -------- AUTH / UI -------- */
  user: AuthedUser | null;
  uiMode: UiMode;
  authLoaded: boolean;
  hydrated: boolean;

  bootstrapAuth: () => Promise<void>;
  signOut: () => Promise<void>;

  /* -------- GAME -------- */
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

  transfer: (
    from: AccountType,
    to: AccountType,
    amountCents: number
  ) => boolean;

  upsertTasks: (tasks: Task[]) => void;
  markTask: (taskId: string, status: Task["status"]) => void;

  closeMonth: () => void;
  resetAll: () => void;
};

/* ---------------- CONSTANTS ---------------- */

const MONTH_MS = 1000 * 60 * 5; // 5 min = 1 month

function initialState() {
  const ts = nowMs();
  return {
    /* auth */
    user: null as AuthedUser | null,
    uiMode: "kid" as UiMode,
    authLoaded: false,
    hydrated: false,

    /* game */
    profileName: "Player",
    monthIndex: 1,
    monthStartTs: ts,
    chequingCents: 5000,
    savingsCents: 2000,
    ledger: [] as LedgerEntry[],
    tasks: [] as Task[],
    monthSummaries: [] as MonthSummary[],
    narrationEnabled: true,
    voiceId: "21m00Tcm4TlvDq8ikWAM",
  };
}

/* ---------------- STORE ---------------- */

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...(initialState() as any),

      /* ---------- AUTH ---------- */

      bootstrapAuth: async () => {
        try {
          const res = await fetch("/api/auth/me", {
            method: "GET",
            cache: "no-store",
          });

          const data = await res.json().catch(() => null);
          const user: AuthedUser | null = data?.user ?? null;

          const mode: UiMode =
            user?.ageGroup === "teen" ? "teen" : "kid";

          set({
            user,
            uiMode: mode,
            profileName: user?.name || get().profileName || "Player",
            authLoaded: true,
          });
        } catch {
          set({
            user: null,
            uiMode: "kid",
            authLoaded: true,
          });
        }
      },

      signOut: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        } finally {
          set({
            user: null,
            uiMode: "kid",
            authLoaded: true,
          });
        }
      },

      /* ---------- SETTINGS ---------- */

      setProfileName: (name) =>
        set({ profileName: name || "Player" }),

      toggleNarration: () =>
        set({ narrationEnabled: !get().narrationEnabled }),

      setVoiceId: (voiceId) => set({ voiceId }),

      /* ---------- MONEY ---------- */

      deposit: (account, amountCents, description, category = "income") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return;

        const entry: LedgerEntry = {
          id: uid("tx"),
          ts: nowMs(),
          description,
          amountCents,
          account,
          category,
        };

        set((s) => ({
          ledger: [entry, ...s.ledger].slice(0, 300),
          chequingCents:
            account === "chequing"
              ? s.chequingCents + amountCents
              : s.chequingCents,
          savingsCents:
            account === "savings"
              ? s.savingsCents + amountCents
              : s.savingsCents,
        }));
      },

      withdraw: (account, amountCents, description, category = "other") => {
        amountCents = Math.round(amountCents);
        if (amountCents <= 0) return false;

        const balance =
          account === "chequing"
            ? get().chequingCents
            : get().savingsCents;

        if (balance < amountCents) return false;

        const entry: LedgerEntry = {
          id: uid("tx"),
          ts: nowMs(),
          description,
          amountCents: -amountCents,
          account,
          category,
        };

        set((s) => ({
          ledger: [entry, ...s.ledger].slice(0, 300),
          chequingCents:
            account === "chequing"
              ? s.chequingCents - amountCents
              : s.chequingCents,
          savingsCents:
            account === "savings"
              ? s.savingsCents - amountCents
              : s.savingsCents,
        }));

        return true;
      },

      transfer: (from, to, amountCents) => {
        if (from === to) return false;
        const ok = get().withdraw(
          from,
          amountCents,
          `Transfer to ${to}`,
          "transfer"
        );
        if (!ok) return false;
        get().deposit(to, amountCents, `Transfer from ${from}`, "transfer");
        return true;
      },

      /* ---------- TASKS ---------- */

      upsertTasks: (tasks) => {
        const existing = new Map(get().tasks.map((t) => [t.id, t]));
        const merged: Task[] = [...get().tasks];

        for (const t of tasks) {
          if (existing.has(t.id)) {
            const i = merged.findIndex((x) => x.id === t.id);
            if (i >= 0) merged[i] = { ...existing.get(t.id)!, ...t };
          } else {
            merged.unshift(t);
          }
        }

        const start = get().monthStartTs;
        const end = start + MONTH_MS;

        set({
          tasks: merged
            .filter((t) => t.createdAt >= start && t.createdAt <= end)
            .slice(0, 30),
        });
      },

      markTask: (taskId, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, status } : t
          ),
        })),

      /* ---------- MONTH END ---------- */

      closeMonth: () => {
        const s = get();
        const start = s.monthStartTs;
        const end = start + MONTH_MS;

        const updatedTasks = s.tasks.map((t) =>
          t.status === "open" && nowMs() > t.dueAt
            ? { ...t, status: "failed" as const }
            : t
        );

        const rentPaid =
          updatedTasks.find((t) => t.category === "rent")?.status === "paid";

        const summary: MonthSummary = {
          monthIndex: s.monthIndex,
          startedAt: start,
          endedAt: end,
          rentPaid,
          tasksPaid: updatedTasks.filter((t) => t.status === "paid").length,
          tasksFailed: updatedTasks.filter((t) => t.status === "failed").length,
          netCents: s.ledger
            .filter((e) => e.ts >= start && e.ts <= end)
            .reduce((a, e) => a + e.amountCents, 0),
        };

        set({
          tasks: updatedTasks,
          monthSummaries: [summary, ...s.monthSummaries].slice(0, 12),
          monthIndex: s.monthIndex + 1,
          monthStartTs: nowMs(),
        });
      },

      resetAll: () => {
        const { user, uiMode, authLoaded } = get();
        set({
          ...(initialState() as any),
          user,
          uiMode,
          authLoaded,
          hydrated: true,
        });
      },
    }),
    {
      name: "penny_store_v1",
      version: 3,

      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },

      // ❗ do NOT persist auth
      partialize: (s) => {
        const { user, authLoaded, ...rest } = s as any;
        return rest;
      },
    }
  )
);

export const MONTH_LENGTH_MS = MONTH_MS;
