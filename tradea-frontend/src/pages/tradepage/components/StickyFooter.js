function StickyFooter({ isBuyer, tradeStatus, onDeposit, onDeliver, onConfirm }) {
    const getStatusColor = () => {
        switch (tradeStatus) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'negotiating': return 'bg-yellow-100 text-yellow-800';
            case 'escrow_locked': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed bottom-0 left-64 right-96 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-30">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor()}`}>
                        {tradeStatus.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-gray-500 hidden sm:block">
                        {tradeStatus === 'negotiating' && "Agree on terms and deadline to proceed."}
                        {tradeStatus === 'terms_accepted' && "Waiting for deadline acceptance."}
                        {tradeStatus === 'escrow_locked' && "Funds secured. Work in progress."}
                        {tradeStatus === 'delivered' && "Review files before completing trade."}
                    </p>
                </div>

                <div className="space-x-4">
                    {/* Contextual Action Button */}
                    {isBuyer && tradeStatus === 'terms_accepted' && (
                        <span className="text-sm text-gray-500 italic">Set Deadline above</span>
                    )}

                    {isBuyer && tradeStatus === 'deadline_accepted' && (
                        <button
                            onClick={onDeposit}
                            className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-md transform hover:scale-105 transition"
                        >
                            💰 Deposit Escrow
                        </button>
                    )}

                    {!isBuyer && tradeStatus === 'escrow_locked' && (
                        <button
                            onClick={onDeliver}
                            className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 shadow-md transform hover:scale-105 transition"
                        >
                            📤 Upload Delivery
                        </button>
                    )}

                    {isBuyer && tradeStatus === 'delivered' && (
                        <button
                            onClick={onConfirm}
                            className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 shadow-lg transform hover:scale-105 transition flex items-center"
                        >
                            <span className="mr-2">🤝</span> Trade Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StickyFooter;
