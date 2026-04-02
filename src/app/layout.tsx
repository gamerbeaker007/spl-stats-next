import TopBar from "@/components/top-bar/TopBar";
import { AuthProvider } from "@/lib/frontend/context/AuthContext";
import theme from "@/lib/frontend/themes/theme";
import { CssBaseline, InitColorSchemeScript, ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Box from "@mui/material/Box";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPL Stats",
  description: "Splinterlands Statistics Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <InitColorSchemeScript attribute="class" />
      </head>
      <body>
        <AppRouterCacheProvider options={{ key: "css" }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <TopBar />
              {/* pt offsets the fixed AppBar (64px). px/pb provide default page padding. */}
              <Box component="main" sx={{ pt: "64px", px: 3, pb: 3 }}>
                {children}
              </Box>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
