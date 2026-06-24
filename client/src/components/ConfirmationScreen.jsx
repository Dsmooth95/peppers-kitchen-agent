import { useState, useEffect } from 'react';
import { CheckCircle, Monitor, Printer, Smartphone } from 'lucide-react';

const NOTIFICATIONS = [
  {
    key: 'kds',
    Icon: Monitor,
    title: 'Square KDS',
    subtitle: 'Order received on kitchen display',
    colorBg: 'bg-blue-500/15',
    colorBorder: 'border-blue-500/30',
    colorIcon: 'text-blue-400',
    colorCheck: 'text-blue-400',
  },
  {
    key: 'printer',
    Icon: Printer,
    title: 'Receipt Printer',
    subtitle: 'Ticket printed',
    colorBg: 'bg-purple-500/15',
    colorBorder: 'border-purple-500/30',
    colorIcon: 'text-purple-400',
    colorCheck: 'text-purple-400',
  },
  {
    key: 'sms',
    Icon: Smartphone,
    title: 'Owner SMS',
    subtitle: "Order summary sent to owner's phone",
    colorBg: 'bg-green-500/15',
    colorBorder: 'border-green-500/30',
    colorIcon: 'text-green-400',
    colorCheck: 'text-green-400',
  },
];

export default function ConfirmationScreen({
  orderNumber,
  pickupTime,
  cartItems,
  total,
  customerName,
  onDone,
}) {
  const [visibleSet, setVisibleSet] = useState(new Set());

  // Stagger kitchen notification cards
  useEffect(() => {
    NOTIFICATIONS.forEach(({ key }, i) => {
      setTimeout(
        () => setVisibleSet((prev) => new Set([...prev, key])),
        1000 + i * 1500
      );
    });
  }, []);

  const displayNum = orderNumber || `PK-${Date.now().toString().slice(-6)}`;
  const displayTime = pickupTime || '~20 minutes';

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        {/* ── Confirmation card ─────────────────────────────────────────────────── */}
        <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl mb-4">
          {/* Green header */}
          <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-7 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-500/30 pop-in">
              <CheckCircle size={30} className="text-white" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              {customerName ? `Thanks, ${customerName}!` : 'Order Confirmed!'}
            </h1>
            <p className="text-green-400 text-sm mt-1.5">
              Thank you for ordering from Pepper's Kitchen 🌮
            </p>
          </div>

          {/* Order meta */}
          <div className="px-6 py-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">
                  Order #
                </p>
                <p className="text-white font-mono font-bold text-lg">
                  {displayNum}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">
                  Pickup
                </p>
                <p className="text-orange-400 font-semibold">{displayTime}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="border-t border-gray-800 pt-3 space-y-1.5">
              {cartItems.map((item, i) => {
                const modTotal = (item.modifiers || []).reduce(
                  (s, m) => s + (m.price || 0),
                  0
                );
                const lineTotal = (item.unitPrice + modTotal) * item.quantity;
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-gray-500 tabular-nums">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-gray-800 mt-2 pt-2 flex justify-between font-semibold">
                <span className="text-white">Total Paid</span>
                <span className="text-white tabular-nums">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Kitchen notification cards ─────────────────────────────────────────── */}
        <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-widest px-1 mb-3">
          Kitchen Notifications
        </h3>

        <div className="space-y-3 mb-5">
          {NOTIFICATIONS.map(
            ({
              key,
              Icon,
              title,
              subtitle,
              colorBg,
              colorBorder,
              colorIcon,
              colorCheck,
            }) => {
              const visible = visibleSet.has(key);
              return (
                <div
                  key={key}
                  className={`border rounded-2xl p-4 transition-all duration-500 ${
                    visible
                      ? `${colorBg} ${colorBorder} opacity-100 translate-y-0`
                      : 'border-gray-800 bg-gray-900/50 opacity-0 translate-y-3'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Icon circle */}
                      <div
                        className={`w-9 h-9 rounded-xl ${colorBg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <Icon size={17} className={colorIcon} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">{title}</p>
                        <p className="text-gray-500 text-xs">{subtitle}</p>

                        {/* Owner SMS mock bubble */}
                        {key === 'sms' && visible && (
                          <div className="mt-3 bg-gray-800 rounded-2xl rounded-tl-none p-3 text-xs max-w-xs fade-in-up">
                            <p className="text-white font-semibold mb-1.5">
                              🌮 New Order {displayNum}{customerName ? ` — ${customerName}` : ''}
                            </p>
                            {cartItems.map((item, ci) => {
                              const modTotal = (item.modifiers || []).reduce(
                                (s, m) => s + (m.price || 0),
                                0
                              );
                              const lineTotal =
                                (item.unitPrice + modTotal) * item.quantity;
                              return (
                                <p key={ci} className="text-gray-300">
                                  {item.quantity}× {item.name} —{' '}
                                  <span className="tabular-nums">
                                    ${lineTotal.toFixed(2)}
                                  </span>
                                </p>
                              );
                            })}
                            <div className="border-t border-gray-700 mt-2 pt-2">
                              <p className="text-white font-semibold tabular-nums">
                                Total: ${total.toFixed(2)}
                              </p>
                              <p className="text-gray-500 mt-0.5">
                                Pickup: {displayTime}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkmark */}
                    {visible && (
                      <CheckCircle
                        size={18}
                        className={`${colorCheck} flex-shrink-0 pop-in mt-0.5`}
                      />
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium py-3.5 rounded-2xl transition-colors"
        >
          Start New Order
        </button>
      </div>
    </div>
  );
}
