"use client";

import { importBattleCsvAction } from "@/lib/backend/actions/battle-import-action";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";

const CHUNK_SIZE = 1000;

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function BattleImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
    setResult(null);
    setErrorMsg(null);
    setProgress(null);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setErrorMsg(null);
    setProgress(null);

    try {
      const text = await file.text();
      const allLines = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter((l) => l.trim() !== "");

      const header = allLines[0];
      const dataLines = allLines.slice(1);
      const totalChunks = Math.max(1, Math.ceil(dataLines.length / CHUNK_SIZE));

      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        setProgress({ current: i + 1, total: totalChunks });
        const chunk = dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkCsv = [header, ...chunk].join("\n");
        const rowOffset = i * CHUNK_SIZE;

        const res = await importBattleCsvAction(chunkCsv, rowOffset);
        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
        totalImported += res.imported;
        totalSkipped += res.skipped;
        allErrors.push(...res.errors);
      }

      setResult({ imported: totalImported, skipped: totalSkipped, errors: allErrors });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Battle History CSV Import
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload either the <strong>battle</strong> CSV (player team — has winner/result columns) or
        the <strong>losing</strong> CSV (opponent team). The format is auto-detected from the
        headers. Existing rows for the same (battleId, account, team, position) are overwritten.
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

          {progress && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Importing chunk {progress.current} / {progress.total}…
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(progress.current / progress.total) * 100}
                sx={{ mt: 0.5 }}
              />
            </Box>
          )}

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
