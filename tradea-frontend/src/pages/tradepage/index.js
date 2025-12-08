import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TradeLayout from './TradeLayout';
import TradeSidebar from './components/TradeSidebar';
import MilestoneTracker from './components/MilestoneTracker';
import TermsSection from './components/TermsSection';
import EscrowPanel from './components/EscrowPanel';
import ChatPanel from './components/ChatPanel';
import DeliveryPanel from './components/DeliveryPanel';

function TradePage() {
    const location = useLocation();
    // Auto-select trade from localStorage or location state
    const [selectedTradeId, setSelectedTradeId] = useState(() => {
        return location.state?.trade_id || localStorage.getItem("selected_trade_id") || null;
    });

    const [trade, setTrade] = useState(null);
    const [userId] = useState(Number(localStorage.getItem("user_id")));
    const token = localStorage.getItem("token");

    // Fetch trade data when a trade is selected
    const fetchTradeData = useCallback(async () => {
        if (!selectedTradeId) return;
        try {
            const tradeRes = await fetch(`http://localhost:8000/trade/view?trade_id=${selectedTradeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const tradeData = await tradeRes.json();

            const statusRes = await fetch(`http://localhost:8000/trade/status?trade_id=${selectedTradeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const statusData = await statusRes.json();

            setTrade({ ...tradeData.details, ...statusData.status, id: selectedTradeId });
        } catch (err) {
            console.error("Failed to fetch trade data:", err);
        }
    }, [selectedTradeId, token]);

    useEffect(() => {
        fetchTradeData();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchTradeData, 5000);
        return () => clearInterval(interval);
    }, [selectedTradeId, fetchTradeData]);

    // Action handlers
    const handleDepositEscrow = async () => {
        try {
            await fetch("http://localhost:8000/trade/escrow", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({ trade_id: selectedTradeId })
            });
            fetchTradeData();
        } catch (err) {
            console.error("Failed to deposit escrow:", err);
        }
    };

    const handleUploadDelivery = async (file) => {
        console.log("Uploading file:", file);
        try {
            const formData = new FormData();
            formData.append("trade_id", selectedTradeId);
            formData.append("uploader_id", userId);
            formData.append("file", file);

            await fetch("http://localhost:8000/trade/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData
            });
            fetchTradeData();
        } catch (err) {
            console.error("Failed to deliver:", err);
        }
    };

    const handleConfirmTrade = async () => {
        try {
            await fetch("http://localhost:8000/trade/swap/confirm", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    trade_id: selectedTradeId,
                    user_id: userId
                })
            });
            fetchTradeData();
        } catch (err) {
            console.error("Failed to confirm trade:", err);
        }
    };

    const isBuyer = trade && userId === trade.buyer_id;

    let currentStep = 0;
    if (trade?.buyer_accepted_terms && trade?.seller_accepted_terms) currentStep = 1;
    if (trade?.escrow_locked) currentStep = 2;
    if (trade?.seller_delivered) currentStep = 3;
    if (trade?.trade_completed) currentStep = 4;

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
            {/* 2. Trade Sidebar (Selector) */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200">
                <TradeSidebar
                    onSelect={(id) => {
                        setSelectedTradeId(id);
                        localStorage.setItem("selected_trade_id", id);
                    }}
                    selectedTradeId={selectedTradeId}
                />
            </div>

            {/* 3. Main Content & Chat Panel */}
            <div className="flex-1 min-w-0">
                <TradeLayout
                    rightPanel={
                        selectedTradeId ? (
                            <ChatPanel
                                requestId={trade?.request_id}
                                otherUser={{
                                    id: userId === trade?.buyer_id ? trade?.seller_id : trade?.buyer_id,
                                    name: trade?.other_party_name,
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
                    ) : !trade ? (
                        <div className="flex items-center justify-center h-64">Loading trade details...</div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${trade.seller_id}&background=random`}
                                                alt="Avatar"
                                            />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-gray-900">{trade.item}</h1>
                                            <p className="text-sm text-gray-500">
                                                Initiated on {new Date().toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-500">Other Party</span>
                                        <p className="font-medium text-gray-900">
                                            User {isBuyer ? trade.seller_id : trade.buyer_id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Milestone Tracker */}
                            <div className="mb-8">
                                <MilestoneTracker currentStep={currentStep} />
                            </div>

                            {/* Workflow Panels */}
                            <div className="space-y-6">
                                <div
                                    className={`p-6 rounded-xl border ${currentStep >= 1
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-800">1. Trade Terms</h3>
                                        {currentStep >= 1 && (
                                            <span className="text-green-600 text-sm font-bold">✓ Agreed</span>
                                        )}
                                    </div>
                                    <TermsSection trade={trade} />
                                </div>

                                <EscrowPanel
                                    escrowLocked={trade.escrow_locked}
                                    tradeCompleted={trade.trade_completed}
                                    onDeposit={handleDepositEscrow}
                                    onRelease={() => { }}
                                />

                                <DeliveryPanel
                                    isSeller={!isBuyer}
                                    isDelivered={trade.seller_delivered}
                                    onUpload={handleUploadDelivery}
                                    watermarkText={`User ${trade.seller_id}`}
                                />
                            </div>

                            {/* Confirmation Section */}
                            {trade.escrow_locked &&
                                trade.seller_delivered &&
                                !trade.trade_completed && (
                                    <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                        <h3 className="text-lg font-bold text-blue-900 mb-2">
                                            Ready to Complete Trade?
                                        </h3>
                                        <p className="text-blue-700 mb-6">
                                            Both parties must confirm to release funds and finalize the transfer simultaneously.
                                        </p>

                                        <button
                                            onClick={handleConfirmTrade}
                                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg transform transition hover:-translate-y-0.5"
                                        >
                                            Confirm Trade & Release
                                        </button>

                                        <div className="mt-4 flex justify-center space-x-8 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <span
                                                    className={`w-3 h-3 rounded-full mr-2 ${trade.buyer_confirmed_delivery
                                                        ? 'bg-green-500'
                                                        : 'bg-gray-300'
                                                        }`}
                                                ></span>
                                                Buyer Confirmed
                                            </div>
                                            <div className="flex items-center">
                                                <span
                                                    className={`w-3 h-3 rounded-full mr-2 ${trade.seller_delivered ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}
                                                ></span>
                                                Seller Confirmed
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </>
                    )}
                </TradeLayout>
            </div>
        </div>
    );
}

export default TradePage;