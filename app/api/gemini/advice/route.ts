import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  context: z.string().min(1).max(4000),
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Gemini sometimes returns ``` fences or extra formatting
function cleanText(text: string) {
  return (text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const apiKey = requireEnv("GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ Gemini 2.5 model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are Penny’s friendly money coach for a financial literacy game.

Write 3–5 SHORT bullet tips that help the player decide what to do next.
Rules:
- Positive, not scary
- Use simple money words: budget, balance, rent, savings, needs vs wants, fee
- Suggest an action when possible (example: transfer from savings, pay rent first)
- PLAIN TEXT only (no JSON, no markdown code blocks)

Context:
${body.context}
`.trim();

    const result = await model.generateContent(prompt);
    const text = cleanText(result.response.text());

    const advice =
      text.length > 0
        ? text
        : "• Pay needs first (rent/food)\n• Check your balance before spending\n• Save a little before buying wants";

    return NextResponse.json({ advice });
  } catch (e: any) {
    console.error("Gemini advice error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
