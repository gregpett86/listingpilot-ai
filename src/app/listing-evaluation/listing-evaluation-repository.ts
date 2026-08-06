import type { PropertyDetails, UploadedPhoto } from "../listing-readiness/report-data";
import type {
  ListingEvaluationReportData,
  ListingEvaluationReportStatus,
} from "./report-view-model";

export const listingEvaluationRepositoryKey =
  "listingpilot:listing-evaluation-reports:v1";

const oldSessionStoragePrefix = "listingpilot:listingevaluation:";
const oldSessionLatestKey = `${oldSessionStoragePrefix}latest`;

type AgentInformation = {
  email: string;
  name: string;
  phone: string;
  website: string;
  brokerage: string;
};

export type ListingEvaluationPhotoMetadata = {
  analysisStatus?: UploadedPhoto["analysisStatus"];
  confidence?: number;
  id: string;
  isCoverPreferred?: boolean;
  name: string;
  roomLabel: UploadedPhoto["roomLabel"];
};

export type ListingEvaluationReportRecord = {
  agentInformation: AgentInformation;
  beds: string;
  baths: string;
  cityStateZip: string;
  createdAt: string;
  currentScore: number;
  heroImageThumbnail?: string;
  homeownerName: string;
  id: string;
  photoMetadata: ListingEvaluationPhotoMetadata[];
  potentialScore: number;
  propertyAddress: string;
  recommendationCount: number;
  reportData: ListingEvaluationReportData;
  roomCount: number;
  selectedRecommendationIds: number[];
  sqft: string;
  status: ListingEvaluationReportStatus;
  storageWarning?: string;
  updatedAt: string;
  yearBuilt?: string;
};

export type SaveListingEvaluationResult = {
  record?: ListingEvaluationReportRecord;
  storageWarning?: string;
  success: boolean;
};

type RepositoryPayload = {
  reports: ListingEvaluationReportRecord[];
  version: 1;
};

function localStore() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function sessionStore() {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage;
}

function nowIso() {
  return new Date().toISOString();
}

function optionalYearBuilt(property: PropertyDetails) {
  const possibleProperty = property as PropertyDetails & { yearBuilt?: string };
  return possibleProperty.yearBuilt;
}

function reportStatus(reportData: ListingEvaluationReportData) {
  if (reportData.status) return reportData.status;
  return reportData.photos.some((photo) => photo.analysisStatus === "needs_review")
    ? "Needs Review"
    : "Ready";
}

function uniqueRoomCount(photos: UploadedPhoto[]) {
  return new Set(
    photos
      .map((photo) => photo.roomLabel)
      .filter((room) => room !== "Unknown"),
  ).size;
}

function photoMetadata(photos: UploadedPhoto[]): ListingEvaluationPhotoMetadata[] {
  return photos.map((photo) => ({
    analysisStatus: photo.analysisStatus,
    confidence: photo.confidence,
    id: photo.id,
    isCoverPreferred: photo.isCoverPreferred,
    name: photo.name,
    roomLabel: photo.roomLabel,
  }));
}

function createRecord(
  reportData: ListingEvaluationReportData,
  existing?: ListingEvaluationReportRecord,
): ListingEvaluationReportRecord {
  const createdAt = reportData.createdAt ?? existing?.createdAt ?? nowIso();
  const updatedAt = reportData.updatedAt ?? nowIso();
  const property = reportData.property;
  const heroImageThumbnail =
    reportData.summary.propertyHeroPhoto.photo?.dataUrl ??
    reportData.summary.coverPhoto?.dataUrl ??
    reportData.photos.find((photo) => photo.dataUrl)?.dataUrl;

  return {
    agentInformation: {
      brokerage: property.brokerage,
      email: property.agentEmail,
      name: property.agentName,
      phone: property.agentPhone,
      website: property.agentWebsite,
    },
    baths: property.baths,
    beds: property.beds,
    cityStateZip: property.cityStateZip,
    createdAt,
    currentScore: reportData.summary.currentScore,
    heroImageThumbnail,
    homeownerName: property.homeownerName,
    id: reportData.id,
    photoMetadata: photoMetadata(reportData.photos),
    potentialScore: reportData.summary.potentialScore,
    propertyAddress: property.address,
    recommendationCount: reportData.recommendations.length,
    reportData: {
      ...reportData,
      createdAt,
      status: reportStatus(reportData),
      updatedAt,
    },
    roomCount: uniqueRoomCount(reportData.photos),
    selectedRecommendationIds: reportData.selectedRecommendationIds,
    sqft: property.sqft,
    status: reportStatus(reportData),
    updatedAt,
    yearBuilt: optionalYearBuilt(property),
  };
}

function withoutFullImageData(record: ListingEvaluationReportRecord) {
  const stripPhoto = (photo: UploadedPhoto): UploadedPhoto => ({
    ...photo,
    dataUrl: photo.isCoverPreferred ? photo.dataUrl : "",
  });
  const strippedReportData: ListingEvaluationReportData = {
    ...record.reportData,
    photos: record.reportData.photos.map(stripPhoto),
    recommendations: record.reportData.recommendations.map((recommendation) => ({
      ...recommendation,
      sourcePhoto: recommendation.sourcePhoto
        ? stripPhoto(recommendation.sourcePhoto)
        : undefined,
    })),
    summary: {
      ...record.reportData.summary,
      photos: record.reportData.summary.photos.map(stripPhoto),
    },
  };

  return {
    ...record,
    reportData: strippedReportData,
    storageWarning:
      "Browser storage is full. Listing metadata was saved, but some full photo data could not be preserved locally.",
  };
}

function readPayload(): RepositoryPayload {
  const store = localStore();
  if (!store) return { reports: [], version: 1 };
  const raw = store.getItem(listingEvaluationRepositoryKey);
  if (!raw) return { reports: [], version: 1 };

  try {
    const parsed = JSON.parse(raw) as Partial<RepositoryPayload>;
    if (!Array.isArray(parsed.reports)) return { reports: [], version: 1 };
    return { reports: parsed.reports, version: 1 };
  } catch {
    return { reports: [], version: 1 };
  }
}

function writePayload(payload: RepositoryPayload) {
  const store = localStore();
  if (!store) return;
  store.setItem(listingEvaluationRepositoryKey, JSON.stringify(payload));
}

function upsertRecord(
  records: ListingEvaluationReportRecord[],
  record: ListingEvaluationReportRecord,
) {
  const others = records.filter((item) => item.id !== record.id);
  return [record, ...others].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

function cloneReportDataForDuplicate(reportData: ListingEvaluationReportData, id: string) {
  const timestamp = nowIso();
  const property = {
    ...reportData.property,
    address: reportData.property.address.trim().endsWith("Copy")
      ? reportData.property.address
      : `${reportData.property.address} Copy`,
  };

  return {
    ...reportData,
    createdAt: timestamp,
    id,
    property,
    status: "Draft" as const,
    updatedAt: timestamp,
  };
}

export function listListingEvaluationReports() {
  migrateSessionReports();
  return readPayload().reports;
}

export function getListingEvaluationReport(id: string) {
  migrateSessionReports();
  return readPayload().reports.find((report) => report.id === id);
}

export function saveListingEvaluationReport(
  reportData: ListingEvaluationReportData,
): SaveListingEvaluationResult {
  migrateSessionReports();
  const payload = readPayload();
  const existing = payload.reports.find((report) => report.id === reportData.id);
  const record = createRecord(
    {
      ...reportData,
      updatedAt: nowIso(),
    },
    existing,
  );

  try {
    writePayload({
      reports: upsertRecord(payload.reports, record),
      version: 1,
    });
    return { record, success: true };
  } catch (error) {
    const fallbackRecord = withoutFullImageData(record);
    try {
      writePayload({
        reports: upsertRecord(payload.reports, fallbackRecord),
        version: 1,
      });
      return {
        record: fallbackRecord,
        storageWarning: fallbackRecord.storageWarning,
        success: true,
      };
    } catch {
      return {
        storageWarning:
          error instanceof Error
            ? error.message
            : "Browser storage is full. The Listing Evaluation report could not be saved locally.",
        success: false,
      };
    }
  }
}

export function updateListingEvaluationReport(
  reportData: ListingEvaluationReportData,
) {
  return saveListingEvaluationReport(reportData);
}

export function deleteListingEvaluationReport(id: string) {
  const payload = readPayload();
  writePayload({
    reports: payload.reports.filter((report) => report.id !== id),
    version: 1,
  });
}

export function duplicateListingEvaluationReport(id: string) {
  const report = getListingEvaluationReport(id);
  if (!report) return undefined;
  const nextId = `evaluation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duplicated = cloneReportDataForDuplicate(report.reportData, nextId);
  const result = saveListingEvaluationReport(duplicated);
  return result.record;
}

export function clearListingEvaluationReports() {
  localStore()?.removeItem(listingEvaluationRepositoryKey);
}

export function migrateSessionReports() {
  const session = sessionStore();
  const store = localStore();
  if (!session || !store) return;
  const payload = readPayload();
  let nextReports = payload.reports;

  for (let index = 0; index < session.length; index += 1) {
    const key = session.key(index);
    if (!key || key === oldSessionLatestKey || !key.startsWith(oldSessionStoragePrefix)) {
      continue;
    }
    const raw = session.getItem(key);
    if (!raw) continue;

    try {
      const reportData = JSON.parse(raw) as ListingEvaluationReportData;
      if (!reportData.id || nextReports.some((report) => report.id === reportData.id)) {
        continue;
      }
      nextReports = upsertRecord(nextReports, createRecord(reportData));
    } catch {
      // Ignore invalid legacy records.
    }
  }

  if (nextReports !== payload.reports) {
    writePayload({ reports: nextReports, version: 1 });
  }
}
