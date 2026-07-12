# Feature Request C – Card Combining

## Overview

It is time to build the **Combine** feature into the `BuyMissingCcPageClient`.

The goal is to allow players to combine cards directly from both:

- `BuyMissingCcPageClient`
- `BuyCardDialog`

The feature should clearly indicate whether combining is possible, explain why it is disabled when applicable, and provide a smooth UX during the combine transaction.

---

# Part 1 - BuyMissingCcPageClient

## New Combine column

Implement **Combine** column to the table.

The button should use an upgrade/combine icon (please suggest the best MUI icon if there is a better one).

The button should be enabled only when the selected card can actually be upgraded.

When disabled, provide a tooltip explaining why.

## Combine is NOT possible when

Disable the button when any of the following is true:

- More than one copy is currently on a wagon.
- One or more copies are part of a set.
- There are not enough copies to reach the next level.
- The card is already max level.

The tooltip should explain the first reason that prevents combining.

---

# Part 2 - Combine Dialog (new component)

Clicking the Combine button opens a new dialog.

## Header

Display:

- Card image
- Card name
- Current level

---

## Upgrade preview

Layout:

```
Current Card      ======>      Target Card
(Level X)                       (Level Y)
```

Initially the target card should show the next selectable level.

---

## Level selector

Below the preview, display every possible level.

Example:

```
1 2 3 4 5 6 7 8 9 10
```

Behavior:

- Levels below the current level are disabled.
- Current level is highlighted.
- Every level that can currently be reached is highlighted in green.

Example:

Current level = 3

Enough BCX exists for:

- Level 4
- Level 5
- Level 6
- Level 8

Then only those levels are selectable.

Selecting a level updates:

- Target card image
- BCX requirements
- Preview

---

## Invalid state

This should rarely happen because the table already disables invalid cards.

If it somehow does:

Show

```
Current Card  ======>  (empty)
```

Display a warning explaining why the card cannot be upgraded.

---

## Combine transaction

When Combine is clicked:

Send the following operation.

Example:

```json
{
  "type": "custom_json",
  "id": "sm_combine_cards",
  "json": {
    "cards": [
      "C14-769-OW0HX4CZ40",
      "C14-769-P4VD308JXS"
    ],
    "app": "splinterlands/0.7.177",
    "n": "uKDe93ivnW"
  }
}
```

The implementation should generate this payload using the selected cards.

---

## Loading animation

After the transaction is submitted:

Animate the arrow between the two cards.

Instead of a static arrow, it should visually indicate the upgrade progressing from left to right.

Ideas:

- moving arrow
- flowing particles
- pulsing upgrade animation

Nothing too fancy, but enough to clearly communicate that an upgrade is in progress.

While waiting:

- disable all controls
- show progress
- wait for transaction verification

---

## Success

After verification:

- update the dialog
- refresh the player's collection
- update all relevant UI
- update combine availability

---

# Part 3 - Storybook

Create Storybook stories covering all important dialog states.

At minimum:

- Upgrade available
- Multiple target levels available
- Already max level
- Not enough copies
- Card in set
- Wagon restriction
- Loading
- Success

---

# Part 4 - BuyCardDialog

Add a **Combine** column to the level table.

Unlike the page, this is per level.

Each level should determine independently whether it can be combined.

Use exactly the same validation rules.

Disabled buttons should explain why.

---

## Combine action

Unlike the page dialog:

Clicking Combine here should immediately perform the combine operation.

No additional dialog is required.

During combine:

- replace the button with a spinner
- wait for verification
- refresh balances
- refresh collection
- refresh level calculations

Use the same flow as the Buy action.

---

# Part 5 - BuyMissingCcPage filters

Add a new filter:

**Upgradeable Cards**

When enabled:

Only show cards whose Combine button is currently enabled.

This makes it easy to find cards that can immediately be upgraded.

---

# Architecture

Please try to reuse as much logic as possible.
Make components, beter more component then large file

Validation rules should exist in one place and be shared between:

- BuyMissingCcPageClient
- BuyCardDialog
- Storybook

The UI should simply consume the validation result rather than duplicating business logic.

Likewise, the combine transaction flow should be shared where possible.

---

# Questions / Suggestions

If you think there is a better UX, better naming, or a cleaner architecture, please propose it before implementing.

In particular, I'd appreciate suggestions on:

- Better name than **Combine**
- Better upgrade animation
- Better validation architecture
- Better dialog layout
- Opportunities to reuse existing Buy dialog components
