import type { MultiAccountDashboardCategories } from "@/lib/shared/dashboard-categories";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { PlayerPoolBalances, SplBalance } from "@/types/spl/balances";
import { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import { Box } from "@mui/material";
import CardCollection from "./CardCollection";
import ElectroneumBalances from "@/components/multi-dashboard/ElectroneumBalances";
import Glint from "./Glint";
import Guild from "./Guild";
import Potions from "./Potions";
import Scrolls from "./Scrolls";
import TopBalances from "./TopBalances";

interface Props {
  categories: MultiAccountDashboardCategories;
  balances?: SplBalance[];
  poolBalances?: PlayerPoolBalances;
  seasonRewards?: SPLSeasonRewards;
  glintLoading?: boolean;
  glintError?: string | null;
  collectionData?: PlayerCardCollectionData | null;
  collectionLoading?: boolean;
  collectionError?: string | null;
}

export default function PlayerBalances({
  categories,
  balances,
  poolBalances,
  seasonRewards,
  glintLoading,
  glintError,
  collectionData,
  collectionLoading,
  collectionError,
}: Readonly<Props>) {
  const hasPotionsScrollsGuild =
    categories.balancePotions || categories.balanceScrolls || categories.balanceGuild;
  const hasGlintOrCollection = categories.balanceGlint || categories.collection;

  return (
    <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 1 }}>
      {categories.balanceMain && <TopBalances balances={balances} poolBalances={poolBalances} />}
      {categories.balanceElectronium && <ElectroneumBalances balances={balances} />}
      {hasPotionsScrollsGuild && (
        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
          {categories.balancePotions && <Potions balances={balances} />}
          {categories.balanceScrolls && <Scrolls balances={balances} />}
          {categories.balanceGuild && <Guild balances={balances} />}
        </Box>
      )}
      {hasGlintOrCollection && (
        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
          {categories.balanceGlint && (
            <Glint
              balances={balances}
              seasonRewards={seasonRewards}
              glintLoading={glintLoading}
              glintError={glintError}
            />
          )}
          {categories.collection && (
            <CardCollection
              data={collectionData}
              loading={collectionLoading}
              error={collectionError}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
