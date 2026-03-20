"use client";

import { usePageTitle } from "@/lib/frontend/context/PageTitleContext";
import { Container, Paper, Typography } from "@mui/material";
import Box from "@mui/material/Box";

export default function HomeContent() {
  usePageTitle("SPL Stats");

  return (
    <Container maxWidth="lg">
      <Paper elevation={2} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h3" gutterBottom>
          Welcome to SPL Stats
        </Typography>
        <Typography variant="body1">
          A Next.js dashboard application for Splinterlands statistics with authenticated access,
          encrypted token storage, and comprehensive logging.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Features:
          </Typography>
          <ul>
            <li>
              <Typography variant="body1">
                <strong>Authentication:</strong> GitHub OAuth with whitelist-based access
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Security:</strong> AES-256-GCM encrypted token storage with random IVs
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Logging:</strong> Winston with daily rotating file transports
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>UI:</strong> Material-UI v7 with dark/light theme switching
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Database:</strong> PostgreSQL with Prisma ORM
              </Typography>
            </li>
          </ul>
        </Box>
      </Paper>
    </Container>
  );
}
