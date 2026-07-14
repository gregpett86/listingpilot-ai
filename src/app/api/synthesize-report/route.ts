import { NextResponse } from "next/server";
import { CONFIDENCE_LEVELS } from "@/lib/property-intelligence";
import {
  fallbackWholePropertyAnalysis,
  normalizeWholePropertyAnalysis,
  validateWholePropertySynthesisRequest,
  type WholePropertyAnalysis,
  type WholePropertySynthesisRequest,
  type WholePropertySynthesisResponse,
} from "@/lib/whole-property-synthesis";

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

const enableServerDebug =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ENABLE_VISION_DEBUG === "true";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "overallCondition",
    "buyerAppeal",
    "listingReadinessNarrative",
    "topSellingFeatures",
    "topImprovementPriorities",
    "stagingObservations",
    "overallConfidence",
    "marketingHighlights",
  ],
  properties: {
    executiveSummary: { type: "string" },
    overallCondition: { type: "string" },
    buyerAppeal: { type: "string" },
    listingReadinessNarrative: { type: "string" },
    topSellingFeatures: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    topImprovementPriorities: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    stagingObservations: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    overallConfidence: { enum: CONFIDENCE_LEVELS },
    marketingHighlights: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
  },
};

function logDebug(message: string, data?: unknown) {
  if (enableServerDebug) {
    console.log("[ListingPilot Synthesis]", message, data ?? "");
  }
}

function jsonResponse(
  analysis: WholePropertyAnalysis,
  usedFallback: boolean,
  init?: ResponseInit,
) {
  const body: WholePropertySynthesisResponse = {
    wholePropertyAnalysis: analysis,
    usedFallback,
  };

  return NextResponse.json(body, init);
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

async function callOpenAI({
  apiKey,
  model,
  request,
}: {
  apiKey: string;
  model: string;
  request: WholePropertySynthesisRequest;
}) {
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
          role: "system",
          content:
            "You are a luxury real estate listing consultant preparing a report for a homeowner before listing. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create a whole-property listing preparation assessment from these room summaries.

Speak naturally to a homeowner. Do not sound like a home inspector.
Only discuss visible presentation from the supplied summaries.
Never invent or discuss HVAC, roof, foundation, electrical, plumbing, hidden defects, odor, mold, water intrusion, structural conditions, system ages, values, costs, ROI, or code compliance.

Return:
- executiveSummary: specific, natural, and not templated
- overallCondition
- buyerAppeal
- listingReadinessNarrative
- topSellingFeatures: 3 to 5 short bullets
- topImprovementPriorities: only highest-impact visible cosmetic improvements
- stagingObservations
- overallConfidence
- marketingHighlights: short listing-focused observations

Input JSON:
${JSON.stringify(request)}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "listingpilot_whole_property_synthesis",
          schema: responseSchema,
          strict: true,
        },
      },
    }),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    logDebug("Request JSON parse failed.", error);
    return NextResponse.json(
      { error: "The report summary request was malformed." },
      { status: 400 },
    );
  }

  const validatedRequest = validateWholePropertySynthesisRequest(body);

  if (!validatedRequest) {
    return NextResponse.json(
      { error: "The report summary request was incomplete." },
      { status: 400 },
    );
  }

  const fallback = fallbackWholePropertyAnalysis(validatedRequest);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    logDebug("OPENAI_API_KEY is missing. Returning synthesis fallback.");
    return jsonResponse(fallback, true);
  }

  let providerResponse: Response;

  try {
    providerResponse = await callOpenAI({
      apiKey,
      model,
      request: validatedRequest,
    });
  } catch (error) {
    logDebug("OpenAI synthesis request failed before response.", error);
    return jsonResponse(fallback, true);
  }

  if (!providerResponse.ok) {
    const providerDetail = await providerResponse.text().catch(() => "");
    logDebug("OpenAI synthesis returned an error response.", {
      status: providerResponse.status,
      detail: providerDetail,
    });
    return jsonResponse(fallback, true);
  }

  const data = (await providerResponse.json()) as OpenAIResponse;
  const outputText = extractOutputText(data);

  try {
    const parsed = JSON.parse(outputText) as unknown;
    const normalized = normalizeWholePropertyAnalysis(parsed, fallback);

    if (!normalized) {
      logDebug("OpenAI synthesis JSON failed normalization.");
      return jsonResponse(fallback, true);
    }

    return jsonResponse(normalized, false);
  } catch (error) {
    logDebug("OpenAI synthesis JSON could not be parsed.", error);
    return jsonResponse(fallback, true);
  }
}
