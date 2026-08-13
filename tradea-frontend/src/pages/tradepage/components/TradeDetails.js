import { useEffect, useState } from "react";

export default function TradeDetailsPage({ tradeId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [trade, setTrade] = useState(null);
    const [editMode, setEditMode] = useState(false);

    const [item, setItem] = useState("");
    const [price, setPrice] = useState("");
    const [deadline, setDeadline] = useState("");
    const [demand, setDemand] = useState("");

    const token = localStorage.getItem("token");

    const fetchTradeDetails = async () => {
        try {
            const res = await fetch(`http://localhost:8000/trade/details/fetch?trade_id=${tradeId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.status === "ok") {
                setTrade(data);
                setItem(data.item);
                setPrice(data.price);
                setDeadline(data.deadline?.slice(0, 16)); // for datetime-local input
                setDemand(data.demand);
            }
        } catch (err) {
            console.error("Failed to fetch trade details:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        const form = new FormData();
        form.append("trade_id", tradeId);
        form.append("item", item);
        form.append("price", price);
        form.append("deadline", deadline);
        form.append("demand", demand);

        const res = await fetch("http://localhost:8000/trade/details/update", {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });

        const data = await res.json();
        if (data.message) {
            alert("✅ Trade updated");
            setEditMode(false);
            fetchTradeDetails();
        } else {
            alert("❌ Update failed: " + data.details);
        }
    };

    useEffect(() => {
        fetchTradeDetails();
    }, [tradeId]);

    if (loading) return <div className="p-6 text-slate-400">Loading trade details...</div>;
    if (!trade) return <div className="p-6 text-red-500">Trade not found.</div>;

    return (
        <div className="relative">
            <button
                onClick={onClose}
                className="absolute top-0 right-0 text-slate-400 hover:text-white text-xl p-2"
            >
                ×
            </button>

            <div className="p-6 max-w-3xl mx-auto text-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Trade Details</h1>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="text-blue-400 hover:underline text-sm"
                    >
                        {editMode ? "Cancel Edit" : "✎ Edit"}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400">Trade Name</label>
                        {editMode ? (
                            <input
                                className="w-full bg-slate-800 p-2 rounded"
                                value={item}
                                onChange={(e) => setItem(e.target.value)}
                            />
                        ) : (
                            <p className="text-lg font-medium">{trade.item}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400">Price</label>
                            {editMode ? (
                                <input
                                    type="number"
                                    className="w-full bg-slate-800 p-2 rounded"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            ) : (
                                <p>₹{trade.price}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400">Deadline</label>
                            {editMode ? (
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-800 p-2 rounded"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            ) : (
                                <p>{new Date(trade.deadline).toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 capitalize">
                            Your Demand ({trade.role})
                        </label>
                        {editMode ? (
                            <textarea
                                className="w-full bg-slate-800 p-2 rounded"
                                rows={4}
                                value={demand}
                                onChange={(e) => setDemand(e.target.value)}
                            />
                        ) : (
                            <p className="whitespace-pre-wrap text-slate-300">{trade.demand}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400">Other Party's Demand</label>
                        <p className="whitespace-pre-wrap text-slate-500">{trade.other_demand || "—"}</p>
                    </div>

                    <div className="text-sm text-slate-500">
                        <p>Created on: {new Date(trade.created_at).toLocaleString()}</p>
                        <p>Other party: {trade.other_user_name}</p>
                    </div>

                    {editMode && (
                        <button
                            onClick={handleCommit}
                            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
                        >
                            Commit Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}