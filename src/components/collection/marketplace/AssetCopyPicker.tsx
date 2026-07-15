"use client";

import type { OwnedAssetInstance } from "@/types/marketplace-assets";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import { useMemo, useState } from "react";

const PAGE_SIZE = 5;

interface AssetCopyPickerProps {
  instances: OwnedAssetInstance[];
  loading: boolean;
  selectedUids: string[];
  onToggle: (uid: string) => void;
  /** Show the delist column + button for listed copies (list dialog only). */
  showDelist?: boolean;
  onDelist?: (listingItemId: number) => void;
  delistingId?: number | null;
  disabled?: boolean;
}

/**
 * Paginated checkbox list of a music track's owned copies. Music lists/transfers
 * operate on specific instance uids, so the user picks copies here; already-listed
 * copies aren't selectable but can be delisted.
 */
export default function AssetCopyPicker({
  instances,
  loading,
  selectedUids,
  onToggle,
  showDelist = false,
  onDelist,
  delistingId,
  disabled = false,
}: Readonly<AssetCopyPickerProps>) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(instances.length / PAGE_SIZE));
  // Clamp during render (instances can shrink after a list/delist) instead of in an effect.
  const safePage = Math.min(page, pageCount - 1);

  const pagedInstances = useMemo(
    () => instances.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [instances, safePage]
  );

  const selected = useMemo(() => new Set(selectedUids), [selectedUids]);

  if (!loading && instances.length === 0) {
    return <Alert severity="info">You do not own any copies of this item.</Alert>;
  }
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Item Id</TableCell>
            <TableCell>Status</TableCell>
            {showDelist && <TableCell align="right">Listing</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedInstances.map((instance) => {
            const isSelectable = instance.actionable && !disabled;
            return (
              <TableRow key={instance.uid} hover selected={selected.has(instance.uid)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selected.has(instance.uid)}
                    disabled={!isSelectable}
                    onChange={() => onToggle(instance.uid)}
                  />
                </TableCell>
                <TableCell>{instance.uid}</TableCell>
                <TableCell>
                  {instance.listed ? (
                    <Chip
                      size="small"
                      color="warning"
                      label={instance.price !== null ? `Listed @ ${instance.price}` : "Listed"}
                    />
                  ) : instance.inUse ? (
                    <Chip size="small" label="In use" />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="Available" />
                  )}
                </TableCell>
                {showDelist && (
                  <TableCell align="right">
                    {instance.listed && instance.listingItemId !== null && onDelist ? (
                      <Button
                        size="small"
                        color="warning"
                        disabled={disabled || delistingId === instance.listingItemId}
                        onClick={() => onDelist(instance.listingItemId as number)}
                      >
                        {delistingId === instance.listingItemId ? "Delisting..." : "Delist"}
                      </Button>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {pagedInstances.length === 0 && (
            <TableRow>
              <TableCell colSpan={showDelist ? 4 : 3} align="center">
                {loading ? "Loading your copies..." : "No copies."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={instances.length}
        page={safePage}
        onPageChange={(_event, next) => setPage(next)}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
      />
    </TableContainer>
  );
}
