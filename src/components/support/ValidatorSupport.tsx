"use client";

import {
  MAX_VALIDATOR_VOTES,
  SUPPORT_VALIDATOR,
  SUPPORT_VALIDATOR_BRAND,
} from "@/constants/support";
import { getValidatorVotes } from "@/lib/backend/actions/support-actions";
import type { ValidatorVote } from "@/lib/backend/api/spl/spl-validator-api";
import { broadcastSupportOperation } from "@/lib/frontend/supportBroadcast";
import {
  buildApproveValidatorOp,
  buildUnapproveValidatorOp,
} from "@/lib/shared/support-op-builders";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";

interface ValidatorSupportProps {
  username: string | null;
  authLoading: boolean;
  onMessage: (message: string, severity?: "success" | "error" | "info" | "warning") => void;
}

type VotesState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "ready"; votes: ValidatorVote[] };

export default function ValidatorSupport({
  username,
  authLoading,
  onMessage,
}: Readonly<ValidatorSupportProps>) {
  const [state, setState] = useState<VotesState>({ kind: "idle" });
  const [pendingValidator, setPendingValidator] = useState<string | null>(null);

  const refreshVotes = useCallback(async () => {
    if (!username) {
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "loading" });
    const result = await getValidatorVotes();
    if (result.error) {
      setState({ kind: "error", error: result.error });
      return;
    }

    setState({ kind: "ready", votes: result.votes });
  }, [username]);

  useEffect(() => {
    if (!authLoading && username) {
      void getValidatorVotes().then((result) => {
        if (result.error) {
          setState({ kind: "error", error: result.error });
          return;
        }
        setState({ kind: "ready", votes: result.votes });
      });
      return;
    }

    if (!authLoading && !username) {
      void Promise.resolve().then(() => {
        setState({ kind: "idle" });
      });
    }
  }, [authLoading, username]);

  const waitForVotes = useCallback(async (isVerified: (votes: ValidatorVote[]) => boolean) => {
    const maxAttempts = 15;
    const delayMs = 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const refreshed = await getValidatorVotes();

      if (!refreshed.error) {
        setState({ kind: "ready", votes: refreshed.votes });
        if (isVerified(refreshed.votes)) {
          return true;
        }
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return false;
  }, []);

  const voteForSupportValidator = async () => {
    if (!username) return;

    setPendingValidator(SUPPORT_VALIDATOR);
    const result = await broadcastSupportOperation(
      username,
      buildApproveValidatorOp(username, SUPPORT_VALIDATOR),
      "active"
    );

    if (!result.success) {
      onMessage(result.error ?? "Vote was cancelled or failed", "error");
      setPendingValidator(null);
      return;
    }

    const verified = await waitForVotes((votes) =>
      votes.some((vote) => vote.validator.toLowerCase() === SUPPORT_VALIDATOR.toLowerCase())
    );

    if (verified) {
      onMessage(`Vote for ${SUPPORT_VALIDATOR_BRAND} was recorded.`, "success");
    } else {
      onMessage("Vote was broadcast, but validator data is still syncing.", "info");
      await refreshVotes();
    }

    setPendingValidator(null);
  };

  const unvoteValidator = async (validator: string) => {
    if (!username) return;

    setPendingValidator(validator);
    const result = await broadcastSupportOperation(
      username,
      buildUnapproveValidatorOp(username, validator),
      "active"
    );

    if (!result.success) {
      onMessage(result.error ?? `Unvote ${validator} failed`, "error");
      setPendingValidator(null);
      return;
    }

    const verified = await waitForVotes(
      (votes) => !votes.some((vote) => vote.validator.toLowerCase() === validator.toLowerCase())
    );

    if (verified) {
      onMessage(`Unvoted ${validator}`, "success");
    } else {
      onMessage("Unvote was broadcast, but validator data is still syncing.", "info");
      await refreshVotes();
    }

    setPendingValidator(null);
  };

  const renderBody = () => {
    if (!username && !authLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title="Log in first to vote.">
            <span>
              <Button variant="contained" size="large" disabled startIcon={<HowToVoteIcon />}>
                Vote for {SUPPORT_VALIDATOR_BRAND}
              </Button>
            </span>
          </Tooltip>
        </Box>
      );
    }

    if (authLoading || state.kind === "loading") {
      return (
        <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (state.kind === "error") {
      return <Alert severity="error">Could not load validator votes: {state.error}</Alert>;
    }

    if (state.kind !== "ready") return null;

    const alreadyVoted = state.votes.some(
      (vote) => vote.validator.toLowerCase() === SUPPORT_VALIDATOR.toLowerCase()
    );

    if (alreadyVoted) {
      return (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <CheckCircleIcon color="success" sx={{ mt: 0.2 }} />
          <Typography>
            You already support <strong>{SUPPORT_VALIDATOR_BRAND}</strong> through validator voting.
          </Typography>
        </Box>
      );
    }

    const reachedLimit = state.votes.length >= MAX_VALIDATOR_VOTES;

    if (!reachedLimit) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            size="large"
            onClick={voteForSupportValidator}
            disabled={pendingValidator !== null}
            startIcon={
              pendingValidator ? <CircularProgress size={16} color="inherit" /> : <HowToVoteIcon />
            }
          >
            Vote for {SUPPORT_VALIDATOR_BRAND}
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          You have reached the {MAX_VALIDATOR_VOTES}-validator limit. Unvote one validator first,
          then vote for <strong>{SUPPORT_VALIDATOR_BRAND}</strong>.
        </Alert>
        <Divider sx={{ mb: 1 }} />
        <List dense disablePadding>
          {state.votes.map((vote) => (
            <ListItem
              key={vote.validator}
              secondaryAction={
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  disabled={pendingValidator !== null}
                  onClick={() => unvoteValidator(vote.validator)}
                  startIcon={
                    pendingValidator === vote.validator ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                >
                  Unvote
                </Button>
              }
            >
              <ListItemText primary={vote.validator} secondary={`Weight: ${vote.vote_weight}`} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Button variant="contained" size="large" disabled startIcon={<HowToVoteIcon />}>
            Vote for {SUPPORT_VALIDATOR_BRAND}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <HowToVoteIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Support {SUPPORT_VALIDATOR_BRAND}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Support <strong>{SUPPORT_VALIDATOR_BRAND}</strong> by voting for {SUPPORT_VALIDATOR}
          &apos;s validator .
        </Typography>

        {renderBody()}
      </CardContent>
    </Card>
  );
}
