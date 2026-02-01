"use client";

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="penny-card p-8 w-[min(92vw,520px)] text-center">
        <img src="/assets/sprites/coins/coin_3.png" alt="Loading" className="h-16 w-16 mx-auto animate-bounce" />
        <h2 className="mt-3 text-2xl font-extrabold">Loading…</h2>
        <p className="mt-2 text-penny-brown/70">{label}</p>
        <div className="mt-5 h-3 w-full bg-penny-tan/40 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-penny-orange animate-pulse" />
        </div>
      </div>
    </div>
  );
}
