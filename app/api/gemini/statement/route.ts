import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  monthIndex: z.number().int(),
  ledger: z.array(z.object({
    ts: z.number(),
    description: z.string(),
    amountCents: z.number(),
    account: z.enum(["chequing","savings"]),
    category: z.string()
  })).max(300),
  tasks: z.array(z.object({
    title: z.string(),
    category: z.string(),
    costCents: z.number(),
    status: z.string()
  })).max(40),
  balances: z.object({ chequingCents: z.number(), savingsCents: z.number() })
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
Output JSON ONLY:
{
  "headline": string,
  "whatWentWell": [string,string,string],
  "whatToImprove": [string,string,string],
  "termsLearned": [{"term":string,"meaning":string},{"term":string,"meaning":string},{"term":string,"meaning":string}],
  "score": number (0..100)
}
Use the given data. Encourage. Focus on budgeting, rent, expenses, transfers.
Data:
monthIndex=${body.monthIndex}
balances=${JSON.stringify(body.balances)}
tasks=${JSON.stringify(body.tasks)}
ledger=${JSON.stringify(body.ledger.slice(0,40))}
`;

    const r = await model.generateContent(prompt);
    const text = r.response.text().trim();
    return NextResponse.json(JSON.parse(text));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
