import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TradeLayout from './TradeLayout';
import TradeSidebar from './components/TradeSidebar';
import ChatPanel from './components/ChatPanel';
import TradeDetailsForm from './components/TradeDetailsForm';
import TradeDashboard from './components/TradeDashboard';

function TradePage() {
    const location = useLocation();
    const [selectedTradeId, setSelectedTradeId] = useState(() => {
        return location.state?.trade_id || localStorage.getItem("selected_trade_id") || null;
    });

    const [tradeId, setTradeId] = useState(() => selectedTradeId);
    const [requestId, setRequestId] = useState(null);
    const [trade, setTrade] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userId] = useState(Number(localStorage.getItem("user_id")));
    const token = localStorage.getItem("token");

    const fetchTradeData = useCallback(async () => {
        if (!tradeId || !token) return;
        try {
            // 1. Fetch /trade/view
            const tradeRes = await fetch(`http://localhost:8000/trade/view?trade_id=${tradeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const tradeData = await tradeRes.json();
            const request_id = tradeData.details?.request_id;
            // 2. Fetch /trade/intent/status
            let statusData = {};
            if (request_id) {
                const statusRes = await fetch(`http://localhost:8000/trade/intent/status?request_id=${request_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                statusData = await statusRes.json();
                setRequestId(request_id);
            }
            // 3. Fetch /trade/details/fetch
            const detailsRes = await fetch(`http://localhost:8000/trade/details/fetch?trade_id=${tradeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const detailsData = await detailsRes.json();
            // 4. Merge all into one trade object
            setTrade({
                ...(tradeData.details || {}),
                ...statusData,
                ...detailsData,
                id: tradeId,
                request_id
            });
        } catch (err) {
            console.error("Failed to fetch trade data:", err);
        } finally {
            setLoading(false);
        }
    }, [tradeId, token]);

    useEffect(() => {
        fetchTradeData();
        const interval = setInterval(fetchTradeData, 5000);
        return () => clearInterval(interval);
    }, [tradeId, fetchTradeData]);

    const otherPartyId = trade ? (userId === trade?.buyer_id ? trade?.seller_id : trade?.buyer_id) : "User";
    const otherPartyName = trade?.other_party_name || `User ${otherPartyId}`;
    const bothProceeded = trade?.buyer_proceeded && trade?.seller_proceeded;

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200">
                <TradeSidebar
                    onSelect={(id) => {
                        setSelectedTradeId(id);
                        localStorage.setItem("selected_trade_id", id);
                        setTradeId(id);
                        setTrade(null);
                        setRequestId(null);
                        setLoading(true);
                    }}
                    selectedTradeId={selectedTradeId}
                />
            </div>

            <div className="flex-1 min-w-0">
                <TradeLayout
                    rightPanel={
                        trade && requestId ? (
                            <ChatPanel
                                requestId={requestId}
                                otherUser={{
                                    id: otherPartyId,
                                    name: otherPartyName,
                                    avatar_url: trade?.other_party_avatar_url
                                }}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Select a trade to chat
                            </div>
                        )
                    }
                >
                    {!selectedTradeId ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-20">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">👋</span>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-700">Welcome to Tradea</h2>
                            <p className="mt-2">Select a trade from the sidebar to view details.</p>
                        </div>
                    ) : loading ? (
                        <div className="text-center py-10">Loading trade...</div>
                    ) : bothProceeded ? (
                        <TradeDashboard
                            trade={trade}
                            onSwap={() => console.log("Swap initiated")}
                            fetchTrade={fetchTradeData}
                        />
                    ) : (
                        <TradeDetailsForm
                            tradeId={trade?.id}
                            requestId={trade?.request_id}
                            userAvatar={trade?.user_avatar_url}
                            role={trade?.role}
                            youProceeded={
                                (trade?.role === 'buyer' && trade?.buyer_proceeded) ||
                                (trade?.role === 'seller' && trade?.seller_proceeded)
                            }
                            onProceed={fetchTradeData}
                        />
                        
                    )}
                </TradeLayout>
            </div>
        </div>
    );
}

export default TradePage;