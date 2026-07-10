import { LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import { findLeagueLogoUrl } from "@/lib/utils";
import { League } from "@/types/buy-missing-cc";
import { Box, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import Image from "next/image";

const BRACKET_LEAGUE_LOGO: Record<League, number> = {
  wood: 0,
  bronze: 3,
  silver: 6,
  gold: 9,
  diamond: 12,
  champion: 15,
};

export default function BracketFilter({
  selectedBracket,
  setSelectedBracket,
}: Readonly<{
  selectedBracket: League | "";
  setSelectedBracket: (bracket: League | "") => void;
}>) {
  return (
    <Box display={"flex"} flexWrap={"wrap"} alignItems={"center"} gap={1}>
      <Typography variant="body2" sx={{ mr: 1 }}>
        Targeted Bracket
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={selectedBracket}
        onChange={(_event, next) => setSelectedBracket(next ?? "")}
        size="small"
      >
        <ToggleButton value="">All</ToggleButton>
        {(Object.keys(LEAGUE_BRACKETS) as League[]).map((bracket) => {
          const logo = findLeagueLogoUrl("modern", BRACKET_LEAGUE_LOGO[bracket]);
          return (
            <ToggleButton key={bracket} value={bracket}>
              {logo ? (
                <Tooltip title={LEAGUE_BRACKETS[bracket].label}>
                  <Image src={logo} alt={LEAGUE_BRACKETS[bracket].label} width={26} height={26} />
                </Tooltip>
              ) : (
                LEAGUE_BRACKETS[bracket].label
              )}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
}
