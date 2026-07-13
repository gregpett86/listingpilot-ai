import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import {
  decodedByteLength,
  unsupportedTextDataUrl,
  validPngBase64,
  validPngDataUrl,
} from "@/test/fixtures/images";

function photo(overrides: Record<string, unknown> = {}) {
  return {
    id: "photo-1",
    name: "kitchen.png",
    fileMimeType: "image/png",
    fileSize: decodedByteLength(validPngBase64),
    dataUrl: validPngDataUrl,
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/analyze-photos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/analyze-photos", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a safe error when the API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(request({ photos: [photo()] }));
    const body = await json(response);

    expect(response.status).toBe(500);
    expect(body.errorType).toBe("missing_api_key");
    expect(body).not.toHaveProperty("detail");
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze-photos", {
        method: "POST",
        body: "{",
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.errorType).toBe("malformed_request");
  });

  it("rejects empty payloads before provider calls", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const response = await POST(request({ photos: [] }));
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.errorType).toBe("no_photos");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed data URLs and malformed base64 before provider calls", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const response = await POST(
      request({
        photos: [
          photo({
            dataUrl: unsupportedTextDataUrl,
          }),
        ],
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(400);
    expect(body.errorType).toBe("unsupported_mime_type");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves valid photos when another photo fails validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            findings: [
              {
                photoId: "photo-1",
                roomType: "Kitchen",
                condition: "Average",
                confidence: "High",
                opportunities: ["cabinet hardware"],
              },
            ],
          }),
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    const response = await POST(
      request({
        photos: [
          photo(),
          photo({
            id: "bad-photo",
            name: "bad.gif",
            fileMimeType: "image/gif",
            fileSize: 10,
            dataUrl: unsupportedTextDataUrl,
          }),
        ],
      }),
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.findings).toHaveLength(1);
    expect(body.failedPhotos).toMatchObject([
      { photoId: "bad-photo", errorType: "unsupported_mime_type" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps malformed OpenAI output to safe provider_response_invalid errors", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "not-json" }), {
        status: 200,
      }),
    );

    const response = await POST(request({ photos: [photo()] }));
    const body = await json(response);

    expect(response.status).toBe(502);
    expect(body.errorType).toBe("provider_response_invalid");
    expect(body).not.toHaveProperty("rawOutputText");
  });

  it("maps insufficient quota separately from transient rate limits", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "insufficient_quota",
            type: "insufficient_quota",
          },
        }),
        { status: 429 },
      ),
    );

    const response = await POST(request({ photos: [photo()] }));
    const body = await json(response);

    expect(response.status).toBe(429);
    expect(body.errorType).toBe("provider_quota_exceeded");
    expect(body.error).toBe(
      "Image analysis quota is exhausted. Check the OpenAI project billing and quota settings.",
    );
  });

  it("keeps generic 429 responses as transient rate limits", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "rate_limit_exceeded",
            type: "rate_limit_exceeded",
          },
        }),
        { status: 429 },
      ),
    );

    const response = await POST(request({ photos: [photo()] }));
    const body = await json(response);

    expect(response.status).toBe(429);
    expect(body.errorType).toBe("provider_rate_limited");
    expect(body.error).toBe(
      "Image analysis is busy right now. Please try again shortly.",
    );
  });
});
