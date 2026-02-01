"use client";

import { TopNav } from "@/components/TopNav";

const TERMS = [
  { term: "Budget", meaning: "A plan for how you will use your money." },
  { term: "Balance", meaning: "How much money is in an account right now." },
  { term: "Expense", meaning: "Money you spend (like rent, food, bills)." },
  { term: "Income", meaning: "Money you earn or receive." },
  { term: "Transfer", meaning: "Moving money between accounts." },
  { term: "Statement", meaning: "A report of what happened in your account." },
  { term: "Fee", meaning: "Extra money charged for a service." },
  { term: "Emergency Fund", meaning: "Money saved for surprises." }
];

export default function HelpPage() {
  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="penny-title">Money Glossary</h1>
        <p className="penny-subtitle">Quick definitions kids can understand.</p>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {TERMS.map((t) => (
            <div key={t.term} className="penny-card p-5">
              <div className="text-lg font-extrabold">{t.term}</div>
              <div className="mt-1 text-sm text-penny-brown/80">{t.meaning}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 penny-card p-5">
          <div className="text-xl font-extrabold">Gameplay tips</div>
          <ul className="mt-3 list-disc pl-5 text-sm text-penny-brown/80 space-y-2">
            <li>Collect coins on the map to grow your Penny size.</li>
            <li>Pay tasks before the timer hits zero to avoid fees.</li>
            <li>If you can’t pay, transfer from Savings → Chequing.</li>
            <li>Your statement shows deposits, withdrawals, and transfers.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
