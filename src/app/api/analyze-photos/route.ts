import { NextResponse } from "next/server";
import {
  CONFIDENCE_LEVELS,
  PROPERTY_CONDITIONS,
  ROOM_TYPES,
  type ConfidenceLevel,
  type PropertyCondition,
  type RoomType,
} from "@/lib/property-intelligence";

type AnalyzePhotoInput = {
  id: string;
  name: string;
  dataUrl: string;
};

type VisionFinding = {
  photoId: string;
  roomType: RoomType;
  condition: PropertyCondition;
  confidence: ConfidenceLevel;
  opportunities: string[];
};

type OpenAIContentPart = {
  type: string;
  text?: string;
};

type OpenAIResponse = {
  output?: Array<{
    content?: OpenAIContentPart[];
  }>;
  output_text?: string;
};

type VisionAnalysisJson = {
  findings?: Partial<VisionFinding>[];
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "photoId",
          "roomType",
          "condition",
          "confidence",
          "opportunities",
        ],
        properties: {
          photoId: { type: "string" },
          roomType: { enum: ROOM_TYPES },
          condition: { enum: PROPERTY_CONDITIONS },
          confidence: { enum: CONFIDENCE_LEVELS },
          opportunities: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
};

function isSupportedRoomType(value: string): value is RoomType {
  return ROOM_TYPES.includes(value as RoomType);
}

function isSupportedCondition(value: string): value is PropertyCondition {
  return PROPERTY_CONDITIONS.includes(value as PropertyCondition);
}

function isSupportedConfidence(value: string): value is ConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as ConfidenceLevel);
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text" && part.text)
      .map((part) => part.text)
      .join("") ?? ""
  );
}

function normalizeFinding(
  finding: Partial<VisionFinding>,
  fallbackPhotoId: string,
): VisionFinding {
  return {
    photoId:
      typeof finding.photoId === "string" ? finding.photoId : fallbackPhotoId,
    roomType:
      typeof finding.roomType === "string" && isSupportedRoomType(finding.roomType)
        ? finding.roomType
        : "Living Room",
    condition:
      typeof finding.condition === "string" &&
      isSupportedCondition(finding.condition)
        ? finding.condition
        : "Average",
    confidence:
      typeof finding.confidence === "string" &&
      isSupportedConfidence(finding.confidence)
        ? finding.confidence
        : "Medium",
    opportunities: Array.isArray(finding.opportunities)
      ? finding.opportunities
          .filter(
            (opportunity): opportunity is string =>
              typeof opportunity === "string",
          )
          .slice(0, 6)
      : [],
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[ListingPilot Vision] Missing OPENAI_API_KEY");

    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        errorType: "missing_api_key",
      },
      { status: 500 },
    );
  }

  let body: { photos?: AnalyzePhotoInput[] };

  try {
    body = (await request.json()) as { photos?: AnalyzePhotoInput[] };
  } catch (error) {
    console.error("[ListingPilot Vision] Request JSON parsing failed", error);

    return NextResponse.json(
      {
        error: "Vision request JSON could not be parsed.",
        errorType: "image_processing_failure",
      },
      { status: 400 },
    );
  }

  const photos = body.photos?.slice(0, 30) ?? [];
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

  console.log("[ListingPilot Vision] Request received", {
    model,
    requestedPhotoCount: photos.length,
    photoNames: photos.map((photo) => photo.name),
  });

  if (photos.length === 0) {
    return NextResponse.json({
      findings: [],
      rawVisionJson: { findings: [] },
      model,
      requestedPhotoCount: 0,
    });
  }

  const content = [
    {
      type: "input_text",
      text: `Analyze each uploaded real estate photo for ListingPilot AI.

Return one finding per image. Use only these roomType values: ${ROOM_TYPES.join(", ")}.
Use only these condition values: ${PROPERTY_CONDITIONS.join(", ")}.
Use only these confidence values: ${CONFIDENCE_LEVELS.join(", ")}.

Visible opportunities should be concise phrases such as cabinet hardware, lighting, paint, decluttering, landscaping cleanup, curb appeal, flooring, caulk, staging, fixture update, pressure washing, or storage organization.
If the image is unclear, use the closest room type, a conservative condition, and Low confidence.
Each image is labeled with its photoId immediately before the image. Copy that exact photoId into the structured output.`,
    },
    ...photos.flatMap((photo) => [
      {
        type: "input_text",
        text: `photoId: ${photo.id}\nfileName: ${photo.name}`,
      },
      {
        type: "input_image",
        image_url: photo.dataUrl,
        detail: "low",
      },
    ]),
  ];

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "listingpilot_photo_analysis",
            schema: responseSchema,
            strict: true,
          },
        },
      }),
    });
  } catch (error) {
    console.error("[ListingPilot Vision] OpenAI request failed", error);

    return NextResponse.json(
      {
        error: "OpenAI Vision request failed before a response was returned.",
        errorType: "api_request_failure",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorType =
      response.status === 429 ? "rate_limit_issue" : "api_request_failure";

    console.error("[ListingPilot Vision] OpenAI response failed", {
      status: response.status,
      errorType,
      detail: errorText,
    });

    return NextResponse.json(
      { error: "OpenAI Vision analysis failed.", errorType, detail: errorText },
      { status: response.status },
    );
  }

  const data = (await response.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);
  let parsed: VisionAnalysisJson;

  try {
    parsed = JSON.parse(outputText) as VisionAnalysisJson;
  } catch (error) {
    console.error("[ListingPilot Vision] Structured JSON parsing failed", {
      error,
      outputText,
    });

    return NextResponse.json(
      {
        error: "OpenAI Vision JSON response could not be parsed.",
        errorType: "json_parsing_failure",
        rawOutputText: outputText,
      },
      { status: 502 },
    );
  }

  const findingsByPhotoId = new Map(
    parsed.findings?.map((finding) => [finding.photoId, finding]) ?? [],
  );
  const findings = photos.map((photo) =>
    normalizeFinding(
      findingsByPhotoId.get(photo.id) ?? { photoId: photo.id },
      photo.id,
    ),
  );

  console.log("[ListingPilot Vision] Response parsed", {
    returnedFindingCount: findings.length,
    findings,
  });

  return NextResponse.json({
    findings,
    rawVisionJson: parsed,
    rawOutputText: outputText,
    model,
    requestedPhotoCount: photos.length,
  });
}
