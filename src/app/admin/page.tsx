import { Container, Typography, Paper, Box, Chip } from "@mui/material";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/backend/auth/authOptions";
import { redirect } from "next/navigation";
import fs from "fs/promises";
import path from "path";

async function getRecentLogs() {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    const files = await fs.readdir(logsDir);

    // Find the most recent app log file
    const appLogFiles = files.filter((f) => f.startsWith("app-") && f.endsWith(".log"));

    if (appLogFiles.length === 0) {
      return "No log files found";
    }

    appLogFiles.sort().reverse();
    const latestLog = path.join(logsDir, appLogFiles[0]);

    const content = await fs.readFile(latestLog, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    // Return last 50 lines
    return lines.slice(-50).join("\n");
  } catch (error) {
    return `Error reading logs: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function getSystemInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const logs = await getRecentLogs();
  const systemInfo = await getSystemInfo();

  return (
    <Container maxWidth="xl">
      <Typography variant="h3" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome, {session.user?.name}!
      </Typography>

      <Box sx={{ display: "grid", gap: 3, mt: 4 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            System Information
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
            <Chip label={`Node: ${systemInfo.nodeVersion}`} />
            <Chip label={`Platform: ${systemInfo.platform}`} />
            <Chip label={`Uptime: ${Math.round(systemInfo.uptime / 60)}m`} />
            <Chip label={`Memory: ${systemInfo.memory.used}MB / ${systemInfo.memory.total}MB`} />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Recent Logs
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: "background.default",
              p: 2,
              borderRadius: 1,
              overflow: "auto",
              maxHeight: 400,
              fontSize: "0.875rem",
              fontFamily: "monospace",
            }}
          >
            {logs}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
