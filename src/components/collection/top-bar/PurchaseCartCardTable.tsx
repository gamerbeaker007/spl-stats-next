"use client";

import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import type { CardPurchasePlanItem } from "@/types/purchase/purchase-plan";
import { IconButton, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { MdDelete } from "react-icons/md";
import { getFoilLabel } from "@/lib/shared/card-utils";

interface PurchaseCartLandTableProps {
  items: CardPurchasePlanItem[];
  onRemove: (account: string, marketId: string) => void;
}

/** Land deed rows of the shared purchase cart (each deed is a unique, quantity-1 listing). */
export default function PurchaseCartCardTable({
  items,
  onRemove,
}: Readonly<PurchaseCartLandTableProps>) {
  return (
    <ScrollableTableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell align="center">Remove</TableCell>
            <TableCell>Account</TableCell>
            <TableCell>Card</TableCell>
            <TableCell>Edition</TableCell>
            <TableCell>Foil</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>UID</TableCell>
            <TableCell>CC</TableCell>
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
                  aria-label="Remove listing"
                >
                  <MdDelete />
                </IconButton>
              </TableCell>
              <TableCell>{item.account}</TableCell>
              <TableCell>{item.cardName}</TableCell>
              <TableCell>{item.edition}</TableCell>
              <TableCell>{getFoilLabel(item.foil)}</TableCell>
              <TableCell>{item.level}</TableCell>
              <TableCell>{item.uid ?? "-"}</TableCell>
              <TableCell>{item.cc}</TableCell>
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
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={12}>No listings selected.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollableTableContainer>
  );
}
