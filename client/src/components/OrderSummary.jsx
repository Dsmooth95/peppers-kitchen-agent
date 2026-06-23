import { useRef, useEffect, useState } from 'react';
import { ShoppingBag, Clock } from 'lucide-react';

export default function OrderSummary({ cartItems, total, pickupTime }) {
  const prevLenRef = useRef(0);
  const [highlightIdx, setHighlightIdx] = useState(null);

  useEffect(() => {
    if (cartItems.length > prevLenRef.current) {
      setHighlightIdx(cartItems.length - 1);
      const t = setTimeout(() => setHighlightIdx(null), 700);
      prevLenRef.current = cartItems.length;
      return () => clearTimeout(t);
    }
    prevLenRef.current = cartItems.length;
  }, [cartItems.length]);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/60 border-b border-gray-800">
        <ShoppingBag size={15} className="text-orange-400 flex-shrink-0" />
        <h2 className="text-white text-sm font-semibold">Live Order</h2>
        {cartItems.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">
            {cartItems.reduce((s, i) => s + i.quantity, 0)} item
            {cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="p-4 min-h-[100px]">
        {cartItems.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6 leading-relaxed">
            Your order will appear here as you add items
          </p>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item, i) => {
              const modTotal = (item.modifiers || []).reduce(
                (s, m) => s + (m.price || 0),
                0
              );
              const lineTotal = (item.unitPrice + modTotal) * item.quantity;
              const isNew = i === highlightIdx;

              return (
                <div
                  key={i}
                  className={`text-sm ${isNew ? 'cart-item-new' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-orange-400 font-bold w-5 text-center flex-shrink-0 mt-px">
                        {item.quantity}×
                      </span>
                      <span className="text-white font-medium leading-snug">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-gray-300 ml-3 flex-shrink-0 tabular-nums">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                  {(item.modifiers || []).map((mod, mi) => (
                    <p key={mi} className="text-gray-500 text-xs ml-7 mt-0.5">
                      + {mod.name}{' '}
                      <span className="text-gray-600">
                        (+${mod.price.toFixed(2)})
                      </span>
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-800 px-4 pt-3 pb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Order Total</span>
            <span className="text-white font-bold text-lg tabular-nums">
              ${total.toFixed(2)}
            </span>
          </div>
          {pickupTime && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <Clock size={11} />
              <span>Pickup at {pickupTime}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
