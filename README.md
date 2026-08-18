# Pepper's Kitchen — AI Food Truck Phone Order Demo

A full-stack beta demo simulating a customer calling a food truck, placing an order via an AI agent, paying through Square, and triggering kitchen notifications — all inside a mobile phone UI in the browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express, deployed as a Vercel serverless function |
| AI Agent | Anthropic Claude (`claude-sonnet-4-6`) |
| Payments | Square API (sandbox) |
| State | Vercel Redis — sessions, pending/confirmed orders |

---

## Setup

### 1. Install dependencies

```bash
cd food-truck-agent
npm install
```

This runs `postinstall` which also installs `client/` dependencies. The Vercel CLI is included as a dev dependency so `vercel dev` works without a global install.

### 2. Link the project and pull environment variables

```bash
npx vercel link
```

Then in the Vercel dashboard for this project: **Storage → Create Database → Redis**, and connect it to this project. This auto-injects `REDIS_URL`.

Add your other secrets in **Settings → Environment Variables** (or a local `.env`, copied from `.env.example`):

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SQUARE_ACCESS_TOKEN` | Square Developer Dashboard → Sandbox → Access Token |
| `SQUARE_APPLICATION_ID` | Square Developer Dashboard → Sandbox → Application ID |
| `SQUARE_LOCATION_ID` | Square Developer Dashboard → Sandbox → Locations |
| `SQUARE_ENVIRONMENT` | Leave as `sandbox` for testing |

To pull the Redis connection string and any dashboard-configured vars down into a local `.env`:

```bash
npx vercel env pull .env
```

### 3. Run

```bash
npm run dev
```

This runs `vercel dev`, which serves the Vite frontend and the `/api/*` serverless function together on one port (default http://localhost:3000), matching how it behaves in production.

---

## Getting Square Sandbox Keys

1. Go to [developer.squareup.com](https://developer.squareup.com) and sign in
2. Create a new application (or use an existing one)
3. In the left sidebar, toggle to **Sandbox** mode
4. Under **Credentials**, copy:
   - **Sandbox Access Token** → `SQUARE_ACCESS_TOKEN`
   - **Application ID** → `SQUARE_APPLICATION_ID`
5. Under **Locations**, copy any location ID → `SQUARE_LOCATION_ID`

---

## Demo Flow

1. Open http://localhost:3000 (the port `vercel dev` prints)
2. Click the green **Call** button on the phone screen
3. Type your order in the chat (e.g., `"2 beef tacos with guacamole and a Mexican Coke"`)
4. Follow Pepper's prompts to confirm items and choose a pickup time
5. When Pepper confirms your order, click **Proceed to Payment**
6. Click **Pay Now** — Square sandbox checkout opens in a new tab
7. Use the Square sandbox test card:
   - **Card number:** `4111 1111 1111 1111`
   - **Expiry:** `12/26`
   - **CVV:** `111`
   - **ZIP:** `12345`
8. Return to the demo tab — the confirmation screen appears with sequential kitchen notifications

### Demo Mode (No Webhook Required)

If you're running locally without a public webhook URL, after clicking **Pay Now** and completing the Square sandbox checkout:

1. Return to the demo tab
2. Click the gray **[Demo: Simulate Payment Confirmed]** button
3. The confirmation screen will appear

---

## Setting Up Webhooks (Optional)

For real-time payment confirmation without the simulate button, once deployed to Vercel (or tunneled locally via `vercel dev` + ngrok):

1. In Square Developer Dashboard → **Webhooks** → **Add endpoint:**
   - URL: `https://<your-vercel-domain>/api/webhook`
   - Events: `payment.completed`
2. Save. Now completing the Square checkout will automatically trigger the confirmation screen.

---

## Project Structure

```
food-truck-agent/
├── .env                        Local secrets (never commit this)
├── .env.example                Key names with empty values
├── package.json                Root: deps for api/, dev via `vercel dev`
├── vercel.json                 Build/dev/rewrite config for Vercel
├── food-truck-agent.code-workspace
│
├── api/
│   └── index.js                Express app exported as a Vercel serverless function;
│                                all /api/* routes, state in Vercel Redis
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             Panel state machine
        └── components/
            ├── IdleScreen.jsx
            ├── CallScreen.jsx
            ├── OrderSummary.jsx
            ├── PaymentScreen.jsx
            └── ConfirmationScreen.jsx
```

---

## Deploying to Vercel

```bash
npx vercel        # preview deploy
npx vercel --prod # production deploy
```

Before your first deploy, make sure (via the dashboard or `vercel env add`):
- A Redis database is created and connected under Storage (provides `REDIS_URL`)
- `ANTHROPIC_API_KEY`, `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` are set as environment variables for the environments you deploy to (Preview/Production)
- If using owner notifications: `NOTIFY_KDS`, `NOTIFY_PRINTER`, `NOTIFY_OWNER_SMS`, `OWNER_PHONE`

See `SYSTEM_ARCHITECTURE.md` for the full production swap guide (real payments, real SMS, etc).
