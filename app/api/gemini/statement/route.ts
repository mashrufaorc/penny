import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Statement } from "@/models/Statement";

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
        category: z.string().optional().default("general"),
        id: z.string().optional(),
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
    .max(60),
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

/**
 * Gemini sometimes returns:
 * - pure JSON
 * - JSON wrapped in ```json ... ```
 * - JSON with a little extra text
 * This extracts the first {...} block and parses safely.
 */
function safeJsonParse(text: string) {
  const cleaned = (text ?? "")
    .trim()
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("AI returned non-JSON output.");
  }
}

export async function POST(req: Request) {
  try {
    // 1) Auth
    const token = cookies().get("penny_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid } = await verifySession(token);

    // 2) Validate request body
    const body = BodySchema.parse(await req.json());

    // 3) Gemini
    const apiKey = requireEnv("GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use a known valid model for @google/generative-ai SDK
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Return JSON ONLY (no markdown, no backticks). Must match:
{
  "headline": string,
  "whatWentWell": string[],
  "whatToImprove": string[],
  "termsLearned": [{"term": string, "meaning": string}],
  "score": number
}

Make it kid-friendly and encouraging.
Focus on: budgeting, rent/needs vs wants, saving, deadlines, and smart choices.
Be specific using the data.

DATA:
monthIndex=${body.monthIndex}
balances=${JSON.stringify(body.balances)}
tasks=${JSON.stringify(body.tasks.slice(0, 40))}
ledger=${JSON.stringify(body.ledger.slice(0, 60))}
`.trim();

    const r = await model.generateContent(prompt);
    const text = r.response.text()?.trim() || "";

    const parsed = safeJsonParse(text);
    const ai = AiStatementSchema.parse(parsed);

    // 4) MongoDB Atlas save (upsert)
    await dbConnect();

    await Statement.updateOne(
      { userId: uid, monthIndex: body.monthIndex },
      {
        $set: {
          userId: uid,
          monthIndex: body.monthIndex,
          balances: body.balances,
          ledgerPreview: body.ledger.slice(0, 80),
          tasksPreview: body.tasks.slice(0, 50),
          ai,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 5) Return AI statement to client
    return NextResponse.json(ai);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 400 }
    );
  }
}
