import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({ situation: z.string().min(1).max(800) });

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const apiKey = requireEnv("GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a friendly coach for kids/teens learning money.
Give:
1) A 1-sentence simple explanation
2) 3 bullet tips (max 10 words each)
3) A mini glossary: define 2 terms (one line each)
Encouraging tone.
Situation: ${body.situation}
`;

    const r = await model.generateContent(prompt);
    return NextResponse.json({ text: r.response.text().trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
