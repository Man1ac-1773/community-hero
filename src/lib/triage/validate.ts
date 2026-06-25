export function validateTriageOutput(parsed: any, candidateIds: string[]): any {
  let { classification, primaryReportId, relatedReportIds } = parsed;

  if (classification === 'NEW_INCIDENT') {
    primaryReportId = null;
  } else if (classification === 'LIKELY_DUPLICATE') {
    if (primaryReportId && !candidateIds.includes(primaryReportId)) {
      primaryReportId = null; // AI hallucinated an ID
      classification = 'NEW_INCIDENT';
    }
  }

  const validRelated = (relatedReportIds || []).filter((id: string) => candidateIds.includes(id));

  return {
    ...parsed,
    classification,
    primaryReportId,
    relatedReportIds: validRelated
  };
}
