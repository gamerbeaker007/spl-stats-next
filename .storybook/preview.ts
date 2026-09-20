import type { Preview } from "@storybook/react";
import { AccountsProvider } from "@/lib/frontend/context/AccountsContext";
import { AuthProvider } from "@/lib/frontend/context/AuthContext";
import React from "react";

const preview: Preview = {
  decorators: [
    (Story) =>
      React.createElement(
        AuthProvider,
        null,
        React.createElement(AccountsProvider, null, React.createElement(Story))
      ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "padded",
  },
};

export default preview;
