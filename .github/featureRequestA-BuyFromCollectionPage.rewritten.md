# Feature A: Buy Cards From Collection Page

## Goal

Add card-buying support to the existing multi-dashboard collection page:

```txt
/multi-dashboard/collection?users=beaker007
```

When the user clicks a card in the collection view, open a reusable `BuyCardDialog` in `manual-listings` mode. The user can inspect exact market listings, select one or more listings, add them to a shopping cart / purchase plan, or buy the selected listings immediately.

This feature is also the foundation for the later **Buy Missing CC** feature. Build the purchase infrastructure in a reusable way so Feature B can reuse the same dialog, cart, checkout, broadcast, and transaction verification flow.

## Terminology

- Use **CC** in user-facing UI.
- Splinterlands API fields may still use **BCX** internally.
- BCX and CC represent the same thing.
- UI labels should say `Buy CC`, `Card Copies`, or `CC`; avoid `Buy BCX`.

## Reference Projects

Current project:

```txt
/Users/remco.boerwinkel/TempProjects/spl-stats-next
```

Reference project:

```txt
/Users/remco.boerwinkel/TempProjects/splinter-lands-next
```

Use the reference project for:

- `fetchMarketListingsByCard`
- `splBroadcast.ts`
- transaction lookup / verification behavior
- SPL API dev/test configuration
- operation app/dev-prefix handling

## Scope

### Included

- Shared market purchase infrastructure.
- A reusable `BuyCardDialog`.
- The `manual-listings` dialog mode.
- Purchase plan / shopping cart state.
- Cart indicator in the top bar.
- Cart checkout dialog.
- Direct Hive Keychain Active-key purchasing.
- Transaction verification after purchase.
- Balance and card-collection refresh after purchase.

### Not Included

- Buy Missing CC page.
- Target-level upgrade planning.
- Cheapest upgrade path calculations.
- Card stat comparison.
- Ability preview.
- Card combining.
- Automatic combining after purchase.
- Storybook work.

## Shared Architecture

Build these pieces so they can be reused by Feature B.

### 1. SPL API Configuration

If not already present in `spl-stats-next`, add the same production/test API switching style used by `splinter-lands-next`.

Requirements:

- Production SPL API support.
- MAV test API support.
- One central config file for SPL API base URLs.
- One central custom-json operation prefix config.
- Client and server code must use the same config style.

Reference:

```txt
splinter-lands-next/src/lib/shared/config/splApiConfig.ts
```

### 2. Transaction Lookup and Verification

Take over the transaction verification approach from `splinter-lands-next`.

Requirements:

- Add or adapt `lookupTransaction`.
- Replace direct `fetchTransactionLookup` usage where appropriate.
- Add `waitForTransactions`.
- Poll until transactions resolve as success or failure.
- Surface failed transactions with a useful user-visible error.
- Preserve existing behavior for any current transaction lookup users.
- Improve transaction type detection using the parser/structure from the reference project where practical.

Reference:

```txt
splinter-lands-next/src/lib/frontend/splBroadcast.ts
splinter-lands-next/src/lib/backend/api/spl/trxLookupParser.ts
splinter-lands-next/src/lib/backend/actions/land-manager/overview-actions.ts
```

### 3. Direct Market Purchase Operation

Create a direct account-signed market purchase operation builder.

Important: this purchase must **not** use on-behalf broadcasting.

Use:

```ts
const MARKET = "spl-stats.com";
```

The operation should be a direct `sm_market_purchase` custom-json signed by the buyer account with Active authority:

```ts
custom_json {
  required_auths: [buyerAccount],
  required_posting_auths: [],
  id: "sm_market_purchase",
  json: {
    items: marketIds,
    currency: "DEC" | "CREDITS",
    price: totalPrice,
    market: MARKET,
    app,
    n
  }
}
```

Requirements:

- Use the same `app` determination style as `splinter-lands-next`.
- Apply the test/dev operation prefix consistently when test API mode is active.
- Support currency selection: `DEC` or `CREDITS`.
- Include the total price as a guard against listing price changes between selection and broadcast.
- Use Hive Keychain Active key for broadcasting.

### 4. Market Listing Fetch

Add or adapt a market listing API wrapper based on:

```txt
splinter-lands-next/src/lib/backend/api/spl/spl-base-api.ts
```

Required function:

```ts
fetchMarketListingsByCard({
  cardDetailId,
  foil,
  edition,
  type: "buy",
  level?
})
```

Requirements:

- Fetch exact market listings for one card.
- Sort by cheapest per CC where supported by the API.
- Support optional listing level filtering.
- Do not hide listings needed by Feature B later.
- Return enough fields to build a `PurchasePlanItem`, including market listing id, CC/BCX quantity, level, price, seller if available, foil, edition, and card detail id.

## Shared Purchase Plan

Use one reusable purchase plan model for cart items and direct buy items.

Suggested type:

```ts
interface PurchasePlanItem {
  account: string;
  marketId: string;
  cardDetailId: number;
  cardName: string;
  edition: number;
  foil: number;
  level: number;
  cc: number;
  priceDec: number;
  priceCredits?: number;
  seller?: string;
}
```

Requirements:

- Each selected market listing remains its own purchase item.
- Do not merge listings into one summary row.
- Store the destination account on every item.
- Prevent duplicate market listing ids in the cart for the same account.
- Support multiple monitored accounts in one cart.
- Checkout must group items by account and execute one transaction per account.

## Top Bar

Extend the top bar with:

- A shopping cart / purchase plan indicator.
- A visible badge/count when items are in the cart.
- A click action that opens the cart checkout dialog.
- Token balances for Credits, DEC, and SPS.

Balance requirements:

- Reuse existing balance APIs and existing balance components where practical.
- Hover should show cached balance data for monitored accounts.
- Refresh affected account balances after confirmed purchases.
- When no user is logged in, balances/cart can still be visible if data exists, but buy actions must be disabled.

Existing component to inspect:

```txt
spl-stats-next/src/components/multi-dashboard/TopBalances.tsx
```

## BuyCardDialog

Create one reusable dialog component with two possible modes, but only implement `manual-listings` behavior in Feature A.

Suggested API:

```ts
type BuyCardDialogMode = "manual-listings" | "target-level";

interface BuyCardDialogProps {
  open: boolean;
  mode: BuyCardDialogMode;
  account: string;
  cardDetailId: number;
  cardName: string;
  edition: number;
  foil: number;
  currentLevel?: number;
  currentCc?: number;
  onClose: () => void;
  onAddToPurchasePlan: (items: PurchasePlanItem[]) => void;
  onBuyNow: (items: PurchasePlanItem[]) => Promise<void>;
}
```

### Mode: `manual-listings`

This mode is used by Feature A.

The user manually selects exact market listings.

Display:

- Card image.
- Card name.
- Edition.
- Foil.
- Selected destination account.
- Foil toggle/filter.
- Listing level filter/select.
- Paginated market listing table.
- Selected totals in DEC and CREDITS.
- `Add to cart` button.
- `Buy now` button.

Listing table requirements:

- Pagination options: 20 / 50 / 100.
- Row selection by click.
- Shift-click selects or deselects all rows between the last selected row and current row.
- Selected rows are visually obvious.
- Rows already in the cart are visually marked.
- Per row, show at least: card/level, CC quantity, price, price per CC if available, seller if available, and in-cart status.

Selection totals:

- Show selected listing count.
- Show total selected CC.
- Show total selected DEC.
- Show total selected CREDITS.

### Mode: `target-level`

Reserve this mode for Feature B.

Feature A should define the mode type and component boundary if useful, but it does not need to implement upgrade calculations.

In this mode, `level` will mean target upgrade level. In `manual-listings` mode, `level` means market listing level filter. Keep those concepts separate in code.

## Collection Page Integration

On `/multi-dashboard/collection`, make cards buyable.

Requirements:

- Clicking a card opens `BuyCardDialog` in `manual-listings` mode.
- The dialog receives the clicked card's `cardDetailId`, `edition`, `foil`, name, and selected account.
- If the collection page displays multiple accounts, determine the account from the clicked card context. If the UI is aggregated and no account is obvious, add a small account selector in the dialog that defaults to the current/first selected monitored account.
- If the selected account is not a monitored or logged-in account that can sign, allow browsing listings but disable `Buy now` and checkout.

## Cart / Checkout Dialog

Clicking the top-bar cart indicator opens a checkout dialog.

Display:

- Every selected listing individually.
- Destination account per listing.
- Card image/name.
- Edition.
- Foil.
- Level.
- CC quantity.
- Seller if available.
- Listing price.
- Remove button per listing.
- Totals by account.
- Grand totals.

Checkout behavior:

- Let the user choose purchase currency: `DEC` or `CREDITS`.
- Check balance for each account before broadcasting.
- If the cart contains items for multiple accounts, split into one transaction per account.
- Ask Hive Keychain separately for each account transaction.
- Use Active key.
- After broadcast, call `waitForTransactions`.
- Show verification progress.
- On confirmed success, remove completed items from the cart.
- Refresh balances and card collections for affected accounts.
- Show a success message after confirmation.
- On failure, keep unconfirmed items in the cart and show the error.

## Authentication Rules

- If the user is not logged in, listings can still be browsed.
- If the user is not logged in, `Buy now`, `Add to cart`, and checkout purchase actions should be disabled.
- If an item belongs to an account that cannot be signed by the current user, checkout for that account must be disabled with a clear tooltip/message.
- Authentication must use Hive Keychain Active key for purchase broadcasts.

## Acceptance Criteria

- Clicking a card on `/multi-dashboard/collection?users=beaker007` opens the buy dialog.
- The dialog fetches exact market listings for the selected card.
- The user can toggle foil and filter/select listing level.
- The listing table supports 20 / 50 / 100 pagination.
- The user can select rows by click.
- Shift-click selects/deselects a range.
- Selected totals are shown in DEC and CREDITS.
- `Add to cart` adds exact listings to the cart for the correct account.
- Listings already in the cart are visibly marked.
- The top bar shows a cart indicator with a count.
- Clicking the cart opens checkout with all selected listings.
- Checkout groups purchases by account.
- Buying uses direct `sm_market_purchase`, not on-behalf.
- Hive Keychain prompts for Active key.
- Transactions are verified after broadcast.
- Successful purchases refresh balances and affected card collections.
- Completed items are removed from the cart after confirmed success.
- When not logged in, browsing works but buy actions are disabled.

