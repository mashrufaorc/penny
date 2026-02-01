import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing env: GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { checking = 50, savings = 20, month = 1, recentActivity = [] } = body || {};

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are Penny’s kid-friendly money coach.
Write 3-5 short bullet tips for a child/teen based on their bank summary.
Keep it simple, positive, and educational. Avoid scary language.

Return PLAIN TEXT only (no JSON, no code blocks).

Month: ${month}
Checking: $${checking}
Savings: $${savings}
Recent Activity (may be empty): ${JSON.stringify(recentActivity).slice(0, 2000)}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text() || "";

    // Clean up common Gemini formatting
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({ advice: cleaned });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
