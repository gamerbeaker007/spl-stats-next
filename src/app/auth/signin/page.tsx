"use client";

import { Container, Typography, Paper, Button, Box } from "@mui/material";
import { signIn } from "next-auth/react";
import { MdLogin } from "react-icons/md";

export default function SignInPage() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Sign In
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Sign in with your GitHub account to access the dashboard
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<MdLogin />}
            onClick={() => signIn("github", { callbackUrl: "/" })}
            fullWidth
          >
            Sign in with GitHub
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
