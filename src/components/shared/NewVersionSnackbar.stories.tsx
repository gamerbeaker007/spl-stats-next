import type { Meta, StoryObj } from "@storybook/react";
import { NewVersionSnackbarView } from "./NewVersionSnackbar";

const meta: Meta<typeof NewVersionSnackbarView> = {
  title: "Shared/NewVersionSnackbar",
  component: NewVersionSnackbarView,
  args: {
    open: true,
    onReload: () => console.log("reload"),
    onDismiss: () => console.log("dismiss"),
  },
};

export default meta;
type Story = StoryObj<typeof NewVersionSnackbarView>;

export const Open: Story = {};
