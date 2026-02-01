"use client";

import { TopNav } from "@/components/TopNav";
import { useGameStore } from "@/lib/store";
import { fmtMoney } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { narrate } from "@/lib/narration";

type AiStatement = {
  headline: string;
  whatWentWell: string[];
  whatToImprove: string[];
  termsLearned: { term: string; meaning: string }[];
  score: number;
};

export default function StatementPage() {
  const { monthIndex, ledger, tasks, chequingCents, savingsCents, monthSummaries } =
    useGameStore();

  const [ai, setAi] = useState<AiStatement | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const latest = monthSummaries[0];
  const monthLedger = useMemo(() => ledger.slice(0, 30), [ledger]);

  async function gen() {
    setErr("");
    setAi(null);
    setLoading(true);

    try {
      const res = await fetch("/api/gemini/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // IMPORTANT: route.ts expects ledger items with ts/description/amountCents/account/category
        body: JSON.stringify({
          monthIndex,
          ledger: monthLedger.map((e: any) => ({
            ts: e.ts ?? Date.now(),
            description: e.description ?? "",
            amountCents: e.amountCents ?? 0,
            account: e.account ?? "chequing",
            category: e.category ?? "general",
            id: e.id,
          })),
          tasks: tasks.map((t: any) => ({
            title: t.title,
            category: t.category,
            costCents: t.costCents,
            status: t.status,
          })),
          balances: { chequingCents, savingsCents },
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        let msg = "No AI response (check GEMINI_API_KEY).";
        try {
          const j = JSON.parse(text);
          msg = j?.error ?? msg;
        } catch {
          msg = text || msg;
        }
        throw new Error(msg);
      }

      const j = JSON.parse(text) as AiStatement;
      setAi(j);

      narrate(`Your statement is ready. Score: ${j.score} out of 100. ${j.headline}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingOrGenerate() {
    setErr("");
    setLoading(true);

    try {
      // Try MongoDB first
      const existingRes = await fetch(`/api/statements/month/${monthIndex}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      // If unauthorized, show error and stop (user must login)
      if (existingRes.status === 401) {
        const t = await existingRes.text();
        let msg = "Unauthorized. Please log in again.";
        try {
          msg = JSON.parse(t)?.error ?? msg;
        } catch {}
        throw new Error(msg);
      }

      if (existingRes.ok) {
        const existing = await existingRes.json().catch(() => ({} as any));
        if (existing?.statement?.ai) {
          setAi(existing.statement.ai as AiStatement);
          setLoading(false);
          return;
        }
      }

      // Not found or no ai saved -> generate
      await gen();
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExistingOrGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="penny-title">Bank Statement</h1>
        <p className="penny-subtitle">
          A kid-friendly summary of your “month” so you learn how statements work.
        </p>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="penny-card p-5 md:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Balances</div>
                <div className="text-sm text-penny-brown/70">Month #{monthIndex}</div>
              </div>

              <div className="flex gap-2">
                <button
                  className="penny-btn bg-white"
                  onClick={loadExistingOrGenerate}
                  disabled={loading}
                  title="Load saved statement (or generate if missing)"
                >
                  {loading ? "Working…" : "Load"}
                </button>

                <button
                  className="penny-btn bg-white"
                  onClick={gen}
                  disabled={loading}
                  title="Force a fresh AI statement (and overwrite saved one)"
                >
                  {loading ? "Working…" : "Regenerate"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl2 bg-penny-tan/30 border border-black/5">
                <div className="font-extrabold">Chequing</div>
                <div className="text-2xl font-black">{fmtMoney(chequingCents)}</div>
              </div>
              <div className="p-4 rounded-xl2 bg-penny-mint/30 border border-black/5">
                <div className="font-extrabold">Savings</div>
                <div className="text-2xl font-black">{fmtMoney(savingsCents)}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-lg font-extrabold">Recent Activity</div>
              <div className="mt-2 overflow-hidden rounded-xl2 border border-black/5">
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Account</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/70">
                    {monthLedger.map((e: any) => (
                      <tr key={e.id ?? `${e.ts}-${e.description}`} className="border-t border-black/5">
                        <td className="p-3">{e.description}</td>
                        <td className="p-3 capitalize">{e.account}</td>
                        <td className="p-3 text-right font-semibold">
                          {e.amountCents < 0 ? "-" : ""}
                          {fmtMoney(Math.abs(e.amountCents))}
                        </td>
                      </tr>
                    ))}
                    {monthLedger.length === 0 ? (
                      <tr>
                        <td className="p-3 text-penny-brown/70" colSpan={3}>
                          No transactions yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {latest ? (
              <div className="mt-6 p-4 rounded-xl2 bg-white border border-black/5">
                <div className="font-extrabold">Last month snapshot</div>
                <div className="mt-2 text-sm text-penny-brown/80">
                  Rent paid:{" "}
                  <span className="font-bold">{latest.rentPaid ? "Yes ✅" : "No ❌"}</span>{" "}
                  • Tasks paid: <span className="font-bold">{latest.tasksPaid}</span> •
                  Tasks missed: <span className="font-bold">{latest.tasksFailed}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="penny-card p-5">
            <div className="text-xl font-extrabold">AI Coach</div>
            <p className="text-sm text-penny-brown/70 mt-1">Generated by Gemini.</p>

            {err ? (
              <div className="mt-3 p-3 rounded-xl2 bg-red-50 border border-red-200 text-sm">
                {err}
                <div className="mt-2 text-xs text-penny-brown/60">
                  If this says Unauthorized, login again. If it says missing key, set{" "}
                  <span className="font-mono">GEMINI_API_KEY</span> in{" "}
                  <span className="font-mono">.env.local</span> and restart{" "}
                  <span className="font-mono">npm run dev</span>.
                </div>
              </div>
            ) : null}

            {!ai && !err ? (
              <div className="mt-3 text-sm text-penny-brown/70">
                {loading ? "Loading…" : "No statement yet."}
              </div>
            ) : null}

            {ai ? (
              <div className="mt-3">
                <div className="p-3 rounded-xl2 bg-penny-tan/30 border border-black/5">
                  <div className="font-extrabold">Score</div>
                  <div className="text-3xl font-black">{ai.score}/100</div>
                  <div className="mt-1 text-sm text-penny-brown/80">{ai.headline}</div>
                </div>

                <div className="mt-4">
                  <div className="font-extrabold">What went well</div>
                  <ul className="list-disc pl-5 text-sm text-penny-brown/80 mt-2 space-y-1">
                    {ai.whatWentWell.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <div className="font-extrabold">What to improve</div>
                  <ul className="list-disc pl-5 text-sm text-penny-brown/80 mt-2 space-y-1">
                    {ai.whatToImprove.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <div className="font-extrabold">Terms learned</div>
                  <div className="mt-2 space-y-2">
                    {ai.termsLearned.map((t, i) => (
                      <div key={i} className="p-3 rounded-xl2 bg-white border border-black/5">
                        <div className="font-extrabold">{t.term}</div>
                        <div className="text-sm text-penny-brown/80">{t.meaning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
