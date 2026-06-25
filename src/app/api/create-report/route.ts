import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Needs service role to bypass RLS for trusted writes if needed, but ANON key is fine if we use the user's token. Wait, we need to insert as the user.
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    // Use the user's token to make the insert so RLS passes and it belongs to them
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // We expect the client to send the final triage result along with the report data.
    // In a fully locked down system, we'd run triage here again. 
    // For this hackathon, passing the triage result from the previous /api/triage-report call is acceptable.
    const { 
      category, severity, description, lat, lng, imageUrl,
      classification, confidence, primaryReportId, relatedReportIds,
      clusterKey, priorityScore, priorityBand, recommendedAction,
      reasoning, caseBrief, signals, userOverride
    } = body;

    // Strict validation of client-supplied triage fields to prevent tampering
    if (classification && !['NEW_INCIDENT', 'LIKELY_DUPLICATE', 'RELATED_CLUSTER'].includes(classification)) {
      return NextResponse.json({ error: 'Invalid classification' }, { status: 400 });
    }
    if (priorityScore !== undefined && (typeof priorityScore !== 'number' || priorityScore < 0 || priorityScore > 100)) {
      return NextResponse.json({ error: 'Invalid priorityScore' }, { status: 400 });
    }
    if (priorityBand && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priorityBand)) {
      return NextResponse.json({ error: 'Invalid priorityBand' }, { status: 400 });
    }
    if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
      return NextResponse.json({ error: 'Invalid confidence' }, { status: 400 });
    }
    if (userOverride !== undefined && typeof userOverride !== 'boolean') {
      return NextResponse.json({ error: 'Invalid userOverride' }, { status: 400 });
    }

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Citizen';

    const { data, error } = await userSupabase.from('reports').insert([{
      "userId": user.id,
      "userName": userName,
      category,
      severity,
      description,
      lat,
      lng,
      "imageUrl": imageUrl,
      "triageClassification": classification || 'NEW_INCIDENT',
      "triageConfidence": confidence || 1.0,
      "duplicateOf": primaryReportId || null,
      "relatedReportIds": relatedReportIds || [],
      "clusterKey": clusterKey,
      "priorityScore": priorityScore || 50,
      "priorityBand": priorityBand || 'MEDIUM',
      "recommendedAction": recommendedAction,
      "triageReasoning": reasoning,
      "caseBrief": caseBrief || {},
      "triageSignals": signals || {},
      "userOverride": userOverride || false
    }]).select().single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Create Report Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
