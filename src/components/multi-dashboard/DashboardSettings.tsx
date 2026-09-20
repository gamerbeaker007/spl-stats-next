"use client";

import {
  DASHBOARD_CATEGORY_GROUPS,
  getCategoriesInGroup,
  type MultiAccountDashboardCategories,
} from "@/lib/shared/dashboard-categories";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  config: MultiAccountDashboardCategories;
  onSave: (categories: MultiAccountDashboardCategories) => Promise<void>;
}

export function DashboardSettings({ open, onClose, config, onSave }: Props) {
  const [draft, setDraft] = useState<MultiAccountDashboardCategories>(config);
  const [saving, setSaving] = useState(false);

  // Keep draft in sync when config prop changes (e.g. initial load completes)
  useEffect(() => {
    setDraft(config);
  }, [config]);

  const toggle = (id: keyof MultiAccountDashboardCategories) => {
    setDraft((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allSelected = Object.values(draft).every(Boolean);

  const toggleAll = () => {
    setDraft((prev) => {
      const nextValue = !Object.values(prev).every(Boolean);
      const next = { ...prev };
      for (const key of Object.keys(next) as (keyof MultiAccountDashboardCategories)[]) {
        next[key] = nextValue;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDraft(config);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Dashboard Settings</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which information to show on each player card. Disabled sections are not loaded.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Button variant="outlined" size="small" onClick={toggleAll}>
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </Box>

        {DASHBOARD_CATEGORY_GROUPS.map((group, idx) => {
          const defs = getCategoriesInGroup(group);
          if (defs.length === 0) return null;
          return (
            <Box key={group} sx={{ mb: 2 }}>
              {idx > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                {group}
              </Typography>
              {defs.map((def) => (
                <FormControlLabel
                  key={def.id}
                  control={
                    <Checkbox
                      checked={draft[def.id]}
                      onChange={() => toggle(def.id)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{def.label}</Typography>}
                  sx={{ display: "flex", ml: 0 }}
                />
              ))}
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
