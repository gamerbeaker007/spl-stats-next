can you add a new feature on this page: http://localhost:3000/multi-dashboard/collection?users=beaker007
when clicked on card show a buying dialog
The dialog has these options
* Toggles desired foil
* Select level
* Per item add to cart make it visible that its added to the shopping cart
* Shift click will add or remove all the item between first and last select item
* Make paginated with select how many you want to see 20 50 100
* Show total select value in credit and dec
* Buy directly what is select or add to cart option (take note for which account add it to the cart)

The splinter-land-next project you can find how to find card fetchMarketListingsByCard
How to make a operation splboardcast (this purchase call should NOT be a on-behalf function)
Take over the waitForTransaction and the whole verifyTrx structure check implement it here (check if other code need updated to move to this structure!!) .
const MARKET = "spl-stats.com";
Take over how the APP is determined

Show in the topbar the tokens you owned credits/dec/sps (balances api, with hover of th all the monitor account cache the data) and shopping cart (it indication when something is in it) (make buyable with credit and dec option credits api return usd )
After purchasing verify trx and show when succcesfull

When clicking on the shopping cart you get a dialog to buy the card again showing which cards are selected  handle multi account buy so buy 10 cards for account A and 5 card for account B. so purchase order needs to be separated and check balances for each account in this screen.

Actual buy dialog should contains the list of cards  total amount to spend in DEC and CREDITS here you can choose buy with credits or DEC
 after buy wait for the transaction to be validated and force update the balances and cardCollection of the users affected
When not logged in only the buy buttons needs to be disabled.
