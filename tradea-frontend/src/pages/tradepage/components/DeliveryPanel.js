import React, { useState } from 'react';

const DeliveryPanel = ({ isBuyer, onDeposit, onUpload, deliveryLink, sellerDelivered, watermarkText }) => {
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create a fake local preview URL
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            // In a real app, we'd upload here or pass file to parent
            if (onUpload) onUpload(file);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Delivery</h3>

            <div className="flex gap-6">
                {/* Action Buttons */}
                <div className="flex-1 space-y-4">
                    <button
                        onClick={onDeposit}
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                        Deposit to Escrow
                    </button>

                    <label className="w-full flex items-center justify-center px-4 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition cursor-pointer">
                        <span>Upload File</span>
                        <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>

                    <p className="text-xs text-gray-500 text-center mt-2">
                        Upload fin's on rough to notify cation.
                    </p>
                </div>

                {/* Preview Area */}
                <div className="flex-1">
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 h-48 flex items-center justify-center relative overflow-hidden group">
                        {previewUrl || deliveryLink ? (
                            <>
                                <img
                                    src={previewUrl || deliveryLink}
                                    alt="Preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                                {/* Watermark Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 rotate-45">
                                    <span className="text-2xl font-bold text-gray-400 whitespace-nowrap select-none">
                                        {watermarkText || "PREVIEW"} • {watermarkText || "PREVIEW"}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto h-12 w-12 text-gray-300 mb-2">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-gray-400">No file uploaded</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryPanel;
