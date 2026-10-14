import { describe, expect, it } from "vitest";
import { buildPropertySpaces, defaultSpaceLabel } from "./property-template";

describe("property space templates", () => {
  it("creates independently addressable repeated spaces", () => {
    const spaces = buildPropertySpaces({ bedroom: 3, bathroom: 2, pool: 1 });
    expect(spaces.filter((space) => space.category === "bedroom")).toHaveLength(3);
    expect(spaces.map((space) => space.id).every(Boolean)).toBe(true);
    expect(new Set(spaces.map((space) => space.id)).size).toBe(spaces.length);
  });

  it("uses numbered defaults only when multiple spaces exist", () => {
    expect(defaultSpaceLabel("bedroom", 1, 3)).toBe("Bedroom 1");
    expect(defaultSpaceLabel("pool", 1, 1)).toBe("Pool");
  });
});
