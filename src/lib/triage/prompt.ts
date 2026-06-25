import { SchemaType, Schema } from '@google/generative-ai';
import { CandidateReport } from './types';

export function buildTriagePrompt(newReport: any, candidates: CandidateReport[], signals: any): string {
  return `You are a Civic Watch Hub triage intelligence system.

A user has just submitted a new incident report:
- Category: ${newReport.category}
- Severity: ${newReport.severity}
- Description: ${newReport.description}

Here are the nearest open incidents within 150m:
${candidates.length > 0 ? candidates.map((c, i) => `
[Candidate ${i+1}]
- ID: ${c.id}
- Category: ${c.category}
- Distance: ${c.distanceMeters}m
- Severity: ${c.severity}
- Description: ${c.description}
`).join('\n') : "None."}

Deterministic Signals:
- Candidates within 150m: ${signals.candidateCount}
- Nearest distance: ${signals.nearestDistanceMeters}m
- Duplicate heuristic score (0 to 1): ${signals.duplicateHeuristicScore.toFixed(2)}

Task:
Determine if the new incident is a NEW_INCIDENT, LIKELY_DUPLICATE, or RELATED_CLUSTER.
CRITICAL RULES FOR DEDUPLICATION:
1. If the distance to a candidate is < 20m AND the Category is the same, you MUST classify it as LIKELY_DUPLICATE, even if the descriptions are worded slightly differently (users describe the same thing differently).
2. Only pick NEW_INCIDENT if the distance is far (> 50m) or the category is entirely unrelated.
3. If it is part of a recurring hotspot (e.g. multiple distinct potholes reported on the same block, 20m-50m apart), pick RELATED_CLUSTER.
4. If you pick LIKELY_DUPLICATE, you MUST provide that candidate's ID as primaryReportId.
5. Generate a concise, operational Case Brief for this incident.
`;
}

export const triageSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    classification: {
      type: SchemaType.STRING,
      enum: ["NEW_INCIDENT", "LIKELY_DUPLICATE", "RELATED_CLUSTER"]
    },
    primaryReportId: {
      type: SchemaType.STRING,
      nullable: true
    },
    relatedReportIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    confidence: {
      type: SchemaType.NUMBER
    },
    recommendedAction: {
      type: SchemaType.STRING,
      enum: ["KEEP_SEPARATE", "MERGE_WITH_EXISTING", "PRIORITIZE_VERIFICATION", "WATCH_HOTSPOT"]
    },
    reasoning: {
      type: SchemaType.STRING
    },
    caseBrief: {
      type: SchemaType.OBJECT,
      properties: {
        headline: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING },
        whyItMatters: { type: SchemaType.STRING },
        communitySignal: { type: SchemaType.STRING },
        nextStep: { type: SchemaType.STRING }
      },
      required: ["headline", "summary", "whyItMatters", "communitySignal", "nextStep"]
    }
  },
  required: ["classification", "relatedReportIds", "confidence", "recommendedAction", "reasoning", "caseBrief"]
};
