"use client";

import { registerGuestTermsPromptHandler } from "@/lib/frontend/guest-terms-ack";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface PromptDecision {
  accepted: boolean;
  dontShowAgain: boolean;
}

export default function GuestTermsBroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const resolverRef = useRef<((decision: PromptDecision) => void) | null>(null);

  useEffect(() => {
    return registerGuestTermsPromptHandler(async () => {
      setDontShowAgain(false);
      setOpen(true);
      return new Promise<PromptDecision>((resolve) => {
        resolverRef.current = resolve;
      });
    });
  }, []);

  const resolvePrompt = (decision: PromptDecision) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    resolve?.(decision);
  };

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current({ accepted: false, dontShowAgain: false });
        resolverRef.current = null;
      }
    };
  }, []);

  return (
    <Dialog open={open} onClose={() => resolvePrompt({ accepted: false, dontShowAgain: false })}>
      <DialogTitle>Accept Terms to continue</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            You&apos;re currently using this service as a guest. <br />
            By continuing, you agree to our{" "}
            <Link
              suppressHydrationWarning
              href="https://spl-stats.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>
            .
          </Typography>

          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                size="small"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
              />
            }
            label="Do not show again"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          size="small"
          onClick={() => resolvePrompt({ accepted: false, dontShowAgain: false })}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => resolvePrompt({ accepted: true, dontShowAgain })}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
