import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

const BodySchema = z.object({
  monthIndex: z.number().int().min(1).max(999),
  difficulty: z.enum(["easy","medium","hard"]).default("easy"),
  profileName: z.string().optional()
});

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
You are generating "life expenses" tasks for a kid-friendly finance game called Penny.
Rules:
- Output MUST be valid JSON ONLY (no markdown).
- Generate 5 tasks.
- Exactly one task MUST be category "rent" and must be the most important.
- Categories allowed: rent, food, home, furniture, transport, fun, bill
- Each task must include: title (short), category, costCents (integer), minutesToDue (integer 1..4), prompt (kid-friendly scenario), hint (one sentence).
- Keep language for kids/teens, positive.
- Costs should fit: easy: 300..2500 cents, medium: 600..4000, hard: 1000..7000.
- Rent should be among higher costs.
- Include one financial term per task (budget, interest, fee, balance, statement).
Context: monthIndex=${body.monthIndex}, difficulty=${body.difficulty}.
`;

    const r = await model.generateContent(prompt);
    const text = r.response.text().trim();
    const parsed = JSON.parse(text) as any[];

    const tasks = parsed.map((t) => ({
      id: uid("task"),
      title: String(t.title).slice(0, 60),
      category: String(t.category),
      costCents: Number(t.costCents),
      dueAt: Date.now() + Number(t.minutesToDue) * 60_000,
      prompt: String(t.prompt).slice(0, 240),
      hint: String(t.hint).slice(0, 140),
      status: "open" as const,
      createdAt: Date.now()
    }));

    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to generate tasks" }, { status: 400 });
  }
}
