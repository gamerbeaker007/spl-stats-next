"use client";

import { useCardDetail } from "@/hooks/battles/useCardDetail";
import { useCardOptions } from "@/hooks/battles/useCardOptions";
import { useLastBattles } from "@/hooks/battles/useLastBattles";
import { useMonitoredAccountNames } from "@/hooks/battles/useMonitoredAccountNames";
import CardStatsCard from "./CardStatsCard";
import ManaBucketChart from "./ManaBucketChart";
import type { BestCardStat, DetailedBattleEntry, LosingCardStat } from "@/types/battles";
import { DEFAULT_BATTLE_FILTER, RARITY_LABELS } from "@/types/battles";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { MdArrowBack, MdExpandMore, MdOpenInNew } from "react-icons/md";
import { useEffect, useMemo, useState } from "react";

const ACCOUNT_STORAGE_KEY = "card-detail-account";

interface CardDetailContentProps {
  cardDetailId: number;
  /** Pre-validated account from the server — takes priority over localStorage. */
  initialAccount?: string;
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Box sx={{ textAlign: "center", px: 2 }}>
      <Typography variant="h5" fontWeight={700} color={color ?? "text.primary"}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function CardGrid({
  title,
  cards,
  showWinRate = true,
  onCardClick,
}: {
  title: string;
  cards: (BestCardStat | LosingCardStat)[];
  showWinRate?: boolean;
  onCardClick?: (cardDetailId: number) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1.5 }}>
        {cards.map((c) => (
          <CardStatsCard
            key={`${c.cardDetailId}|${c.edition}`}
            card={c}
            showWinRate={showWinRate}
            onClick={onCardClick ? () => onCardClick(c.cardDetailId) : undefined}
          />
        ))}
      </Stack>
    </Box>
  );
}

// Visual battle entry — shows full team card images like the Python reference
const RULESET_IMG_BASE =
  "https://d36mxiodymuqjm.cloudfront.net/website/icons/rulesets/new/img_combat-rule_";

function rulesetImgUrl(ruleset: string): string {
  const name = ruleset
    .replace(/ /g, "-")
    .toLowerCase()
    .replace("&-", "")
    .replace("?", "-")
    .replace("\u2019", "-"); // right single quote
  return `${RULESET_IMG_BASE}${name}_150.png`;
}

function VisualBattleEntry({ battle }: { battle: DetailedBattleEntry }) {
  const isWin = battle.result === "win";
  const rulesets = [battle.ruleset1, battle.ruleset2, battle.ruleset3].filter(
    (r) => r && r !== "None" && r !== ""
  );
  const replayUrl = `https://next.splinterlands.com/battle/${battle.battleId}`;

  const summoner = battle.playerTeam.find((c) => c.position === 0);
  // Python ref: reversed(my_team['monsters']) — player monsters face inward toward "vs"
  const monsters = battle.playerTeam
    .filter((c) => c.position > 0)
    .sort((a, b) => b.position - a.position);
  const oppSummoner = battle.opponentTeam.find((c) => c.position === 0);
  // Opponent monsters face inward too — normal ascending order
  const oppMonsters = battle.opponentTeam
    .filter((c) => c.position > 0)
    .sort((a, b) => a.position - b.position);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 1.5,
        borderColor: isWin ? "success.main" : "error.main",
        borderWidth: 2,
      }}
    >
      {/* Info row */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {new Date(battle.createdDate).toLocaleString()}
        </Typography>
        <Chip label={`${battle.manaCap} mana`} size="small" variant="outlined" />
        <Chip
          label={battle.format}
          size="small"
          variant="outlined"
          sx={{ textTransform: "capitalize" }}
        />
        <Chip label={battle.matchType} size="small" variant="outlined" />
        {rulesets.map((rs) => (
          <Tooltip key={rs} title={rs} placement="top">
            <Box
              component="img"
              src={rulesetImgUrl(rs)}
              alt={rs}
              sx={{ width: 24, height: 24, objectFit: "contain" }}
            />
          </Tooltip>
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Watch replay">
          <Link href={replayUrl} target="_blank" rel="noopener noreferrer">
            <MdOpenInNew size={18} style={{ verticalAlign: "middle", opacity: 0.7 }} />
          </Link>
        </Tooltip>
      </Stack>

      {/* Teams row */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ overflowX: "auto" }}>
        {/* Player team */}
        <Stack direction="row" alignItems="flex-end" spacing={0.5}>
          {isWin && (
            <Typography fontSize={20} title="Win">
              🏆
            </Typography>
          )}
          {summoner && (
            <Tooltip title={summoner.cardName}>
              <Box
                sx={{
                  position: "relative",
                  width: 66,
                  height: 90,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={summoner.imageUrl}
                  alt={summoner.cardName}
                  fill
                  style={{ objectFit: "cover", objectPosition: "top" }}
                  sizes="66px"
                />
              </Box>
            </Tooltip>
          )}
          {monsters.map((m) => (
            <Tooltip key={m.position} title={m.cardName}>
              <Box
                sx={{
                  position: "relative",
                  width: 44,
                  height: 60,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={m.imageUrl}
                  alt={m.cardName}
                  fill
                  style={{ objectFit: "cover", objectPosition: "top" }}
                  sizes="40px"
                />
              </Box>
            </Tooltip>
          ))}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontWeight: 700 }}>
          vs
        </Typography>

        {/* Opponent team */}
        <Stack direction="row" alignItems="flex-end" spacing={0.5}>
          {oppMonsters.map((m) => (
            <Tooltip key={m.position} title={m.cardName}>
              <Box
                sx={{
                  position: "relative",
                  width: 44,
                  height: 60,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={m.imageUrl}
                  alt={m.cardName}
                  fill
                  style={{ objectFit: "cover", objectPosition: "top" }}
                  sizes="44px"
                />
              </Box>
            </Tooltip>
          ))}
          {oppSummoner && (
            <Tooltip title={oppSummoner.cardName}>
              <Box
                sx={{
                  position: "relative",
                  width: 66,
                  height: 90,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Image
                  src={oppSummoner.imageUrl}
                  alt={oppSummoner.cardName}
                  fill
                  style={{ objectFit: "cover", objectPosition: "top" }}
                  sizes="66px"
                />
              </Box>
            </Tooltip>
          )}
          {!isWin && (
            <Typography fontSize={20} title="Opponent wins">
              🏆
            </Typography>
          )}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          vs {battle.opponent}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function CardDetailContent({
  cardDetailId,
  initialAccount = "",
}: CardDetailContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  // initialAccount (server-validated) takes priority; fall back to localStorage
  const [account, setAccount] = useState(initialAccount);
  const { accounts, loading: accountsLoading } = useMonitoredAccountNames();
  const { cards: cardOptions, loading: cardsLoading } = useCardOptions(account);
  const filter = useMemo(() => ({ ...DEFAULT_BATTLE_FILTER, account }), [account]);
  const { detail, loading, error } = useCardDetail(cardDetailId, filter);

  // Fetch both wins and losses live from SPL API for full team data on both sides
  const allBattleIds = useMemo(
    () => [
      ...(detail?.lastWins ?? []).map((b) => b.battleId),
      ...(detail?.lastLosses ?? []).map((b) => b.battleId),
    ],
    [detail]
  );
  const { battles: liveBattles, loading: battlesLoading } = useLastBattles(account, allBattleIds);
  const liveWins = useMemo(() => liveBattles.filter((b) => b.result === "win"), [liveBattles]);
  const liveLosses = useMemo(() => liveBattles.filter((b) => b.result === "loss"), [liveBattles]);

  const handleCardClick = (id: number) => {
    const params = account ? `?account=${encodeURIComponent(account)}` : "";
    router.push(`/battles/card/${id}${params}`);
  };

  // Sync account state when the server-provided initialAccount changes (URL navigation)
  // or fall back to localStorage when there is no server-provided account.
  useEffect(() => {
    if (initialAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccount(initialAccount);
      return;
    }
    try {
      const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      // Reading localStorage on mount is legitimate — suppress overly strict rule.

      if (saved) setAccount(saved);
    } catch {
      // ignore
    }
  }, [initialAccount]);

  // Persist account to localStorage whenever it changes
  useEffect(() => {
    if (!account) return;
    try {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
    } catch {
      // ignore
    }
  }, [account]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header row with selects */}
      <Stack direction="row" alignItems="center" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small"
          variant="text"
          startIcon={<MdArrowBack />}
          onClick={() => router.push("/battles")}
        >
          Back
        </Button>
        <Typography variant="h5" fontWeight={600}>
          Card Detail
        </Typography>
        <Box sx={{ flexGrow: 1 }} />

        {/* Account selector */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="cd-account-label">Account</InputLabel>
          <Select
            labelId="cd-account-label"
            label="Account"
            value={account}
            onChange={(e) => {
              const next = e.target.value;
              setAccount(next);
              const params = next ? `?account=${encodeURIComponent(next)}` : "";
              router.replace(`${pathname}${params}`);
            }}
            disabled={accountsLoading}
          >
            {/* Ensure the prefilled value always has a matching option while accounts load */}
            {account && !accounts.includes(account) && (
              <MenuItem value={account}>{account}</MenuItem>
            )}
            {accounts.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Card selector */}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="cd-card-label">Card</InputLabel>
          <Select
            labelId="cd-card-label"
            label="Card"
            value={cardOptions.some((c) => c.cardDetailId === cardDetailId) ? cardDetailId : ""}
            onChange={(e) => handleCardClick(Number(e.target.value))}
            disabled={!account || cardsLoading}
            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
          >
            {cardOptions.map((c) => (
              <MenuItem key={c.cardDetailId} value={c.cardDetailId}>
                {c.cardName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {!account && <Alert severity="info">Select an account above to view card statistics.</Alert>}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && !detail && account && (
        <Alert severity="info">
          No battle data found for this card. The card may not have been played by this account.
        </Alert>
      )}

      {!loading && detail && (
        <>
          {/* Card image + stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Card image */}
            <Grid size={{ xs: 12, sm: "auto" }}>
              <Box
                sx={{
                  position: "relative",
                  width: { xs: 140, sm: 180 },
                  height: { xs: 180, sm: 230 },
                  borderRadius: 1,
                  overflow: "hidden",
                  boxShadow: 3,
                  mx: { xs: "auto" },
                }}
              >
                <Image
                  src={detail.stat.imageUrl}
                  alt={detail.stat.cardName}
                  fill
                  style={{ objectFit: "cover", objectPosition: "top" }}
                  sizes="180px"
                />
              </Box>
            </Grid>

            {/* Stats */}
            <Grid size={{ xs: 12, sm: "grow" }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {detail.stat.cardName}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 0.5 }}>
                <Chip label={detail.stat.cardType} size="small" variant="outlined" />
                <Chip
                  label={RARITY_LABELS[detail.stat.rarity] ?? `R${detail.stat.rarity}`}
                  size="small"
                  variant="outlined"
                />
                <Chip label={`Level ${detail.stat.level}`} size="small" variant="outlined" />
                {detail.stat.gold && <Chip label="Gold" size="small" color="warning" />}
              </Stack>

              <Stack
                direction="row"
                divider={<Divider orientation="vertical" flexItem />}
                spacing={0}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                <StatBox label="Battles" value={detail.stat.battles} />
                <StatBox label="Wins" value={detail.stat.wins} color="success.main" />
                <StatBox label="Losses" value={detail.stat.losses} color="error.main" />
                <StatBox
                  label="Win Rate"
                  value={`${detail.stat.winPercentage}%`}
                  color={
                    detail.stat.winPercentage >= 60
                      ? "success.main"
                      : detail.stat.winPercentage >= 45
                        ? "warning.main"
                        : "error.main"
                  }
                />
              </Stack>

              {/* Ruleset breakdown */}
              {detail.rulesets.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Top Rulesets
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {detail.rulesets.map((r) => (
                      <Chip
                        key={r.ruleset}
                        label={`${r.ruleset} (${r.count})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Match type breakdown */}
              {detail.matchTypeStats.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Match Types
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {detail.matchTypeStats.map((m) => (
                      <Paper key={m.matchType} variant="outlined" sx={{ px: 1.5, py: 0.75 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {m.matchType}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {m.wins}W / {m.losses}L · {m.winPct}%
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Match mode (format) breakdown */}
              {detail.formatStats.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Match Modes
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {detail.formatStats.map((f) => (
                      <Paper key={f.format} variant="outlined" sx={{ px: 1.5, py: 0.75 }}>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ textTransform: "capitalize" }}
                        >
                          {f.format}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {f.wins}W / {f.losses}L · {f.winPct}%
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Mana cap distribution chart */}
              {detail.manaCapData.some((d) => d.count > 0) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Mana Cap Distribution
                  </Typography>
                  <ManaBucketChart data={detail.manaCapData} width={200} height={200} />
                </Box>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* Paired cards */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Most Played With
            </Typography>
            <CardGrid
              title="Summoners (top 2)"
              cards={detail.pairedSummoners}
              showWinRate
              onCardClick={handleCardClick}
            />
            <CardGrid
              title="Monsters (top 5)"
              cards={detail.pairedMonsters}
              showWinRate
              onCardClick={handleCardClick}
            />
            {detail.pairedSummoners.length === 0 && detail.pairedMonsters.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No paired card data available.
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Nemesis cards (what beats you when playing this card) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Weakest Against
            </Typography>
            <CardGrid
              title="Opponent summoners (top 2)"
              cards={detail.nemesisSummoners}
              showWinRate={false}
            />
            <CardGrid
              title="Opponent monsters (top 5)"
              cards={detail.nemesisMonsters}
              showWinRate={false}
            />
            {detail.nemesisSummoners.length === 0 && detail.nemesisMonsters.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No loss data available for this card.
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Recent battles — visual team display, fetched live from SPL API */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Recent Battles
            </Typography>
            {battlesLoading && <CircularProgress size={18} />}
          </Stack>
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", mb: 1 }}>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography fontWeight={500} color="success.main">
                Last {detail.lastWins.length} Won Battles
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {liveWins.map((b) => (
                <VisualBattleEntry key={b.battleId} battle={b} />
              ))}
              {!battlesLoading && liveWins.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No won battles found.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <AccordionSummary expandIcon={<MdExpandMore />}>
              <Typography fontWeight={500} color="error.main">
                Last {detail.lastLosses.length} Lost Battles
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {liveLosses.map((b) => (
                <VisualBattleEntry key={b.battleId} battle={b} />
              ))}
              {liveLosses.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No lost battles found.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
}
