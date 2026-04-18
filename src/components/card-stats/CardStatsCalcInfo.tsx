"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { MdClose, MdInfoOutline } from "react-icons/md";

// ---------------------------------------------------------------------------
// BCX dialog section
// ---------------------------------------------------------------------------

function BcxExplanation() {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        BCX — Base Card Experience
      </Typography>
      <Typography variant="body2" paragraph>
        BCX is how many &quot;base copies&quot; a card is worth. It is derived from the raw XP value
        returned by the Splinterlands API.
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        Untamed era and newer (tier ≥ 4)
      </Typography>
      <Typography variant="body2" paragraph>
        XP and BCX are the same number — BCX = XP directly.
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        Alpha / Beta era
      </Typography>
      <Typography variant="body2" paragraph>
        XP must be divided by a per-rarity threshold value that is fetched from the{" "}
        <code>/settings</code> API endpoint. The threshold table used depends on the card&apos;s
        edition and whether it is gold:
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Era / foil</TableCell>
              <TableCell>XP table used</TableCell>
              <TableCell>Formula</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Alpha (regular)", "alpha_xp", "(XP + threshold) / threshold"],
              ["Alpha (gold)", "gold_xp", "max(XP / threshold, 1)"],
              ["Alpha-era promos (regular)", "alpha_xp", "(XP + threshold) / threshold"],
              ["Alpha-era promos (gold)", "gold_xp", "max(XP / threshold, 1)"],
              ["Beta (regular)", "beta_xp", "(XP + threshold) / threshold"],
              ["Beta (gold)", "beta_gold_xp", "max(XP / threshold, 1)"],
            ].map(([era, table, formula]) => (
              <TableRow key={era}>
                <TableCell>{era}</TableCell>
                <TableCell>
                  <code>{table}</code>
                </TableCell>
                <TableCell>
                  <code>{formula}</code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" gutterBottom>
        XP thresholds per rarity (from <code>/settings</code>)
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Table</TableCell>
              <TableCell align="right">Common</TableCell>
              <TableCell align="right">Rare</TableCell>
              <TableCell align="right">Epic</TableCell>
              <TableCell align="right">Legendary</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["alpha_xp (Alpha regular)", "20", "100", "250", "1,000"],
              ["gold_xp (Alpha gold)", "250", "500", "1,000", "2,500"],
              ["beta_xp (Beta regular)", "15", "75", "175", "750"],
              ["beta_gold_xp (Beta gold)", "200", "400", "800", "2,000"],
            ].map(([table, c, r, e, l]) => (
              <TableRow key={table}>
                <TableCell>
                  <code>{table}</code>
                </TableCell>
                <TableCell align="right">{c}</TableCell>
                <TableCell align="right">{r}</TableCell>
                <TableCell align="right">{e}</TableCell>
                <TableCell align="right">{l}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="body2" paragraph>
        Alpha cards have 1 subtracted from the raw BCX before flooring. The final value is always
        rounded down with <code>Math.floor</code>.
      </Typography>
    </>
  );
}

// ---------------------------------------------------------------------------
// CP dialog section
// ---------------------------------------------------------------------------

function CpExplanation() {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        CP — Collection Power
      </Typography>
      <Typography variant="body2" paragraph>
        CP = base CP per BCX × BCX × edition multiplier × max-level bonus.
      </Typography>
      <Typography variant="body2" paragraph>
        Foundation cards always return 0 CP. Cards with BCX = 0 also return 0.
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        Base CP per BCX (by rarity &amp; foil tier)
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rarity</TableCell>
              <TableCell align="right">Regular</TableCell>
              <TableCell align="right">Gold / Gold Arcane</TableCell>
              <TableCell align="right">Black / Black Arcane</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Common", "5", "125", "625"],
              ["Rare", "20", "500", "2,500"],
              ["Epic", "100", "2,500", "12,500"],
              ["Legendary", "500", "12,500", "62,500"],
            ].map(([rarity, reg, gold, black]) => (
              <TableRow key={rarity}>
                <TableCell>{rarity}</TableCell>
                <TableCell align="right">{reg}</TableCell>
                <TableCell align="right">{gold}</TableCell>
                <TableCell align="right">{black}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" gutterBottom>
        Edition multiplier
      </Typography>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Edition / era</TableCell>
              <TableCell align="right">Regular ×</TableCell>
              <TableCell align="right">Gold ×</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Chaos Legion and newer", "1", "1"],
              ["Untamed / Untamed rewards", "2", "4"],
              ["Untamed promos (tier 3)", "6", "12"],
              ["Alpha / Alpha-era promos", "6", "12"],
              ["Beta promos", "6", "12"],
              ["Beta", "3", "6"],
              ["Gladius", "2", "4"],
            ].map(([era, reg, gold]) => (
              <TableRow key={era}>
                <TableCell>{era}</TableCell>
                <TableCell align="right">{reg}</TableCell>
                <TableCell align="right">{gold}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" gutterBottom>
        Max-level bonus (+5%)
      </Typography>
      <Typography variant="body2" paragraph>
        <strong>Gold Arcane</strong>, <strong>Black</strong>, and <strong>Black Arcane</strong>{" "}
        cards are always at max level, so a ×1.05 bonus is always applied.
      </Typography>
      <Typography variant="body2">
        <strong>Regular</strong> and <strong>Gold</strong> cards may or may not be at max level — it
        cannot be determined from the aggregate distribution data — so no bonus is applied and the
        displayed CP may be slightly lower than the true value.
      </Typography>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export default function CardStatsCalcInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Button
            size="small"
            color="info"
            startIcon={<MdInfoOutline />}
            onClick={() => setOpen(true)}
          >
            Learn more
          </Button>
        }
      >
        CP values for <strong>regular</strong> and <strong>gold</strong> cards may deviate — it is
        not possible to determine how many of those cards are at max level. Max level cards receive
        a +5% CP bonus. For <strong>Gold Arcane</strong>, <strong>Black</strong>, and{" "}
        <strong>Black Arcane</strong> cards this bonus is already included, as these foil types are
        always at max level.
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          How BCX &amp; CP are calculated
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <BcxExplanation />
          <Divider sx={{ my: 3 }} />
          <CpExplanation />
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Source:{" "}
              <code>
                src/lib/backend/actions/card-stats/cardStatsAction.ts — determineBcx / calculateCp
              </code>
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
