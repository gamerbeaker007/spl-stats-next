import SideBar from "@/components/shared/SideBar";
import TopBar from "@/components/shared/TopBar";
import { AuthProvider } from "@/lib/frontend/context/AuthContext";
import { PageTitleProvider } from "@/lib/frontend/context/PageTitleContext";
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
              <PageTitleProvider>
                <Box sx={{ display: "flex", minHeight: "100vh" }}>
                  <SideBar />
                  <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                    <TopBar />
                    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                      {children}
                    </Box>
                  </Box>
                </Box>
              </PageTitleProvider>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
