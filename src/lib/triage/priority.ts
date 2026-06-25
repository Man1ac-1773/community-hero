import { PriorityBand } from './types';

export function computePriorityScore(report: any, candidates: any[]): { score: number; band: PriorityBand } {
  let score = 0;
  
  switch (report.severity) {
    case 'Low': score += 20; break;
    case 'Medium': score += 40; break;
    case 'High': score += 65; break;
    case 'Critical': score += 85; break;
    default: score += 20; break;
  }
  
  if (candidates.length >= 3) score += 10;
  
  const highRisk = ["Traffic Signal Issue", "Utility Line Down", "Water Leak", "Broken Streetlight"];
  if (highRisk.includes(report.category)) score += 5;
  
  if (report.category === 'Other') score -= 5;
  
  score = Math.max(0, Math.min(100, score));
  
  let band: PriorityBand = 'LOW';
  if (score >= 80) band = 'CRITICAL';
  else if (score >= 55) band = 'HIGH';
  else if (score >= 30) band = 'MEDIUM';
  
  return { score, band };
}
