import { useState, useEffect, useRef } from 'react';
import { ExternalLink, MessageSquare, ArrowLeft, Loader } from 'lucide-react';
import OrderSummary from './OrderSummary.jsx';

export default function PaymentScreen({
  cartItems,
  total,
  pickupTime,
  sessionId,
  onPaymentConfirmed,
  onHangUp,
}) {
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [squareOrderId, setSquareOrderId] = useState(null);
  const [pendingOrderNum, setPendingOrderNum] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef(null);

  // ── Start polling Square order status ───────────────────────────────────────
  const startPolling = (orderId, orderNum) => {
    setIsPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/order-status/${orderId}`);
        const data = await res.json();
        if (data.confirmed) {
          clearInterval(pollRef.current);
          setIsPolling(false);
          onPaymentConfirmed({
            orderId,
            orderNum: data.orderNumber || orderNum,
          });
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Create Square payment link ──────────────────────────────────────────────
  const handlePayNow = async () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment link');

      setPaymentUrl(data.paymentUrl);
      setSquareOrderId(data.orderId);
      setPendingOrderNum(data.orderNumber);
      setSmsSent(true);

      window.open(data.paymentUrl, '_blank');
      startPolling(data.orderId, data.orderNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Demo helper: manually simulate payment confirmation
  const handleSimulate = async () => {
    if (!squareOrderId) return;
    try {
      await fetch('/api/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: squareOrderId }),
      });
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-center items-start">
      {/* ── Phone frame ───────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 flex-shrink-0 mx-auto lg:mx-0">
        <div className="bg-gray-800 rounded-[3rem] p-3 shadow-2xl border border-gray-700">
          <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 px-5 py-4 border-b border-gray-800 text-center">
              <h2 className="text-white font-semibold text-base">
                Confirm & Pay
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Pepper's Kitchen</p>
            </div>

            {/* Order preview */}
            <div className="px-4 py-3 max-h-44 overflow-y-auto chat-scrollbar space-y-2">
              {cartItems.map((item, i) => {
                const modTotal = (item.modifiers || []).reduce(
                  (s, m) => s + (m.price || 0),
                  0
                );
                const lineTotal = (item.unitPrice + modTotal) * item.quantity;
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate pr-2">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-gray-500 flex-shrink-0 tabular-nums">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total bar */}
            <div className="mx-4 border-t border-gray-800 pt-2.5 pb-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="text-white font-bold text-xl tabular-nums">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Simulated SMS notification */}
            {smsSent && (
              <div className="mx-4 mb-3 bg-gray-800 border border-gray-700 rounded-xl p-3 fade-in-up">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare size={11} className="text-green-400" />
                  <span className="text-green-400 text-xs font-medium">
                    Text Message Sent
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  Payment link sent to{' '}
                  <span className="text-white">(555) 000-0000</span>
                </p>
              </div>
            )}

            {error && (
              <p className="mx-4 mb-3 text-red-400 text-xs text-center bg-red-500/10 rounded-xl p-2.5">
                {error}
              </p>
            )}

            {/* CTA buttons */}
            <div className="p-4 pt-0 space-y-2">
              <button
                onClick={handlePayNow}
                disabled={isCreating}
                className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/20"
              >
                {isCreating ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    <span className="text-sm">Creating payment link…</span>
                  </>
                ) : (
                  <>
                    <ExternalLink size={15} />
                    <span>
                      {paymentUrl ? 'Reopen Payment Page' : 'Pay Now'}
                    </span>
                  </>
                )}
              </button>

              {isPolling && (
                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs py-1">
                  <Loader size={11} className="animate-spin" />
                  <span>Waiting for payment confirmation…</span>
                </div>
              )}

              {squareOrderId && !isPolling && (
                <button
                  onClick={handleSimulate}
                  className="w-full text-gray-600 hover:text-gray-400 text-xs py-1 transition-colors"
                >
                  [Demo: Simulate Payment Confirmed]
                </button>
              )}

              <button
                onClick={onHangUp}
                className="w-full flex items-center justify-center gap-1.5 text-gray-600 hover:text-gray-400 text-xs py-1 transition-colors"
              >
                <ArrowLeft size={10} />
                Back to start
              </button>
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center mt-2">
            <div className="w-24 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Order summary sidebar ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <OrderSummary
          cartItems={cartItems}
          total={total}
          pickupTime={pickupTime}
        />
      </div>
    </div>
  );
}
