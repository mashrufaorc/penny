export async function speak(text: string) {
  if (!text) return;

  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  audio.play();

  audio.onended = () => URL.revokeObjectURL(url);
}
