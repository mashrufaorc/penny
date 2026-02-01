"use client";

import { fmtMoney } from "@/lib/utils";

export function BankCard({ title, subtitle, cents, badge }: { title: string; subtitle: string; cents: number; badge?: string }) {
  return (
    <div className="penny-card p-5 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-penny-sky/30 blur-2xl" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-penny-mint/30 blur-2xl" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold">{title}</h3>
            {badge ? <span className="penny-chip">{badge}</span> : null}
          </div>
          <p className="text-sm text-penny-brown/70">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black">{fmtMoney(cents)}</div>
          <div className="text-xs text-penny-brown/60">Available</div>
        </div>
      </div>
    </div>
  );
}
