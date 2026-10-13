"use client";

import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import LandDeedImage from "@/components/collection/land-market/LandDeedImage";
import LandIcon from "@/components/collection/land-market/LandIcon";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import {
  LAND_TYPE_LABELS,
  getLandRarityIconUrl,
  getLandTerrainIconUrl,
  getLandTerrainLabel,
  getLandTypeIconUrl,
  capitalize,
} from "@/lib/shared/land-deed-utils";
import type { LandPurchasePlanItem } from "@/types/purchase/purchase-plan";
import {
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { MdDelete } from "react-icons/md";

interface PurchaseCartLandTableProps {
  items: LandPurchasePlanItem[];
  onRemove: (account: string, marketId: string) => void;
}

/** Land deed rows of the shared purchase cart (each deed is a unique, quantity-1 listing). */
export default function PurchaseCartLandTable({
  items,
  onRemove,
}: Readonly<PurchaseCartLandTableProps>) {
  return (
    <ScrollableTableContainer maxHeight="40vh">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell align="center">Remove</TableCell>
            <TableCell>Account</TableCell>
            <TableCell>Deed</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Land</TableCell>
            <TableCell>Seller</TableCell>
            <TableCell>USD</TableCell>
            <TableCell>DEC</TableCell>
            <TableCell>CREDITS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.account}-${item.marketId}`}>
              <TableCell align="center">
                <IconButton
                  size="small"
                  onClick={() => onRemove(item.account, item.marketId)}
                  aria-label={`Remove land ${item.location}`}
                >
                  <MdDelete />
                </IconButton>
              </TableCell>
              <TableCell>{item.account}</TableCell>
              <TableCell>
                <LandDeedImage
                  src={item.imageUrl}
                  alt={`Deed ${item.location}`}
                  sx={{ width: 64, height: 40, borderRadius: 0.5 }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {item.location}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.regionName}
                </Typography>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <LandIcon
                    src={getLandTerrainIconUrl(item.terrain)}
                    label={getLandTerrainLabel(item.terrain)}
                  />
                  {item.rarity && (
                    <LandIcon
                      src={getLandRarityIconUrl(item.rarity)}
                      label={capitalize(item.rarity)}
                    />
                  )}
                  {item.landType && (
                    <LandIcon
                      src={getLandTypeIconUrl(item.landType)}
                      label={LAND_TYPE_LABELS[item.landType]}
                    />
                  )}
                </Stack>
              </TableCell>
              <TableCell>{item.seller ?? "-"}</TableCell>
              <TableCell>
                <CurrencyAmountChip currency="USD" value={item.priceUsd} />
              </TableCell>
              <TableCell>
                <CurrencyAmountChip currency="DEC" value={item.priceDec} />
              </TableCell>
              <TableCell>
                <CurrencyAmountChip currency="CREDITS" value={item.priceCredits} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollableTableContainer>
  );
}
