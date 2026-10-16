import { fetchUnclaimedBalanceHistoryPage } from "@/lib/backend/api/spl/spl-authenticated-api";
import { SplUnclaimedBalanceHistoryItem } from "@/types/spl/balance";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIncrementalUnclaimedHistory } from "./unclaimed-balance-history";

vi.mock("@/lib/backend/api/spl/spl-authenticated-api", () => ({
  fetchUnclaimedBalanceHistoryPage: vi.fn(),
}));

vi.mock("@/lib/backend/log/logger.server", () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("../worker-config", () => ({
  BALANCE_HISTORY_PAGE_LIMIT: 1000,
  REQUEST_DELAY_MS: 0,
}));

const seasonStart = Date.UTC(2020, 0, 1);

function makeItem(
  id: string,
  seasonId: number,
  type: string,
  amount: string
): SplUnclaimedBalanceHistoryItem {
  return {
    reward_action: "earned",
    id,
    player: "player",
    token: "SPS",
    type,
    amount,
    block_num: 1,
    trx_id: id,
    created_date: new Date(seasonStart + (seasonId - 0.5) * 86_400_000).toISOString(),
    to_player: "player",
    status: null,
    last_block_action_date: null,
    action: "transfer",
    block_successful: true,
    block_result: "",
  };
}

describe("fetchIncrementalUnclaimedHistory modern spillover", () => {
  beforeEach(() => {
    vi.mocked(fetchUnclaimedBalanceHistoryPage).mockReset();
  });

  it("only spills modern items into season 192 and later, preserving season-type spillover", async () => {
    vi.mocked(fetchUnclaimedBalanceHistoryPage).mockResolvedValue([
      makeItem("modern-67", 67, "modern", "-1"),
      makeItem("modern-192", 192, "modern", "-2"),
      makeItem("modern-193", 193, "modern", "-3"),
      makeItem("season-67", 67, "season", "-4"),
    ]);

    const allSeasons = Array.from({ length: 193 }, (_, index) => ({
      id: index + 1,
      endsAt: new Date(seasonStart + (index + 1) * 86_400_000),
    }));
    const { deltas } = await fetchIncrementalUnclaimedHistory(
      "player",
      "jwt",
      allSeasons,
      null,
      null
    );

    expect(deltas.get(67)).toEqual([
      { token: "UNCLAIMED_SPS", type: "modern", earned: 1, cost: 0, count: 1 },
    ]);
    expect(deltas.get(192)).toEqual([
      { token: "UNCLAIMED_SPS", type: "modern", earned: 5, cost: 0, count: 2 },
    ]);
    expect(deltas.get(66)).toEqual([
      { token: "UNCLAIMED_SPS", type: "season", earned: 4, cost: 0, count: 1 },
    ]);
  });
});
