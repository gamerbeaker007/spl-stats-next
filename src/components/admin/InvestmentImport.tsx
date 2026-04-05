"use client";

import { importInvestmentCsvAction } from "@/lib/backend/actions/investment-import-action";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function InvestmentImport() {
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
      const res = await importInvestmentCsvAction(text);
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
        Investment CSV Import
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Import historical investment CSV (columns: <code>date, account_name, amount</code>). To add
        or remove individual entries, use the &ldquo;Investments&rdquo; button on the Portfolio
        page.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button variant="outlined" component="label" disabled={loading}>
            Choose CSV
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              ref={fileRef}
              onChange={handleFileChange}
            />
          </Button>
          {fileName && <Chip label={fileName} size="small" onDelete={() => setFileName(null)} />}
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={loading || !fileName}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            Import
          </Button>
        </Stack>
        {errorMsg && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMsg}
          </Alert>
        )}
        {result && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Imported: ${result.imported}`} color="success" size="small" />
              <Chip label={`Skipped: ${result.skipped}`} size="small" />
            </Stack>
            {result.errors.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {result.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
