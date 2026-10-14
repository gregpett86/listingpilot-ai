import type { ListingEvaluationV2 } from "@/lib/listing-evaluation-v2/types";

export type SavedListingAiReport = {
  id: string;
  evaluation: ListingEvaluationV2;
  agent: {
    name: string;
    brokerage: string;
    phone: string;
    email: string;
    headshotDataUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = "listing-ai-reports-v2";
const DB_VERSION = 1;
const STORE = "reports";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveListingAiReport(
  input: Omit<SavedListingAiReport, "createdAt" | "updatedAt">,
): Promise<SavedListingAiReport> {
  if (typeof indexedDB === "undefined") throw new Error("Report storage is unavailable.");
  const db = await openDb();
  try {
    const existing = await new Promise<SavedListingAiReport | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(input.id);
      request.onsuccess = () => resolve(request.result as SavedListingAiReport | undefined);
      request.onerror = () => reject(request.error);
    });
    const now = new Date().toISOString();
    const record: SavedListingAiReport = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return record;
  } finally {
    db.close();
  }
}

export async function listListingAiReports(): Promise<SavedListingAiReport[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  try {
    const reports = await new Promise<SavedListingAiReport[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as SavedListingAiReport[]) ?? []);
      request.onerror = () => reject(request.error);
    });
    return reports.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function deleteListingAiReport(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
