import { ROOM_TYPES, RoomType } from "./types";

const roomKeywords: Record<RoomType, string[]> = {
  Kitchen: ["kitchen", "cabinet", "counter", "island", "pantry", "appliance"],
  Bathroom: ["bath", "bathroom", "shower", "tub", "vanity", "toilet"],
  "Living Room": ["living", "family", "den", "great-room", "fireplace"],
  Bedroom: ["bed", "bedroom", "primary", "closet", "suite"],
  Exterior: ["exterior", "front", "porch", "entry", "siding", "roof"],
  Landscaping: ["landscape", "yard", "lawn", "garden", "mulch", "patio"],
  Garage: ["garage", "driveway", "carport", "opener"],
  Basement: ["basement", "cellar", "lower-level", "mechanical"],
  Pool: ["pool", "spa", "swimming", "hot tub"],
};

export type RoomClassificationResult = {
  roomType: RoomType;
  confidence: number;
  matchedKeywords: string[];
};

export function classifyRoomFromText(input: string): RoomClassificationResult {
  const normalized = input.toLowerCase();
  const matches = ROOM_TYPES.map((roomType) => {
    const matchedKeywords = roomKeywords[roomType].filter((keyword) =>
      normalized.includes(keyword),
    );

    return {
      roomType,
      matchedKeywords,
      score: matchedKeywords.length,
    };
  }).sort((a, b) => b.score - a.score);

  const best = matches[0];

  if (!best || best.score === 0) {
    return {
      roomType: "Living Room",
      confidence: 0.2,
      matchedKeywords: [],
    };
  }

  return {
    roomType: best.roomType,
    confidence: Math.min(0.95, 0.45 + best.score * 0.2),
    matchedKeywords: best.matchedKeywords,
  };
}

export function isSupportedRoomType(value: string): value is RoomType {
  return ROOM_TYPES.includes(value as RoomType);
}
