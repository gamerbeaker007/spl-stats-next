import { getDefaultCategories, withDefaultCategories } from "@/lib/shared/dashboard-categories";
import type { MultiAccountDashboardCategories } from "@/lib/shared/dashboard-categories";
import { describe, expect, it } from "vitest";

/** A config saved before `ratingEmblem` existed. */
function savedBeforeEmblem(
  overrides: Partial<MultiAccountDashboardCategories>
): Partial<MultiAccountDashboardCategories> {
  const saved: Partial<MultiAccountDashboardCategories> = {
    ...getDefaultCategories(),
    ...overrides,
  };
  delete saved.ratingEmblem;
  return saved;
}

describe("withDefaultCategories", () => {
  it("fills categories missing from an older saved config with defaults", () => {
    expect(withDefaultCategories(savedBeforeEmblem({ land: false }))).toEqual({
      ...getDefaultCategories(),
      land: false,
    });
  });

  it("lets older configs inherit ratingEmblem from rating", () => {
    expect(withDefaultCategories(savedBeforeEmblem({ rating: false })).ratingEmblem).toBe(false);
  });

  it("keeps an explicitly saved ratingEmblem", () => {
    const saved = { ...getDefaultCategories(), rating: false, ratingEmblem: true };
    expect(withDefaultCategories(saved)).toEqual(saved);
  });
});
