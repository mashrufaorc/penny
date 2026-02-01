import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  context: z.string().min(1).max(4000), // keep it simple: pass a short summary string
  mode: z.enum(["kid", "teen"]).default("kid"),
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function stripFences(s: string) {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const apiKey = requireEnv("GEMINI_API_KEY");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const body = BodySchema.parse(await req.json());

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are Penny’s friendly money coach.
Give 3–5 short bullet tips for ${body.mode === "kid" ? "a child" : "a teenager"}.

Rules:
- Be positive, not scary.
- Use simple money words (budget, rent, savings, needs vs wants).
- Keep it short.
- PLAIN TEXT only. No JSON. No code blocks.

Context:
${body.context}
`.trim();

    const resp = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7 },
    });

    const text = stripFences((resp.text ?? "").trim());

    return NextResponse.json({ advice: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
