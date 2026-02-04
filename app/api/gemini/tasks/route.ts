import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

/* -------------------- Validation -------------------- */

const BodySchema = z.object({
  monthIndex: z.number().int().min(1).max(999),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
});

const CategorySchema = z.enum([
  "rent",
  "food",
  "home",
  "furniture",
  "transport",
  "fun",
  "bill",
]);

const GeminiTaskSchema = z.object({
  title: z.string(),
  category: CategorySchema,
  costCents: z.number().int(),
  minutesToDue: z.number().int().min(1).max(4),
  prompt: z.string(),
  hint: z.string(),
});

/* -------------------- Helpers -------------------- */

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function extractJsonArray(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return a JSON array");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function costRange(diff: "easy" | "medium" | "hard") {
  if (diff === "easy") return [300, 2500];
  if (diff === "medium") return [600, 4000];
  return [1000, 7000];
}

/* -------------------- Route -------------------- */

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const [minCost, maxCost] = costRange(body.difficulty);

    const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Generate tasks for a kid-friendly finance game called Penny.

STRICT RULES:
- Output JSON ONLY
- Output MUST be a JSON ARRAY
- No markdown
- No explanation text

Generate EXACTLY 5 tasks.

Rules:
- Exactly ONE task must be category "rent"
- Categories allowed: rent, food, home, furniture, transport, fun, bill
- costCents must be between ${minCost} and ${maxCost}
- Rent should be one of the highest costs
- minutesToDue must be between 1 and 4

Each task must include:
title, category, costCents, minutesToDue, prompt, hint

Language: positive, kid-friendly
Include one finance term per task (budget, balance, fee, interest, statement)

Return JSON array only.
`.trim();

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const rawTasks = extractJsonArray(rawText);
    const parsedTasks = z
      .array(GeminiTaskSchema)
      .length(5)
      .parse(rawTasks);

    const now = Date.now();

    const tasks = parsedTasks.map((t) => ({
      id: uid("task"),
      title: t.title.slice(0, 60),
      category: t.category,
      costCents: t.costCents,
      dueAt: now + t.minutesToDue * 60_000,
      prompt: t.prompt.slice(0, 240),
      hint: t.hint.slice(0, 140),
      status: "open" as const,
      createdAt: now,
    }));

    const rentCount = tasks.filter((t) => t.category === "rent").length;
    if (rentCount !== 1) {
      tasks[0].category = "rent";
      for (let i = 1; i < tasks.length; i++) {
        if (tasks[i].category === "rent") tasks[i].category = "bill";
      }
    }

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("Gemini 2.5 task error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Task generation failed" },
      { status: 500 }
    );
  }
}
