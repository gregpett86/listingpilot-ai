import type { PropertySpace, SpaceCategory } from "./types";

export type PropertySpaceCounts = Partial<Record<SpaceCategory, number>>;

const singularLabels: Partial<Record<SpaceCategory, string>> = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living: "Living Room",
  dining: "Dining Room",
  office: "Office",
  laundry: "Laundry Room",
  entry: "Entry / Foyer",
  hallway: "Hallway",
  stairs: "Stairs",
  garage: "Garage",
  basement: "Basement",
  attic: "Attic",
  exterior: "Exterior",
  landscaping: "Landscaping",
  pool: "Pool",
  spa: "Spa",
  deck_patio: "Deck / Patio",
  guest_house: "Guest House",
  adu: "ADU / In-Law Suite",
  specialty: "Specialty Space",
  custom: "Custom Space",
};

function createId(category: SpaceCategory, sequence: number) {
  return `${category}-${sequence}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultSpaceLabel(category: SpaceCategory, sequence: number, total: number) {
  const base = singularLabels[category] ?? "Space";
  return total > 1 ? `${base} ${sequence}` : base;
}

export function buildPropertySpaces(counts: PropertySpaceCounts): PropertySpace[] {
  return Object.entries(counts).flatMap(([categoryKey, countValue]) => {
    const category = categoryKey as SpaceCategory;
    const count = Math.max(0, Math.floor(countValue ?? 0));

    return Array.from({ length: count }, (_, index) => {
      const sequence = index + 1;
      return {
        id: createId(category, sequence),
        category,
        defaultLabel: defaultSpaceLabel(category, sequence, count),
        sequence,
        status: "not_started" as const,
        photoIds: [],
      };
    });
  });
}

export function addPropertySpace(
  spaces: PropertySpace[],
  category: SpaceCategory,
  customLabel?: string,
): PropertySpace[] {
  const existing = spaces.filter((space) => space.category === category);
  const sequence = existing.length + 1;
  return [
    ...spaces,
    {
      id: createId(category, sequence),
      category,
      defaultLabel: defaultSpaceLabel(category, sequence, sequence),
      customLabel,
      sequence,
      status: "not_started",
      photoIds: [],
    },
  ];
}
