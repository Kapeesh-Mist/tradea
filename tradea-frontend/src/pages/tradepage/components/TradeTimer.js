import { useState } from 'react';

function TradeTimer({ deadline, onSetDeadline, onAcceptDeadline, isBuyer, isDeadlineAccepted }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handlePropose = () => {
        if (date && time) {
            const proposedDeadline = new Date(`${date}T${time}`).toISOString();
            onSetDeadline(proposedDeadline);
        }
    };

    if (isDeadlineAccepted) {
        const timeLeft = new Date(deadline) - new Date();
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">⏳ Time Remaining</h3>
                        <p className="text-gray-600">
                            Trade automatically cancels if not completed by deadline.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-mono font-bold text-blue-600">
                            {days}d {hours}h
                        </div>
                        <div className="text-sm text-gray-500">
                            Deadline: {new Date(deadline).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold mb-4">⏰ Set Trade Deadline</h3>
            <p className="text-gray-600 mb-4">
                Agree on a completion time. If the trade isn't completed by this time, funds are returned.
            </p>

            {deadline ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-yellow-800">Proposed Deadline</p>
                        <p className="text-yellow-900 text-lg font-bold">
                            {new Date(deadline).toLocaleString()}
                        </p>
                    </div>
                    {!isDeadlineAccepted && (
                        <button
                            onClick={onAcceptDeadline}
                            className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-700 transition"
                        >
                            Accept Deadline
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            className="border rounded-md p-2"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                            type="time"
                            className="border rounded-md p-2"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handlePropose}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition h-10"
                    >
                        Propose Deadline
                    </button>
                </div>
            )}
        </div>
    );
}

export default TradeTimer;
