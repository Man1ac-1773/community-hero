export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function computeDuplicateHeuristic(candidate: any, newReport: any): number {
  let score = 0;
  
  if (candidate.category === newReport.category) score += 0.35;
  // TODO: Add related category logic if needed
  
  const distance = candidate.distanceMeters;
  if (distance <= 20) score += 0.35;
  else if (distance <= 50) score += 0.20;
  else if (distance <= 100) score += 0.10;
  
  return Math.min(score, 1.0);
}
