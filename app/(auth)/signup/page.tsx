"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 👇 THIS IS WHERE YOUR CODE GOES
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name
        }),
      });

      const text = await res.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create account");
      }

      // ✅ success → redirect to login or auto-login
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-penny-cream">
      <form
        onSubmit={handleSubmit}
        className="penny-card w-full max-w-md p-6"
      >
        <h1 className="text-2xl font-black">Create your account</h1>

        <input
          className="penny-input mt-4"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="penny-input mt-3"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="password"
          className="penny-input mt-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="penny-btn bg-penny-gold w-full mt-5"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
