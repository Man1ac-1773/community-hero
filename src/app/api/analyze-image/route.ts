import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("[API] /api/analyze-image hit");
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error("[API] No image provided in request.");
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[API] Unauthorized: Missing Authorization header.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[API] Unauthorized: Invalid token or user not found.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const prompt = "Analyze this civic issue image and categorize it.";

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          enum: ["Pothole", "Broken Streetlight", "Illegal Dumping", "Vandalism", "Water Leak", "Traffic Signal Issue", "Overgrown Vegetation", "Sidewalk Damage", "Graffiti", "Fallen Tree", "Drainage Issue", "Abandoned Vehicle", "Litter", "Utility Line Down", "Other"],
          format: "enum",
          description: "The category that best describes the issue in the image."
        },
        severity: {
          type: SchemaType.STRING,
          enum: ["Low", "Medium", "High", "Critical"],
          format: "enum",
          description: "The severity of the issue."
        },
        description: {
          type: SchemaType.STRING,
          description: "A detailed 2-3 sentence description of the issue visible in the image."
        }
      },
      required: ["category", "severity", "description"]
    };

    console.log("[API] Sending payload to Google Generative AI...");
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: imageFile.type } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = result.response.text();
    console.log("[API] Gemini Raw Response:\n", text);

    const parsedData = JSON.parse(text);
    console.log("[API] Successfully parsed JSON:", parsedData);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("====== API ROUTE ERROR ======");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=============================");
    
    if (error.message && (error.message.includes('Quota exceeded') || error.message.includes('429'))) {
      return NextResponse.json({ 
        error: 'AI is experiencing high traffic. Please wait 30 seconds and try again.',
        isRateLimit: true
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: error.message || 'Unknown Server Error',
      details: error.toString()
    }, { status: 500 });
  }
}
