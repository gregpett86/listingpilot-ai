export type Difficulty = "Very Easy" | "Easy" | "Medium";

export type Improvement = {
  id: number;
  room: string;
  title: string;
  description: string;
  points: number;
  difficulty: Difficulty;
  time: string;
  category: string;
  reasons: string[];
  priority: "High" | "Medium" | "Low";
};

export type PropertyDetails = {
  address: string;
  basement: string;
  cityStateZip: string;
  city: string;
  beds: string;
  baths: string;
  garageCount: string;
  pool: string;
  propertyType: string;
  sqft: string;
  state: string;
  homeownerName: string;
  agentName: string;
  brokerage: string;
  agentPhone: string;
  agentEmail: string;
  agentWebsite: string;
  agentHeadshotDataUrl: string;
  zip: string;
};

export type UploadedPhoto = {
  agentCorrectedClassification?: boolean;
  classificationMode?: "ai" | "manual_fallback" | "agent";
  confidence?: number;
  detectedRoomLabel?: RoomLabel;
  height?: number;
  id: string;
  includedInReport?: boolean;
  isCoverPreferred?: boolean;
  isBestRoomPhoto?: boolean;
  name: string;
  dataUrl: string;
  roomLabel: RoomLabel;
  width?: number;
};

export type HeroPhotoSource =
  | "uploaded_ai_selected"
  | "uploaded_agent_selected"
  | "street_view"
  | "property_provider"
  | "unavailable";

export type HeroPhotoClassification =
  | "front_exterior"
  | "rear_exterior"
  | "side_exterior"
  | "backyard"
  | "interior"
  | "unavailable";

export type UploadedPhotoClassification = {
  confidence: number;
  exteriorScore: number;
  photo: UploadedPhoto;
  roomClassification: HeroPhotoClassification;
};

export type AddressHeroPhotoLookupResult = {
  error?: string;
  photo?: UploadedPhoto;
  providerName: string;
  source: Extract<HeroPhotoSource, "street_view" | "property_provider">;
};

export type PropertyHeroPhoto = {
  agentOverrode: boolean;
  aiConfidence: number;
  lookupRequested: boolean;
  photo?: UploadedPhoto;
  reason: string;
  roomClassification: HeroPhotoClassification;
  source: HeroPhotoSource;
};

export type RoomLabel =
  | "Cover"
  | "Front Exterior"
  | "Rear Exterior"
  | "Side Exterior"
  | "Exterior"
  | "Kitchen"
  | "Living Room"
  | "Bedroom"
  | "Primary Bedroom"
  | "Primary Bathroom"
  | "Bathroom"
  | "Dining Room"
  | "Office"
  | "Laundry Room"
  | "Backyard"
  | "Garage"
  | "Basement"
  | "Pool"
  | "Patio"
  | "Landscaping"
  | "Hallway"
  | "Stairs"
  | "Unknown"
  | "Other";

export type CoverageStatus = "Complete" | "Partial" | "Missing" | "Not Applicable";

export type CoverageItem = {
  actual: number;
  expected: number;
  label: string;
  missingCount: number;
  status: CoverageStatus;
};

export type RoomPhotoGroup = {
  bestPhoto?: UploadedPhoto;
  photos: UploadedPhoto[];
  room: RoomLabel | string;
};

export type CategoryScore = {
  name: string;
  icon: string;
  score: number;
  potential: number;
  current: number;
};

export type RoomOverview = {
  room: RoomLabel;
  photo?: UploadedPhoto;
  current: number;
  potential: number;
  status: string;
  recommendations: Improvement[];
};

export type ReadinessSummary = {
  baseScore: number;
  currentScore: number;
  potentialScore: number;
  selectedPoints: number;
  totalPossibleIncrease: number;
  selectedRecommendations: Improvement[];
  categoryScores: CategoryScore[];
  roomOverviews: RoomOverview[];
  photos: UploadedPhoto[];
  coverPhoto?: UploadedPhoto;
  bestBathroomPhoto?: UploadedPhoto;
  bestExteriorPhoto?: UploadedPhoto;
  bestKitchenPhoto?: UploadedPhoto;
  bestLivingRoomPhoto?: UploadedPhoto;
  bestPrimaryBedroomPhoto?: UploadedPhoto;
  executivePhoto?: UploadedPhoto;
  coverageSummary: CoverageItem[];
  groupedRoomPhotos: RoomPhotoGroup[];
  missingRooms: string[];
  strongestPhoto?: UploadedPhoto;
  kitchenPhoto?: UploadedPhoto;
  marketingPhoto?: UploadedPhoto;
  propertyHeroPhoto: PropertyHeroPhoto;
  secondaryDetailRoom?: RoomOverview;
};

export const baseScore = 62;

export const roomLabels: RoomLabel[] = [
  "Front Exterior",
  "Rear Exterior",
  "Side Exterior",
  "Kitchen",
  "Living Room",
  "Dining Room",
  "Primary Bedroom",
  "Bedroom",
  "Bathroom",
  "Office",
  "Laundry Room",
  "Backyard",
  "Garage",
  "Basement",
  "Pool",
  "Patio",
  "Landscaping",
  "Hallway",
  "Stairs",
  "Other",
  "Unknown",
  "Cover",
  "Exterior",
  "Primary Bathroom",
];

export const reviewRoomLabels: RoomLabel[] = [
  "Front Exterior",
  "Rear Exterior",
  "Side Exterior",
  "Kitchen",
  "Living Room",
  "Dining Room",
  "Primary Bedroom",
  "Bedroom",
  "Bathroom",
  "Office",
  "Laundry Room",
  "Backyard",
  "Garage",
  "Basement",
  "Pool",
  "Patio",
  "Landscaping",
  "Hallway",
  "Stairs",
  "Other",
  "Unknown",
];

export const improvements: Improvement[] = [
  {
    id: 1,
    room: "Living Room",
    title: "Fresh Interior Paint",
    description:
      "Use a warm neutral paint color to brighten the room and create a cleaner first impression.",
    points: 8,
    difficulty: "Easy",
    time: "1-2 days",
    category: "Interior Appeal",
    priority: "High",
    reasons: [
      "Dark wall color absorbs natural light",
      "Neutral paint photographs better",
      "Creates broader buyer appeal",
    ],
  },
  {
    id: 2,
    room: "Dining Room",
    title: "Upgrade Light Fixtures",
    description:
      "Replace the dated fixture with a simple modern design that better matches the updated finishes.",
    points: 4,
    difficulty: "Easy",
    time: "2-3 hours",
    category: "Modernization",
    priority: "Medium",
    reasons: [
      "Existing fixture appears dated",
      "Modern lighting creates a stronger focal point",
      "Improves listing photography",
    ],
  },
  {
    id: 3,
    room: "Whole Home",
    title: "Declutter and Depersonalize",
    description:
      "Remove excess decor and personal items so buyers can focus on the space rather than the belongings.",
    points: 3,
    difficulty: "Very Easy",
    time: "3-4 hours",
    category: "Photo Readiness",
    priority: "High",
    reasons: [
      "Several surfaces appear visually busy",
      "Cleaner spaces feel larger",
      "Helps buyers picture themselves in the home",
    ],
  },
  {
    id: 4,
    room: "Exterior",
    title: "Power Wash Exterior",
    description:
      "Clean the front walk, driveway, and entry surfaces to sharpen curb appeal before photography.",
    points: 2,
    difficulty: "Easy",
    time: "2-4 hours",
    category: "Curb Appeal",
    priority: "High",
    reasons: [
      "Walkway shows visible discoloration",
      "Entry photos shape first impressions",
      "Low-effort curb appeal improvement",
    ],
  },
  {
    id: 5,
    room: "Primary Bedroom",
    title: "Stage Primary Bedroom",
    description:
      "Simplify furniture placement and use lighter bedding to make the room feel larger and more restful.",
    points: 4,
    difficulty: "Medium",
    time: "Half day",
    category: "Buyer Appeal",
    priority: "Medium",
    reasons: [
      "Furniture placement reduces visible floor area",
      "Lighter bedding improves photography",
      "A calm primary suite supports buyer emotion",
    ],
  },
  {
    id: 6,
    room: "Kitchen",
    title: "Clear Kitchen Counters",
    description:
      "Remove small appliances and visual clutter so the kitchen reads larger, cleaner, and more premium in photos.",
    points: 5,
    difficulty: "Very Easy",
    time: "1-2 hours",
    category: "Photo Readiness",
    priority: "High",
    reasons: [
      "Kitchens are a primary buyer decision point",
      "Clean surfaces improve perceived care",
      "Simple prep creates stronger listing photos",
    ],
  },
  {
    id: 7,
    room: "Primary Bathroom",
    title: "Refresh Bathroom Presentation",
    description:
      "Use crisp towels, remove counter items, clean mirrors, and simplify the vanity area before photography.",
    points: 4,
    difficulty: "Easy",
    time: "2-3 hours",
    category: "Interior Appeal",
    priority: "Medium",
    reasons: [
      "Bathrooms should feel clean and spa-like",
      "Mirror and counter clutter distract in photos",
      "A polished bath supports move-in-ready perception",
    ],
  },
];

export const baseCategories = [
  { name: "Curb Appeal", icon: "Entry", score: 68, potential: 85 },
  { name: "Interior Appeal", icon: "Room", score: 74, potential: 92 },
  { name: "Modernization", icon: "Light", score: 63, potential: 81 },
  { name: "Buyer Appeal", icon: "Heart", score: 79, potential: 95 },
  { name: "Photo Readiness", icon: "Lens", score: 70, potential: 94 },
];

export const marketingHighlights = [
  "Strong curb appeal for first-photo impact",
  "Natural light that supports brighter listing media",
  "Kitchen and main living areas with broad buyer appeal",
  "Flexible spaces that can be presented for lifestyle marketing",
  "Preparation plan focused on photography readiness",
  "Clear next steps before professional listing launch",
];

export const defaultProperty: PropertyDetails = {
  address: "1234 Oak Ridge Drive",
  cityStateZip: "Dallas, TX 75230",
  city: "Dallas",
  beds: "5",
  baths: "3",
  basement: "No",
  garageCount: "2",
  sqft: "2,842",
  pool: "No",
  propertyType: "Single Family",
  state: "TX",
  homeownerName: "",
  agentName: "Your Real Estate Professional",
  brokerage: "Realty Edge Pro",
  agentPhone: "(555) 123-4567",
  agentEmail: "agent@example.com",
  agentWebsite: "realtyedgepro.com",
  agentHeadshotDataUrl: "",
  zip: "75230",
};

const roomBaseScores: Record<RoomLabel, number> = {
  Cover: 70,
  "Front Exterior": 72,
  "Rear Exterior": 70,
  "Side Exterior": 68,
  Exterior: 70,
  Kitchen: 74,
  "Living Room": 76,
  Bedroom: 71,
  "Primary Bedroom": 72,
  "Primary Bathroom": 69,
  Bathroom: 68,
  "Dining Room": 71,
  Office: 70,
  "Laundry Room": 66,
  Backyard: 73,
  Garage: 68,
  Basement: 67,
  Pool: 72,
  Patio: 72,
  Landscaping: 69,
  Hallway: 66,
  Stairs: 66,
  Unknown: 64,
  Other: 70,
};

export function formatFieldLabel(key: keyof PropertyDetails) {
  const labels: Record<keyof PropertyDetails, string> = {
    address: "Property Address",
    basement: "Basement",
    city: "City",
    cityStateZip: "City/State/ZIP",
    beds: "Beds",
    baths: "Baths",
    garageCount: "Garage Count",
    pool: "Pool",
    propertyType: "Property Type",
    sqft: "Square Feet",
    state: "State",
    homeownerName: "Homeowner Name",
    agentName: "Agent Name",
    brokerage: "Brokerage",
    agentPhone: "Agent Phone",
    agentEmail: "Agent Email",
    agentWebsite: "Website",
    agentHeadshotDataUrl: "Agent Headshot",
    zip: "ZIP",
  };

  return labels[key];
}

export function safeFilename(address: string) {
  return (
    address
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "property"
  );
}

export function calculateReadiness(selectedIds: number[]) {
  const selectedRecommendations = improvements.filter((item) =>
    selectedIds.includes(item.id),
  );
  const selectedPoints = selectedRecommendations.reduce(
    (sum, item) => sum + item.points,
    0,
  );
  const totalPossibleIncrease = improvements.reduce(
    (sum, item) => sum + item.points,
    0,
  );

  return {
    currentScore: Math.min(100, baseScore + selectedPoints),
    potentialScore: Math.min(100, baseScore + totalPossibleIncrease),
    selectedPoints,
    totalPossibleIncrease,
    selectedRecommendations,
  };
}

export function inferRoomFromFilename(name: string): RoomLabel {
  const normalized = name.toLowerCase();

  if (/front|facade|curb|front elevation/.test(normalized)) return "Front Exterior";
  if (/rear|back exterior|back elevation/.test(normalized)) return "Rear Exterior";
  if (/side exterior|side elevation/.test(normalized)) return "Side Exterior";
  if (/exterior|entry/.test(normalized)) return "Front Exterior";
  if (/kitchen|island/.test(normalized)) return "Kitchen";
  if (/living|family|great-room|great room/.test(normalized)) return "Living Room";
  if (/primary|master/.test(normalized) && /bed|bedroom|suite/.test(normalized)) return "Primary Bedroom";
  if (/bed|bedroom/.test(normalized)) return "Bedroom";
  if (/bath|vanity|shower/.test(normalized)) return "Bathroom";
  if (/dining/.test(normalized)) return "Dining Room";
  if (/office|study/.test(normalized)) return "Office";
  if (/laundry|mudroom/.test(normalized)) return "Laundry Room";
  if (/garage|carport/.test(normalized)) return "Garage";
  if (/basement|lower level/.test(normalized)) return "Basement";
  if (/pool|spa/.test(normalized)) return "Pool";
  if (/patio|terrace|deck/.test(normalized)) return "Patio";
  if (/landscap|lawn|garden/.test(normalized)) return "Landscaping";
  if (/hall|hallway|corridor/.test(normalized)) return "Hallway";
  if (/stair|stairs|staircase/.test(normalized)) return "Stairs";
  if (/yard|patio|terrace|pool|garden/.test(normalized)) return "Backyard";

  return "Unknown";
}

function normalizedPhotoName(photo: UploadedPhoto) {
  return photo.name.toLowerCase().replace(/[_-]+/g, " ");
}

export function isUsableImageDataUrl(dataUrl: string) {
  return /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(dataUrl);
}

export function validUploadedPhotos(photos: UploadedPhoto[]) {
  return photos.filter((photo) => isUsableImageDataUrl(photo.dataUrl));
}

export function isIncludedReportPhoto(photo: UploadedPhoto) {
  return photo.includedInReport !== false && isUsableImageDataUrl(photo.dataUrl);
}

export function photoReportRoom(photo: UploadedPhoto) {
  return photo.roomLabel === "Cover"
    ? "Front Exterior"
    : photo.roomLabel === "Exterior"
      ? "Front Exterior"
      : photo.roomLabel;
}

export function applyFallbackPhotoClassification(photo: UploadedPhoto): UploadedPhoto {
  if (photo.classificationMode === "ai" || photo.agentCorrectedClassification) {
    return photo;
  }

  const detectedRoomLabel =
    photo.detectedRoomLabel && photo.detectedRoomLabel !== "Unknown"
      ? photo.detectedRoomLabel
      : inferRoomFromFilename(photo.name);
  const confidence = detectedRoomLabel === "Unknown" ? 0.35 : 0.62;

  return {
    ...photo,
    classificationMode: photo.classificationMode ?? "manual_fallback",
    confidence: photo.confidence ?? confidence,
    detectedRoomLabel,
    includedInReport: photo.includedInReport ?? true,
    roomLabel:
      photo.roomLabel === "Other" || photo.roomLabel === "Unknown"
        ? detectedRoomLabel
        : photo.roomLabel,
  };
}

export function normalizeReportPhotos(photos: UploadedPhoto[]) {
  return photos.map(applyFallbackPhotoClassification);
}

export function classifyUploadedPhotoForHero(photo: UploadedPhoto): UploadedPhotoClassification {
  const normalized = normalizedPhotoName(photo);
  const isLandscape =
    typeof photo.width === "number" &&
    typeof photo.height === "number" &&
    photo.width >= photo.height;

  if (photo.roomLabel === "Backyard" || /backyard|rear yard|terrace|patio|pool|garden/.test(normalized)) {
    return {
      confidence: photo.roomLabel === "Backyard" ? 0.86 : 0.74,
      exteriorScore: 54 + (isLandscape ? 6 : 0),
      photo,
      roomClassification: "backyard",
    };
  }

  if (/rear|back exterior|back elevation/.test(normalized)) {
    return {
      confidence: 0.78,
      exteriorScore: 58 + (isLandscape ? 6 : 0),
      photo,
      roomClassification: "rear_exterior",
    };
  }

  if (/side exterior|side elevation|side yard/.test(normalized)) {
    return {
      confidence: 0.76,
      exteriorScore: 56 + (isLandscape ? 6 : 0),
      photo,
      roomClassification: "side_exterior",
    };
  }

  if (
    photo.roomLabel === "Exterior" ||
    photo.roomLabel === "Front Exterior" ||
    photo.roomLabel === "Cover" ||
    /front|facade|facade|elevation|curb|driveway|entry|exterior|street view/.test(normalized)
  ) {
    const fullHouseCue = /front|facade|facade|elevation|curb|driveway/.test(normalized);
    const manualExteriorCue =
      photo.roomLabel === "Exterior" ||
      photo.roomLabel === "Front Exterior" ||
      photo.roomLabel === "Cover";
    return {
      confidence: fullHouseCue ? 0.92 : manualExteriorCue ? 0.82 : 0.76,
      exteriorScore:
        82 +
        (fullHouseCue ? 10 : 0) +
        (manualExteriorCue ? 5 : 0) +
        (isLandscape ? 8 : 0),
      photo,
      roomClassification: "front_exterior",
    };
  }

  return {
    confidence: 0.64,
    exteriorScore: 0,
    photo,
    roomClassification: "interior",
  };
}

export function chooseBestUploadedHeroPhoto(photos: UploadedPhoto[]) {
  const classified = validUploadedPhotos(photos)
    .map(classifyUploadedPhotoForHero)
    .filter((classification) => classification.roomClassification === "front_exterior")
    .sort((a, b) => b.exteriorScore - a.exteriorScore);

  return classified[0];
}

export function resolveAddressHeroPhoto(
  property: PropertyDetails,
): AddressHeroPhotoLookupResult | undefined {
  void property;
  return undefined;
}

export function resolvePropertyHeroPhoto(
  photos: UploadedPhoto[],
  lookupResult?: AddressHeroPhotoLookupResult,
): PropertyHeroPhoto {
  const validPhotos = validUploadedPhotos(photos);
  const agentSelected = validPhotos.find(
    (photo) => photo.isCoverPreferred || photo.roomLabel === "Cover",
  );

  if (agentSelected) {
    const classification = classifyUploadedPhotoForHero(agentSelected);
    return {
      agentOverrode: true,
      aiConfidence: classification.confidence,
      lookupRequested: false,
      photo: agentSelected,
      reason: "Agent manually selected this image as the cover hero.",
      roomClassification: classification.roomClassification,
      source: "uploaded_agent_selected",
    };
  }

  const uploadedHero = chooseBestUploadedHeroPhoto(validPhotos);
  if (uploadedHero) {
    return {
      agentOverrode: false,
      aiConfidence: uploadedHero.confidence,
      lookupRequested: false,
      photo: uploadedHero.photo,
      reason: "Selected from uploaded photos because it best matches a front exterior elevation.",
      roomClassification: uploadedHero.roomClassification,
      source: "uploaded_ai_selected",
    };
  }

  if (lookupResult?.photo) {
    return {
      agentOverrode: false,
      aiConfidence: 0.78,
      lookupRequested: true,
      photo: lookupResult.photo,
      reason: `Resolved from ${lookupResult.providerName} using the property address.`,
      roomClassification: "front_exterior",
      source: lookupResult.source,
    };
  }

  return {
    agentOverrode: false,
    aiConfidence: 0,
    lookupRequested: true,
    reason:
      lookupResult?.error ??
      "No uploaded front exterior was found and no address-based exterior image provider is configured.",
    roomClassification: "unavailable",
    source: "unavailable",
  };
}

export function chooseCoverPhoto(photos: UploadedPhoto[]) {
  const heroPhoto = resolvePropertyHeroPhoto(photos);

  return heroPhoto.photo;
}

export function chooseInteriorPhoto(photos: UploadedPhoto[]) {
  const validPhotos = normalizeReportPhotos(photos).filter(isIncludedReportPhoto);

  return (
    validPhotos.find((photo) => photo.roomLabel === "Kitchen") ??
    validPhotos.find((photo) => photo.roomLabel === "Living Room") ??
    validPhotos.find((photo) => photo.roomLabel === "Primary Bedroom") ??
    validPhotos.find((photo) => photo.roomLabel === "Bedroom")
  );
}

export function chooseStrongestPhoto(photos: UploadedPhoto[]) {
  const validPhotos = normalizeReportPhotos(photos).filter(isIncludedReportPhoto);

  return (
    validPhotos.find((photo) => photo.roomLabel === "Kitchen") ??
    chooseInteriorPhoto(validPhotos) ??
    chooseCoverPhoto(validPhotos)
  );
}

export function chooseMarketingPhoto(photos: UploadedPhoto[]) {
  const validPhotos = normalizeReportPhotos(photos).filter(isIncludedReportPhoto);
  const coverPhoto = chooseCoverPhoto(validPhotos);
  const preferredRooms: RoomLabel[] = [
    "Backyard",
    "Patio",
    "Pool",
    "Living Room",
    "Primary Bedroom",
    "Bedroom",
    "Kitchen",
    "Front Exterior",
  ];

  for (const room of preferredRooms) {
    const match = validPhotos.find(
      (photo) => photo.roomLabel === room && photo.id !== coverPhoto?.id,
    );

    if (match) return match;
  }

  return validPhotos.find((photo) => photo.id !== coverPhoto?.id) ?? coverPhoto;
}

function roomMatches(photo: UploadedPhoto, rooms: RoomLabel[]) {
  return rooms.includes(photoReportRoom(photo) as RoomLabel);
}

export function chooseBestRoomPhoto(
  photos: UploadedPhoto[],
  rooms: RoomLabel[],
) {
  const matchingPhotos = normalizeReportPhotos(photos)
    .filter(isIncludedReportPhoto)
    .filter((photo) => roomMatches(photo, rooms))
    .sort((a, b) => {
      if (a.isBestRoomPhoto !== b.isBestRoomPhoto) return a.isBestRoomPhoto ? -1 : 1;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });

  return matchingPhotos[0];
}

export function groupRoomPhotos(photos: UploadedPhoto[]): RoomPhotoGroup[] {
  const grouped = new Map<string, UploadedPhoto[]>();

  normalizeReportPhotos(photos)
    .filter(isIncludedReportPhoto)
    .forEach((photo) => {
      const room = photoReportRoom(photo);
      grouped.set(room, [...(grouped.get(room) ?? []), photo]);
    });

  return Array.from(grouped.entries()).map(([room, groupedPhotos]) => ({
    bestPhoto:
      groupedPhotos.find((photo) => photo.isBestRoomPhoto) ??
      groupedPhotos
        .slice()
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0],
    photos: groupedPhotos,
    room,
  }));
}

function numberFromProperty(value: string) {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function yesNo(value: string) {
  return value.trim().toLowerCase().startsWith("y");
}

function coverageItem(label: string, actual: number, expected: number): CoverageItem {
  if (expected <= 0) {
    return {
      actual,
      expected,
      label,
      missingCount: 0,
      status: "Not Applicable",
    };
  }

  const missingCount = Math.max(0, expected - actual);
  return {
    actual,
    expected,
    label,
    missingCount,
    status: actual >= expected ? "Complete" : actual > 0 ? "Partial" : "Missing",
  };
}

export function calculatePhotoCoverage(
  property: PropertyDetails,
  photos: UploadedPhoto[],
): CoverageItem[] {
  const includedPhotos = normalizeReportPhotos(photos).filter(isIncludedReportPhoto);
  const roomCount = (rooms: RoomLabel[]) =>
    includedPhotos.filter((photo) => roomMatches(photo, rooms)).length;

  return [
    coverageItem(
      "Bedrooms detected",
      roomCount(["Primary Bedroom", "Bedroom"]),
      numberFromProperty(property.beds),
    ),
    coverageItem(
      "Bathrooms detected",
      roomCount(["Primary Bathroom", "Bathroom"]),
      numberFromProperty(property.baths),
    ),
    coverageItem("Exterior", roomCount(["Front Exterior", "Rear Exterior", "Side Exterior", "Exterior"]), 1),
    coverageItem("Kitchen", roomCount(["Kitchen"]), 1),
    coverageItem("Living Room", roomCount(["Living Room"]), 1),
    coverageItem("Garage", roomCount(["Garage"]), Math.max(0, numberFromProperty(property.garageCount))),
    coverageItem("Pool", roomCount(["Pool"]), yesNo(property.pool) ? 1 : 0),
    coverageItem("Basement", roomCount(["Basement"]), yesNo(property.basement) ? 1 : 0),
  ];
}

export function chooseSecondaryDetailRoom(roomOverviews: RoomOverview[]) {
  return (
    roomOverviews.find(
      (room) => room.room === "Primary Bathroom" && room.photo,
    ) ??
    roomOverviews.find(
      (room) => room.room === "Primary Bedroom" && room.photo,
    ) ??
    roomOverviews.find(
      (room) => room.room === "Living Room" && room.photo,
    ) ??
    roomOverviews.find((room) => room.photo && room.room !== "Kitchen") ??
    roomOverviews.find((room) => room.room === "Primary Bathroom") ??
    roomOverviews.find((room) => room.room !== "Kitchen") ??
    roomOverviews[0]
  );
}

export function buildRoomOverviews(
  photos: UploadedPhoto[],
  selectedRecommendations: Improvement[],
): RoomOverview[] {
  const normalizedPhotos = normalizeReportPhotos(photos);
  const requiredRooms: RoomLabel[] = [
    "Kitchen",
    "Living Room",
    "Primary Bedroom",
    "Bathroom",
    "Front Exterior",
  ];
  const detectedRooms = normalizedPhotos
    .map((photo) => photoReportRoom(photo) as RoomLabel)
    .filter((room) => room !== "Cover");
  const rooms = Array.from(new Set([...requiredRooms, ...detectedRooms]));

  return rooms.map((room) => {
    const recommendations = selectedRecommendations.filter(
      (item) => item.room === room || (item.room === "Whole Home" && room !== "Exterior"),
    );
    const scoreLift = recommendations.reduce((sum, item) => sum + item.points, 0);
    const current = roomBaseScores[room] ?? 70;
    const potential = Math.min(96, current + scoreLift + (scoreLift > 0 ? 8 : 5));

    return {
      room,
      photo: normalizedPhotos
        .filter(isIncludedReportPhoto)
        .find((photo) => photoReportRoom(photo) === room),
      current,
      potential,
      recommendations,
      status:
        scoreLift > 0
          ? "Preparation recommended before photography"
          : "Presentation appears ready based on provided photos",
    };
  });
}

export function buildReadinessSummary(
  selectedIds: number[],
  photos: UploadedPhoto[],
  property: PropertyDetails = defaultProperty,
  options: { addressHeroPhotoLookup?: AddressHeroPhotoLookupResult } = {},
): ReadinessSummary {
  const normalizedPhotos = normalizeReportPhotos(photos);
  const readiness = calculateReadiness(selectedIds);
  const propertyHeroPhoto = resolvePropertyHeroPhoto(
    normalizedPhotos,
    options.addressHeroPhotoLookup,
  );
  const roomOverviews = buildRoomOverviews(
    normalizedPhotos,
    readiness.selectedRecommendations,
  );
  const coverageSummary = calculatePhotoCoverage(property, normalizedPhotos);
  const groupedRoomPhotos = groupRoomPhotos(normalizedPhotos);
  const missingRooms = coverageSummary
    .filter((item) => item.status === "Missing" || item.status === "Partial")
    .map((item) => item.label);
  const categoryScores = baseCategories.map((category) => {
    const selectedCategoryPoints = readiness.selectedRecommendations
      .filter((item) => item.category === category.name)
      .reduce((sum, item) => sum + item.points, 0);

    return {
      ...category,
      current: Math.min(category.potential, category.score + selectedCategoryPoints),
    };
  });

  return {
    baseScore,
    ...readiness,
    categoryScores,
    roomOverviews,
    photos: normalizedPhotos,
    coverPhoto: propertyHeroPhoto.photo,
    bestBathroomPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Bathroom", "Primary Bathroom"]),
    bestExteriorPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Front Exterior", "Exterior", "Rear Exterior", "Side Exterior"]),
    bestKitchenPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Kitchen"]),
    bestLivingRoomPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Living Room"]),
    bestPrimaryBedroomPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Primary Bedroom", "Bedroom"]),
    coverageSummary,
    executivePhoto: chooseInteriorPhoto(normalizedPhotos),
    groupedRoomPhotos,
    missingRooms,
    strongestPhoto: chooseStrongestPhoto(normalizedPhotos),
    kitchenPhoto: chooseBestRoomPhoto(normalizedPhotos, ["Kitchen"]),
    marketingPhoto: chooseMarketingPhoto(normalizedPhotos),
    propertyHeroPhoto,
    secondaryDetailRoom: chooseSecondaryDetailRoom(roomOverviews),
  };
}
