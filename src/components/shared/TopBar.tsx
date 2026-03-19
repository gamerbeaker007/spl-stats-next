"use client";

import { usePageTitle } from "@/lib/frontend/context/PageTitleContext";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LoginComponent from "./LoginComponent";
import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  const { title } = usePageTitle();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar
        variant="dense"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          minHeight: 64,
        }}
      >
        {/* Left side */}
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        {/* Right side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ThemeToggle />
          <LoginComponent />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
