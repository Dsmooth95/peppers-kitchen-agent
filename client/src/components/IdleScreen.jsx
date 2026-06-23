import { Phone, MapPin } from 'lucide-react';

export default function IdleScreen({ onCall }) {
  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex justify-center">
      {/* Phone outer shell */}
      <div className="w-80 bg-gray-800 rounded-[3rem] p-3 shadow-2xl border border-gray-700">
        {/* Inner screen */}
        <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-4 pb-2 text-gray-500 text-xs">
            <span>{time}</span>
            <div className="flex items-center gap-1.5">
              <span className="tracking-tight">●●●</span>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                <path d="M1 9.5C3.5 7 6 5.5 7.5 5.5C9 5.5 11.5 7 14 9.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3.5 7C5 5.5 6.3 4.5 7.5 4.5C8.7 4.5 10 5.5 11.5 7" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7.5" cy="9.5" r="1" fill="#6b7280"/>
              </svg>
              <span>100%</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-8 pt-6 pb-10">
            {/* Avatar */}
            <div className="relative mb-5">
              <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/25">
                <span className="text-5xl leading-none">🌮</span>
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-950" />
            </div>

            <h1 className="text-white text-2xl font-bold tracking-tight mb-0.5">
              Pepper's Kitchen
            </h1>
            <p className="text-gray-400 text-sm mb-3">AI Food Truck Ordering</p>

            <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-5">
              <MapPin size={11} />
              <span>Downtown Food Truck Park</span>
            </div>

            <p className="text-orange-400 text-xl font-mono tracking-widest font-medium mb-8">
              (855) 595-6727
            </p>

            {/* Animated call button */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute w-24 h-24 bg-green-500 rounded-full opacity-15 animate-ping" />
              <div
                className="absolute w-20 h-20 bg-green-500 rounded-full opacity-10 animate-ping"
                style={{ animationDelay: '0.4s', animationDuration: '1.6s' }}
              />
              <button
                onClick={onCall}
                className="relative w-16 h-16 bg-green-500 hover:bg-green-400 active:scale-95 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40 transition-all duration-150 cursor-pointer"
                aria-label="Start order"
              >
                <Phone size={26} className="text-white" fill="white" />
              </button>
            </div>

            <p className="text-gray-600 text-xs text-center">
              Tap to place your order
            </p>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-2">
          <div className="w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}
