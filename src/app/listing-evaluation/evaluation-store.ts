import type { ListingEvaluationReportData } from "./report-view-model";

const storagePrefix = "listingpilot:listingevaluation:";
const latestKey = `${storagePrefix}latest`;

function storage() {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage;
}

export function saveListingEvaluation(reportData: ListingEvaluationReportData) {
  const store = storage();
  if (!store) return;

  store.setItem(`${storagePrefix}${reportData.id}`, JSON.stringify(reportData));
  store.setItem(latestKey, reportData.id);
}

export function loadListingEvaluation(id: string) {
  const store = storage();
  const raw = store?.getItem(`${storagePrefix}${id}`);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as ListingEvaluationReportData;
  } catch {
    return undefined;
  }
}

export function latestListingEvaluationId() {
  return storage()?.getItem(latestKey) ?? undefined;
}
