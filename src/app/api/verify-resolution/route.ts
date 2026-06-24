import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a strict civic engineer. The original reported issue was:
    CATEGORY: ${category}
    DESCRIPTION: ${description}

    The user has uploaded a new photo claiming this issue is now resolved.
    Analyze the new photo. Does it show that the issue is genuinely fixed, cleared, or no longer a problem?
    Respond ONLY with a valid JSON object matching this exact schema, with no markdown formatting or backticks:
    {
      "isResolved": boolean,
      "reasoning": "A short explanation of why it is or isn't resolved based on visual evidence."
    }`;

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: image.type
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(text);

    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error("[API] Resolution verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
