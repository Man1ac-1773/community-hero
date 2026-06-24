import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    console.log("[API] /api/analyze-image hit");
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error("[API] No image provided in request.");
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    console.log(`[API] Image received: ${imageFile.name} (${imageFile.size} bytes, ${imageFile.type})`);

    const buffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[API] Server misconfiguration: GEMINI_API_KEY is missing from environment variables.");
      return NextResponse.json({ error: 'Server misconfiguration: Gemini API key missing' }, { status: 500 });
    }
    
    console.log("[API] Initializing Gemini API...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this civic issue image. Respond ONLY with a valid JSON object matching this exact schema, with no markdown formatting or backticks:
    {
      "category": "string (e.g. Pothole, Broken Streetlight, Illegal Dumping)",
      "severity": "string (e.g. Low, Medium, High, Critical)",
      "description": "string (A detailed 2-3 sentence description of the issue visible in the image)"
    }`;

    console.log("[API] Sending payload to Google Generative AI...");
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: imageFile.type
        }
      }
    ]);

    const text = result.response.text();
    console.log("[API] Gemini Raw Response:\n", text);

    let cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    if (!cleanJson.startsWith('{')) {
       console.error("[API] Gemini did not return a valid JSON object. Raw text:", text);
       return NextResponse.json({ error: 'AI returned invalid format', rawText: text }, { status: 500 });
    }

    const parsedData = JSON.parse(cleanJson);
    console.log("[API] Successfully parsed JSON:", parsedData);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("====== API ROUTE ERROR ======");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=============================");
    
    return NextResponse.json({ 
      error: error.message || 'Unknown Server Error',
      details: error.toString()
    }, { status: 500 });
  }
}
