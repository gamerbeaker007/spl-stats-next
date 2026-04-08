import HiveBlogContent from "@/components/hive-blog/HiveBlogContent";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";

export default function HiveBlogPage() {
  return (
    <Box>
      <HiveBlogContent />
      <Divider sx={{ my: 3 }} />
    </Box>
  );
}
