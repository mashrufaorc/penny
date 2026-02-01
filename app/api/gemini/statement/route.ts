import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const runtime = "nodejs";

const BodySchema = z.object({
  monthIndex: z.number().int(),
  ledger: z
    .array(
      z.object({
        ts: z.number(),
        description: z.string(),
        amountCents: z.number(),
        account: z.enum(["chequing", "savings"]),
        category: z.string(),
      })
    )
    .max(300),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        category: z.string(),
        costCents: z.number(),
        status: z.string(),
      })
    )
    .max(80),
  balances: z.object({
    chequingCents: z.number(),
    savingsCents: z.number(),
  }),
});

const AiStatementSchema = z.object({
  headline: z.string(),
  whatWentWell: z.array(z.string()).min(3).max(6),
  whatToImprove: z.array(z.string()).min(3).max(6),
  termsLearned: z
    .array(z.object({ term: z.string(), meaning: z.string() }))
    .min(3)
    .max(6),
  score: z.number().min(0).max(100),
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Small helper in case Gemini ever returns extra whitespace
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }
    throw new Error("AI returned non-JSON output.");
  }
}

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());

    const apiKey = requireEnv("GEMINI_API_KEY");
    const ai = new GoogleGenAI({ apiKey });

    const compactLedger = body.ledger.slice(0, 60);

    const prompt = `
You are a kid-friendly financial coach for a game.
Write a helpful monthly bank-statement summary based on the data.
Be encouraging, clear, and specific.

Focus on:
- rent + essential bills
- spending vs saving
- missed tasks / late payments
- simple next steps

Return JSON that matches the provided schema.

Data:
monthIndex=${body.monthIndex}
balances=${JSON.stringify(body.balances)}
tasks=${JSON.stringify(body.tasks)}
ledger(sample)=${JSON.stringify(compactLedger)}
`.trim();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(AiStatementSchema),
      },
    });

    const text = (response.text ?? "").trim();
    const parsed = safeJsonParse(text);
    const validated = AiStatementSchema.parse(parsed);

    return NextResponse.json(validated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 400 }
    );
  }
}
