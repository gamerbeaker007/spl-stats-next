"use client";

import { Container, Typography, Paper, Button } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { MdError } from "react-icons/md";
import { Suspense } from "react";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "AccessDenied":
        return "Access denied. You are not authorized to access this application.";
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <MdError size={64} color="error" />
        <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
          Authentication Error
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {getErrorMessage()}
        </Typography>
        <Button variant="contained" onClick={() => router.push("/")} sx={{ mt: 2 }}>
          Go Home
        </Button>
      </Paper>
    </Container>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
