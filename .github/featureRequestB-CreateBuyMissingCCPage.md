# Feature Specification: Buy Missing CC

## Overview

Implement a new feature called **Buy Missing CC** in the **spl-stats-next** project.

The purpose of this feature is to help players efficiently upgrade their Splinterlands card collection by:

- analyzing their current collection
- calculating the cheapest upgrade path
- estimating upgrade costs
- planning purchases
- purchasing the missing Card Copies (CC) through Hive Keychain

This feature should primarily be designed as an **upgrade planning tool**. Purchasing is simply the final execution step.

---

# Terminology

Throughout the frontend use **CC (Card Copies)**.

Splinterlands APIs still use the legacy term **BCX**.

BCX and CC represent exactly the same thing.

Frontend UI should always use **CC**.

---

# High Level Goals

The feature consists of several phases:

1. Infrastructure improvements
2. New Buy Missing CC page
3. Upgrade calculations
4. Purchase planning
5. Purchase execution

Business logic should remain separated from UI so it can later be reused for Combine functionality.

---

# Phase 1 – Infrastructure

## Transaction Lookup

Take over the transaction lookup implementation from **splinter-land-next** project (also checked out on this pc).

Replace the current implementation inside spl-stats-next.

Specifically:

- copy `lookupTransaction`
- replace usages of `fetchTransactionLookup`
- preserve existing behaviour
- improve transaction type detection

---

## Test API Support

Implement the same API switching support as splinter-land-next.

Reference:

```ts
splApiConfig.ts;
```

Requirements:

- Production API
- MAV test API
- Same configuration style as splinter-land-next

---

# New Page

Create a completely new page:

```
Buy Missing CC
```

The page consists of:

- Account selector
- Existing card filters
- Modern Bracket filters
- Collection table
- Purchase Plan

---

# Account Selection

Allow selecting:

## Monitored Account

One of the monitored accounts.

Actions are enabled.

## Manual Account

Enter any account manually.

The page becomes read-only.

Purchasing is disabled because transactions cannot be signed.

---

# Required API Calls

## Player Collection

```
fetchCardCollection
```

Used for:

- owned cards
- level
- CC
- editions
- foils

---

## Grouped Market Data

Reuse:

```
fetchMarketForSaleGrouped
```

Important:

Do **NOT** request only **max level cards** (this is currently done inside splinter-land-next).

Request grouped market information for **all card levels**.

Use:

```
low_price_bcx
```

to estimate:

- cost to next level
- cost to max level

These values are estimates only.

---

## Individual Market Listings

```
fetchMarketListingsByCard
```

Used when opening the Buy BCX dialog.

Important:

Do **NOT** use the default level filter.

Fetch all listings.

These listings are used to determine:

- cheapest purchase path
- exact listings
- exact quantity
- actual purchase plan

---

## Card Details

```
fetchCardDetails
```

Used for:

- stats
- abilities
- stat comparison

I will provide the helper for rendering ability icons.

---

## Settings

```
fetchSettings
```

Used for:

- combine rates
- XP calculations
- edition rules

---

# Page Layout

Top

- Account selector
- Existing card filters
- Modern Bracket filters

Center

Collection table

Bottom (or right side)

Purchase Plan

---

# Collection Table

Rows are grouped by:

- Card ID
- Foil

Support:

- sorting
- pagination

Pagination:

- 50
- 100
- 1000

Columns:

- Card image
- Name
- Rarity icon
- Highest owned level
- CC inside highest level card
- Total owned CC
- Set icon
- Edition icon
- Modern Bracket warning
- Estimated price to next level
- Estimated price to max level
- Buy BCX
- Combine

---

# Buy BCX Button

Enabled.

Opens the Buy BCX dialog.

---

# Combine Button

Disabled.

Tooltip:

> Coming in a future release.

No combine functionality is implemented in this feature.

---

# Existing Card Filters

Reuse the existing implementation already available inside spl-stats-next.

Do not modify the shared filter component.

---

# Modern Bracket Filters

These are frontend-only filters.

They should be layered on top of the existing filters.

Do not modify the existing shared card filter.

Implement a nice league selector using league icons.

Unlike a standard radio group it must also support:

- None selected

Supported brackets:

- Novice
- Bronze
- Silver
- Gold
- Diamond
- Champion

---

# Under-Level Detection

When a Modern Bracket is selected:

Compare every card against that bracket.

If the owned level is below the selected bracket:

Show a warning icon.

Hover tooltip should display the required levels.

---

# Additional Filter

When a Modern Bracket is active:

Provide:

```
Show only under-levelled cards
```

Cards already meeting the selected bracket should be hidden.

---

# League Configuration

League caps may be hardcoded.

However, they must exist in one central configuration file.

Changing future league caps should only require modifying this configuration.

Current values:

| League   | Common | Rare | Epic | Legendary |
| -------- | ------ | ---- | ---- | --------- |
| Novice   | 1      | 1    | 1    | 1         |
| Bronze   | 1-3    | 1-3  | 1-2  | 1         |
| Silver   | 2-5    | 1-4  | 1-3  | 1-2       |
| Gold     | 4-8    | 3-7  | 2-5  | 2-3       |
| Diamond  | 6-10   | 5-8  | 4-6  | 2-4       |
| Champion | 8-10   | 6-8  | 5-6  | 3-4       |

---

# Buy BCX Dialog

Opening Buy BCX opens an upgrade planner.

Display:

- Card image
- Name
- Edition
- Foil
- Current level
- Current owned CC
- Current stats
- Target level selector
- Required additional CC
- Estimated total price
- Upgraded stats
- Newly unlocked abilities
- Add to Purchase Plan button

Support upgrading directly from any level to any valid higher level.

Example:

Level 1 → Level 10

---

# Upgrade Calculations

The calculations must consider:

- player's highest owned card
- CC already combined into that card
- missing CC
- combine rates
- edition
- foil

Example:

Need:

100 CC

Already own:

63 CC

Purchase:

37 CC

Never purchase more CC than required.

---

# Purchase Plan

The Purchase Plan represents the **actual market purchases** that will be executed.

Do **not** merge purchases into a single summarized entry.

Every selected market listing should remain visible individually.

The user should clearly see exactly what will be purchased.

Each purchase entry should contain:

- Card image
- Card name
- Edition
- Foil
- Listing quantity (CC)
- Individual listing price
- Seller (if available)
- Remove button

At the bottom show totals:

- Total CC being purchased
- Estimated DEC
- Estimated USD
- Number of market listings

This Purchase Plan represents the exact execution plan that will later be broadcast.

---

# Checkout

Executing the Purchase Plan opens a confirmation dialog.

Display:

- every listing being purchased
- destination account
- total CC
- estimated DEC
- estimated USD

If purchases belong to multiple monitored accounts:

Execute one transaction per account.

Authenticate every transaction separately using the correct Hive Keychain Active Key.

---

# Purchasing

Reuse:

```
splBroadcast.ts
```

from splinter-land-next.

Differences:

Do **not** use onbehalf broadcasting.

Instead:

Use Hive Keychain.

Authentication:

Active Key.

The authenticated account must match the monitored account currently selected.

---

# Successful Purchase

After a successful purchase:

- invalidate caches
- refresh player collection
- refresh market data
- refresh page
- remove completed purchases from the Purchase Plan

The user should immediately see the newly purchased cards reflected in the collection.

---

# Combine Rates

Use:

```
fetchSettings
```

---

## Untamed and newer

Use:

- combine_rates
- combine_rates_gold

Simple BCX progression.

---

## Foundations

Use:

- foundations_combine_rates
- foundations_combine_rates_gold

Same behaviour with fewer levels.

---

## Alpha / Beta

Use:

- xp_levels
- alpha_xp
- beta_xp
- gold_xp
- beta_gold_xp

Alpha, Beta, Promo and Reward cards follow different XP rules.

Research the official Splinterlands implementation (or existing project code) and implement the correct conversion.

If any uncertainty remains, stop and ask instead of guessing.

---

# Unsupported Foils

The following foils cannot currently be upgraded:

- Black
- Gold Arcane
- Black Arcane

For these cards:

- Buy BCX disabled
- Combine disabled

---

# Storybook

Set up Storybook for spl-stats-next.

Use splinter-land-next as the reference.

Create stories for:

- ability icons
- reusable components
- upgrade comparison
- ability preview

Also create a page showing every ability icon returned by `fetchCardDetails`.

---

# Architecture

Follow the existing architecture used by spl-stats-next.

Keep business logic separate from React components.

Create reusable services for calculations.

Suggested services:

- `calculateUpgradeRequirements()`
- `calculateUpgradeCostEstimate()`
- `selectCheapestListings()`
- `buildPurchasePlan()`

These services should later be reusable by the Combine feature.

---

# Current Scope

Included:

- Collection analysis
- Upgrade calculations
- Upgrade planner
- Market estimation
- Purchase Plan
- Hive Keychain purchasing

Not included:

- Card combining
- Automatic combining after purchase
- Batch upgrade execution

---

# Additional Notes

- Display only market prices. Ignore market fees.
- If the player already owns a max-level copy, disable Buy BCX and Combine.
- Upgrade calculations must always take into account the CC already contained in the player's highest-level card.
- The Purchase Plan contains only purchases. Combining will be implemented in a future feature.
- After a successful purchase, refresh the player's collection immediately.
- If any implementation detail regarding Alpha/Beta XP calculations or Splinterlands rules is unclear, stop and ask instead of making assumptions.

## Expected Implementation Quality

- Reuse existing components whenever practical.
- Strong TypeScript typing throughout.
- Separate API, calculation and UI layers.
- Mobile responsive where possible.
- Follow the existing coding style of spl-stats-next.
- Prefer reusable services over feature-specific logic.
- Ask questions whenever game rules are ambiguous rather than making assumptions.

# Additional Requirements & Changes

## Collection Table

### Include Unowned Cards

The collection table should **not** only display cards owned by the selected account.

Instead, it should display **every playable card** available in Splinterlands.

Use `fetchCardDetails` as the source of truth for the complete card list.

The player's collection (`fetchCardCollection`) should then be merged into this dataset.

For cards that are **not owned**:

- Show level = 0 (or "Not Owned")
- Show CC = 0
- Show Total Owned CC = 0
- Estimated upgrade prices should still be calculated normally
- The card should still be purchasable

### Unowned Card Appearance

Cards not owned by the player should be visually distinguishable.

Requirements:

- Apply approximately **60% transparent grayscale overlay** to the card image.
- The card should remain fully visible and recognizable.
- All filtering should continue to work exactly the same as owned cards.

Unowned cards must respect every existing filter, including:

- Edition
- Set
- Rarity
- Foil
- Modern
- Bracket filters
- Search
- Any future filters

---

# Page Summary

At the very top of the page add a summary section.

Display two estimated totals.

## Total Cost to Complete Collection

Estimate the total cost required to obtain a fully maxed collection.

This is an estimate only and is based on grouped market pricing (`low_price_bcx`).

Display:

- Estimated DEC
- Estimated USD

---

## Total Cost to Complete Selected Bracket

When a Bracket Filter is selected, display an additional estimate.

Estimate the total cost required for every displayed card to reach the maximum level allowed within the selected bracket.

Example:

Selected bracket:

Silver

Estimate how much it would cost to make every card Silver-capable.

Again this is only an estimate based on grouped market pricing.

---

# Default Filters

When the page loads apply sensible defaults.

Enable by default:

- Regular Foil
- Modern cards (verify current application defaults and match them if appropriate)

The goal is to immediately present the collection most players are interested in.

---

# Bracket Filters

Rename:

**Modern Bracket Filters**

to

**Bracket Filters**

The filter should work independently from the Modern/Wild card filters.

It simply defines a target competitive bracket.

---

# Table Changes

Replace the current warning column with a new column:

**Bracket Status**

This column indicates how the selected card relates to the currently selected bracket.

If no bracket is selected:

- Column remains empty.

Otherwise determine one of three states.

## Max for Bracket

The card has reached the maximum useful level for the selected bracket.

Show:

- Green check icon

Example:

Silver bracket

Common Level 5

Status:

✓ Max for Silver

---

## In Bracket but Not Max

The card is playable in the selected bracket but is **not yet maxed for that bracket**.

Example:

Silver Common Level 2

Silver allows Common Level 2–5.

Level 2 is playable but not optimal.

Show:

- Warning icon

Tooltip:

"Playable in Silver, but can still be upgraded to Level 5."

---

## Below Bracket

The card does not meet the minimum required level for the selected bracket.

Example:

Silver Common Level 1

Show:

- Alert icon

Tooltip:

"Does not meet Silver level requirements."

---

# Show Only Under-Levelled Cards

Update the behaviour of this filter.

Previously this meant:

- Cards below the bracket.

New behaviour:

Show every card that is **not maxed for the selected bracket**.

This therefore includes both:

- Alert cards (below bracket)
- Warning cards (playable but not maxed)

Hide only cards that already have the green check (maxed for the selected bracket).

This makes the filter much more useful when planning collection upgrades.

---

# Purchase Planning

Cards that are not owned should behave exactly like owned cards.

The only difference is:

Current CC = 0

Therefore the planner should simply calculate the total CC required from zero ownership.

Everything else (pricing, purchase planning, checkout, Purchase Plan) behaves identically.

---

# Calculation Notes

The page now contains two different estimation modes.

## Collection Completion

Maximum level for every card.

## Bracket Completion

Maximum useful level for the selected bracket.

Both calculations use grouped market data and therefore provide estimates rather than exact purchase prices.

Actual purchase prices are only calculated when opening the **Buy BCX** dialog and building the **Purchase Plan** using individual market listings.
