import { getBracketLevelRange, isMinLevelExempt } from "@/lib/shared/league-brackets";
import { describe, expect, it } from "vitest";

describe("getBracketLevelRange", () => {
  it("drops the minimum level for exempt editions 17 and 24", () => {
    expect(isMinLevelExempt(17)).toBe(true);
    expect(isMinLevelExempt(24)).toBe(true);
    expect(isMinLevelExempt(3)).toBe(false);
    expect(getBracketLevelRange("gold", "common", 24)).toEqual([1, 8]);
    expect(getBracketLevelRange("champion", "legendary", 17)).toEqual([1, 4]);
  });

  it("keeps the bracket range for other editions", () => {
    expect(getBracketLevelRange("gold", "common", 23)).toEqual([4, 8]);
  });
});
