import React, { useEffect, useState } from 'react';

const TermsModal = ({ tradeId, userId, onClose, fetchTrade }) => {
    const [terms, setTerms] = useState('');
    const [editing, setEditing] = useState(false);
    const [demand, setDemand] = useState('');
    const [otherDemand, setOtherDemand] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const fetchTerms = async () => {
            const res = await fetch(`http://localhost:8000/trade/terms/view?trade_id=${tradeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            console.log("Fetched terms data:", data);
            setTerms(data.terms_text);
        };

        const fetchDemands = async () => {
            const res = await fetch(`http://localhost:8000/trade/details/fetch?trade_id=${tradeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setDemand(data.demand);
            setOtherDemand(data.other_demand);
        };

        fetchTerms();
        fetchDemands();
    }, [tradeId]);

    const handleSave = async () => {
        await fetch(`http://localhost:8000/trade/terms/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ trade_id: tradeId, new_terms: terms }),
        });
        setEditing(false);
        fetchTrade();
    };

    const handleAcceptTerms = async () => {
        await fetch(`http://localhost:8000/trade/terms/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ trade_id: tradeId }),
        });
        setAcceptedTerms(true);
        fetchTrade();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-md w-[95%] max-w-4xl shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Trade Terms</h2>
                    {!editing && (
                        <button onClick={() => setEditing(true)} className="text-sm text-blue-600 underline">
                            Edit Terms
                        </button>
                    )}
                </div>

                <textarea
                    className={`w-full h-64 border p-3 rounded text-sm font-mono ${editing ? 'bg-white' : 'bg-gray-100'} transition`}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    readOnly={!editing}
                />

                {editing && (
                    <div className="flex justify-end mt-3">
                        <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                            Save
                        </button>
                    </div>
                )}

                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-1">Your Demand</h3>
                    <p className="text-sm text-gray-700 border p-2 rounded bg-gray-50">{demand}</p>

                    <h3 className="text-lg font-semibold mt-4 mb-1">Other Party's Demand</h3>
                    <p className="text-sm text-gray-700 border p-2 rounded bg-gray-50">{otherDemand}</p>
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Close</button>
                    <button
                        onClick={handleAcceptTerms}
                        disabled={acceptedTerms}
                        className={`px-4 py-2 rounded ${acceptedTerms ? 'bg-green-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        {acceptedTerms ? 'Accepted' : 'Accept Terms'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;