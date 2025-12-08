import React from 'react';

function EscrowPanel({ isBuyer, escrowLocked, onDeposit, onRelease, tradeCompleted }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${escrowLocked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">$ 500</h3>
                    <p className={`text-sm font-medium ${escrowLocked ? 'text-green-600' : 'text-gray-500'}`}>
                        {escrowLocked ? 'Locked in escrow' : 'Waiting for deposit'}
                    </p>
                </div>
            </div>

            {/* Actions could go here if we wanted them inline, but design shows them separate or below */}
            {/* Keeping logic simple for now, relying on parent to show buttons if needed, or we can add them here */}
        </div>
    );
}

export default EscrowPanel;
