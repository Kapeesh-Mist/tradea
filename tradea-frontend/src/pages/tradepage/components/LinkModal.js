import React from "react";

const LinkModal = ({ isOpen, onClose, linkInput, setLinkInput, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl border-2 border-black">
                <h2 className="text-xl font-bold mb-4">Paste Your Links</h2>
                <textarea
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="One link per line"
                    className="w-full h-40 border p-2 rounded resize-none"
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={() => {
                            setLinkInput("");
                            onClose();
                        }}
                        className="px-4 py-2 border rounded"
                    >
                        Cancel
                    </button>

                    <button onClick={onConfirm} className="px-4 py-2 bg-black text-white rounded">Add Links</button>
                </div>
            </div>
        </div>
    );
};

export default LinkModal;