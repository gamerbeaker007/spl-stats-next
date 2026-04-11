"use client";

import { navLinks } from "@/components/nav/navLinks";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/jackpot-prizes": "Browse jackpot prize history, CA gold rewards, and fortune draw results.",
  "/multi-dashboard": "View real-time stats for all your monitored accounts side by side.",
  "/season": "Season leaderboard standings and earnings overview per account.",
  "/battles": "Browse and analyze battle history, nemeses, and card performance.",
  "/portfolio": "Track the value of your Splinterlands portfolio over time.",
  "/hive-blog": "Generate and publish Splinterlands season reports to the Hive blockchain.",
  "/spl-metrics":
    "Game-wide metrics: battles, market volume, daily active users, sign-ups, and more.",
  "/users": "Manage the accounts you are monitoring and check sync status.",
  "/admin": "Admin tools: log viewer and worker run history.",
};

const tileLinks = navLinks.filter((l) => l.href !== "/");

export default function HomeContent() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to SPL Statistics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A Splinterlands statistics dashboard. Choose a section to get started.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {tileLinks.map(({ href, label, icon }) => (
          <Grid key={href} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea
                component={Link}
                suppressHydrationWarning
                href={href}
                sx={{ height: "100%", alignItems: "flex-start", display: "flex" }}
              >
                <CardContent sx={{ width: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
                    <Typography variant="h6">{label}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {PAGE_DESCRIPTIONS[href] ?? ""}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
