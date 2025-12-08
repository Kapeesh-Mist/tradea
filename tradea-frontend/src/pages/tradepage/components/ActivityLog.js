import { useState } from 'react';

function ActivityLog({ activities }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-24">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-left"
            >
                <h3 className="text-lg font-bold text-gray-800">📜 Activity Log</h3>
                <span className="text-gray-500 text-xl">{isOpen ? '−' : '+'}</span>
            </button>

            {isOpen && (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 mt-4 transition-all">
                    {activities.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No activity yet.</p>
                    ) : (
                        activities.map((log, index) => (
                            <div key={index} className="flex items-start">
                                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400 mr-3"></div>
                                <div>
                                    <p className="text-sm text-gray-800">{log.detail}</p>
                                    <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default ActivityLog;
