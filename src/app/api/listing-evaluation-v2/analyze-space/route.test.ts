import { describe, expect, it } from "vitest";
import { SPECIALIST_BY_CATEGORY } from "@/lib/listing-evaluation-v2/agent-contracts";

describe("space specialist routing", () => {
  it("routes important space types to dedicated specialists", () => {
    expect(SPECIALIST_BY_CATEGORY.kitchen).toBe("kitchen");
    expect(SPECIALIST_BY_CATEGORY.bathroom).toBe("bathroom");
    expect(SPECIALIST_BY_CATEGORY.landscaping).toBe("exterior_curb");
    expect(SPECIALIST_BY_CATEGORY.pool).toBe("outdoor_living");
    expect(SPECIALIST_BY_CATEGORY.garage).toBe("specialty");
  });
});
