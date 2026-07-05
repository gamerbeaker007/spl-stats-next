# Feature B: Buy Missing CC Page

## Goal

Create a new **Buy Missing CC** page in `spl-stats-next`.

The page helps players plan card upgrades by:

- showing owned and unowned playable cards
- comparing current card level/CC against useful target levels
- estimating cost to upgrade cards
- selecting exact market listings needed for an upgrade
- adding those exact listings to the shared purchase plan
- purchasing missing Card Copies through the shared Feature A checkout flow

This feature is primarily an upgrade planning tool. Purchasing is the final execution step.

## Dependency on Feature A

Feature B must reuse the purchase infrastructure created by Feature A.

Do not create a second purchase dialog, cart, checkout flow, broadcast helper, or transaction verification system.

Reuse:

- `BuyCardDialog`
- `PurchasePlanItem`
- shopping cart / purchase plan state
- cart indicator
- checkout dialog
- direct `sm_market_purchase` operation builder
- Hive Keychain Active-key broadcast helper
- `waitForTransactions`
- transaction lookup/verification parser
- balance refresh
- card collection refresh

Feature B adds the `target-level` mode to `BuyCardDialog`.
The buyCardDialog need to be exetended with tabs to witch between buying method

## Terminology

- Use **CC** in all frontend labels.
- Splinterlands APIs may still use **BCX** internally.
- BCX and CC represent the same thing.
- Use `Buy CC`, not `Buy BCX`, in the UI.

## Scope

### Included

- New Buy Missing CC page.
- Account selector.
- Existing card filters.
- Bracket filters.
- Collection/upgrade table.
- Page summary estimates.
- Upgrade requirement calculations.
- Market cost estimates from grouped market data.
- `BuyCardDialog` `target-level` mode.
- Exact purchase plan construction from individual market listings.
- Reuse of Feature A checkout/purchase flow.

### Not Included

- Card combining.
- Automatic combining after purchase.
- Batch upgrade execution beyond adding exact listings to the purchase plan.
- A separate checkout implementation.
- A separate cart implementation.

Storybook setup may be done as a follow-up phase. It should not block the core Buy Missing CC page unless explicitly requested.

## Page Route and Navigation

Add a new page named:

```txt
Buy Missing CC
```

Use the route that best matches the existing app navigation conventions. If no convention is obvious, use:

```txt
/buy-missing-cc
```

Add it to navigation only if that matches existing product patterns.
Add to side bar
so in main layout Card / sub pages collection and buy missing CC

## Account Selection

The page supports two account modes.

### Monitored Account

- The user selects one monitored account.
- Upgrade planning is enabled.
- Adding to purchase plan is enabled.
- Checkout is enabled if the current login can sign for that account.

### Manual Account

- The user can enter any account name manually.
- The page becomes read-only.
- Collection analysis and estimates still work.
- Purchasing is disabled because transactions cannot be signed.

## Required API Calls

### Card Details

Use:

```ts
fetchCardDetails
```

Purpose:

- complete playable card list
- card name
- rarity
- edition/set metadata
- stats
- abilities
- valid levels

The collection table must include unowned cards. Use `fetchCardDetails` as the source of truth for the full list of playable cards, then merge the selected player's collection data into it.

### Player Collection

Use:

```ts
fetchCardCollection
```

Purpose:

- owned cards
- owned level
- owned CC
- highest owned copy
- editions
- foils

### Grouped Market Data

Use:

```ts
fetchMarketForSaleGrouped
```

Important:

- Request grouped market information for all card levels.
- Do not request only max-level cards.
- In `splinter-lands-next` (porject aslo on VsCodeProject folder), the grouped endpoint currently uses `level: "max"` in some flows; do not copy that behavior for this feature.

Use `low_price_bcx` / low price per CC to estimate:

- cost to next useful level
- cost to max level
- cost to complete selected bracket
- cost to complete max collection

These are estimates only.

### Individual Market Listings

Use:

```ts
fetchMarketListingsByCard
```

Purpose:

- exact listings
- exact quantity
- exact purchase plan
- cheapest listing selection for a chosen target level

Important:

- Do not apply a default level filter.
- Fetch all listings for the selected card/edition/foil.
- The exact purchase price is calculated only when the user opens the Buy CC dialog and builds a purchase plan.

### Settings

Use:

```ts
fetchSettings
```

Purpose:

- combine rates
- gold combine rates
- Foundations combine rates
- Alpha/Beta/Promo/Reward XP conversion rules
- edition-specific rules

public api enpoint you can validate result
https://api.splinterlands.com/settings

## Page Layout

Top:

- page summary estimates
- account selector
- existing card filters
- bracket filters
- `Show only not maxed for bracket` filter when a bracket is selected

Center:

- collection/upgrade table

Side or bottom:

- shared Purchase Plan/cart entry point from Feature A

The page should feel like a planning table, not a marketing page.

## Default Filters

On first load, use sensible defaults:

- Regular foil enabled by default.
- Modern cards enabled by default if this matches existing app defaults.

Verify current app filter defaults and preserve them where appropriate.

## Existing Card Filters

Reuse the existing shared card filter implementation in `spl-stats-next`.

Requirements:

- Do not modify the shared filter component unless necessary.
- Layer Feature B-only filters on top of the existing filter result.
- Unowned cards must respect the same filters as owned cards.

## Bracket Filters

Rename the concept to **Bracket Filters**.

Do not call them **Modern Bracket Filters** in the UI because the bracket filter must work independently from Modern/Wild filters.

The bracket filter defines a target competitive bracket.

Supported brackets:

- Novice
- Bronze
- Silver
- Gold
- Diamond
- Champion

The selector must support no bracket selected.

Implement a compact league selector using league icons if available.

## League Configuration

Store league level rules in one central configuration file.

Changing future bracket caps should only require editing this one config.

Current values:

| League   | Common | Rare | Epic | Legendary |
| ---      | ---    | ---  | ---  | ---       |
| Novice   | 1      | 1    | 1    | 1         |
| Bronze   | 1-3    | 1-3  | 1-2  | 1         |
| Silver   | 2-5    | 1-4  | 1-3  | 1-2       |
| Gold     | 4-8    | 3-7  | 2-5  | 2-3       |
| Diamond  | 6-10   | 5-8  | 4-6  | 2-4       |
| Champion | 8-10   | 6-8  | 5-6  | 3-4       |

Interpretation:

- The lower number is the minimum useful/playable level for that bracket.
- The upper number is the maximum useful level for that bracket.
- If only one number is present, minimum and maximum are the same.

## Collection Table

The table should display every playable card, not only owned cards.

Build rows from `fetchCardDetails`, then merge selected account ownership from `fetchCardCollection`.

Use a row key that avoids mixing editions:

```txt
card_detail_id + edition + foil
```

This matters because some cards can exist in multiple editions.

Support:

- sorting
- pagination
- page size 50 / 100 / 1000

Columns:

- card image
- name
- rarity icon
- set icon
- edition icon
- foil
- highest owned level
- CC inside highest owned card
- total owned CC
- bracket status
- estimated price to next useful level
- estimated price to max bracket level
- estimated price to max card level
- `Buy CC`
- `Combine`

### Unowned Cards

For cards not owned by the selected account:

- show level as `Not owned` or `0`
- show CC as `0`
- show total owned CC as `0`
- still calculate upgrade estimates
- still allow `Buy CC` for monitored accounts
- apply approximately 60% grayscale/transparent treatment to the card image
- keep the card recognizable

Unowned cards must respect all filters:

- edition
- set
- rarity
- foil
- Modern/Wild
- bracket
- search
- future filters

### Bracket Status Column

If no bracket is selected, this column remains empty.

If a bracket is selected, show one of three states.

#### Max for Bracket

The card has reached the maximum useful level for the selected bracket.

Show:

- green check icon
- label like `Max for Silver`

Example:

```txt
Silver Common level 5 = Max for Silver
```

#### In Bracket but Not Max

The card meets the minimum level for the selected bracket but has not reached the bracket max.

Show:

- warning icon
- tooltip like `Playable in Silver, but can still be upgraded to Level 5.`

Example:

```txt
Silver Common level 2 = playable, not maxed
```

#### Below Bracket

The card does not meet the minimum level for the selected bracket.

Show:

- alert icon
- tooltip like `Does not meet Silver level requirements.`

Example:

```txt
Silver Common level 1 = below bracket
```

### Show Only Not Maxed for Bracket

When a bracket is selected, provide a filter:

```txt
Show only not maxed for bracket
```

Behavior:

- show cards below bracket
- show cards in bracket but not maxed
- hide only cards already maxed for the selected bracket

## Page Summary

At the top of the page, show estimated totals.

### Total Cost to Complete Collection

Estimate the total cost required to make every displayed card max level.

Use grouped market data and `low_price_bcx`.

Display:

- estimated DEC
- estimated USD

### Total Cost to Complete Selected Bracket

Only show this when a bracket is selected.

Estimate the total cost required for every displayed card to reach the maximum useful level for the selected bracket.

Example:

```txt
Selected bracket: Silver
Estimate the cost to make every displayed card max useful level for Silver.
```

This is also an estimate based on grouped market data.

## Upgrade Calculations

Create reusable calculation services. Do not put this logic directly inside React components.

Suggested services:

```ts
calculateUpgradeRequirements()
calculateUpgradeCostEstimate()
selectCheapestListings()
buildPurchasePlan()
```

Calculations must consider:

- card detail id
- edition
- foil
- rarity
- current highest owned card level
- CC already combined into the highest owned card
- total owned CC
- target level
- missing CC
- combine rates
- edition rules

Example:

```txt
Target requires: 100 CC
Already owned: 63 CC
Missing: 37 CC
Purchase: 37 CC
```

Never purchase more CC than required.

### Combine Rates

Use `fetchSettings`.

For Untamed and newer:

- `combine_rates`
- `combine_rates_gold`

For Foundations:

- `foundations_combine_rates`
- `foundations_combine_rates_gold`

For Alpha / Beta / Promo / Reward:

- `xp_levels`
- `alpha_xp`
- `beta_xp`
- `gold_xp`
- `beta_gold_xp`

Alpha, Beta, Promo, and Reward cards follow different XP rules.

If the existing project or official implementation does not make the conversion clear, stop and ask instead of guessing.

## BuyCardDialog: `target-level` Mode

The `Buy CC` action opens the shared `BuyCardDialog` from Feature A in `target-level` mode.
Note again you can switch here between target-level and manual-listingmode

Display:

- card image
- name
- edition
- foil
- current level
- current owned CC
- current stats
- target level selector
- required additional CC
- estimated total price
- upgraded stats
- newly unlocked abilities
- exact selected market listings
- `Add to Purchase Plan` button

Behavior:

- allow upgrading directly from any current level to any valid higher level
- allow unowned cards to start from level 0 / 0 CC
- fetch all individual listings for the selected card/edition/foil
- calculate missing CC for the selected target level
- select the cheapest exact listings needed
- do not select more CC than required
- show the exact listings before adding them to the Purchase Plan
- add exact `PurchasePlanItem[]` entries to the shared purchase plan

Example:

```txt
Current: level 1, 63 CC
Target: level 10, 100 CC required
Missing: 37 CC
Selected listings must total exactly 37 CC, or the closest possible amount without exceeding 37 CC.
```

If exact fulfillment is impossible without exceeding required CC, show a clear message and let the user choose a lower target or manually inspect listings. Do not silently overbuy.

## Purchase Plan

Reuse the Feature A Purchase Plan.

Requirements:

- every selected market listing remains visible individually
- do not merge purchases into a summary row
- show card image/name
- show edition
- show foil
- show listing quantity in CC
- show individual listing price
- show seller if available
- show destination account
- allow removing individual listings

Totals:

- total CC
- estimated DEC
- estimated USD / CREDITS where available
- number of market listings

## Checkout

Reuse Feature A checkout.

Requirements:

- opening checkout shows every listing being purchased
- show destination account
- show total CC
- show estimated DEC
- show estimated USD / CREDITS where available
- if purchases belong to multiple monitored accounts, execute one transaction per account
- authenticate every transaction separately through Hive Keychain Active key
- after success, refresh balances, market data, and selected account collection
- remove completed purchases from the Purchase Plan

## Unsupported Foils

The following foils cannot currently be upgraded:

- Black
- Gold Arcane
- Black Arcane

For these cards:

- disable `Buy CC`
- disable `Combine`
- show a tooltip explaining that upgrades for this foil are not supported yet

## Combine Button

Show a disabled Combine button.

Tooltip:

```txt
Coming in a future release.
```

No combine functionality is implemented in this feature.

## Storybook Follow-Up

Do not let Storybook setup block the core feature.

As a follow-up task, set up Storybook using `splinter-lands-next` as reference and add stories for:

- ability icons
exmaple:
 ability in cardDetails abilities":[["Ambush"],[],["Stun"],
 icon https://d36mxiodymuqjm.cloudfront.net/website/abilities/ability_ambush.png
- reusable purchase components
- upgrade comparison
- ability preview
- a page showing every ability icon returned by `fetchCardDetails`

this api is public available to explore:
https://api.splinterlands.com/cards/get_details

## Acceptance Criteria

- A Buy Missing CC page exists.
- The page can analyze a monitored account.
- The page can analyze a manual account in read-only mode.
- The table includes owned and unowned playable cards.
- Unowned cards are visually distinct but still filterable and purchasable for monitored accounts.
- Existing card filters are reused.
- Bracket filters work independently from Modern/Wild filters.
- Bracket status shows maxed, playable-but-not-maxed, or below-bracket states.
- `Show only not maxed for bracket` hides only cards maxed for the selected bracket.
- Page summary shows total estimated cost to max the displayed collection.
- When a bracket is selected, page summary shows estimated cost to max the displayed cards for that bracket.
- Estimates use grouped market data and are clearly treated as estimates.
- Exact purchase planning happens only in the Buy CC dialog using individual listings.
- The Buy CC dialog uses `target-level` mode.
- Upgrade calculations account for current CC already owned.
- The selected listings never exceed the required missing CC.
- The dialog adds exact listings to the shared Purchase Plan.
- Checkout reuses Feature A purchase infrastructure.
- Successful purchase refreshes the selected account collection and balances.
- No combine functionality is implemented.
- If Alpha/Beta/Promo/Reward XP conversion is unclear, implementation stops and asks instead of guessing.
