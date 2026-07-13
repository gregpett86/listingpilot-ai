import { NextResponse } from "next/server";
import {
  CONFIDENCE_LEVELS,
  PROPERTY_CONDITIONS,
  ROOM_TYPES,
} from "@/lib/property-intelligence";
import {
  PHOTO_UPLOAD_LIMITS,
  type AnalyzePhotosResponse,
  type AnalysisErrorCode,
  type PhotoAnalysisFailure,
  type PhotoAnalysisResult,
  type ValidatedAnalyzePhotoInput,
  type VisionFinding,
  isSupportedCondition,
  isSupportedConfidence,
  isSupportedRoomType,
  safeErrorMessage,
  validateAnalyzePhotosBody,
} from "@/lib/analysis-schema";

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

type OpenAIErrorResponse = {
  error?: {
    code?: string;
    type?: string;
  };
};

const enableServerDebug =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_VISION_DEBUG === "true";

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

function logDebug(message: string, data?: unknown) {
  if (enableServerDebug) {
    console.log("[ListingPilot Vision]", message, data ?? "");
  }
}

function jsonResponse(
  body: AnalyzePhotosResponse,
  init?: ResponseInit,
) {
  return NextResponse.json(body, init);
}

function buildErrorResponse({
  code,
  failedPhotos = [],
  requestedPhotoCount = 0,
  status,
}: {
  code: AnalysisErrorCode;
  failedPhotos?: PhotoAnalysisFailure[];
  requestedPhotoCount?: number;
  status: number;
}) {
  return jsonResponse(
    {
      findings: [],
      photoResults: failedPhotos,
      failedPhotos,
      requestedPhotoCount,
      error: safeErrorMessage(code),
      errorType: code,
    },
    { status },
  );
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
): VisionFinding | null {
  if (typeof finding.photoId !== "string") {
    return null;
  }

  if (
    typeof finding.roomType !== "string" ||
    !isSupportedRoomType(finding.roomType)
  ) {
    return null;
  }

  if (
    typeof finding.condition !== "string" ||
    !isSupportedCondition(finding.condition)
  ) {
    return null;
  }

  if (
    typeof finding.confidence !== "string" ||
    !isSupportedConfidence(finding.confidence)
  ) {
    return null;
  }

  return {
    photoId: finding.photoId,
    roomType: finding.roomType,
    condition: finding.condition,
    confidence: finding.confidence,
    opportunities: Array.isArray(finding.opportunities)
      ? finding.opportunities
          .filter(
            (opportunity): opportunity is string =>
              typeof opportunity === "string",
          )
          .slice(0, PHOTO_UPLOAD_LIMITS.maxOpportunities)
      : [],
  };
}

function buildFailure(
  photo: Pick<ValidatedAnalyzePhotoInput, "id" | "name">,
  errorType: AnalysisErrorCode,
): PhotoAnalysisFailure {
  return {
    photoId: photo.id,
    name: photo.name,
    status: "failed",
    errorType,
    message: safeErrorMessage(errorType),
  };
}

function providerErrorTypeFromResponse({
  body,
  status,
}: {
  body: string;
  status: number;
}): AnalysisErrorCode {
  let parsed: OpenAIErrorResponse | null = null;

  try {
    parsed = JSON.parse(body) as OpenAIErrorResponse;
  } catch {
    parsed = null;
  }

  const providerCode = parsed?.error?.code ?? parsed?.error?.type;

  if (providerCode === "insufficient_quota") {
    return "provider_quota_exceeded";
  }

  if (status === 429) {
    return "provider_rate_limited";
  }

  return "provider_unavailable";
}

function buildPhotoResults({
  failedPhotos,
  findings,
  photos,
}: {
  failedPhotos: PhotoAnalysisFailure[];
  findings: VisionFinding[];
  photos: ValidatedAnalyzePhotoInput[];
}) {
  const findingsByPhotoId = new Map(
    findings.map((finding) => [finding.photoId, finding]),
  );
  const results: PhotoAnalysisResult[] = [...failedPhotos];
  const missingFindings: PhotoAnalysisFailure[] = [];

  photos.forEach((photo) => {
    const finding = findingsByPhotoId.get(photo.id);

    if (finding) {
      results.push({
        photoId: photo.id,
        name: photo.name,
        status: "success",
        finding,
      });
      return;
    }

    const failure = buildFailure(photo, "no_analysis_result");
    missingFindings.push(failure);
    results.push(failure);
  });

  return {
    results,
    missingFindings,
  };
}

async function callOpenAI({
  apiKey,
  model,
  photos,
}: {
  apiKey: string;
  model: string;
  photos: ValidatedAnalyzePhotoInput[];
}) {
  const content = [
    {
      type: "input_text",
      text: `Analyze each uploaded real estate photo for ListingPilot AI.

Return one finding per image. Use only these roomType values: ${ROOM_TYPES.join(", ")}.
Use only these condition values: ${PROPERTY_CONDITIONS.join(", ")}.
Use only these confidence values: ${CONFIDENCE_LEVELS.join(", ")}.

Visible opportunities should be concise photo-grounded phrases such as cabinet hardware, lighting, paint, decluttering, landscaping cleanup, curb appeal, flooring, caulk, staging, fixture update, pressure washing, pool cleaning, or storage organization.
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

  return fetch("https://api.openai.com/v1/responses", {
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
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    logDebug("OPENAI_API_KEY is missing.");
    return buildErrorResponse({
      code: "missing_api_key",
      status: 500,
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    logDebug("Request JSON parse failed.", error);
    return buildErrorResponse({
      code: "malformed_request",
      status: 400,
    });
  }

  const {
    failedPhotos: validationFailures,
    requestIssues,
    requestedPhotoCount,
    validPhotos,
  } = validateAnalyzePhotosBody(body);

  if (requestIssues.length > 0) {
    const primaryIssue = requestIssues[0];

    logDebug("Request validation failed.", requestIssues);
    return buildErrorResponse({
      code: primaryIssue.code,
      requestedPhotoCount,
      status: 400,
    });
  }

  if (validPhotos.length === 0) {
    const failedPhotos =
      validationFailures.length > 0
        ? validationFailures
        : [
            {
              photoId: "unknown",
              name: "Uploaded photo",
              status: "failed" as const,
              errorType: "no_photos" as const,
              message: safeErrorMessage("no_photos"),
            },
          ];

    return buildErrorResponse({
      code: failedPhotos[0].errorType,
      failedPhotos,
      requestedPhotoCount,
      status: 400,
    });
  }

  let providerResponse: Response;

  try {
    providerResponse = await callOpenAI({
      apiKey,
      model,
      photos: validPhotos,
    });
  } catch (error) {
    logDebug("OpenAI request failed before response.", error);
    const failedPhotos = validPhotos.map((photo) =>
      buildFailure(photo, "provider_unavailable"),
    );

    return buildErrorResponse({
      code: "provider_unavailable",
      failedPhotos: [...validationFailures, ...failedPhotos],
      requestedPhotoCount,
      status: 502,
    });
  }

  if (!providerResponse.ok) {
    const providerDetail = await providerResponse.text().catch(() => "");
    const errorType = providerErrorTypeFromResponse({
      body: providerDetail,
      status: providerResponse.status,
    });

    logDebug("OpenAI returned an error response.", {
      status: providerResponse.status,
      detail: providerDetail,
    });

    const failedPhotos = validPhotos.map((photo) =>
      buildFailure(photo, errorType),
    );

    return buildErrorResponse({
      code: errorType,
      failedPhotos: [...validationFailures, ...failedPhotos],
      requestedPhotoCount,
      status: providerResponse.status === 429 ? 429 : 502,
    });
  }

  const data = (await providerResponse.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);
  let parsed: VisionAnalysisJson;

  try {
    parsed = JSON.parse(outputText) as VisionAnalysisJson;
  } catch (error) {
    logDebug("OpenAI JSON could not be parsed.", {
      error,
      outputText,
    });

    const failedPhotos = validPhotos.map((photo) =>
      buildFailure(photo, "provider_response_invalid"),
    );

    return buildErrorResponse({
      code: "provider_response_invalid",
      failedPhotos: [...validationFailures, ...failedPhotos],
      requestedPhotoCount,
      status: 502,
    });
  }

  const validPhotoIds = new Set(validPhotos.map((photo) => photo.id));
  const findings =
    parsed.findings
      ?.map(normalizeFinding)
      .filter((finding): finding is VisionFinding =>
        Boolean(finding && validPhotoIds.has(finding.photoId)),
      ) ?? [];
  const { missingFindings, results } = buildPhotoResults({
    failedPhotos: validationFailures,
    findings,
    photos: validPhotos,
  });
  const failedPhotos = [...validationFailures, ...missingFindings];

  return jsonResponse({
    findings,
    photoResults: results,
    failedPhotos,
    model,
    requestedPhotoCount,
    debug: enableServerDebug
      ? {
          returnedFindingCount: parsed.findings?.length ?? 0,
          successfulFindingCount: findings.length,
          failedPhotoCount: failedPhotos.length,
        }
      : undefined,
  });
}
