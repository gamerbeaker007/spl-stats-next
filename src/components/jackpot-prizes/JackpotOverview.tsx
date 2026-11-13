"use client";

import {
  jackpotNavGroups,
  type JackpotNavGroup,
  type JackpotNavItem,
} from "@/components/jackpot-prizes/jackpot-nav-items";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { MdChevronRight } from "react-icons/md";

function OverviewTile({ item }: Readonly<{ item: JackpotNavItem }>) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "border-color 150ms, transform 150ms, box-shadow 150ms",
        "&:hover": {
          borderColor: item.color ?? "primary.main",
          transform: "translateY(-2px)",
          boxShadow: 3,
        },
        "&:hover .tile-arrow": { transform: "translateX(3px)", opacity: 1 },
      }}
    >
      <CardActionArea
        component={Link}
        href={item.href}
        suppressHydrationWarning
        sx={{ height: "100%", p: 2, display: "flex", alignItems: "center", gap: 2 }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
          }}
        >
          <Image src={item.icon} alt={item.alt} width={36} height={36} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, lineHeight: 1.3, color: item.color ?? "text.primary" }}
          >
            {item.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {item.description}
          </Typography>
        </Box>
        <Box
          className="tile-arrow"
          sx={{
            display: "flex",
            color: "text.secondary",
            opacity: 0.6,
            transition: "transform 150ms, opacity 150ms",
          }}
        >
          <MdChevronRight size={24} />
        </Box>
      </CardActionArea>
    </Card>
  );
}

function OverviewSection({ group }: Readonly<{ group: JackpotNavGroup }>) {
  return (
    <Box component="section" sx={{ mb: 5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: 22,
          }}
        >
          {group.icon}
        </Box>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {group.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {group.subtitle}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {group.items.map((item) => (
          <OverviewTile key={item.href} item={item} />
        ))}
      </Box>
    </Box>
  );
}

export default function JackpotOverview() {
  return (
    <Container maxWidth="lg" sx={{ mt: 3, pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Jackpots &amp; Mint History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Explore Splinterlands jackpot prizes, reward draws and card mint histories.
        </Typography>
      </Box>
      {jackpotNavGroups.map((group) => (
        <OverviewSection key={group.key} group={group} />
      ))}
    </Container>
  );
}
