import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  const { data: allData, error: allErr } = await supabase.from('reports').select('lat, lng, status');
  console.log("All open reports count:", allData?.length);
  if (allData && allData.length > 0) {
    const r = allData[0];
    console.log("Testing with lat/lng of an existing report:", r);
    
    const lat = r.lat;
    const lng = r.lng;
    
    const latMin = lat - 0.002;
    const latMax = lat + 0.002;
    const lngMin = lng - 0.002;
    const lngMax = lng + 0.002;

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'OPEN')
      .gte('lat', latMin)
      .lte('lat', latMax)
      .gte('lng', lngMin)
      .lte('lng', lngMax)
      .order('id', { ascending: false })
      .limit(50);
      
    if (error) console.error("Query Error:", error);
    console.log("Candidates found:", data?.length);
  }
}

testFetch();
