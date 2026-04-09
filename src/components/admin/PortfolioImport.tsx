"use client";

import { importPortfolioCsvAction } from "@/lib/backend/actions/portfolio-import-action";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function PortfolioImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
    setResult(null);
    setErrorMsg(null);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const text = await file.text();
      const res = await importPortfolioCsvAction(text);

      if (!res.success) {
        setErrorMsg(res.error);
      } else {
        setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Portfolio CSV Import
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload the historical portfolio CSV exported from the Python project. Each row is
        transformed and upserted as a daily snapshot. Existing rows for the same (username, date)
        are overwritten.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" component="label" disabled={loading}>
              Choose CSV file
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                ref={fileRef}
                onChange={handleFileChange}
              />
            </Button>

            {fileName && (
              <Chip
                label={fileName}
                size="small"
                variant="outlined"
                onDelete={() => {
                  if (fileRef.current) fileRef.current.value = "";
                  setFileName(null);
                  setResult(null);
                  setErrorMsg(null);
                }}
              />
            )}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!fileName || loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? "Importing…" : "Import"}
            </Button>
          </Stack>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          {result && (
            <Stack spacing={1}>
              <Divider />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Imported: ${result.imported}`} color="success" size="small" />
                {result.skipped > 0 && (
                  <Chip label={`Skipped: ${result.skipped}`} color="warning" size="small" />
                )}
                {result.errors.length > 0 && (
                  <Chip label={`Errors: ${result.errors.length}`} color="error" size="small" />
                )}
              </Stack>

              {result.errors.length > 0 && (
                <Box
                  component="pre"
                  sx={{
                    p: 1,
                    fontSize: "0.75rem",
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    overflowX: "auto",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {result.errors.join("\n")}
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
