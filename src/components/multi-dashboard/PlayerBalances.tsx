import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { PlayerPoolBalances, SplBalance } from "@/types/spl/balances";
import { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import { Box } from "@mui/material";
import CardCollection from "./CardCollection";
import Glint from "./Glint";
import Guild from "./Guild";
import Potions from "./Potions";
import Scrolls from "./Scrolls";
import TopBalances from "./TopBalances";
import ElectroneumBalances from "@/components/multi-dashboard/ElectroneumBalances";

interface Props {
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
  balances,
  poolBalances,
  seasonRewards,
  glintLoading,
  glintError,
  collectionData,
  collectionLoading,
  collectionError,
}: Readonly<Props>) {
  return (
    <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 1 }}>
      <TopBalances balances={balances} poolBalances={poolBalances} />
      <ElectroneumBalances balances={balances} />

      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        <Potions balances={balances} />
        <Scrolls balances={balances} />
        <Guild balances={balances} />
      </Box>
      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        <Glint
          balances={balances}
          seasonRewards={seasonRewards}
          glintLoading={glintLoading}
          glintError={glintError}
        />
        <CardCollection data={collectionData} loading={collectionLoading} error={collectionError} />
      </Box>
    </Box>
  );
}
