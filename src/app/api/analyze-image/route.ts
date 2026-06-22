import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert File to base64
    const buffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Gemini API key missing' }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `You are an automated civic issue categorization assistant. 
Analyze the provided image and output a structured JSON response with the following keys:
- category: The type of issue (e.g., "Pothole", "Streetlight", "Waste", "Vandalism", "Infrastructure").
- severity: The severity level ("LOW", "MEDIUM", "HIGH", "CRITICAL").
- description: A brief, factual description of the issue shown in the image.
Return ONLY valid JSON without any markdown formatting.`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: imageFile.type
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const textResponse = result.response.text();
    
    // Clean up response if Gemini returns markdown code blocks
    let cleanJson = textResponse.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsedData = JSON.parse(cleanJson);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
