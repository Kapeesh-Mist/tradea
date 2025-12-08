import { useState, useEffect } from 'react';

function TradeSidebar({ onSelect, selectedTradeId }) {
    console.log("✅ TradeSidebar mounted");

    const [trades, setTrades] = useState([]);
    const [userId] = useState(Number(localStorage.getItem("user_id")));
    const token = localStorage.getItem("token");

    const [openSections, setOpenSections] = useState({
        ongoing: true,
        past: false,
        cancelled: false
    });

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await fetch(`http://localhost:8000/user/${userId}/trades`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setTrades(data.trades || []);
                console.log("Fetched trades:", data.trades);
            } catch (err) {
                console.error("Failed to fetch trades:", err);
            }
        };
        fetchTrades();
    }, [userId, token]);

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const ongoingTrades = trades.filter(t => !t.trade_completed && !t.is_cancelled);
    const pastTrades = trades.filter(t => t.trade_completed);
    const cancelledTrades = trades.filter(t => t.is_cancelled);

    const renderTradeList = (list) => (
        <div className="space-y-1 mt-2">
            {list.length === 0 ? (
                <p className="text-slate-500 text-sm pl-4 italic">No trades</p>
            ) : (
                list.map(trade => {
                    const isActive = selectedTradeId === trade.trade_id;
                    const otherPartyName = trade.other_party_name || `User ${userId === trade.buyer_id ? trade.seller_id : trade.buyer_id}`;
                    const avatarUrl = trade.other_party_avatar_url;

                    return (
                        <button
                            key={trade.trade_id}
                            onClick={() => onSelect(trade.trade_id)}
                            className={`w-full text-left group flex items-center px-3 py-2 rounded-md transition-all duration-200 ${isActive
                                    ? 'bg-slate-800 text-white shadow-sm border-l-2 border-blue-500'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white mr-3">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    otherPartyName.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm truncate">{trade.item}</span>
                                    <div className="flex space-x-1">
                                        {trade.escrow_locked && (
                                            <span className="text-green-400 text-xs font-semibold">Escrowed</span>
                                        )}
                                        {trade.seller_delivered && (
                                            <span className="text-yellow-400 text-xs font-semibold">Delivered</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 truncate group-hover:text-slate-400">
                                    {otherPartyName}
                                </div>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-300">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
                    <span className="text-blue-500 mr-2">✦</span> Tradea
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Trade Management</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                {/* Ongoing Trades */}
                <div>
                    <button
                        onClick={() => toggleSection('ongoing')}
                        className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition mb-2"
                    >
                        <span>Ongoing Trades</span>
                        <span className="text-lg leading-none">{openSections.ongoing ? '−' : '+'}</span>
                    </button>
                    {openSections.ongoing && renderTradeList(ongoingTrades)}
                </div>

                {/* Past Trades */}
                <div>
                    <button
                        onClick={() => toggleSection('past')}
                        className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition mb-2"
                    >
                        <span>Past Trades</span>
                        <span className="text-lg leading-none">{openSections.past ? '−' : '+'}</span>
                    </button>
                    {openSections.past && renderTradeList(pastTrades)}
                </div>

                {/* Cancelled Trades */}
                <div>
                    <button
                        onClick={() => toggleSection('cancelled')}
                        className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition mb-2"
                    >
                        <span>Cancelled</span>
                        <span className="text-lg leading-none">{openSections.cancelled ? '−' : '+'}</span>
                    </button>
                    {openSections.cancelled && renderTradeList(cancelledTrades)}
                </div>
            </div>
        </div>
    );
}

export default TradeSidebar;