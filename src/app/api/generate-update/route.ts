import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, severity, description, status, triageClassification, caseBrief } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert Public Relations Officer for the City Council. A citizen has reported the following civic issue:

Category: ${category}
Severity: ${severity}
Status: ${status}
AI Triage Classification: ${triageClassification}
Description: "${description}"
Case Brief (AI generated context): ${JSON.stringify(caseBrief || {})}

Write a professional, empathetic, and actionable 2-3 paragraph public announcement regarding this issue. 
It should be addressed to the citizens.
Acknowledge their frustration, explain what the city is doing to address it (make reasonable, realistic assumptions based on the category/severity), and provide a generic timeline (e.g. "within the next 48 hours" or "in our upcoming weekly maintenance cycle"). 
Keep the tone authoritative but deeply empathetic. Format the response with markdown. Do not include placeholders like [City Name], just speak generally as "The City Council".
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ update: text });
  } catch (err: any) {
    console.error("Generate Update Error:", err);
    if (err.message && (err.message.includes('Quota exceeded') || err.message.includes('429'))) {
      return NextResponse.json({ error: 'AI is experiencing high traffic. Please wait 30 seconds and try again.' }, { status: 429 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
