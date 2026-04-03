import NavShell from "@/components/nav/NavShell";
import { AuthProvider } from "@/lib/frontend/context/AuthContext";
import { ThemeSetup } from "@/lib/frontend/context/ThemeSetup";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
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
      <body>
        <AppRouterCacheProvider>
          <ThemeSetup>
            <AuthProvider>
              <NavShell>{children}</NavShell>
            </AuthProvider>
          </ThemeSetup>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
