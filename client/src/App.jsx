import { useState, useCallback } from 'react';
import IdleScreen from './components/IdleScreen.jsx';
import CallScreen from './components/CallScreen.jsx';
import PaymentScreen from './components/PaymentScreen.jsx';
import ConfirmationScreen from './components/ConfirmationScreen.jsx';

function generateSessionId() {
  return (
    'sess_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).substring(2, 9)
  );
}

export default function App() {
  const [panel, setPanel] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [pickupTime, setPickupTime] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [squareOrderId, setSquareOrderId] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Derived total ───────────────────────────────────────────────────────────
  const total = cartItems.reduce((sum, item) => {
    const modTotal = (item.modifiers || []).reduce(
      (s, m) => s + (m.price || 0),
      0
    );
    return sum + (item.unitPrice + modTotal) * item.quantity;
  }, 0);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStartCall = useCallback(async () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setMessages([]);
    setCartItems([]);
    setOrderComplete(false);
    setPickupTime(null);
    setCustomerName(null);
    setSquareOrderId(null);
    setOrderNumber(null);
    setPanel('call');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello', sessionId: newSessionId }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages([
        {
          role: 'assistant',
          content:
            "Hello! Thank you for calling Pepper's Kitchen. What can I get started for you today?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return;

      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId }),
        });
        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.reply },
          ]);
        }
        if (data.cartItems?.length > 0) {
          setCartItems(data.cartItems);
        }
        if (data.orderComplete) {
          setOrderComplete(true);
        }
        if (data.suggestedPickupTime) {
          setPickupTime(data.suggestedPickupTime);
        }
        if (data.customerName) {
          setCustomerName(data.customerName);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              "I'm sorry, I'm having a little trouble. Could you repeat that?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const handleEndCall = useCallback(() => {
    setPanel('payment');
  }, []);

  const handlePaymentConfirmed = useCallback(({ orderId, orderNum }) => {
    setSquareOrderId(orderId);
    setOrderNumber(orderNum);
    setPanel('confirmation');
  }, []);

  const handleReset = useCallback(() => {
    setPanel('idle');
    setMessages([]);
    setCartItems([]);
    setOrderComplete(false);
    setPickupTime(null);
    setCustomerName(null);
    setSessionId(null);
    setSquareOrderId(null);
    setOrderNumber(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-4xl">
        {panel === 'idle' && <IdleScreen onCall={handleStartCall} />}

        {panel === 'call' && (
          <CallScreen
            messages={messages}
            cartItems={cartItems}
            total={total}
            isLoading={isLoading}
            orderComplete={orderComplete}
            pickupTime={pickupTime}
            onSend={handleSendMessage}
            onEndCall={handleEndCall}
          />
        )}

        {panel === 'payment' && (
          <PaymentScreen
            cartItems={cartItems}
            total={total}
            pickupTime={pickupTime}
            customerName={customerName}
            sessionId={sessionId}
            onPaymentConfirmed={handlePaymentConfirmed}
            onHangUp={handleReset}
          />
        )}

        {panel === 'confirmation' && (
          <ConfirmationScreen
            orderNumber={orderNumber}
            pickupTime={pickupTime}
            cartItems={cartItems}
            total={total}
            customerName={customerName}
            onDone={handleReset}
          />
        )}
      </div>
    </div>
  );
}
