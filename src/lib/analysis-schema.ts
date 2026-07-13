import {
  CONFIDENCE_LEVELS,
  PROPERTY_CONDITIONS,
  ROOM_TYPES,
  type ConfidenceLevel,
  type PropertyCondition,
  type RoomType,
} from "@/lib/property-intelligence";

export const PHOTO_UPLOAD_LIMITS = {
  maxPhotos: 30,
  maxBytesPerPhoto: 8 * 1024 * 1024,
  maxTotalBytes: 80 * 1024 * 1024,
  maxNameLength: 160,
  maxIdLength: 220,
  maxOpportunities: 6,
} as const;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMimeType =
  (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export type AnalysisErrorCode =
  | "missing_api_key"
  | "malformed_request"
  | "no_photos"
  | "too_many_photos"
  | "duplicate_photo"
  | "unsupported_mime_type"
  | "file_too_large"
  | "total_payload_too_large"
  | "invalid_photo_id"
  | "invalid_photo_name"
  | "invalid_data_url"
  | "data_url_mime_mismatch"
  | "invalid_base64"
  | "image_decode_failed"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_quota_exceeded"
  | "provider_response_invalid"
  | "no_analysis_result";

export type AnalysisValidationIssue = {
  code: AnalysisErrorCode;
  message: string;
  photoId?: string;
  photoName?: string;
};

export type AnalyzePhotoInput = {
  id: string;
  name: string;
  fileMimeType?: string;
  fileSize?: number;
  dataUrl: string;
};

export type ValidatedAnalyzePhotoInput = AnalyzePhotoInput & {
  fileMimeType: SupportedImageMimeType;
  fileSize: number;
  decodedByteLength: number;
};

export type VisionFinding = {
  photoId: string;
  roomType: RoomType;
  condition: PropertyCondition;
  confidence: ConfidenceLevel;
  opportunities: string[];
};

export type PhotoAnalysisFailure = {
  photoId: string;
  name: string;
  status: "failed";
  errorType: AnalysisErrorCode;
  message: string;
};

export type PhotoAnalysisSuccess = {
  photoId: string;
  name: string;
  status: "success";
  finding: VisionFinding;
};

export type PhotoAnalysisResult = PhotoAnalysisSuccess | PhotoAnalysisFailure;

export type AnalyzePhotosResponse = {
  findings: VisionFinding[];
  photoResults: PhotoAnalysisResult[];
  failedPhotos: PhotoAnalysisFailure[];
  model?: string;
  requestedPhotoCount: number;
  error?: string;
  errorType?: AnalysisErrorCode;
  debug?: unknown;
};

export type ClientPhotoValidationInput = {
  id?: string;
  name: string;
  type: string;
  size: number;
};

export function normalizeImageMimeType(
  mimeType: string | undefined,
): SupportedImageMimeType | null {
  const normalized = (mimeType ?? "").trim().toLowerCase();

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return SUPPORTED_IMAGE_MIME_TYPES.includes(
    normalized as SupportedImageMimeType,
  )
    ? (normalized as SupportedImageMimeType)
    : null;
}

export function isSupportedImageMimeType(
  mimeType: string | undefined,
): mimeType is SupportedImageMimeType {
  return normalizeImageMimeType(mimeType) != null;
}

export function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export function safeErrorMessage(code: AnalysisErrorCode) {
  switch (code) {
    case "missing_api_key":
      return "Image analysis is not configured yet.";
    case "no_photos":
      return "Add at least one supported property photo before running analysis.";
    case "too_many_photos":
      return `Upload ${PHOTO_UPLOAD_LIMITS.maxPhotos} photos or fewer.`;
    case "duplicate_photo":
      return "This photo is already in the upload queue.";
    case "unsupported_mime_type":
      return "Only JPEG, PNG, and WebP photos are supported.";
    case "file_too_large":
      return `Each photo must be ${formatBytes(PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto)} or smaller.`;
    case "total_payload_too_large":
      return `The total upload must be ${formatBytes(PHOTO_UPLOAD_LIMITS.maxTotalBytes)} or smaller.`;
    case "invalid_photo_id":
    case "invalid_photo_name":
    case "malformed_request":
      return "The photo upload request was malformed.";
    case "invalid_data_url":
    case "data_url_mime_mismatch":
    case "invalid_base64":
    case "image_decode_failed":
      return "One or more photos could not be read as valid image files.";
    case "provider_rate_limited":
      return "Image analysis is busy right now. Please try again shortly.";
    case "provider_quota_exceeded":
      return "Image analysis quota is exhausted. Check the OpenAI project billing and quota settings.";
    case "provider_unavailable":
      return "Image analysis is temporarily unavailable. Please try again.";
    case "provider_response_invalid":
      return "Image analysis returned an unreadable result. Please retry.";
    case "no_analysis_result":
      return "No analysis result was returned for this photo.";
  }
}

function buildIssue(
  code: AnalysisErrorCode,
  photo?: { id?: string; name?: string },
): AnalysisValidationIssue {
  return {
    code,
    message: safeErrorMessage(code),
    photoId: typeof photo?.id === "string" ? photo.id : undefined,
    photoName: typeof photo?.name === "string" ? photo.name : undefined,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidBoundedString(value: unknown, maxLength: number) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

export function parseImageDataUrl(dataUrl: unknown): {
  dataUrl: string;
  mimeType: SupportedImageMimeType;
  decodedByteLength: number;
} | {
  issue: AnalysisValidationIssue;
} {
  if (typeof dataUrl !== "string" || dataUrl.length === 0) {
    return { issue: buildIssue("invalid_data_url") };
  }

  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return { issue: buildIssue("invalid_data_url") };
  }

  const mimeType = normalizeImageMimeType(match[1]);
  const base64 = match[2];

  if (!mimeType) {
    return { issue: buildIssue("unsupported_mime_type") };
  }

  if (base64.length === 0 || base64.length % 4 !== 0) {
    return { issue: buildIssue("invalid_base64") };
  }

  let decodedByteLength = 0;
  let canonicalBase64 = "";

  try {
    if (typeof atob === "function") {
      const binary = atob(base64);
      decodedByteLength = binary.length;
      canonicalBase64 = btoa(binary);
    } else {
      const buffer = globalThis.Buffer.from(base64, "base64");
      decodedByteLength = buffer.length;
      canonicalBase64 = buffer.toString("base64");
    }
  } catch {
    return { issue: buildIssue("invalid_base64") };
  }

  if (decodedByteLength === 0 || canonicalBase64 !== base64) {
    return { issue: buildIssue("invalid_base64") };
  }

  return {
    dataUrl,
    mimeType,
    decodedByteLength,
  };
}

export function validateClientPhotoFiles<TFile extends ClientPhotoValidationInput>({
  currentPhotoCount,
  currentTotalBytes,
  existingKeys,
  files,
}: {
  currentPhotoCount: number;
  currentTotalBytes: number;
  existingKeys: Set<string>;
  files: TFile[];
}) {
  const accepted: TFile[] = [];
  const issues: AnalysisValidationIssue[] = [];
  let nextTotalBytes = currentTotalBytes;

  if (currentPhotoCount >= PHOTO_UPLOAD_LIMITS.maxPhotos) {
    return {
      accepted,
      issues: [buildIssue("too_many_photos")],
    };
  }

  for (const file of files) {
    const availableSlots =
      PHOTO_UPLOAD_LIMITS.maxPhotos - currentPhotoCount - accepted.length;

    if (availableSlots <= 0) {
      issues.push(buildIssue("too_many_photos", file));
      continue;
    }

    if (!normalizeImageMimeType(file.type)) {
      issues.push(buildIssue("unsupported_mime_type", file));
      continue;
    }

    if (file.size <= 0 || file.size > PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto) {
      issues.push(buildIssue("file_too_large", file));
      continue;
    }

    const duplicateKey = `${file.name}:${file.size}:${file.type}`;

    if (existingKeys.has(duplicateKey)) {
      issues.push(buildIssue("duplicate_photo", file));
      continue;
    }

    if (nextTotalBytes + file.size > PHOTO_UPLOAD_LIMITS.maxTotalBytes) {
      issues.push(buildIssue("total_payload_too_large", file));
      continue;
    }

    accepted.push(file);
    existingKeys.add(duplicateKey);
    nextTotalBytes += file.size;
  }

  return { accepted, issues };
}

export function validateAnalyzePhotosBody(body: unknown): {
  validPhotos: ValidatedAnalyzePhotoInput[];
  failedPhotos: PhotoAnalysisFailure[];
  requestIssues: AnalysisValidationIssue[];
  requestedPhotoCount: number;
} {
  const validPhotos: ValidatedAnalyzePhotoInput[] = [];
  const failedPhotos: PhotoAnalysisFailure[] = [];
  const requestIssues: AnalysisValidationIssue[] = [];

  if (!isPlainObject(body) || !Array.isArray(body.photos)) {
    return {
      validPhotos,
      failedPhotos,
      requestIssues: [buildIssue("malformed_request")],
      requestedPhotoCount: 0,
    };
  }

  const photos = body.photos;

  if (photos.length === 0) {
    return {
      validPhotos,
      failedPhotos,
      requestIssues: [buildIssue("no_photos")],
      requestedPhotoCount: 0,
    };
  }

  if (photos.length > PHOTO_UPLOAD_LIMITS.maxPhotos) {
    requestIssues.push(buildIssue("too_many_photos"));
  }

  const seenIds = new Set<string>();
  let totalBytes = 0;

  photos.slice(0, PHOTO_UPLOAD_LIMITS.maxPhotos).forEach((photo) => {
    const candidate = isPlainObject(photo) ? photo : {};
    const id = candidate.id;
    const name = candidate.name;
    const fileMimeType = candidate.fileMimeType;
    const fileSize = candidate.fileSize;
    const fallbackId = typeof id === "string" ? id : "unknown";
    const fallbackName = typeof name === "string" ? name : "Uploaded photo";

    const fail = (code: AnalysisErrorCode) => {
      failedPhotos.push({
        photoId: fallbackId,
        name: fallbackName,
        status: "failed",
        errorType: code,
        message: safeErrorMessage(code),
      });
    };

    if (!isValidBoundedString(id, PHOTO_UPLOAD_LIMITS.maxIdLength)) {
      fail("invalid_photo_id");
      return;
    }

    if (!isValidBoundedString(name, PHOTO_UPLOAD_LIMITS.maxNameLength)) {
      fail("invalid_photo_name");
      return;
    }

    const photoId = String(id);
    const photoName = String(name);

    if (seenIds.has(photoId)) {
      fail("duplicate_photo");
      return;
    }

    seenIds.add(photoId);

    const normalizedFileMimeType =
      typeof fileMimeType === "string"
        ? normalizeImageMimeType(fileMimeType)
        : null;

    if (!normalizedFileMimeType) {
      fail("unsupported_mime_type");
      return;
    }

    if (
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto
    ) {
      fail("file_too_large");
      return;
    }

    const parsedDataUrl = parseImageDataUrl(candidate.dataUrl);

    if ("issue" in parsedDataUrl) {
      fail(parsedDataUrl.issue.code);
      return;
    }

    if (parsedDataUrl.mimeType !== normalizedFileMimeType) {
      fail("data_url_mime_mismatch");
      return;
    }

    if (parsedDataUrl.decodedByteLength !== fileSize) {
      fail("image_decode_failed");
      return;
    }

    if (parsedDataUrl.decodedByteLength > PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto) {
      fail("file_too_large");
      return;
    }

    if (totalBytes + parsedDataUrl.decodedByteLength > PHOTO_UPLOAD_LIMITS.maxTotalBytes) {
      fail("total_payload_too_large");
      return;
    }

    totalBytes += parsedDataUrl.decodedByteLength;
    validPhotos.push({
      id: photoId,
      name: photoName,
      fileMimeType: normalizedFileMimeType,
      fileSize,
      dataUrl: parsedDataUrl.dataUrl,
      decodedByteLength: parsedDataUrl.decodedByteLength,
    });
  });

  return {
    validPhotos,
    failedPhotos,
    requestIssues,
    requestedPhotoCount: photos.length,
  };
}

export function isSupportedRoomType(value: string): value is RoomType {
  return ROOM_TYPES.includes(value as RoomType);
}

export function isSupportedCondition(value: string): value is PropertyCondition {
  return PROPERTY_CONDITIONS.includes(value as PropertyCondition);
}

export function isSupportedConfidence(value: string): value is ConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as ConfidenceLevel);
}
