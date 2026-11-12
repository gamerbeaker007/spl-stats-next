"use client";

import AddInvestmentDialog from "@/components/portfolio/AddInvestmentDialog";
import OtherAssetsChart from "@/components/portfolio/OtherAssetsChart";
import PortfolioDataState from "@/components/portfolio/PortfolioDataState";
import PortfolioTotalChart from "@/components/portfolio/PortfolioTotalChart";
import SpsChart from "@/components/portfolio/SpsChart";
import { usePortfolioHistory } from "@/hooks/portfolio/usePortfolioHistory";
import { usePortfolio } from "@/lib/frontend/context/PortfolioContext";
import { useTheme } from "@/lib/frontend/context/ThemeSetup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { MdAddCircleOutline } from "react-icons/md";

/** /portfolio — total value vs. investments, SPS and other asset history + investments dialog. */
export default function PortfolioValuePage() {
  const { allAccounts, selectedAccounts, overview } = usePortfolio();
  const { theme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const history = usePortfolioHistory(selectedAccounts);

  // Investments changed: refresh the invested total + cumulative line in the background.
  const handleInvestmentsChanged = () => {
    void overview.refetch({ silent: true });
    void history.refetch({ silent: true });
  };

  return (
    <Box>
      <PortfolioDataState data={history.data} loading={history.loading} error={history.error}>
        {(data) => (
          <Stack spacing={4}>
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="h6">Portfolio Value History</Typography>
                <Button
                  variant="outlined"
                  startIcon={<MdAddCircleOutline />}
                  onClick={() => setDialogOpen(true)}
                >
                  Investments
                </Button>
              </Stack>
              <PortfolioTotalChart
                history={data.history}
                cumulativeInvestments={data.cumulativeInvestments}
                theme={theme}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                SPS History
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Left axis: USD value. Right axis: quantity (solid = liquid, dashed = staked).
              </Typography>
              <SpsChart history={data.history} theme={theme} />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                Other Assets History
              </Typography>
              <OtherAssetsChart history={data.history} theme={theme} />
            </Box>
          </Stack>
        )}
      </PortfolioDataState>

      <AddInvestmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        selectedAccounts={selectedAccounts}
        accounts={allAccounts}
        onChanged={handleInvestmentsChanged}
      />
    </Box>
  );
}
