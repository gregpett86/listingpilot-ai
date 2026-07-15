import { describe, expect, it } from "vitest";
import { classifyRoomFromText } from "./room-classification";

describe("classifyRoomFromText", () => {
  it("classifies hallway text as Hallway", () => {
    expect(
      classifyRoomFromText("bright hallway corridor with entry hall storage"),
    ).toMatchObject({
      roomType: "Hallway",
    });
  });

  it("classifies stairs text as Stairs without mapping downward steps to Basement", () => {
    expect(
      classifyRoomFromText("stairs with railing and landing leading downward"),
    ).toMatchObject({
      roomType: "Stairs",
    });
  });

  it("continues classifying basement text as Basement", () => {
    expect(
      classifyRoomFromText("finished basement lower level recreation room"),
    ).toMatchObject({
      roomType: "Basement",
    });
  });
});
