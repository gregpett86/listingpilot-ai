export const validPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const validWebpBase64 =
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

export const validPngDataUrl = `data:image/png;base64,${validPngBase64}`;
export const validWebpDataUrl = `data:image/webp;base64,${validWebpBase64}`;
export const unsupportedTextDataUrl = "data:text/plain;base64,SGVsbG8=";
export const malformedBase64DataUrl = "data:image/png;base64,not-base64***";
export const invalidBase64DataUrl = "data:image/png;base64,AAAAA";

export function decodedByteLength(base64: string) {
  return Buffer.from(base64, "base64").length;
}
