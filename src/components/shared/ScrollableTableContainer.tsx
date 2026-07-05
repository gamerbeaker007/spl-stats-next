import TableContainer from "@mui/material/TableContainer";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

interface ScrollableTableContainerProps {
  children: ReactNode;
  maxHeight?: number | string;
  sx?: SxProps<Theme>;
}

export default function ScrollableTableContainer({
  children,
  maxHeight = "70vh",
  sx,
}: Readonly<ScrollableTableContainerProps>) {
  return (
    <TableContainer
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        maxHeight,
        ...sx,
      }}
    >
      {children}
    </TableContainer>
  );
}
