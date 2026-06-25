import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchCandidateReports } from './candidates';
import { computeDuplicateHeuristic } from './signals';
import { computePriorityScore } from './priority';
import { buildTriagePrompt, triageSchema } from './prompt';
import { validateTriageOutput } from './validate';
import { TriageResult, TriageSignals } from './types';

export async function runTriage(supabase: any, apiKey: string, newReport: any): Promise<TriageResult> {
  // 1. Fetch Candidates
  const candidates = await fetchCandidateReports(supabase, newReport.lat, newReport.lng);
  
  // 2. Compute Signals
  let maxHeuristic = 0;
  let nearestDist = null;
  let sameCatCount = 0;

  let primaryCandidateId = null;

  for (const c of candidates) {
    if (nearestDist === null || c.distanceMeters < nearestDist) nearestDist = c.distanceMeters;
    if (c.category === newReport.category) sameCatCount++;
    const h = computeDuplicateHeuristic(c, newReport);
    if (h > maxHeuristic) {
      maxHeuristic = h;
      primaryCandidateId = c.id;
    }
  }

  const signals: TriageSignals = {
    candidateCount: candidates.length,
    nearestDistanceMeters: nearestDist,
    sameCategoryCandidates: sameCatCount,
    duplicateHeuristicScore: maxHeuristic
  };

  // 3. Priority Scoring
  const { score, band } = computePriorityScore(newReport, candidates);

  // 4. Cluster Key
  const latRounded = newReport.lat.toFixed(3);
  const lngRounded = newReport.lng.toFixed(3);
  const clusterKey = `${newReport.category.replace(/\s+/g, '_').toLowerCase()}:${latRounded}:${lngRounded}`;

  // 5. Call Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const promptText = buildTriagePrompt(newReport, candidates, signals);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: triageSchema
    }
  });

  const parsed = JSON.parse(result.response.text());
  
  // 6. Validate and Merge
  const candidateIds = candidates.map(c => c.id);
  const validatedAiResponse = validateTriageOutput(parsed, candidateIds);

  // 7. Deterministic Override for obvious duplicates
  if (maxHeuristic >= 0.70 && primaryCandidateId) {
    validatedAiResponse.classification = 'LIKELY_DUPLICATE';
    validatedAiResponse.primaryReportId = primaryCandidateId;
    if (!validatedAiResponse.caseBrief.headline.includes("Duplicate")) {
      validatedAiResponse.caseBrief.headline = "Probable Duplicate Incident";
      validatedAiResponse.caseBrief.summary = "A highly similar incident was recently reported at this exact location.";
      validatedAiResponse.caseBrief.nextStep = "Please verify the existing report to build consensus.";
    }
  }

  return {
    ...validatedAiResponse,
    clusterKey,
    priorityScore: score,
    priorityBand: band,
    signals
  };
}
