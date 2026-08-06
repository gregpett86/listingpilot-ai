import {
  ImprovementRecord,
  PropertyCondition,
  RoomType,
} from "./types";

const conditionLanguage: Record<PropertyCondition, string> = {
  Excellent: "protect an already strong presentation",
  Good: "polish a space that is already close to listing-ready",
  Average: "turn a serviceable space into a stronger first impression",
  Dated: "reduce the dated cues buyers notice in photos and showings",
  "Needs Improvement": "remove avoidable buyer objections before launch",
};

export function buildSellerTalkingPoints({
  condition,
  improvement,
  roomType,
}: {
  condition: PropertyCondition;
  improvement: ImprovementRecord;
  roomType: RoomType;
}) {
  const valueRange = `$${improvement.potentialAddedSaleValueRange.min.toLocaleString()} - $${improvement.potentialAddedSaleValueRange.max.toLocaleString()}`;
  const costRange = `$${improvement.typicalCostRange.min.toLocaleString()} - $${improvement.typicalCostRange.max.toLocaleString()}`;

  return [
    ...improvement.sellerTalkingPoints,
    `For the ${roomType.toLowerCase()}, this helps ${conditionLanguage[condition]}.`,
    `Typical prep cost is ${costRange}, with a potential added sale value range of ${valueRange}.`,
  ];
}
