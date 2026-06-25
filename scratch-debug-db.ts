import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDB() {
  console.log("=== Inspecting Comments Table ===");
  const { data: commentsData, error: commentsError } = await supabase.from('comments').select('*').limit(1);
  if (commentsError) {
    console.error("Comments Error:", commentsError);
  } else {
    console.log("Comments columns (if row exists):", commentsData.length > 0 ? Object.keys(commentsData[0]) : "No rows");
  }

  // Use REST API OPTIONS to get full schema info (OpenAPI spec)
  console.log("\n=== Fetching OpenAPI Spec from Supabase ===");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`);
    const spec = await res.json();
    
    const commentsSchema = spec.definitions?.comments?.properties;
    if (commentsSchema) {
      console.log("COMMENTS TABLE COLUMNS:", Object.keys(commentsSchema));
    } else {
      console.log("Could not find comments table in OpenAPI spec.");
    }

    const reportsSchema = spec.definitions?.reports?.properties;
    if (reportsSchema) {
      console.log("REPORTS TABLE COLUMNS:", Object.keys(reportsSchema));
    } else {
      console.log("Could not find reports table in OpenAPI spec.");
    }
  } catch (err) {
    console.error("Failed to fetch OpenAPI spec:", err);
  }
}

inspectDB();
