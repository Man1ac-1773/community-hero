import { CandidateReport } from './types';
import { haversineDistance } from './signals';

export async function fetchCandidateReports(supabase: any, lat: number, lng: number): Promise<CandidateReport[]> {
  // We fetch a wide bounding box to keep the query simple, then filter in Node.
  // ~0.002 degrees is roughly 220 meters.
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

  if (error || !data) return [];

  const candidates: CandidateReport[] = data.map((r: any) => {
    const verifiedCount = Array.isArray(r.verifiedBy) ? r.verifiedBy.length : 0;
    return {
      id: r.id,
      category: r.category,
      severity: r.severity,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: haversineDistance(lat, lng, r.lat, r.lng),
      description: r.description,
      verifiedCount,
      createdAt: r.createdAt
    };
  });

  // Filter within 150m, prioritize exact category match and closest distance
  return candidates
    .filter(c => c.distanceMeters <= 150)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5); // Send top 5 to Gemini
}
