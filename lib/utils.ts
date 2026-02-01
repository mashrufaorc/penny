import { clsx } from "clsx";

export function cn(...inputs: any[]) { return clsx(inputs); }

export function fmtMoney(cents: number) {
  const v = (cents / 100).toFixed(2);
  return `$${v}`;
}

export function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
export function nowMs() { return Date.now(); }
export function uid(prefix = "id") { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
