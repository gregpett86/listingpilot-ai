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
  cityStateZip: string;
  beds: string;
  baths: string;
  sqft: string;
  homeownerName: string;
  agentName: string;
  brokerage: string;
  agentPhone: string;
  agentEmail: string;
};

export type UploadedPhoto = {
  id: string;
  isCoverPreferred?: boolean;
  name: string;
  dataUrl: string;
  roomLabel: RoomLabel;
};

export type RoomLabel =
  | "Exterior"
  | "Kitchen"
  | "Living Room"
  | "Primary Bedroom"
  | "Primary Bathroom"
  | "Bathroom"
  | "Dining Room"
  | "Backyard"
  | "Other";

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
  executivePhoto?: UploadedPhoto;
  strongestPhoto?: UploadedPhoto;
  kitchenPhoto?: UploadedPhoto;
  marketingPhoto?: UploadedPhoto;
  secondaryDetailRoom?: RoomOverview;
};

export const baseScore = 62;

export const roomLabels: RoomLabel[] = [
  "Exterior",
  "Kitchen",
  "Living Room",
  "Primary Bedroom",
  "Primary Bathroom",
  "Bathroom",
  "Dining Room",
  "Backyard",
  "Other",
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
  beds: "5",
  baths: "3",
  sqft: "2,842",
  homeownerName: "",
  agentName: "Your Real Estate Professional",
  brokerage: "Realty Edge Pro",
  agentPhone: "(555) 123-4567",
  agentEmail: "agent@example.com",
};

const roomBaseScores: Record<RoomLabel, number> = {
  Exterior: 70,
  Kitchen: 74,
  "Living Room": 76,
  "Primary Bedroom": 72,
  "Primary Bathroom": 69,
  Bathroom: 68,
  "Dining Room": 71,
  Backyard: 73,
  Other: 70,
};

export function formatFieldLabel(key: keyof PropertyDetails) {
  const labels: Record<keyof PropertyDetails, string> = {
    address: "Property Address",
    cityStateZip: "City/State/ZIP",
    beds: "Beds",
    baths: "Baths",
    sqft: "Square Feet",
    homeownerName: "Homeowner Name",
    agentName: "Agent Name",
    brokerage: "Brokerage",
    agentPhone: "Agent Phone",
    agentEmail: "Agent Email",
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

  if (/front|exterior|entry|facade|curb/.test(normalized)) return "Exterior";
  if (/kitchen|island/.test(normalized)) return "Kitchen";
  if (/living|family|great-room|great room/.test(normalized)) return "Living Room";
  if (/bath|vanity|shower/.test(normalized)) return "Primary Bathroom";
  if (/primary|master|bedroom/.test(normalized)) return "Primary Bedroom";
  if (/dining/.test(normalized)) return "Dining Room";
  if (/yard|patio|terrace|pool|garden/.test(normalized)) return "Backyard";

  return "Other";
}

export function chooseCoverPhoto(photos: UploadedPhoto[]) {
  return (
    photos.find((photo) => photo.isCoverPreferred && photo.roomLabel === "Exterior") ??
    photos.find((photo) => photo.isCoverPreferred) ??
    photos.find((photo) => photo.roomLabel === "Exterior") ??
    photos.find((photo) => photo.roomLabel === "Backyard") ??
    photos[0]
  );
}

export function chooseInteriorPhoto(photos: UploadedPhoto[]) {
  return (
    photos.find((photo) => photo.roomLabel === "Kitchen") ??
    photos.find((photo) => photo.roomLabel === "Living Room") ??
    photos.find((photo) => photo.roomLabel === "Primary Bedroom") ??
    photos[0]
  );
}

export function chooseStrongestPhoto(photos: UploadedPhoto[]) {
  return (
    photos.find((photo) => photo.roomLabel === "Kitchen") ??
    chooseCoverPhoto(photos) ??
    chooseInteriorPhoto(photos)
  );
}

export function chooseMarketingPhoto(photos: UploadedPhoto[]) {
  const coverPhoto = chooseCoverPhoto(photos);
  const preferredRooms: RoomLabel[] = [
    "Backyard",
    "Living Room",
    "Primary Bedroom",
    "Kitchen",
    "Exterior",
  ];

  for (const room of preferredRooms) {
    const match = photos.find(
      (photo) => photo.roomLabel === room && photo.id !== coverPhoto?.id,
    );

    if (match) return match;
  }

  return photos.find((photo) => photo.id !== coverPhoto?.id) ?? coverPhoto;
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
  const requiredRooms: RoomLabel[] = [
    "Kitchen",
    "Living Room",
    "Primary Bedroom",
    "Primary Bathroom",
    "Bathroom",
    "Exterior",
  ];
  const detectedRooms = photos.map((photo) => photo.roomLabel);
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
      photo: photos.find((photo) => photo.roomLabel === room),
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
): ReadinessSummary {
  const readiness = calculateReadiness(selectedIds);
  const roomOverviews = buildRoomOverviews(
    photos,
    readiness.selectedRecommendations,
  );
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
    photos,
    coverPhoto: chooseCoverPhoto(photos),
    executivePhoto: chooseInteriorPhoto(photos),
    strongestPhoto: chooseStrongestPhoto(photos),
    kitchenPhoto: photos.find((photo) => photo.roomLabel === "Kitchen"),
    marketingPhoto: chooseMarketingPhoto(photos),
    secondaryDetailRoom: chooseSecondaryDetailRoom(roomOverviews),
  };
}
