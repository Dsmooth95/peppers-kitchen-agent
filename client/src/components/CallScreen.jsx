import { useState, useRef, useEffect } from 'react';
import { Phone, Send } from 'lucide-react';
import OrderSummary from './OrderSummary.jsx';

export default function CallScreen({
  messages,
  cartItems,
  total,
  isLoading,
  orderComplete,
  pickupTime,
  onSend,
  onEndCall,
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-center items-start">
      {/* ── Phone frame ───────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-80 flex-shrink-0 mx-auto lg:mx-0">
        <div className="bg-gray-800 rounded-[3rem] p-3 shadow-2xl border border-gray-700">
          <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Connected status bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-green-900/25 border-b border-green-800/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-medium">
                  Connected
                </span>
              </div>
              <span className="text-gray-500 text-xs">Pepper's Kitchen</span>
            </div>

            {/* Caller info strip */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
              <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
                <span className="text-lg leading-none">🌮</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  Pepper's Kitchen
                </p>
                <p className="text-gray-500 text-xs">AI Ordering Agent</p>
              </div>
            </div>

            {/* Chat window */}
            <div className="h-72 overflow-y-auto p-3 space-y-2.5 chat-scrollbar bg-gray-950">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] px-3 py-2 text-sm leading-relaxed rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white rounded-br-sm message-customer'
                        : 'bg-gray-800 text-gray-100 rounded-bl-sm message-pepper'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1 items-center h-3">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input row */}
            <div className="p-3 border-t border-gray-800 bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your order…"
                  disabled={isLoading}
                  className="flex-1 bg-gray-800 text-white text-sm rounded-full px-4 py-2 outline-none placeholder-gray-600 disabled:opacity-50 focus:ring-1 focus:ring-orange-500/40"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Send"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>

            {/* End call / proceed button */}
            <div className="flex justify-center px-4 py-3 bg-gray-900 rounded-b-[2.5rem]">
              <button
                onClick={onEndCall}
                className={`flex items-center gap-2 text-white text-sm px-6 py-2 rounded-full transition-all ${
                  orderComplete
                    ? 'bg-orange-500 hover:bg-orange-400 shadow-md shadow-orange-500/30'
                    : 'bg-red-700 hover:bg-red-600'
                }`}
              >
                <Phone
                  size={13}
                  className={orderComplete ? '' : 'rotate-[135deg]'}
                />
                {orderComplete ? 'Proceed to Payment' : 'End Call'}
              </button>
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center mt-2">
            <div className="w-24 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Live order summary ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <OrderSummary
          cartItems={cartItems}
          total={total}
          pickupTime={pickupTime}
        />
        {orderComplete && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/25 rounded-xl text-green-400 text-xs text-center fade-in-up">
            ✓ Order confirmed — ready for payment
          </div>
        )}
      </div>
    </div>
  );
}
