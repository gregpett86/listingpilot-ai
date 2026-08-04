import { describe, expect, it } from "vitest";
import {
  buildReadinessSummary,
  defaultProperty,
  improvements,
} from "./report-data";
import { createListingReadinessPdf } from "./report-pdf";

const validJpegDataUrl =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5sooor9jIP//Z";

describe("createListingReadinessPdf", () => {
  it("creates the eight-page luxury report structure without requiring photos", () => {
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [],
    );
    const doc = createListingReadinessPdf(defaultProperty, summary);

    expect(doc.getNumberOfPages()).toBe(8);
    expect(summary.selectedRecommendations).toHaveLength(improvements.length);
    expect(summary.coverPhoto).toBeUndefined();
  });

  it("embeds a valid uploaded cover image instead of the missing-photo placeholder", () => {
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [
        {
          dataUrl: validJpegDataUrl,
          id: "front",
          isCoverPreferred: true,
          name: "front.png",
          roomLabel: "Exterior",
        },
      ],
    );
    const doc = createListingReadinessPdf(defaultProperty, summary);
    expect(summary.coverPhoto?.dataUrl).toBe(validJpegDataUrl);
    const properties = doc.getImageProperties(summary.coverPhoto?.dataUrl ?? "");
    expect(properties.width).toBeGreaterThan(0);
    expect(properties.height).toBeGreaterThan(0);
  });

  it("shows the missing-photo placeholder only when no usable uploaded image exists", () => {
    const summary = buildReadinessSummary(
      improvements.map((item) => item.id),
      [
        {
          dataUrl: "data:text/plain;base64,broken",
          id: "broken",
          isCoverPreferred: true,
          name: "broken.txt",
          roomLabel: "Exterior",
        },
      ],
    );
    const doc = createListingReadinessPdf(defaultProperty, summary);

    expect(summary.coverPhoto).toBeUndefined();
    expect(doc.getNumberOfPages()).toBe(8);
  });
});
