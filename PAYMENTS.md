# Cash and eSewa checkout

Products now have Buy now → Cash / eSewa. Each order purchases one product, priced in NPR from the database. Orders preserve the title and price at checkout. Existing per-user product access remains in place.

Open Orders from the workspace navigation (or `#orders`) for order history. Filter by Cash/eSewa and Paid/Pending, with 20 orders per page. Cash stays pending until the workspace user confirms cash receipt; this is a manual record, not payment-provider verification. eSewa can only become paid through provider verification. The screen includes receipt timestamps and provider references when available. `POST /api/orders/:id/cash-paid` records cash receipt; `GET /api/orders` lists only the signed-in user's orders.

On opening or refreshing Orders, `POST /api/orders/sync` verifies up to 20 recent pending eSewa orders before fetching the filtered history. This recovers completed payments when the browser return was missed. Provider failures leave orders pending and do not block the saved history. Older pending orders can still be checked individually. Payment return links open Orders, and the return verifier stays mounted across workspace navigation.

Cash orders are saved with payment pending (cash has not been collected). eSewa orders become paid only after the backend checks the eSewa status API and matches the amount, merchant and transaction ID. Browser callback parameters never mark orders paid. Repeated requests using the same checkout key reuse the order.

## Local test setup

Keep the existing database/auth configuration in `.env`. Add these server settings if needed:

```env
CLIENT_URL=http://localhost:5173
ESEWA_MODE=test
ESEWA_PRODUCT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q(
```

Restart the backend and frontend (or rebuild Docker). Test settings are defaults; they do not collect real money. The secret stays on the backend. Set CLIENT_URL to the actual browser frontend address, not the Docker service name.

1. Sign in, create a positive-price product and click Buy now.
2. Select Cash: confirm the order reference and pending cash payment.
3. Select eSewa: complete the hosted sandbox payment using the current test credentials from [eSewa ePay v2 documentation](https://developer.esewa.com.np/pages/Epay-V2).
4. On return, the app verifies payment. Check payment retries verification if the provider is delayed. Cancelling never marks an order paid. The pending reference is also retained in session storage for returning to the app.

## Production

When upgrading an existing checkout database, run `npm run migrate:order-indexes` once. This preserves orders, ensures the current unique indexes exist and removes the obsolete `requestId_1` index that prevents multiple new orders.

Set ESEWA_MODE=production, replace ESEWA_PRODUCT_CODE and ESEWA_SECRET_KEY with credentials issued to your merchant account, and set CLIENT_URL to the HTTPS frontend URL. Do not expose the merchant secret as a VITE variable. Complete merchant onboarding and a provider-approved end-to-end test before accepting real payments. Keep configuration stable for outstanding orders.

API: authenticated POST /api/orders accepts productId, paymentMethod (cash/esewa), requestKey; GET /api/orders/:id reads your order; POST /api/orders/:id/verify verifies it. Orders are persisted in MongoDB. Shipping, inventory and fulfilment are outside this checkout's scope.
