"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const bootstrapAuth = useGameStore((s) => s.bootstrapAuth);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let j: any = {};
      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        j = {};
      }

      if (!res.ok) {
        throw new Error(j?.error || text || "Login failed");
      }

      await bootstrapAuth().catch(() => {});

      router.replace(next);
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-penny-cream flex items-center justify-center px-4">
      <div className="penny-card w-full max-w-md p-6">
        <h1 className="penny-title text-3xl">Sign in</h1>
        <p className="penny-subtitle mt-1">Welcome back to Penny.</p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input
            className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
          <input
            className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {err ? (
            <div className="p-3 rounded-xl2 bg-red-50 border border-red-200 text-sm">
              {err}
            </div>
          ) : null}

          <button className="penny-btn w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            className="penny-btn w-full bg-white"
            type="button"
            disabled={loading}
            onClick={() => router.push(`/signup?next=${encodeURIComponent(next)}`)}
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
