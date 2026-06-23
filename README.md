# Pepper's Kitchen — AI Food Truck Phone Order Demo

A full-stack beta demo simulating a customer calling a food truck, placing an order via an AI agent, paying through Square, and triggering kitchen notifications — all inside a mobile phone UI in the browser.

Built for government contract demonstration purposes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express (ESM) |
| AI Agent | Anthropic Claude (`claude-sonnet-4-6`) |
| Payments | Square API (sandbox) |

---

## Setup

### 1. Install dependencies

```bash
cd food-truck-agent
npm install
```

This runs `postinstall` which automatically installs both `server/` and `client/` dependencies.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your API keys:

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SQUARE_ACCESS_TOKEN` | Square Developer Dashboard → Sandbox → Access Token |
| `SQUARE_APPLICATION_ID` | Square Developer Dashboard → Sandbox → Application ID |
| `SQUARE_LOCATION_ID` | Square Developer Dashboard → Sandbox → Locations |
| `SQUARE_ENVIRONMENT` | Leave as `sandbox` for testing |

### 3. Run

```bash
npm run dev
```

Starts both servers concurrently:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

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

1. Open http://localhost:5173
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

For real-time payment confirmation without the simulate button:

1. Install [ngrok](https://ngrok.com): `ngrok http 3001`
2. Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. In Square Developer Dashboard → **Webhooks** → **Add endpoint:**
   - URL: `https://abc123.ngrok.io/api/webhook`
   - Events: `payment.completed`
4. Save. Now completing the Square checkout will automatically trigger the confirmation screen.

---

## Project Structure

```
food-truck-agent/
├── .env                        API keys (never commit this)
├── .env.example                Key names with empty values
├── package.json                Root: runs both servers via concurrently
├── food-truck-agent.code-workspace
│
├── server/
│   ├── package.json
│   └── index.js                Express API server
│
└── client/
    ├── index.html
    ├── vite.config.js          Proxies /api → localhost:3001
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

## Going to Production

See `SYSTEM_ARCHITECTURE.md` for a complete swap guide from sandbox to production.
