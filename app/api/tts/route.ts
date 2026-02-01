import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().min(1).max(800),
  voiceId: z.string().min(1).max(80).optional()
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const apiKey = requireEnv("ELEVENLABS_API_KEY");
    const voiceId = body.voiceId || "21m00Tcm4TlvDq8ikWAM";
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: body.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.75 }
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return NextResponse.json({ error: errTxt }, { status: 400 });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "TTS failed" }, { status: 400 });
  }
}
