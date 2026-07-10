import TableContainer from "@mui/material/TableContainer";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

// Accepts a plain value or a responsive breakpoint map (e.g. { xs: "70vh", md: "none" }).
type HeightValue = number | string | Record<string, number | string>;

interface ScrollableTableContainerProps {
  children: ReactNode;
  maxHeight?: HeightValue;
  minHeight?: HeightValue;
  sx?: SxProps<Theme>;
}

export default function ScrollableTableContainer({
  children,
  maxHeight = "70vh",
  minHeight,
  sx,
}: Readonly<ScrollableTableContainerProps>) {
  return (
    <TableContainer
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        maxHeight,
        ...(minHeight !== undefined && { minHeight }),
        ...sx,
      }}
    >
      {children}
    </TableContainer>
  );
}
