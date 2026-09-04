"use client";

import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SupportFeature from "./SupportFeature";

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SupportDialog({ open, onClose }: Readonly<SupportDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" component="span" fontWeight="bold">
          Support and Donations
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close support dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <SupportFeature compact />
      </DialogContent>
    </Dialog>
  );
}
