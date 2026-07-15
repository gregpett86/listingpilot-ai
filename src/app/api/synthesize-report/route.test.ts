import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { WholePropertySynthesisRequest } from "@/lib/whole-property-synthesis";

function synthesisRequest(
  overrides: Partial<WholePropertySynthesisRequest> = {},
): WholePropertySynthesisRequest {
  return {
    roomSummaries: [
      {
        roomType: "Kitchen",
        condition: "Good",
        strengths: ["Kitchen appears bright and updated."],
        improvements: ["Cabinet hardware refresh"],
        confidence: "High",
        readinessContribution: 82,
        photoCount: 3,
        visibleFindings: ["bright kitchen", "dated cabinet hardware"],
      },
      {
        roomType: "Living Room",
        condition: "Excellent",
        strengths: ["Living room has excellent natural light."],
        improvements: [],
        confidence: "Medium",
        readinessContribution: 95,
        photoCount: 2,
        visibleFindings: ["large windows"],
      },
    ],
    readiness: {
      score: 86,
      status: "Listing Ready",
      summary:
        "The property appears close to listing-ready based on the current observations.",
      highPriorityCount: 0,
      mediumPriorityCount: 1,
      lowPriorityCount: 0,
    },
    coverage: {
      uploadedPhotoCount: 12,
      analyzedRoomCount: 2,
      coveredRooms: ["Kitchen", "Living Room"],
      missingRecommendedRooms: ["Bathroom", "Bedroom", "Exterior"],
    },
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/synthesize-report", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function openAISuccessBody() {
  return {
    output_text: JSON.stringify({
      executiveSummary:
        "This home presents very well from the uploaded photos, with the kitchen and living room giving the listing a bright, polished first impression.",
      overallCondition: "Strong visible presentation with minor prep items.",
      buyerAppeal:
        "The home should appeal to buyers looking for bright shared spaces and a clean move-in presentation.",
      listingReadinessNarrative:
        "The property is close to listing ready, with only targeted cosmetic preparation recommended before photography.",
      topSellingFeatures: [
        "Bright kitchen",
        "Excellent natural light",
        "Inviting living room",
      ],
      topImprovementPriorities: ["Refresh visible cabinet hardware"],
      stagingObservations: ["Keep counters clear for listing photos"],
      overallConfidence: "High",
      marketingHighlights: [
        "Excellent natural lighting",
        "Move-in-ready presentation",
      ],
    }),
  };
}

describe("POST /api/synthesize-report", () => {
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

  it("executes the second OpenAI call and returns the executive summary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(openAISuccessBody()), { status: 200 }),
    );
    global.fetch = fetchMock;

    const response = await POST(request(synthesisRequest()));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" }),
    );
    expect(body.usedFallback).toBe(false);
    expect(body.wholePropertyAnalysis).toMatchObject({
      executiveSummary:
        "This home presents very well from the uploaded photos, with the kitchen and living room giving the listing a bright, polished first impression.",
      overallConfidence: "High",
    });
  });

  it("passes room summaries, readiness, and coverage into the synthesis prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(openAISuccessBody()), { status: 200 }),
    );
    global.fetch = fetchMock;

    await POST(request(synthesisRequest()));

    const [, init] = fetchMock.mock.calls[0];
    const providerBody = JSON.parse(String((init as RequestInit).body)) as {
      input: Array<{ content: Array<{ text: string }> }>;
    };
    const promptText = providerBody.input[1].content[0].text;

    expect(promptText).toContain('"roomType":"Kitchen"');
    expect(promptText).toContain('"improvements":["Cabinet hardware refresh"]');
    expect(promptText).toContain('"score":86');
    expect(promptText).toContain('"missingRecommendedRooms"');
  });

  it("parses whole-property JSON into the normalized response shape", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(openAISuccessBody()), { status: 200 }),
    );

    const response = await POST(request(synthesisRequest()));
    const body = await json(response);
    const analysis = body.wholePropertyAnalysis as Record<string, unknown>;

    expect(analysis.topSellingFeatures).toEqual([
      "Bright kitchen",
      "Excellent natural light",
      "Inviting living room",
    ]);
    expect(analysis.topImprovementPriorities).toEqual([
      "Refresh visible cabinet hardware",
    ]);
    expect(analysis.marketingHighlights).toEqual([
      "Excellent natural lighting",
      "Move-in-ready presentation",
    ]);
  });

  it("gracefully falls back when the provider returns malformed output", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: "not-json" }), {
        status: 200,
      }),
    );

    const response = await POST(request(synthesisRequest()));
    const body = await json(response);
    const analysis = body.wholePropertyAnalysis as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.usedFallback).toBe(true);
    expect(analysis.executiveSummary).toContain("uploaded photos");
  });

  it("gracefully falls back when the API key is missing", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    delete process.env.OPENAI_API_KEY;

    const response = await POST(request(synthesisRequest()));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.usedFallback).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
