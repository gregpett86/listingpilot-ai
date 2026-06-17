export const ROOM_TYPES = [
  "Kitchen",
  "Bathroom",
  "Living Room",
  "Bedroom",
  "Exterior",
  "Landscaping",
  "Garage",
  "Basement",
] as const;

export const PROPERTY_CONDITIONS = [
  "Excellent",
  "Good",
  "Average",
  "Dated",
  "Needs Improvement",
] as const;

export const CONFIDENCE_LEVELS = ["High", "Medium", "Low"] as const;

export type RoomType = (typeof ROOM_TYPES)[number];
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export type CostRange = {
  min: number;
  max: number;
};

export type ImprovementRecord = {
  id: string;
  improvementName: string;
  category: RoomType;
  description: string;
  typicalCostRange: CostRange;
  potentialAddedSaleValueRange: CostRange;
  confidenceLevel: ConfidenceLevel;
  sellerTalkingPoints: string[];
  targetConditions: PropertyCondition[];
  priorityBase: number;
};

export type PropertyConditionObservation = {
  roomType: RoomType;
  condition: PropertyCondition;
  notes?: string;
  photoCount?: number;
  observedIssues?: string[];
};

export type RecommendationPriority = "High" | "Medium" | "Low";

export type PropertyReadinessStatus =
  | "Listing Ready"
  | "Minor Improvements Recommended"
  | "Significant Opportunity"
  | "Needs Review";

export type ImprovementRecommendation = {
  improvement: ImprovementRecord;
  priority: RecommendationPriority;
  priorityScore: number;
  reasons: string[];
  sellerTalkingPoints: string[];
};

export type PropertyReadinessScore = {
  score: number;
  status: PropertyReadinessStatus;
  summary: string;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
};
