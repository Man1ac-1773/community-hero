export type TriageClassification = 'NEW_INCIDENT' | 'LIKELY_DUPLICATE' | 'RELATED_CLUSTER';

export type PriorityBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendedAction = 'KEEP_SEPARATE' | 'MERGE_WITH_EXISTING' | 'PRIORITIZE_VERIFICATION' | 'WATCH_HOTSPOT';

export interface CaseBrief {
  headline: string;
  summary: string;
  whyItMatters: string;
  communitySignal: string;
  nextStep: string;
}

export interface TriageSignals {
  candidateCount: number;
  nearestDistanceMeters: number | null;
  sameCategoryCandidates: number;
  duplicateHeuristicScore: number;
}

export interface TriageResult {
  classification: TriageClassification;
  primaryReportId: string | null;
  relatedReportIds: string[];
  confidence: number;
  clusterKey: string;
  priorityScore: number;
  priorityBand: PriorityBand;
  recommendedAction: RecommendedAction;
  reasoning: string;
  caseBrief: CaseBrief;
  signals: TriageSignals;
}

export interface CandidateReport {
  id: string;
  category: string;
  severity: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  description: string;
  verifiedCount: number;
  createdAt: string;
}
