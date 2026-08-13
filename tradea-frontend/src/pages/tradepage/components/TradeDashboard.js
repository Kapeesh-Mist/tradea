import React, { useState } from 'react';
import HeaderPanel from './HeaderPanel';
import TermsModal from './TermsModal';
import TradeDetails from './TradeDetails';
import LinkModal from './LinkModal';
import PreviewModal from "./PreviewModal";
const formatDate = (iso) => {
    if (!iso) return 'Invalid Date';

    // Strip microseconds (keep only 3 digits after dot)
    const cleaned = iso.replace(/\.(\d{3})\d*/, '.$1');

    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};


const TradeDashboard = ({ trade, onSwap, fetchTrade }) => {
    const [mode, setMode] = useState("file");
    const [files, setFiles] = useState([]);
    const [links, setLinks] = useState([]);
    const [linkInput, setLinkInput] = useState("");
    const [showTradeDetailsModal, setShowTradeDetailsModal] = useState(false);
    const [selectedTradeId, setSelectedTradeId] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const userId = Number(localStorage.getItem('user_id'));

    const handleUpload = async () => {
        const form = new FormData();
        form.append("trade_id", trade.id);
        form.append("uploader_id", userId);

        files.forEach(file => form.append("files", file));

        // Split links by line
        linkInput
            .split("\n")
            .map(link => link.trim())
            .filter(link => link)
            .forEach(link => form.append("links", link));

        const res = await fetch("http://localhost:8000/trade/upload", {
            method: "POST",
            body: form,
        });

        const data = await res.json();
        console.log("Uploaded:", data);
        setFiles([]);
        setLinks([]);
        setLinkInput("");
    };

    const handleCountdownEnd = async () => {
        const token = localStorage.getItem("token");
        const user_id = localStorage.getItem("user_id");

        try {
            const form = new FormData();
            form.append("user_id", user_id);

            const res = await fetch(`http://localhost:8000/trade/${trade.id}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });

            const data = await res.json();
            console.log("⛔ Auto-cancel result:", data);
            fetchTrade();
        } catch (err) {
            console.error("Auto-cancel error:", err);
        }
    };

    return (
        <div className="p-2 bg-white min-h-full font-sans">
            <HeaderPanel
                userName={trade?.other_party_name || 'User name'}
                avatarUrl={trade?.other_party_avatar_url}
                initiatedAt={formatDate(trade?.created_at)}
                endsAt={trade?.deadline}
                tradeName={trade?.item}
                onCountdownEnd={handleCountdownEnd}
            />
            {/* Buttons */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setShowTermsModal(true)}
                    className="flex-1 border-2 border-black rounded-lg py-2 px-3 flex items-center justify-center gap-2 hover:bg-gray-50 bg-white"
                >
                    <div className="bg-black text-white p-1 rounded-full">
                        {/* SVG icon */}
                    </div>
                    <span className="text-[#00c2ff] font-bold text-lg">View Terms</span>
                </button>

                <button
                    className="flex-1 border-2 border-black rounded-lg py-2 px-3 flex items-center justify-center gap-2 hover:bg-gray-50 bg-white"
                    onClick={() => {
                        setSelectedTradeId(trade.trade_id); // or whatever your trade ID variable is
                        setShowTradeDetailsModal(true);
                    }}
                >
                    <div className="bg-black text-white p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <span className="text-gray-600 font-bold text-lg">Edit trade</span>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 px-2">
                <div className="flex items-start justify-between relative">
                    {/* Line */}
                    <div className="absolute top-[9px] left-4 right-4 h-[3px] bg-gray-500 -z-10 bg-opacity-30"></div>

                    <div className="absolute top-[9px] left-4 w-1/2 h-[3px] bg-gray-700 -z-10"></div>

                    {[
                        { label: 'Terms and\nCondition' },
                        { label: 'Escrow\nMoney' },
                        { label: 'Product\nFiles' },
                        { label: 'Transfer\nProducts' },
                        { label: 'Download\nTerms' }
                    ].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center z-10">
                            <div className={`w-5 h-5 rounded-full border-2 border-white ${idx === 2 ? 'bg-black ring-4 ring-gray-200' : 'bg-gray-800'}`}></div>
                            <p className="text-[10px] font-bold text-gray-600 mt-1 text-center whitespace-pre-line leading-tight">{step.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Locked Card */}
                <div className="border-[3px] border-black rounded-2xl p-4 flex flex-col items-center bg-white">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-black rounded-full p-2 h-10 w-10 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <span className="text-4xl font-bold">500</span>
                    </div>
                    <p className="text-xl mb-3 text-gray-700">Locked</p>
                    <button className="w-full border-[3px] border-black rounded-xl py-1 px-2 flex items-center justify-center gap-2 font-bold uppercase hover:bg-gray-50 bg-white">
                        {/* Phone icon approximation */}
                        <div className="border-2 border-gray-400 rounded h-8 w-5 flex items-center justify-center">
                            <div className="h-6 w-3 border border-gray-400 rounded-sm"></div>
                        </div>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] text-gray-500 font-extrabold">UPLOAD</span>
                            <span className="text-sm font-bold text-gray-700">MONEY</span>
                        </div>
                    </button>
                </div>

                {/* Preview Card */}
                <div className="border-[3px] border-black rounded-2xl p-4 flex flex-col justify-between bg-white">
                    <button
                        onClick={async () => {
                            const res = await fetch(`http://localhost:8000/trade/files?trade_id=${trade.id}`);
                            const data = await res.json();
                            setUploadedFiles(data.files); // assuming your backend returns { files: [...] }
                            setPreviewOpen(true);
                        }}
                        className="px-4 py-2 border border-black rounded"
                    >
                        Preview
                    </button>
                    <div className="flex gap-4">
                        {/* Hidden file input */}
                        <input
                            id="file-upload"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => setFiles([...e.target.files])}
                        />

                        {/* Styled label acts as button */}
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer px-4 py-2 bg-black text-white rounded"
                        >
                            Upload Files
                        </label>

                        {/* Add Link button opens modal */}
                        <button
                            onClick={() => setLinkModalOpen(true)}
                            className="px-4 py-2 border border-black rounded"
                        >
                            Add Link
                        </button>
                    </div>
                    <button
                        onClick={handleUpload}
                        className="mt-4 px-4 py-2 bg-black text-white rounded"
                    >
                        Upload to Trade
                    </button>
                </div>
            </div>

            {/* Activity Log */}
            <div className="border-[3px] border-black rounded-2xl p-3 mb-4 relative h-32 bg-white">
                <div className="flex items-start">
                    <div className="mr-2">
                        {/* Clipboard Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="12" x2="11" y2="12"></line><line x1="9" y1="16" x2="11" y2="16"></line><line x1="13" y1="12" x2="15" y2="12"></line><line x1="13" y1="16" x2="15" y2="16"></line></svg>
                        <h3 className="text-sm font-bold text-gray-600 -mt-1 text-center">Activity Log:</h3>
                    </div>
                    <div className="flex-1 mt-6">
                        <div className="border border-gray-400 rounded-[1.5rem] h-20 w-full"></div>
                    </div>
                </div>
            </div>

            {/* Swap Button */}
            <button onClick={onSwap} className="w-full border-2 border-black rounded-2xl p-2 flex items-center justify-center gap-4 hover:bg-gray-50 shadow-sm bg-white">
                {/* Swap Icon */}
                <div className="text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="32" viewBox="0 0 64 64" fill="currentColor">
                        {/* Abstract representation of hands exchanging cash/card */}
                        <rect x="10" y="20" width="30" height="20" rx="4" fill="currentColor" opacity="0.8" />
                        <rect x="25" y="10" width="30" height="20" rx="4" fill="currentColor" opacity="0.6" />
                    </svg>
                </div>
                <span className="text-5xl font-bold tracking-widest text-black font-sans">SWAP</span>
            </button>
            {/* Terms Modal */}
            {showTermsModal && (
                <TermsModal
                    tradeId={trade.id}
                    userId={userId}
                    onClose={() => setShowTermsModal(false)}
                    fetchTrade={fetchTrade}
                />
            )}
            <PreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                trade={trade}
                files={uploadedFiles}
            />

            <LinkModal
                isOpen={linkModalOpen}
                onClose={() => setLinkModalOpen(false)}
                linkInput={linkInput}
                setLinkInput={setLinkInput}
                onConfirm={() => {
                    const newLinks = linkInput
                        .split("\n")
                        .map(link => link.trim())
                        .filter(link => link);
                    setLinks(prev => [...prev, ...newLinks]);
                    setLinkInput("");
                    setLinkModalOpen(false);
                }}
            />
            {showTradeDetailsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
                    onClick={() => setShowTradeDetailsModal(false)}
                >
                    <div
                        className="bg-slate-900 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <TradeDetails
                            tradeId={selectedTradeId}
                            onClose={() => setShowTradeDetailsModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradeDashboard;
