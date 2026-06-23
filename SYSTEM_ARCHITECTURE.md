# System Architecture — Pepper's Kitchen AI Food Truck

## Overview

```
Browser (React)
      │  fetch('/api/...')
      ▼
Vite Dev Server (proxy)   ─── in production: Nginx / reverse proxy
      │
      ▼
Express API Server (Node.js)
      ├── POST /api/chat            → Anthropic Claude API
      ├── POST /api/create-payment-link → Square Checkout API
      ├── POST /api/webhook         ← Square webhook (payment events)
      ├── GET  /api/order-status/:id   (polling)
      └── POST /api/simulate-payment   (demo helper)
```

---

## Component Map

### Frontend (`client/src/`)

| File | Role |
|------|------|
| `App.jsx` | Top-level state machine: panel (`idle → call → payment → confirmation`), cart, session, order number |
| `IdleScreen.jsx` | Phone UI idle state — food truck info, animated green call button |
| `CallScreen.jsx` | Active call UI — chat bubbles, typing indicator, live order sidebar, end-call/proceed button |
| `OrderSummary.jsx` | Reusable sidebar — live cart items, running total, pickup time |
| `PaymentScreen.jsx` | Payment UI — order recap, Square link creation, SMS mock, polling loop |
| `ConfirmationScreen.jsx` | Success screen — order details, 3 sequenced kitchen notification cards |

### Backend (`server/index.js`)

Single Express file using ES modules. All state is in-memory (suitable for single-node demo).

| Route | Description |
|-------|-------------|
| `POST /api/chat` | Maintains per-session conversation history. Calls Claude with the `update_order` tool, runs a tool-use loop until Claude returns `end_turn`, then returns `{ reply, cartItems, orderComplete, suggestedPickupTime }`. |
| `POST /api/create-payment-link` | Converts cart items to Square `lineItems` (amounts in BigInt cents), calls `checkoutApi.createPaymentLink`, returns `{ paymentUrl, orderId, orderNumber }`. |
| `POST /api/webhook` | Receives Square `payment.completed` events, stores confirmed order IDs in `confirmedOrders` Map. |
| `GET /api/order-status/:orderId` | Returns `{ confirmed: true/false }`. Frontend polls this every 3 seconds after opening the payment page. |
| `POST /api/simulate-payment` | Demo-only: manually marks an order as confirmed without needing a real webhook. |

---

## AI Agent Design

### Claude Tool Use

Claude is given one tool: `update_order`. It calls this tool whenever items are added to the cart or the order is finalized. The tool's input schema requires:

```json
{
  "items": [{ "name", "quantity", "unitPrice", "modifiers": [{"name","price"}] }],
  "orderComplete": false,
  "suggestedPickupTime": "12:30 PM"
}
```

The server merges each tool call result into the session's cart state and runs a tool-use loop (`while stop_reason === 'tool_use'`) before returning the final text response to the frontend.

### Session State

```js
sessions[sessionId] = {
  history: [],        // Anthropic messages array (user/assistant alternating)
  cartItems: [],      // Current cumulative cart
  orderComplete: false,
  pickupTime: null,
}
```

Sessions live in a `Map` in server memory. They are not persisted — restarting the server clears all sessions.

---

## Data Flow: Full Order

```
1. User clicks Call
   └─ App generates sessionId, POSTs { message: "Hello", sessionId } to /api/chat
   └─ Claude greets customer

2. User types order items
   └─ Each message POSTed to /api/chat
   └─ Claude uses update_order tool → server stores cart
   └─ Frontend renders cartItems in OrderSummary

3. Customer confirms order + pickup time
   └─ Claude calls update_order with orderComplete: true
   └─ Frontend shows "Proceed to Payment" button (orange)

4. User clicks "End Call" → "Proceed to Payment"
   └─ App transitions to PaymentScreen

5. User clicks "Pay Now"
   └─ POST /api/create-payment-link with cartItems
   └─ Server calls Square checkoutApi.createPaymentLink
   └─ Returns paymentUrl → frontend opens in new tab
   └─ Frontend starts polling GET /api/order-status/:orderId every 3s

6. Square payment webhook fires (or simulate button clicked)
   └─ POST /api/webhook → confirmedOrders.set(orderId, { confirmed: true })
   └─ Next poll returns { confirmed: true }
   └─ Frontend transitions to ConfirmationScreen

7. Confirmation screen
   └─ Order details displayed
   └─ 3 kitchen notification cards appear with 1.5s stagger
```

---

## Swapping Sandbox for Production

### 1. Square

Change `.env`:
```
SQUARE_ACCESS_TOKEN=<production access token>
SQUARE_APPLICATION_ID=<production app id>
SQUARE_LOCATION_ID=<production location id>
SQUARE_ENVIRONMENT=production
```

Register a production webhook endpoint pointing to your server's `/api/webhook`.

### 2. Anthropic

No changes needed — the model is specified in the server code as `claude-sonnet-4-6`. You may switch to `claude-opus-4-8` for higher quality responses (higher cost) or `claude-haiku-4-5-20251001` for lower latency (lower cost).

### 3. SMS (Twilio)

In production, replace the mock SMS bubble with real Twilio SMS:

```bash
npm install twilio --prefix server
```

In `server/index.js`, after confirming order in `/api/webhook`:

```js
import twilio from 'twilio';
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

await twilioClient.messages.create({
  body: `New order ${orderNumber}: ${itemsSummary}. Total: $${total}. Pickup: ${pickupTime}`,
  from: process.env.TWILIO_FROM_NUMBER,
  to: process.env.OWNER_PHONE,
});
```

### 4. Real Phone Calls (Twilio Voice)

To replace the browser chat with an actual phone call:

1. Use **Twilio Voice** with a `/api/voice` TwiML endpoint
2. Route inbound calls through Twilio → your server
3. Use **Twilio Media Streams** + **Deepgram** (or Twilio's built-in Speech Recognition) to convert speech to text
4. Feed transcribed text into the same `/api/chat` route
5. Use **Amazon Polly** or **ElevenLabs** to convert Claude's text reply back to audio
6. Stream audio back through Twilio

The Claude conversation logic (`/api/chat`) does not need to change.

### 5. Persistence

Replace the in-memory Maps with a database:

| Current | Production replacement |
|---------|----------------------|
| `sessions` Map | Redis (with 30-minute TTL per session) |
| `confirmedOrders` Map | PostgreSQL `orders` table |

### 6. Deployment

Recommended stack:
- **Backend:** Railway, Render, or AWS ECS
- **Frontend:** Vercel, Netlify, or served as static files from the same server
- **Reverse proxy:** Nginx (if self-hosting) — proxy `/api/*` to Express, serve static client build for everything else

---

## Security Notes for Production

- Add Square webhook signature verification (use `SQUARE_WEBHOOK_SIGNATURE_KEY` from the dashboard)
- Move session state to Redis with TTLs
- Add rate limiting (`express-rate-limit`) on `/api/chat`
- Never log full conversation history containing customer PII
- Store `.env` values in your platform's secrets manager (AWS Secrets Manager, Railway variables, etc.)
