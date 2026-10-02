import type {
  ConfidenceLevel,
  RecommendationPriority,
  SpaceCategory,
} from "./types";

export type SpecialistAgentKind =
  | "interior_general"
  | "kitchen"
  | "bathroom"
  | "exterior_curb"
  | "outdoor_living"
  | "specialty";

export type SpaceAgentInput = {
  evaluationId: string;
  spaceId: string;
  category: SpaceCategory;
  displayName: string;
  photos: Array<{ id: string; dataUrl: string }>;
  propertyContext: {
    propertyType?: string;
    yearBuilt?: number;
  };
};

export type AgentFinding = {
  kind: "positive" | "opportunity";
  label: string;
  evidence: string;
  confidence: ConfidenceLevel;
};

export type AgentRecommendationCandidate = {
  title: string;
  reason: string;
  evidence: string;
  priority: RecommendationPriority;
  effort: "quick" | "moderate" | "project";
  suggestedImpact: number;
};

export type SpaceAgentOutput = {
  findings: AgentFinding[];
  componentScores: {
    condition: number;
    presentation: number;
    photoReadiness: number;
    marketability: number;
  };
  recommendationCandidates: AgentRecommendationCandidate[];
  confidence: ConfidenceLevel;
};

export type EvidenceAuditResult = {
  acceptedFindings: AgentFinding[];
  acceptedRecommendations: AgentRecommendationCandidate[];
  rejected: Array<{ label: string; reason: string }>;
};

export const SPECIALIST_BY_CATEGORY: Record<SpaceCategory, SpecialistAgentKind> = {
  bedroom: "interior_general",
  bathroom: "bathroom",
  kitchen: "kitchen",
  living: "interior_general",
  dining: "interior_general",
  office: "interior_general",
  laundry: "interior_general",
  entry: "interior_general",
  hallway: "interior_general",
  stairs: "interior_general",
  garage: "specialty",
  basement: "specialty",
  attic: "specialty",
  exterior: "exterior_curb",
  landscaping: "exterior_curb",
  pool: "outdoor_living",
  spa: "outdoor_living",
  deck_patio: "outdoor_living",
  guest_house: "specialty",
  adu: "specialty",
  specialty: "specialty",
  custom: "specialty",
};

export const AGENT_GUARDRAILS = [
  "Only describe conditions visible in the supplied photos.",
  "Never infer hidden defects, odors, code compliance, structural condition, system age, or repair urgency.",
  "Every opportunity and recommendation must cite visible evidence.",
  "Missing photos reduce confidence; they never reduce the property score.",
  "The AI proposes component observations. Deterministic application code calculates final scores.",
] as const;
