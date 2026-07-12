# Feature: Skin Collection and Marketplace Management

Implement a new collection feature that allows users to:

* View all Splinterlands card skins
* See which skins they own
* View current marketplace availability and pricing
* Buy skins using DEC or Credits
* Transfer owned skins to another player
* List owned skins for sale
* Reuse existing collection balances, account selection, transaction handling, and UI patterns

The implementation should remain simple, reusable, strongly typed, and consistent with the existing `/collection` architecture.
Make a new page under collectio/skins

---

## Primary Goal

Create a new page under the collection section, for example:

```text
/collection/skins
```

The page should show every card that has one or more skins.

For each card:

1. Show the standard card version
2. Show all available skins next to it
3. Clearly indicate which standard cards and skins the selected account owns
4. Show marketplace information for each skin
5. Allow the user to buy, transfer, or list skins

---

# 1. Asset API

Use the following endpoint to retrieve skin information:

```http
GET https://vapi.splinterlands.com/market/landing?player={player}&assets=SKINS
```

Example:

```http
GET https://vapi.splinterlands.com/market/landing?player=beaker007&assets=SKINS
```

Example response:

```json
{
  "status": "success",
  "data": {
    "assets": [
      {
        "assetName": "SKINS",
        "assetDescription": "Player Skins",
        "detailId": "1",
        "detailName": "Goblin Shaman Skin - splinterstorm",
        "detailImage": "https://d36mxiodymuqjm.cloudfront.net/cards_v2.2/splinterstorm/Goblin%20Shaman.png",
        "detailIcon": "https://d36mxiodymuqjm.cloudfront.net/cards_battle_mobile/splinterstorm/Goblin%20Shaman.png",
        "detailFilterIcon": "https://d36mxiodymuqjm.cloudfront.net/cards_battle_mobile/splinterstorm/Goblin%20Shaman.png",
        "detailDescription": "Goblin Shaman Splinterstorm Skin for sale in the Shop. 1,000 copies were available for purchase.",
        "detailGroup": "splinterstorm",
        "detailRarity": 1,
        "numCirculation": 1000,
        "numOwned": 0,
        "numListed": 13,
        "prices": [
          {
            "currency": "USD",
            "minPrice": 3
          }
        ]
      }
    ]
  }
}
```

## Important mapping

`detailId` relates to the Splinterlands `card_detail_id`.

Confirm whether it can safely be parsed as a number and used directly as the card detail ID.

Do not scatter this conversion throughout the UI. Normalize the API response in one place.

---

# 2. Generalize the Asset API

Although this page initially uses `SKINS`, the `assets` parameter may also support other asset types such as:

```text
MUSIC
```

Create a reusable abstraction instead of building a skins-only API function.

Suggested direction:

```ts
export const marketplaceAssetNames = ["SKINS", "MUSIC"] as const;

export type MarketplaceAssetName =
  (typeof marketplaceAssetNames)[number];
```

Possible API function:

```ts
getMarketplaceLandingAssets({
  player,
  assetName,
});
```

Do not over-engineer support for unknown future asset types.

The abstraction should make adding another known asset type straightforward.

---

# 3. Types and Response Validation

Create proper types for:

* Marketplace landing response
* Marketplace asset
* Marketplace asset price
* Normalized skin item
* Skin grouping by card detail ID
* Buy operation payload
* Transfer operation payload
* Marketplace listing payload

Do not use `any`.

Validate or safely normalize fields that arrive as strings but represent numeric IDs.

Example fields:

```ts
detailId: string;
numCirculation: number;
numOwned: number;
numListed: number;
```

The normalized model should expose an explicit numeric `cardDetailId`.

---

# 4. Reuse Existing Collection Components

Reuse the existing account selection used by:

```text
/collection/card
/collection/buy-missing-cc
```

Do not create another independent account-selection implementation.

Reuse the existing top balance section from those collection pages.

The page should behave consistently with the existing collection tools regarding:

* Selected account
* Monitored accounts
* Logged-in account
* Local storage
* Balance loading
* Account switching
* Loading states
* Error states

Review the current collection page architecture before deciding where the new page and shared code should live.

---

# 5. Player Card Ownership

Use the cached player collection function:

```ts
getDetailedPlayerCardCollectionCached
```

Use it to determine whether the selected account owns the standard card associated with each skin.

The standard card is linked using:

```ts
skin.cardDetailId === card.card_detail_id
```

## Standard card image

The skin response contains an image such as:

```text
https://d36mxiodymuqjm.cloudfront.net/cards_v2.2/splinterstorm/Goblin%20Shaman.png
```

The standard card image would be:

```text
https://d36mxiodymuqjm.cloudfront.net/cards_v2.2/Goblin%20Shaman.png
```

Do not rely on fragile string replacement unless there is no existing card-image utility.

Prefer existing card detail data or shared image helpers to resolve the standard card image.

---

# 6. Page Layout

The page does not have to use a traditional table.

A grouped card layout is likely more suitable.

Each group represents one base card:

```text
[Standard card] [Skin 1] [Skin 2] [Skin 3]
```

## Standard card

Show the standard card first.

When the selected account does not own the standard card:

* Keep it visible
* Gray it out
* Clearly show that it is not owned

When the account owns it:

* Show it normally
* Optionally show the owned copy count when already available from the player collection model

## Skin cards

Show every available skin next to the standard card.

When the user does not own a skin:

* Keep the skin visible
* Gray it out slightly
* Keep marketplace actions available when listings exist

When the user owns the skin:

* Show it normally
* Show the owned quantity
* Enable transfer and list actions

The layout must remain usable on smaller screens.

Use horizontal scrolling or a responsive wrapping layout where appropriate.

Avoid rendering extremely large components with too many props.

---

# 7. Local Filters

Add at least the following local filter:

```text
Owned skins only
```

When enabled:

* Hide cards for which the selected account owns no skins
* A card group remains visible when at least one skin in the group has `numOwned > 0`

This should be a client-side filter over already loaded skin data.

Do not trigger an API reload when toggling this filter.

Structure the filter state so additional local filters can be added later without creating unnecessary complexity.

---

# 8. Sorting

Provide a simple and useful default sorting strategy.

Recommended default:

1. Card name ascending
2. Skin name ascending within each card group

Consider adding only clearly useful sort options, such as:

* Card name
* Owned first
* Lowest market price
* Most listed

Do not add excessive sorting functionality in the initial implementation.

---

# 9. Skin Card Content

Each skin card should contain three sections.

## Top: Marketplace information

Show:

```ts
numCirculation
numListed
prices
```

Example display:

```text
Circulation: 1,000
Listed: 13
From: $3.00
```

Handle missing prices and zero listings cleanly.

Do not assume the first price entry is always USD without checking its currency.

For this feature, the marketplace list operation uses USD prices, but the purchase operation may use DEC or Credits.

## Middle: Skin image

Render:

```ts
detailImage
```

Use the existing card image presentation style where possible.

Include appropriate alt text based on `detailName`.

## Bottom: Ownership and actions

Show:

```text
Owned: {numOwned}
```

Actions:

* Buy with DEC
* Buy with Credits
* Transfer
* List for sale

Only enable actions when their requirements are satisfied.

---

# 10. Buying Skins

Review the existing `BuyCardDialog`.

Reuse its existing logic and UI patterns where appropriate, especially:

* DEC pricing
* Credits pricing
* Balance validation
* Currency buttons
* Transaction submission
* Confirmation display
* Transaction verification
* Error handling

Do not duplicate price conversion logic.

Extract shared pricing or purchase helpers only where there is genuine reusable logic.

## Purchase broadcast

Example operation:

```json
{
  "operations": [
    [
      "custom_json",
      {
        "required_auths": ["beaker007"],
        "required_posting_auths": [],
        "id": "sm_marketplace_purchase",
        "json": "{\"items\":[{\"listingItemId\":2599174,\"quantity\":1,\"currency\":\"DEC\",\"estimatedCost\":564.792}],\"app\":\"splinterlands/0.7.177\",\"n\":\"lwLzRt22qP\"}"
      }
    ]
  ]
}
```

The application should construct the custom JSON payload, not the complete signed Hive transaction wrapper.

Expected logical payload:

```ts
interface MarketplacePurchasePayload {
  items: Array<{
    listingItemId: number;
    quantity: number;
    currency: "DEC" | "CREDITS";
    estimatedCost: number;
  }>;
  app: string;
  n: string;
}
```

Verify the actual marketplace listing data source required to obtain:

```ts
listingItemId
price
available quantity
```

The landing response only shows aggregate marketplace information, so do not assume it contains enough information to execute a purchase.

Find and reuse the existing marketplace listing API used by `BuyCardDialog` if it supports these assets.

If skins require a different listing endpoint, isolate that difference behind a reusable marketplace API function.

## Buy validation

Before broadcasting:

* Ensure an account is selected
* Ensure the selected account is authorized to transact
* Ensure a valid listing exists
* Ensure the quantity is valid
* Ensure the estimated cost is current
* Ensure the selected account has enough DEC or Credits
* Prevent duplicate submissions while processing

Show the selected listing and calculated cost in the confirmation step.

---

# 11. Transfer Skin Dialog

Add a transfer action for owned skins.

The dialog should contain:

* Skin name
* Available owned quantity
* Recipient account name
* Quantity
* Confirmation summary
* Transaction progress and verification

## Validation

* Recipient is required
* Normalize the recipient name
* Recipient cannot be the same as the sender
* Quantity must be an integer
* Quantity must be at least `1`
* Quantity cannot exceed `numOwned`
* Disable submission while processing

## Transfer broadcast

Example:

```json
{
  "operations": [
    [
      "custom_json",
      {
        "required_auths": ["beaker007"],
        "required_posting_auths": [],
        "id": "sm_transfer_skins",
        "json": "{\"to\":\"shinoumonk\",\"skins\":[{\"skin\":\"Spooky\",\"card_detail_id\":767,\"qty\":1}],\"app\":\"splinterlands/0.7.177\",\"n\":\"xdwAzSGN5d\"}"
      }
    ]
  ]
}
```

Expected logical payload:

```ts
interface TransferSkinsPayload {
  to: string;
  skins: Array<{
    skin: string;
    card_detail_id: number;
    qty: number;
  }>;
  app: string;
  n: string;
}
```

## Important skin identifier

The transfer payload uses:

```ts
skin: "Spooky"
```

Determine which API field maps to this value.

Do not guess whether it is:

```ts
detailGroup
detailName
detailId
```

Trace existing Splinterlands payloads or available API data and create an explicit normalized field such as:

```ts
skinIdentifier
```

If the landing API does not provide the required identifier directly, document the missing mapping and locate the correct data source before implementing the broadcast.

---

# 12. List Skin for Sale Dialog

Add a list-for-sale action for owned skins.

The dialog should contain:

* Skin name
* Owned quantity
* Quantity to list
* USD price per item
* Total listing value
* Confirmation summary
* Transaction progress and verification

## Validation

* Quantity must be an integer
* Quantity must be at least `1`
* Quantity cannot exceed `numOwned`
* Price must be greater than `0`
* Price must be represented safely as a numeric USD amount
* Prevent duplicate submissions while processing

Clarify in the UI whether the entered price is:

```text
Price per skin
```

Do not leave this ambiguous.

## Listing broadcast

Example:

```json
{
  "operations": [
    [
      "custom_json",
      {
        "required_auths": ["beaker007"],
        "required_posting_auths": [],
        "id": "sm_marketplace_list",
        "json": "{\"assetName\":\"SKINS\",\"currency\":\"USD\",\"items\":[{\"quantity\":1,\"price\":100,\"itemId\":\"75\"}],\"app\":\"splinterlands/0.7.177\",\"n\":\"M0UT2MzCKT\"}"
      }
    ]
  ]
}
```

Expected logical payload:

```ts
interface MarketplaceListPayload {
  assetName: "SKINS";
  currency: "USD";
  items: Array<{
    quantity: number;
    price: number;
    itemId: string;
  }>;
  app: string;
  n: string;
}
```

Determine whether:

```ts
itemId === detailId
```

Do not assume this without verifying it from the API behavior or existing implementation.

---

# 13. Transaction Progress Component

The current component is named:

```ts
PurchaseTxProgressPanel
```

It is now also needed for:

* Skin purchases
* Skin transfers
* Skin listings
* Potentially other non-purchase transactions

Review the component and rename it to something generic, for example:

```ts
TransactionProgressPanel
```

or:

```ts
TransactionValidationPanel
```

Prefer `TransactionProgressPanel` if it displays the full lifecycle:

```text
idle
signing
submitted
verifying
verified
failed
```

Use `TransactionValidationPanel` only if the component is specifically limited to verification.

Update imports and references carefully.

Do not create a second nearly identical component.

The component should support generic labels such as:

```ts
successLabel
submittedLabel
failedLabel
transactionLinkLabel
```

Avoid hardcoding purchase-specific language.

---

# 14. Refreshing Data After Transactions

After a successful verified transaction:

## Purchase

Refresh:

* Skin ownership
* Marketplace listings
* Selected account balances

## Transfer

Refresh:

* Skin ownership

## Listing

Refresh:

* Skin ownership
* Marketplace listings

Use the existing cache invalidation or refresh patterns already used by the collection purchase features.

Avoid a full page reload unless the existing architecture requires it.

The UI must not continue showing stale owned quantities after a verified operation.

---

# 15. Suggested Component Structure

Use the existing project structure where possible, but a reasonable separation may look like:

```text
collection/skins/
  page.tsx
  SkinCollectionPage.tsx
  SkinCardGroup.tsx
  SkinCard.tsx
  SkinFilters.tsx
  BuySkinDialog.tsx
  TransferSkinDialog.tsx
  ListSkinDialog.tsx
```

Potential shared code:

```text
lib/backend/api/spl/
  marketplace-assets.ts

lib/backend/actions/
  marketplace-assets-actions.ts
  skin-transaction-actions.ts

types/
  marketplace-assets.ts
  skin-transactions.ts
```

Do not follow this structure blindly.

First inspect the existing collection, market, transaction, dialog, and action architecture and place files consistently with that codebase.

---

# 16. Server and Client Responsibilities

Keep sensitive and external API logic out of client components where possible.

Recommended responsibilities:

## Server

* Fetch marketplace landing assets
* Fetch cached detailed player collection
* Fetch balances
* Resolve market listings
* Build transaction payloads
* Perform transaction lookup or verification
* Normalize external API responses

## Client

* Account selection
* Local filters
* Sorting
* Dialog state
* Form validation
* Triggering server actions
* Displaying progress

Avoid sending large unnormalized API payloads into deeply nested components.

---

# 17. Error Handling

Handle at least:

* Asset API unavailable
* Invalid API response
* No skins returned
* Player collection unavailable
* Marketplace listing no longer available
* Price changed before purchase
* Insufficient DEC
* Insufficient Credits
* Invalid recipient
* Transaction rejected
* Transaction submitted but not yet verified
* Transaction verification failure

Use existing collection error components and notification patterns.

Do not silently ignore malformed marketplace assets.

---

# 18. Loading and Empty States

Provide clear states for:

* Initial page loading
* Account switching
* Marketplace loading
* Collection loading
* No skins available
* No owned skins after enabling the owned-only filter
* No marketplace listings for a skin

Avoid layout jumps where practical.

---

# 19. Performance

The skins response may contain many items.

Use memoized grouping and filtering where useful, but do not add memoization everywhere without measurable benefit.

Important transformations:

```ts
group skins by cardDetailId
sort card groups
filter owned-only
map collection ownership by card_detail_id
```

Prefer building lookup maps once instead of repeatedly calling `.find()` during rendering.

Example:

```ts
const collectionByCardDetailId = new Map<number, PlayerCard[]>();
```

Keep keys typed and consistent.

---

# 20. Accessibility

Ensure:

* Buttons have meaningful labels
* Disabled actions explain why through tooltips where appropriate
* Images have useful alt text
* Dialog fields have labels
* Validation messages are connected to their fields
* The page remains keyboard accessible
* Ownership is not communicated only through opacity or color

Include a visible ownership label or badge.

---

# 21. Testing

Add tests for the highest-risk logic.

At minimum:

## Unit tests

* Asset response normalization
* `detailId` to `cardDetailId` mapping
* Grouping skins by card
* Owned-only filtering
* Marketplace price selection
* Transfer quantity validation
* Listing quantity and price validation
* Generic transaction progress labels

## Integration or component tests

* Account switching refreshes skin ownership
* Unowned skins remain visible when the filter is disabled
* Owned-only filter hides groups without owned skins
* Transfer cannot exceed owned quantity
* Listing cannot exceed owned quantity
* Buy action is disabled when no valid listing exists

Do not spend effort testing purely visual MUI implementation details.

---

# 22. Acceptance Criteria

The feature is complete when:

* `/collection/skins` is accessible from the collection navigation
* Existing account selection is reused
* Existing balance display is reused
* All available skins are loaded from the marketplace landing API
* The API layer supports reusable asset names rather than only hardcoded skins
* Skins are grouped by `cardDetailId`
* The standard card appears before its skins
* Missing standard cards are visually marked as not owned
* Missing skins are visually marked as not owned
* The user can filter to owned skins only
* Each skin shows circulation, listing count, minimum market price, and owned quantity
* The user can buy an available skin using DEC
* The user can buy an available skin using Credits
* The user can transfer an owned skin
* Transfer quantity cannot exceed ownership
* The user can list an owned skin for sale in USD
* Listing quantity cannot exceed ownership
* All broadcasts use correctly typed payload builders
* Transaction progress and verification reuse a generic shared panel
* Ownership, balances, and listings refresh after verified transactions
* No purchase-specific duplicate transaction component is introduced
* The implementation passes linting, type checking, and relevant tests

---

# 23. Implementation Approach

Before changing code:

1. Inspect `/collection/card`
2. Inspect `/collection/buy-missing-cc`
3. Inspect the current account selector
4. Inspect the balance header
5. Inspect `BuyCardDialog`
6. Inspect marketplace listing APIs
7. Inspect current transaction broadcast helpers
8. Inspect `PurchaseTxProgressPanel`
9. Inspect transaction verification actions
10. Identify the correct skin identifiers required for transfer and listing operations

Then provide a brief implementation plan containing:

* Files to create
* Files to modify
* Existing components to reuse
* Shared code that needs extraction
* Any uncertain API mappings

After the plan, implement the feature.

---

# 24. Important Constraints

* Keep the implementation practical and simple
* Do not duplicate collection account-selection logic
* Do not duplicate balance logic
* Do not duplicate DEC or Credits price calculations
* Do not introduce oversized components with many unrelated responsibilities
* Do not introduce unnecessary generic type systems
* Do not use `any`
* Do not guess API identifier mappings
* Do not change working collection functionality unless required for reuse
* Keep existing behavior backward compatible
* Prefer small reusable helpers over large abstractions
* Use existing naming and folder conventions from the repository
* Run formatting, linting, type checking, and relevant tests before finishing

---

# 25. Final Review

After implementation, review the result for:

* Incorrect `detailId`, `itemId`, `skin`, or `listingItemId` mappings
* Stale data after transactions
* Incorrect DEC or Credits calculations
* Invalid quantity handling
* Excessive prop drilling
* Duplicate marketplace logic
* Duplicate account-selection logic
* Missing transaction states
* Components that have become too large
* Types placed in feature-specific files that should be shared
* Shared types that were made unnecessarily generic

Finish with:

1. Summary of implemented functionality
2. Files created
3. Files modified
4. Shared components reused or renamed
5. API mappings confirmed
6. API mappings that remain uncertain
7. Tests performed
8. Remaining risks or follow-up work
