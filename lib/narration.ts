"use client";

import { useGameStore } from "./store";

let currentAudio: HTMLAudioElement | null = null;

export async function narrate(text: string) {
  const s = useGameStore.getState();
  if (!s.narrationEnabled) return;

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text})
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => URL.revokeObjectURL(url);
    await a.play();
  } catch {
  }
}
