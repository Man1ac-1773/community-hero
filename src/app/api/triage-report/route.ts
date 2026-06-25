import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runTriage } from '@/lib/triage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { category, severity, description, lat, lng } = body;

    if (!category || !severity || !description || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const newReport = { category, severity, description, lat, lng };
    const triageResult = await runTriage(supabase, apiKey, newReport);

    return NextResponse.json(triageResult);
  } catch (err: any) {
    console.error("Triage Error:", err);
    if (err.message && (err.message.includes('Quota exceeded') || err.message.includes('429'))) {
      return NextResponse.json({ 
        error: 'AI is experiencing high traffic. Please wait 30 seconds and try again.',
        isRateLimit: true
      }, { status: 429 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
