import React from 'react';
import TradeSidebar from './components/TradeSidebar';
import ChatPanel from './components/ChatPanel';
console.log("✅ TradeLayout rendered");

const TradeLayout = ({ children, rightPanel }) => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Main Content - 50% (flex-1) */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
            </div>

            {/* Right Chat Panel - 30% */}
            <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white">
                {rightPanel}
            </div>
        </div>
    );
};

export default TradeLayout;
