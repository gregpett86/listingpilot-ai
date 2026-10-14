import { NextResponse } from "next/server";
import {
  AGENT_GUARDRAILS,
  SPECIALIST_BY_CATEGORY,
  type AgentRecommendationCandidate,
  type SpaceAgentOutput,
} from "@/lib/listing-evaluation-v2/agent-contracts";
import {
  SPACE_CATEGORIES,
  type ConfidenceLevel,
  type RecommendationPriority,
  type SpaceCategory,
} from "@/lib/listing-evaluation-v2/types";

type AnalyzeSpaceRequest = {
  evaluationId?: string;
  spaceId?: string;
  category?: SpaceCategory;
  displayName?: string;
  propertyContext?: {
    propertyType?: string;
    yearBuilt?: number;
  };
  photos?: Array<{ id: string; dataUrl: string }>;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type: string; text?: string }> }>;
};

const confidenceValues: ConfidenceLevel[] = ["low", "medium", "high"];
const priorityValues: RecommendationPriority[] = [
  "do_first",
  "next_if_possible",
  "optional_polish",
];
const effortValues = ["quick", "moderate", "project"] as const;

const specialistRubrics = {
  interior_general:
    "Evaluate visible condition, presentation, clutter, furniture arrangement, paint/surface presentation, lighting presentation, flooring presentation, staging readiness, and visible marketable features.",
  kitchen:
    "Evaluate visible cabinet/counter presentation, clutter, lighting, hardware/finish presentation, appliance presentation only as visible, staging readiness, cleanliness presentation, and marketable kitchen features.",
  bathroom:
    "Evaluate visible vanity/counter presentation, grout/caulk presentation only when visible, fixtures/finish presentation, clutter, cleanliness presentation, lighting, staging readiness, and marketable bathroom features.",
  exterior_curb:
    "Evaluate visible curb appeal, exterior presentation, entry presentation, landscaping, visible debris/overgrowth, driveway/walkway presentation, and marketable exterior features. Do not assess roof life, structure, drainage, or hidden defects.",
  outdoor_living:
    "Evaluate visible presentation of pool, spa, deck, patio, outdoor kitchen or outdoor living area, including cleanliness, clutter, staging readiness, visible surface presentation, and marketable outdoor features. Do not infer mechanical or safety condition.",
  specialty:
    "Evaluate the visible presentation and listing readiness of this specialty space relative to its stated use. Focus on cleanliness, organization, visible cosmetic condition, lighting, usability presentation, and marketable features without inferring hidden systems or defects.",
} as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "findings",
    "componentScores",
    "recommendationCandidates",
    "confidence",
  ],
  properties: {
    findings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "label", "evidence", "confidence"],
        properties: {
          kind: { enum: ["positive", "opportunity"] },
          label: { type: "string" },
          evidence: { type: "string" },
          confidence: { enum: confidenceValues },
        },
      },
    },
    componentScores: {
      type: "object",
      additionalProperties: false,
      required: ["condition", "presentation", "photoReadiness", "marketability"],
      properties: {
        condition: { type: "number", minimum: 0, maximum: 100 },
        presentation: { type: "number", minimum: 0, maximum: 100 },
        photoReadiness: { type: "number", minimum: 0, maximum: 100 },
        marketability: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    recommendationCandidates: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason", "evidence", "priority", "effort", "suggestedImpact"],
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          evidence: { type: "string" },
          priority: { enum: priorityValues },
          effort: { enum: effortValues },
          suggestedImpact: { type: "number", minimum: 0, maximum: 10 },
        },
      },
    },
    confidence: { enum: confidenceValues },
  },
};

const auditSchema = {
  type: "object",
  additionalProperties: false,
  required: ["acceptedFindingIndexes", "acceptedRecommendationIndexes", "rejected"],
  properties: {
    acceptedFindingIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
    },
    acceptedRecommendationIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
    },
    rejected: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "reason"],
        properties: {
          label: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
};

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text" && part.text)
      .map((part) => part.text)
      .join("") ?? ""
  );
}

function validRequest(body: AnalyzeSpaceRequest) {
  return Boolean(
    body.evaluationId &&
      body.spaceId &&
      body.category &&
      SPACE_CATEGORIES.includes(body.category) &&
      body.displayName &&
      body.photos?.length,
  );
}

async function callModel({
  apiKey,
  model,
  content,
  schema,
  name,
}: {
  apiKey: string;
  model: string;
  content: Array<Record<string, unknown>>;
  schema: Record<string, unknown>;
  name: string;
}) {
  return fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name,
          schema,
          strict: true,
        },
      },
    }),
  });
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeAgentOutput(value: SpaceAgentOutput): SpaceAgentOutput {
  return {
    ...value,
    componentScores: {
      condition: normalizeScore(value.componentScores.condition),
      presentation: normalizeScore(value.componentScores.presentation),
      photoReadiness: normalizeScore(value.componentScores.photoReadiness),
      marketability: normalizeScore(value.componentScores.marketability),
    },
    recommendationCandidates: value.recommendationCandidates.map((candidate) => ({
      ...candidate,
      suggestedImpact: Math.max(0, Math.min(10, candidate.suggestedImpact)),
    })),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: AnalyzeSpaceRequest;
  try {
    body = (await request.json()) as AnalyzeSpaceRequest;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!validRequest(body)) {
    return NextResponse.json(
      { error: "Space analysis request is incomplete." },
      { status: 400 },
    );
  }

  const category = body.category as SpaceCategory;
  const photos = body.photos ?? [];
  const specialist = SPECIALIST_BY_CATEGORY[category];

  const specialistContent: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: [
        `You are the ${specialist} specialist for Realty Edge Pro Listing AI.`,
        `Analyze only the space named "${body.displayName}" with category "${category}".`,
        specialistRubrics[specialist],
        ...AGENT_GUARDRAILS,
        "Score each component from 0-100 based only on visible listing readiness.",
        "Recommendations must be practical seller-preparation actions supported by exact visible evidence.",
        "suggestedImpact is advisory only and will NOT be used for final scoring.",
      ].join("\n\n"),
    },
    ...photos.flatMap((photo) => [
      {
        type: "input_text",
        text: `photoId: ${photo.id}`,
      },
      {
        type: "input_image",
        image_url: photo.dataUrl,
        detail: "low",
      },
    ]),
  ];

  const specialistResponse = await callModel({
    apiKey,
    model,
    content: specialistContent,
    schema: responseSchema,
    name: "listing_ai_space_specialist",
  });

  if (!specialistResponse.ok) {
    const detail = await specialistResponse.text().catch(() => "");
    return NextResponse.json(
      { error: "Specialist analysis failed.", detail },
      { status: specialistResponse.status === 429 ? 429 : 502 },
    );
  }

  let specialistOutput: SpaceAgentOutput;
  try {
    specialistOutput = normalizeAgentOutput(
      JSON.parse(
        extractOutputText((await specialistResponse.json()) as OpenAIResponse),
      ) as SpaceAgentOutput,
    );
  } catch {
    return NextResponse.json(
      { error: "Specialist analysis returned invalid structured data." },
      { status: 502 },
    );
  }

  const auditContent: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: [
        "You are the independent evidence-audit agent for Realty Edge Pro Listing AI.",
        "Reject any finding or recommendation that is not directly supported by something visible in the supplied photos.",
        "Reject hidden-defect, structural, mechanical, odor, code, age/lifespan, safety, value, ROI, urgency, or non-visible claims.",
        "Return indexes only for claims that are visually supportable.",
        `Candidate JSON: ${JSON.stringify(specialistOutput)}`,
      ].join("\n\n"),
    },
    ...photos.map((photo) => ({
      type: "input_image",
      image_url: photo.dataUrl,
      detail: "low",
    })),
  ];

  const auditResponse = await callModel({
    apiKey,
    model,
    content: auditContent,
    schema: auditSchema,
    name: "listing_ai_evidence_audit",
  });

  if (!auditResponse.ok) {
    return NextResponse.json({
      specialist,
      analysis: specialistOutput,
      audit: {
        usedFallback: true,
        rejected: [],
      },
    });
  }

  try {
    const audit = JSON.parse(
      extractOutputText((await auditResponse.json()) as OpenAIResponse),
    ) as {
      acceptedFindingIndexes: number[];
      acceptedRecommendationIndexes: number[];
      rejected: Array<{ label: string; reason: string }>;
    };

    const findings = specialistOutput.findings.filter((_, index) =>
      audit.acceptedFindingIndexes.includes(index),
    );
    const recommendationCandidates =
      specialistOutput.recommendationCandidates.filter((_, index) =>
        audit.acceptedRecommendationIndexes.includes(index),
      );

    return NextResponse.json({
      specialist,
      analysis: {
        ...specialistOutput,
        findings,
        recommendationCandidates,
      },
      audit: {
        usedFallback: false,
        rejected: audit.rejected,
      },
    });
  } catch {
    return NextResponse.json({
      specialist,
      analysis: specialistOutput,
      audit: {
        usedFallback: true,
        rejected: [],
      },
    });
  }
}
