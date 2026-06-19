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

type PipelineTraceEntry = {
  stage:
    | "api_route"
    | "openai_request"
    | "openai_response"
    | "json_parser"
    | "database_save";
  status: "started" | "success" | "failure" | "skipped";
  message: string;
  data?: Record<string, unknown>;
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

function addTrace(
  trace: PipelineTraceEntry[],
  entry: PipelineTraceEntry,
) {
  trace.push(entry);
  console.log("[ListingPilot Vision Trace]", entry);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const trace: PipelineTraceEntry[] = [];

  if (!apiKey) {
    addTrace(trace, {
      stage: "api_route",
      status: "failure",
      message: "OPENAI_API_KEY is not configured.",
    });

    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        errorType: "missing_api_key",
        trace,
      },
      { status: 500 },
    );
  }

  let body: { photos?: AnalyzePhotoInput[] };

  try {
    body = (await request.json()) as { photos?: AnalyzePhotoInput[] };
  } catch (error) {
    addTrace(trace, {
      stage: "api_route",
      status: "failure",
      message: "Vision request JSON could not be parsed.",
      data: { error: error instanceof Error ? error.message : String(error) },
    });

    return NextResponse.json(
      {
        error: "Vision request JSON could not be parsed.",
        errorType: "image_processing_failure",
        trace,
      },
      { status: 400 },
    );
  }

  const photos = body.photos?.slice(0, 30) ?? [];
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

  addTrace(trace, {
    stage: "api_route",
    status: "success",
    message: "API route received uploaded image payload.",
    data: {
      model,
      requestedPhotoCount: photos.length,
      photoNames: photos.map((photo) => photo.name),
    },
  });

  if (photos.length === 0) {
    addTrace(trace, {
      stage: "openai_request",
      status: "skipped",
      message: "No uploaded images were provided.",
    });

    return NextResponse.json({
      findings: [],
      rawVisionJson: { findings: [] },
      model,
      requestedPhotoCount: 0,
      trace,
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
    addTrace(trace, {
      stage: "openai_request",
      status: "started",
      message: "Sending image analysis request to OpenAI.",
      data: {
        model,
        photoCount: photos.length,
        imagePartCount: photos.length,
      },
    });

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

    addTrace(trace, {
      stage: "openai_response",
      status: response.ok ? "success" : "failure",
      message: "OpenAI returned an HTTP response.",
      data: {
        status: response.status,
        ok: response.ok,
      },
    });
  } catch (error) {
    addTrace(trace, {
      stage: "openai_request",
      status: "failure",
      message: "OpenAI request failed before a response was returned.",
      data: { error: error instanceof Error ? error.message : String(error) },
    });

    return NextResponse.json(
      {
        error: "OpenAI Vision request failed before a response was returned.",
        errorType: "api_request_failure",
        detail: error instanceof Error ? error.message : String(error),
        trace,
      },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorType =
      response.status === 429 ? "rate_limit_issue" : "api_request_failure";

    addTrace(trace, {
      stage: "openai_response",
      status: "failure",
      message: "OpenAI response was not successful.",
      data: {
        status: response.status,
        errorType,
        detail: errorText,
      },
    });

    return NextResponse.json(
      {
        error: "OpenAI Vision analysis failed.",
        errorType,
        detail: errorText,
        trace,
      },
      { status: response.status },
    );
  }

  const data = (await response.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);
  addTrace(trace, {
    stage: "openai_response",
    status: "success",
    message: "OpenAI response body was read.",
    data: {
      hasOutputText: Boolean(outputText),
      outputTextLength: outputText.length,
    },
  });

  let parsed: VisionAnalysisJson;

  try {
    parsed = JSON.parse(outputText) as VisionAnalysisJson;
  } catch (error) {
    addTrace(trace, {
      stage: "json_parser",
      status: "failure",
      message: "OpenAI Vision JSON response could not be parsed.",
      data: {
        error: error instanceof Error ? error.message : String(error),
        rawOutputText: outputText,
      },
    });

    return NextResponse.json(
      {
        error: "OpenAI Vision JSON response could not be parsed.",
        errorType: "json_parsing_failure",
        rawOutputText: outputText,
        trace,
      },
      { status: 502 },
    );
  }

  addTrace(trace, {
    stage: "json_parser",
    status: "success",
    message: "OpenAI structured JSON was parsed.",
    data: {
      returnedFindingCount: parsed.findings?.length ?? 0,
      parsed,
    },
  });

  const findingsByPhotoId = new Map(
    parsed.findings?.map((finding) => [finding.photoId, finding]) ?? [],
  );
  const findings = photos.map((photo) =>
    normalizeFinding(
      findingsByPhotoId.get(photo.id) ?? { photoId: photo.id },
      photo.id,
    ),
  );

  addTrace(trace, {
    stage: "database_save",
    status: "skipped",
    message: "No database save exists in this MVP; results remain in client state only.",
  });

  return NextResponse.json({
    findings,
    rawVisionJson: parsed,
    rawOutputText: outputText,
    model,
    requestedPhotoCount: photos.length,
    trace,
  });
}
