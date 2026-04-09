"use client";

import { useMonitoredAccountNames } from "@/hooks/battles/useMonitoredAccountNames";
import { useNemesis } from "@/hooks/battles/useNemesis";
import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import {
  FORMAT_OPTIONS,
  MATCH_TYPE_OPTIONS,
  NemesisOpponentStat,
  SINCE_OPTIONS,
} from "@/types/battles";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Image from "next/image";

const TOP_N = 10;

function hiveAvatarUrl(username: string): string {
  return `https://images.hive.blog/u/${username}/avatar/small`;
}

function OpponentList({ opponents }: { opponents: NemesisOpponentStat[] }) {
  const top = opponents.slice(0, TOP_N);
  if (top.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No losses recorded
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {top.map((opp, idx) => (
        <Box key={opp.opponent} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: 20, textAlign: "right", flexShrink: 0 }}
          >
            {idx + 1}.
          </Typography>
          <Avatar
            src={hiveAvatarUrl(opp.opponent)}
            alt={opp.opponent}
            sx={{ width: 28, height: 28 }}
          />
          <Typography variant="body2" sx={{ flex: 1, fontWeight: idx === 0 ? 600 : 400 }}>
            {opp.opponent}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: "error.main",
              color: "error.contrastText",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {opp.battles}×
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function SectionGrid({
  data,
  options,
}: {
  data: Record<string, NemesisOpponentStat[]>;
  options: { value: string; label: string; iconUrl?: string }[];
}) {
  const present = options.filter((o) => data[o.value]?.length);
  if (present.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data
      </Typography>
    );
  }
  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}
    >
      {present.map((opt) => (
        <Card key={opt.value} variant="outlined">
          <CardHeader
            avatar={
              opt.iconUrl ? (
                <Image src={opt.iconUrl} alt={opt.label} width={20} height={20} />
              ) : undefined
            }
            title={opt.label}
            titleTypographyProps={{ variant: "subtitle2" }}
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ pt: 1 }}>
            <OpponentList opponents={data[opt.value] ?? []} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default function NemesisContent() {
  const { filter, setFilter } = useBattleFilter();
  const { accounts, loading: accountsLoading } = useMonitoredAccountNames();
  const { data, loading, error } = useNemesis(filter);

  return (
    <Box sx={{ px: 2, pt: 1 }}>
      {/* Selectors */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Account</InputLabel>
          <Select
            value={filter.account ?? ""}
            label="Account"
            onChange={(e) => setFilter({ account: e.target.value || undefined })}
            disabled={accountsLoading}
          >
            {accounts.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Since</InputLabel>
          <Select
            value={filter.sinceDays}
            label="Since"
            onChange={(e) => setFilter({ sinceDays: Number(e.target.value) })}
          >
            {SINCE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* States */}
      {!filter.account && (
        <Alert severity="info">Select an account to see your nemesis opponents.</Alert>
      )}
      {filter.account && loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {filter.account && error && <Alert severity="error">{error}</Alert>}
      {filter.account && !loading && !error && !data && (
        <Alert severity="info">No loss data found. Play more battles!</Alert>
      )}

      {data && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Overall */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Overall Nemesis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Opponents who have beaten you the most across all formats and match types
            </Typography>
            <Card variant="outlined" sx={{ maxWidth: 400 }}>
              <CardContent>
                <OpponentList opponents={data.overall} />
              </CardContent>
            </Card>
          </Box>

          {/* By Format */}
          <Box>
            <Typography variant="h6" gutterBottom>
              By Format
            </Typography>
            <SectionGrid
              data={data.byFormat}
              options={FORMAT_OPTIONS.map((f) => ({
                value: f.value,
                label: f.label,
                iconUrl: f.iconUrl,
              }))}
            />
          </Box>

          {/* By Match Type */}
          <Box>
            <Typography variant="h6" gutterBottom>
              By Match Type
            </Typography>
            <SectionGrid
              data={data.byMatchType}
              options={MATCH_TYPE_OPTIONS.map((m) => ({
                value: m.value,
                label: m.label,
                iconUrl: m.iconUrl,
              }))}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
