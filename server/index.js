import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import squarePkg from 'square';
const { SquareClient, SquareEnvironment } = squarePkg;
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory stores ──────────────────────────────────────────────────────────
const sessions = new Map();
// sessions[id] = { history, cartItems, orderComplete, pickupTime, customerName }

const confirmedOrders = new Map();
// confirmedOrders[squareOrderId] = { confirmed, orderNumber, customerName, timestamp }

const pendingOrders = new Map();
// pendingOrders[squareOrderId] = { customerName, cartItems, pickupTime, orderNumber, total }

// ── API clients ───────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN?.trim(),
  environment:
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Pepper, the AI ordering assistant for Pepper's Kitchen food truck. You are friendly, efficient, and conversational. Your job is to take phone orders from customers.

MENU:
- Tacos (beef, chicken, or veggie) — $4.50 each
- Burrito Bowl — $9.00
- Quesadilla — $7.50
- Elote (Mexican street corn) — $3.50
- Chips & Salsa — $3.00
- Chips & Guacamole — $4.50
- Agua Fresca (hibiscus, tamarind, or horchata) — $3.50
- Mexican Coke — $3.00

MODIFIERS:
- Tacos: add cheese +$0.50, add guacamole +$1.00
- Burrito Bowl: choice of protein (beef, chicken, veggie), add sour cream +$0.50
- Quesadilla: add chicken +$2.00

RULES:
1. Greet the customer warmly and ask what they'd like to order
2. Confirm each item as it's added including any modifiers
3. Suggest a drink if none has been ordered ("Can I add a drink to your order?")
4. When the customer is done, read back the complete order with itemized prices and total
5. Ask for the customer's first name ("And what name can I put the order under?")
6. Once you have their name, use it naturally in every response from that point on (e.g. "Got it [Name]!", "Perfect, [Name],")
7. Ask for their preferred pickup time (offer 15-minute increments, next available is always 20 minutes from now)
8. Confirm pickup time and tell them a payment link will be sent to their phone
9. Keep responses concise — this is a phone call simulation, not a chat
10. If asked something you don't know, say "Let me have the owner get back to you on that"
11. Never make up menu items or prices not listed above

When you add items to the order, update the order state, or confirm a complete order, call the update_order tool. Always call update_order with the COMPLETE current order (not just new items). When you learn the customer's first name, call update_order with customerName set. Set orderComplete to true only after the customer has confirmed their entire order, provided their name, AND chosen a pickup time.`;

// ── Claude tool definition ────────────────────────────────────────────────────
const UPDATE_ORDER_TOOL = {
  name: 'update_order',
  description:
    'Update the customer\'s current order. Call this whenever items are added or changed, and when the customer confirms their complete order with a pickup time. Always send the COMPLETE list of all items ordered so far.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Complete list of ALL items ordered so far (cumulative)',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Item name e.g. "Beef Taco", "Chicken Burrito Bowl"',
            },
            quantity: { type: 'integer', description: 'Number of this item' },
            unitPrice: {
              type: 'number',
              description: 'Base price per unit in dollars (before modifiers)',
            },
            modifiers: {
              type: 'array',
              description: 'Any add-ons or modifications',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                },
                required: ['name', 'price'],
              },
            },
          },
          required: ['name', 'quantity', 'unitPrice'],
        },
      },
      orderComplete: {
        type: 'boolean',
        description:
          'Set to true ONLY when customer has confirmed their full order, provided their name, AND chosen a pickup time',
      },
      suggestedPickupTime: {
        type: 'string',
        description: 'Pickup time confirmed with customer e.g. "12:30 PM"',
      },
      customerName: {
        type: 'string',
        description: "Customer's first name for the order, collected after confirming the total",
      },
    },
    required: ['items'],
  },
};

// ── POST /api/chat ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        history: [],
        cartItems: [],
        orderComplete: false,
        pickupTime: null,
        customerName: null,
      });
    }

    const session = sessions.get(sessionId);

    // Add user message to history
    const userContent = message?.trim() || 'Hello';
    session.history.push({ role: 'user', content: userContent });

    // ── Claude API call with tool-use loop ──────────────────────────────────
    let cartItems = session.cartItems;
    let orderComplete = session.orderComplete;
    let suggestedPickupTime = session.pickupTime;
    let customerName = session.customerName;

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [UPDATE_ORDER_TOOL],
      messages: session.history,
    });

    while (response.stop_reason === 'tool_use') {
      // Add Claude's tool-use message to history
      session.history.push({ role: 'assistant', content: response.content });

      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'update_order') {
          const input = block.input;

          if (Array.isArray(input.items)) {
            cartItems = input.items.map((item) => ({
              ...item,
              modifiers: item.modifiers || [],
            }));
            session.cartItems = cartItems;
          }
          if (input.orderComplete !== undefined) {
            orderComplete = input.orderComplete;
            session.orderComplete = orderComplete;
          }
          if (input.suggestedPickupTime) {
            suggestedPickupTime = input.suggestedPickupTime;
            session.pickupTime = suggestedPickupTime;
          }
          if (input.customerName) {
            customerName = input.customerName;
            session.customerName = customerName;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Order updated successfully.',
          });
        }
      }

      // Feed tool results back to Claude
      session.history.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [UPDATE_ORDER_TOOL],
        messages: session.history,
      });
    }

    // Extract final text reply
    let assistantReply = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantReply = block.text;
        break;
      }
    }

    // Add final assistant message to history
    session.history.push({ role: 'assistant', content: response.content });

    return res.json({
      reply: assistantReply,
      cartItems,
      orderComplete,
      suggestedPickupTime,
      customerName,
    });
  } catch (err) {
    console.error('Chat error:', err?.message || err);
    return res.status(500).json({
      error: 'Chat failed',
      reply:
        "I'm sorry, I'm having a little trouble right now. Could you repeat that?",
    });
  }
});

// ── POST /api/create-payment-link ─────────────────────────────────────────────
app.post('/api/create-payment-link', async (req, res) => {
  try {
    const { cartItems, sessionId } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    const session = sessions.get(sessionId);
    const customerName = session?.customerName || 'Guest';
    const pickupTime = session?.pickupTime;

    const lineItems = cartItems.map((item) => {
      const modTotal = (item.modifiers || []).reduce(
        (sum, m) => sum + (m.price || 0),
        0
      );
      const totalUnitPrice = (item.unitPrice || 0) + modTotal;
      const modNames = (item.modifiers || []).map((m) => m.name).join(', ');
      const displayName = modNames ? `${item.name} (${modNames})` : item.name;

      return {
        name: displayName,
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: BigInt(Math.round(totalUnitPrice * 100)),
          currency: 'USD',
        },
      };
    });

    const orderNote = pickupTime
      ? `Order for ${customerName} — Pickup: ${pickupTime}`
      : `Order for ${customerName}`;

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: uuidv4(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID?.trim(),
        lineItems,
        note: orderNote,
      },
    });

    const paymentLink = response.paymentLink;
    const orderNumber = `PK-${Date.now().toString().slice(-6)}`;
    const total = cartItems.reduce((sum, item) => {
      const modTotal = (item.modifiers || []).reduce((s, m) => s + (m.price || 0), 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0);

    pendingOrders.set(paymentLink.orderId, {
      customerName,
      cartItems,
      pickupTime,
      orderNumber,
      total,
    });

    return res.json({
      paymentUrl: paymentLink.url,
      orderId: paymentLink.orderId,
      orderNumber,
    });
  } catch (err) {
    console.error('Payment link error:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to create payment link',
      details: err?.message || 'Unknown error',
    });
  }
});

// ── Notification stubs ────────────────────────────────────────────────────────
function fireNotifications({ orderNumber, customerName, cartItems, pickupTime, total }) {
  if (process.env.NOTIFY_KDS === 'true') {
    // TODO: POST to Square KDS or custom kitchen display webhook
    console.log(`[KDS] Order ${orderNumber} for ${customerName} — ${cartItems.length} item(s), pickup ${pickupTime}`);
  }
  if (process.env.NOTIFY_PRINTER === 'true') {
    // TODO: Send ESC/POS commands to receipt printer (e.g. via node-thermal-printer)
    console.log(`[PRINTER] ${orderNumber} | Name: ${customerName} | Pickup: ${pickupTime} | Total: $${total.toFixed(2)}`);
  }
  if (process.env.NOTIFY_OWNER_SMS === 'true') {
    // TODO: Send via Twilio or similar — use OWNER_PHONE env var
    console.log(`[SMS → ${process.env.OWNER_PHONE}] New order ${orderNumber} for ${customerName} | Pickup: ${pickupTime} | $${total.toFixed(2)}`);
  }
}

// ── POST /api/webhook (Square payment events) ─────────────────────────────────
app.post('/api/webhook', (req, res) => {
  try {
    const event = req.body;
    console.log('Webhook received:', event?.type);

    if (event.type === 'payment.completed') {
      const orderId = event.data?.object?.payment?.order_id;
      if (orderId) {
        const pending = pendingOrders.get(orderId);
        const orderNumber = pending?.orderNumber || `PK-${Date.now().toString().slice(-6)}`;
        confirmedOrders.set(orderId, {
          confirmed: true,
          orderNumber,
          customerName: pending?.customerName,
          timestamp: new Date().toISOString(),
        });
        if (pending) fireNotifications({ orderNumber, ...pending });
        console.log(`Order confirmed via webhook: ${orderId} (${pending?.customerName || 'Guest'})`);
      }
    }

    if (event.type === 'order.fulfillment.updated') {
      const orderId = event.data?.object?.order?.id;
      if (orderId) {
        const pending = pendingOrders.get(orderId);
        const orderNumber = pending?.orderNumber || `PK-${Date.now().toString().slice(-6)}`;
        confirmedOrders.set(orderId, {
          confirmed: true,
          orderNumber,
          customerName: pending?.customerName,
          timestamp: new Date().toISOString(),
        });
        if (pending) fireNotifications({ orderNumber, ...pending });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err?.message || err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── GET /api/order-status/:orderId ────────────────────────────────────────────
app.get('/api/order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const orderData = confirmedOrders.get(orderId);

  if (orderData?.confirmed) {
    return res.json({
      confirmed: true,
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
    });
  }
  return res.json({ confirmed: false });
});

// ── POST /api/simulate-payment (demo helper, no webhook needed) ───────────────
app.post('/api/simulate-payment', (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId required' });
  }
  const pending = pendingOrders.get(orderId);
  const orderNumber = pending?.orderNumber || `PK-${Date.now().toString().slice(-6)}`;
  confirmedOrders.set(orderId, {
    confirmed: true,
    orderNumber,
    customerName: pending?.customerName,
    timestamp: new Date().toISOString(),
  });
  if (pending) fireNotifications({ orderNumber, ...pending });
  console.log(`Simulated payment for order: ${orderId} (${pending?.customerName || 'Guest'})`);
  return res.json({ success: true });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌮  Pepper's Kitchen server running on http://localhost:${PORT}`);
  console.log(`   Square env: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
});
