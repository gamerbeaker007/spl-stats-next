import Tab, { type TabProps } from "@mui/material/Tab";
import { styled } from "@mui/material/styles";

const GlowingTab = styled(Tab)<TabProps>(({ theme }) => ({
  position: "relative",
  transition: "all 0.2s ease-in-out",
  backgroundColor: "var(--mui-palette-background-default)",
  fontSize: 13,
  minHeight: 40,
  padding: "8px 16px",
  textTransform: "none",
  fontWeight: 500,

  // Hover radial glow
  "&:hover::before": {
    content: '""',
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 80,
    height: 28,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background: `radial-gradient(ellipse, ${theme.palette.primary.light} 0%, transparent 70%)`,
    zIndex: 0,
    pointerEvents: "none",
    opacity: 0.5,
  },

  // Selected: diamond underline marker
  "&.Mui-selected::after": {
    content: '""',
    position: "absolute",
    bottom: -4,
    left: "50%",
    transform: "translateX(-50%) rotate(45deg)",
    width: 8,
    height: 8,
    zIndex: 1,
    backgroundColor: theme.palette.primary.main,
  },
}));

export default GlowingTab;
