import {
  EDITION_OPTIONS,
  EDITION_SET_GROUPS,
  getEditionLabel,
  getEditionUrlName,
  getSetName,
} from "@/lib/shared/edition-utils";
import { describe, expect, it } from "vitest";

describe("Reckoning edition", () => {
  it("is registered as edition 24 in the Conclave set", () => {
    expect(getEditionLabel(24)).toBe("Reckoning");
    expect(getEditionUrlName(24)).toBe("reckoning");
    expect(getSetName(24)).toBe("conclave");
    expect(EDITION_OPTIONS).toContainEqual(
      expect.objectContaining({ value: 24, label: "Reckoning" })
    );
    expect(EDITION_SET_GROUPS.find((group) => group.setName === "conclave")?.editions).toContain(
      24
    );
  });
});
