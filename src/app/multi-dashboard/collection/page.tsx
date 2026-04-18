"use client";

import DashboardClient from "@/components/multi-dashboard/dashboard/DashboardClient";
import { Box, Container, Tooltip, Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { MdArrowBack } from "react-icons/md";

export default function DashboardPage() {
  return (
    <Container maxWidth={false} sx={{ px: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Tooltip title="Back to Multi Dashboard">
          <IconButton
            component={Link}
            href="/multi-dashboard"
            suppressHydrationWarning
            sx={{ color: "primary.main" }}
          >
            <MdArrowBack size={24} />
          </IconButton>
        </Tooltip>
        <Typography variant="h4" gutterBottom sx={{ mb: 0, flex: 1 }}>
          Player Dashboard
        </Typography>
      </Box>

      <DashboardClient />
    </Container>
  );
}
