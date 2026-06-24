const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: all } = await supabase.from('reports').select('*');
  console.log('ALL REPORTS:', JSON.stringify(all, null, 2));
  
  if (all && all.length > 0) {
    const testId = all[0].userId;
    console.log('Testing EQ for userId:', testId);
    const { data: eqData, error: eqErr } = await supabase.from('reports').select('*').eq('userId', testId);
    console.log('EQ Result:', eqData?.length, 'Error:', eqErr);
    
    console.log('Testing CONTAINS for verifiedBy:', testId);
    const { data: conData, error: conErr } = await supabase.from('reports').select('*').contains('verifiedBy', [testId]);
    console.log('CONTAINS Result:', conData?.length, 'Error:', conErr);
  }
}
test();
