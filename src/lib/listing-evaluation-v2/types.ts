export const SPACE_CATEGORIES = [
  "bedroom",
  "bathroom",
  "kitchen",
  "living",
  "dining",
  "office",
  "laundry",
  "entry",
  "hallway",
  "stairs",
  "garage",
  "basement",
  "attic",
  "exterior",
  "landscaping",
  "pool",
  "spa",
  "deck_patio",
  "guest_house",
  "adu",
  "specialty",
  "custom",
] as const;

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];

export type EvaluationStatus =
  | "not_started"
  | "in_progress"
  | "needs_review"
  | "complete"
  | "not_evaluated";

export type PhotoCoverage = "none" | "limited" | "good" | "excellent";
export type ConfidenceLevel = "low" | "medium" | "high";
export type RecommendationPriority = "do_first" | "next_if_possible" | "optional_polish";

export type PropertySnapshot = {
  address: string;
  cityStateZip: string;
  homeownerName?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  source: "realty_edge_pro" | "manual";
  agentEditable: true;
};

export type PropertySpace = {
  id: string;
  category: SpaceCategory;
  defaultLabel: string;
  customLabel?: string;
  sequence: number;
  status: EvaluationStatus;
  noPhotosReason?: string;
  photoIds: string[];
};

export type EvaluationPhoto = {
  id: string;
  spaceId: string;
  name: string;
  dataUrl?: string;
  createdAt: string;
};

export type VisibleFinding = {
  id: string;
  kind: "positive" | "opportunity";
  label: string;
  evidence: string;
  confidence: ConfidenceLevel;
};

export type SpaceAnalysis = {
  spaceId: string;
  visibleFindings: VisibleFinding[];
  conditionScore: number;
  presentationScore: number;
  photoReadinessScore: number;
  marketabilityScore: number;
  currentScore: number;
  potentialScore: number;
  confidence: ConfidenceLevel;
  coverage: PhotoCoverage;
  analyzedAt: string;
};

export type ImprovementRecommendation = {
  id: string;
  spaceId: string;
  title: string;
  reason: string;
  evidence: string;
  priority: RecommendationPriority;
  effort: "quick" | "moderate" | "project";
  scoreImpact: number;
  selected: boolean;
};

export type ListingEvaluationV2 = {
  id: string;
  property: PropertySnapshot;
  spaces: PropertySpace[];
  photos: EvaluationPhoto[];
  analyses: SpaceAnalysis[];
  recommendations: ImprovementRecommendation[];
  currentScore?: number;
  potentialScore?: number;
  confidence?: ConfidenceLevel;
  createdAt: string;
  updatedAt: string;
};

export function displaySpaceName(space: PropertySpace) {
  return space.customLabel?.trim() || space.defaultLabel;
}
