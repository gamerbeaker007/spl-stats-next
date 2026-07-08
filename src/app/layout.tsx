import NavShell from "@/components/nav/NavShell";
import TestModeChip from "@/components/test-mode/TestModeChip";
import { AccountsProvider } from "@/lib/frontend/context/AccountsContext";
import { AuthProvider } from "@/lib/frontend/context/AuthContext";
import { PurchasePlanProvider } from "@/lib/frontend/context/PurchasePlanContext";
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
              <AccountsProvider>
                <PurchasePlanProvider>
                  <NavShell>{children}</NavShell>
                </PurchasePlanProvider>
              </AccountsProvider>
            </AuthProvider>
            <TestModeChip />
          </ThemeSetup>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
