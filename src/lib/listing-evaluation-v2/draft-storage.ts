import type {
  EvaluationPhoto,
  ImprovementRecommendation,
  PropertySpace,
  SpaceAnalysis,
} from "@/lib/listing-evaluation-v2/types";

const DB_NAME = "listing-ai-v2";
const DB_VERSION = 1;
const STORE = "drafts";
const DRAFT_KEY = "current-evaluation";

export type ListingAiDraft = {
  property: {
    address: string;
    cityStateZip: string;
    homeownerName: string;
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
    propertyType: string;
  };
  counts: Record<string, number>;
  spaces: PropertySpace[];
  photos: EvaluationPhoto[];
  analyses: SpaceAnalysis[];
  recommendations: ImprovementRecommendation[];
  activeSpaceId?: string;
  coverFrontPhoto: { dataUrl: string; name: string } | null;
  agent: {
    name: string;
    brokerage: string;
    phone: string;
    email: string;
  };
  savedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadListingAiDraft(): Promise<ListingAiDraft | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(DRAFT_KEY);
      request.onsuccess = () => resolve((request.result as ListingAiDraft | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveListingAiDraft(draft: ListingAiDraft): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(draft, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearListingAiDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
