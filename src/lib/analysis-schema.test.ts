import { describe, expect, it } from "vitest";
import {
  PHOTO_UPLOAD_LIMITS,
  parseImageDataUrl,
  validateAnalyzePhotosBody,
  validateClientPhotoFiles,
} from "./analysis-schema";
import {
  decodedByteLength,
  malformedBase64DataUrl,
  invalidBase64DataUrl,
  unsupportedTextDataUrl,
  validPngBase64,
  validPngDataUrl,
} from "@/test/fixtures/images";

describe("analysis-schema validation", () => {
  it("accepts supported JPEG, PNG, and WebP MIME types on the client", () => {
    const result = validateClientPhotoFiles({
      currentPhotoCount: 0,
      currentTotalBytes: 0,
      existingKeys: new Set(),
      files: [
        { id: "1", name: "a.jpg", type: "image/jpeg", size: 100 },
        { id: "2", name: "b.png", type: "image/png", size: 100 },
        { id: "3", name: "c.webp", type: "image/webp", size: 100 },
      ],
    });

    expect(result.accepted).toHaveLength(3);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects unsupported MIME types and oversized files before API requests", () => {
    const result = validateClientPhotoFiles({
      currentPhotoCount: 0,
      currentTotalBytes: 0,
      existingKeys: new Set(),
      files: [
        { id: "1", name: "a.gif", type: "image/gif", size: 100 },
        {
          id: "2",
          name: "b.png",
          type: "image/png",
          size: PHOTO_UPLOAD_LIMITS.maxBytesPerPhoto + 1,
        },
      ],
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "unsupported_mime_type",
      "file_too_large",
    ]);
  });

  it("rejects total upload size overflow and duplicate photos", () => {
    const existingKeys = new Set(["a.png:100:image/png"]);
    const result = validateClientPhotoFiles({
      currentPhotoCount: 1,
      currentTotalBytes: PHOTO_UPLOAD_LIMITS.maxTotalBytes - 50,
      existingKeys,
      files: [
        { id: "1", name: "a.png", type: "image/png", size: 100 },
        { id: "2", name: "b.png", type: "image/png", size: 100 },
      ],
    });

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "duplicate_photo",
      "total_payload_too_large",
    ]);
  });

  it("enforces the beta hard cap of 20 photos", () => {
    const result = validateClientPhotoFiles({
      currentPhotoCount: 20,
      currentTotalBytes: 0,
      existingKeys: new Set(),
      files: [{ id: "1", name: "extra.png", type: "image/png", size: 100 }],
    });

    expect(PHOTO_UPLOAD_LIMITS.maxPhotos).toBe(20);
    expect(result.accepted).toHaveLength(0);
    expect(result.issues).toMatchObject([{ code: "too_many_photos" }]);
  });

  it("parses valid data URLs and rejects malformed URLs/base64", () => {
    expect(parseImageDataUrl(validPngDataUrl)).toMatchObject({
      mimeType: "image/png",
      decodedByteLength: decodedByteLength(validPngBase64),
    });
    expect(parseImageDataUrl(unsupportedTextDataUrl)).toMatchObject({
      issue: { code: "unsupported_mime_type" },
    });
    expect(parseImageDataUrl(malformedBase64DataUrl)).toMatchObject({
      issue: { code: "invalid_data_url" },
    });
    expect(parseImageDataUrl(invalidBase64DataUrl)).toMatchObject({
      issue: { code: "invalid_base64" },
    });
    expect(parseImageDataUrl("blob:http://localhost/fake")).toMatchObject({
      issue: { code: "invalid_data_url" },
    });
  });

  it("validates server request payloads and preserves per-photo failures", () => {
    const result = validateAnalyzePhotosBody({
      photos: [
        {
          id: "valid",
          name: "valid.png",
          assignedCategory: "Kitchen",
          fileMimeType: "image/png",
          fileSize: decodedByteLength(validPngBase64),
          dataUrl: validPngDataUrl,
        },
        {
          id: "bad",
          name: "bad.gif",
          assignedCategory: "Kitchen",
          fileMimeType: "image/gif",
          fileSize: 10,
          dataUrl: unsupportedTextDataUrl,
        },
      ],
    });

    expect(result.validPhotos).toHaveLength(1);
    expect(result.failedPhotos).toMatchObject([
      { photoId: "bad", errorType: "unsupported_mime_type" },
    ]);
  });

  it("rejects server photos without a supported assigned category", () => {
    const result = validateAnalyzePhotosBody({
      photos: [
        {
          id: "valid",
          name: "valid.png",
          assignedCategory: "Attic",
          fileMimeType: "image/png",
          fileSize: decodedByteLength(validPngBase64),
          dataUrl: validPngDataUrl,
        },
      ],
    });

    expect(result.validPhotos).toHaveLength(0);
    expect(result.failedPhotos).toMatchObject([
      { photoId: "valid", errorType: "malformed_request" },
    ]);
  });
});
