import React, { useEffect, useState } from 'react';

const HeaderPanel = ({
  userName,
  avatarUrl,
  initiatedAt,
  endsAt,
  tradeName,
  onCountdownEnd,
}) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  useEffect(() => {
    if (!endsAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(endsAt);
      const diff = end - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        if (onCountdownEnd) onCountdownEnd();
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = days > 0
        ? `${days} DAYS ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(hours + days * 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      setTimeLeft(formatted);
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onCountdownEnd]);

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Top Row */}
      <div className="flex items-start justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl || '/default-avatar.png'}
            alt="User Avatar"
            className="w-16 h-16 rounded-full border-2 border-black object-cover bg-gray-200"
          />
          <div>
            <h1 className="text-2xl font-bold text-black leading-tight">{userName}</h1>
            <p className="text-black italic font-bold text-sm">
              Initiated on {initiatedAt}
            </p>
          </div>
        </div>

        {/* Countdown + Options */}
        <div className="flex items-start gap-2 relative">
          <div className="text-right leading-none">
            <p className="text-[#ff6b6b] text-lg italic font-medium">Ends in:</p>
            <p className="text-[#ff6b6b] text-xl font-bold">{timeLeft}</p>
          </div>
          <button
            className="text-black p-1"
            onClick={() => setShowOptions((prev) => !prev)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {showOptions && (
            <div className="absolute top-10 right-0 bg-white border border-black rounded-md shadow-md z-10 p-2 text-sm font-semibold text-gray-700">
              <p className="cursor-pointer hover:text-black">Option 1</p>
              <p className="cursor-pointer hover:text-black">Option 2</p>
              <p className="cursor-pointer hover:text-black">Option 3</p>
            </div>
          )}
        </div>
      </div>

      {/* Trade Name */}
      <h2 className="text-xl text-gray-400 italic font-serif ml-1">{tradeName}</h2>
    </div>
  );
};

export default HeaderPanel;