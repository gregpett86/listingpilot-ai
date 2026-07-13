import { describe, expect, it } from "vitest";
import { IMPROVEMENT_LIBRARY } from "./improvement-library";
import { ROOM_TYPES } from "./types";

describe("room and category taxonomy", () => {
  it("includes Pool as a first-class optional analysis category", () => {
    expect(ROOM_TYPES).toContain("Pool");
  });

  it("keeps improvement categories aligned with supported room types", () => {
    const roomTypeSet = new Set<string>(ROOM_TYPES);

    expect(
      IMPROVEMENT_LIBRARY.every((improvement) =>
        roomTypeSet.has(improvement.category),
      ),
    ).toBe(true);
  });

  it("contains pool-specific improvement guidance", () => {
    expect(
      IMPROVEMENT_LIBRARY.some(
        (improvement) => improvement.category === "Pool",
      ),
    ).toBe(true);
  });
});
