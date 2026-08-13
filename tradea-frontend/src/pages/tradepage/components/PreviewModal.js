import React, { useState, useEffect } from "react";

const TextPreview = ({ fileUrl, uploader }) => {
    const [content, setContent] = useState("");

    useEffect(() => {
        fetch(fileUrl)
            .then(res => res.text())
            .then(setContent)
            .catch(() => setContent("⚠️ Failed to load file content."));
    }, [fileUrl]);

    return (
        <div className="relative w-full h-[70vh] overflow-auto border bg-gray-100 p-4 font-mono text-sm">
            <pre className="whitespace-pre-wrap">{content}</pre>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-6xl font-bold text-black/10 rotate-45 select-none">
                    {uploader}
                </div>
            </div>
        </div>
    );
};

const PreviewModal = ({ isOpen, onClose, trade, files }) => {
    const [selectedPreview, setSelectedPreview] = useState(null);

    if (!isOpen) return null;

    const renderPreview = (file) => {
        const ext = file.title.split(".").pop().toLowerCase();

        if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
            return (
                <div className="relative w-full h-auto">
                    <img src={file.file_url} alt={file.title} className="max-h-[70vh] mx-auto" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-6xl font-bold text-white/20 rotate-45 select-none">
                            {file.uploader_name}
                        </div>
                    </div>
                </div>
            );
        }

        if (["mp4", "webm", "mov"].includes(ext)) {
            return (
                <div className="relative w-full">
                    <video controls playsInline className="w-full max-h-[70vh]">
                        <source src={file.file_url} type={`video/${ext}`} />
                        Your browser does not support the video tag.
                    </video>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-6xl font-bold text-white/20 rotate-45 select-none">
                            {file.uploader_name}
                        </div>
                    </div>
                </div>
            );
        }

        if (["pdf"].includes(ext)) {
            return (
                <iframe
                    src={file.file_url}
                    className="w-full h-[70vh] border"
                    title="PDF Preview"
                />
            );
        }

        if (["txt", "py", "js", "json", "md", "html", "css"].includes(ext)) {
            return <TextPreview fileUrl={file.file_url} uploader={file.uploader_name} />;
        }

        if (!["png", "jpg", "jpeg", "gif", "webp", "mp4", "webm", "mov", "pdf", "txt", "py", "js", "json", "md", "html", "css"].includes(ext)) {
            if (file.file_url.startsWith("http")) {
                return (
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        Open Link
                    </a>
                );
            }
            return <p className="text-gray-500">⚠️ Preview not supported for this file type.</p>;
        }
        if (["mp3", "wav", "ogg"].includes(ext)) {
            return (
                <div className="relative w-full">
                    <audio controls className="w-full">
                        <source src={file.file_url} type={`audio/${ext}`} />
                        Your browser does not support the audio tag.
                    </audio>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-6xl font-bold text-black/10 rotate-45 select-none">
                            {file.uploader_name}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-[95%] max-w-6xl shadow-xl border-2 border-black overflow-y-auto max-h-[90vh]">
                <h2 className="text-2xl font-bold mb-2">Preview: {trade?.title || `Trade #${trade?.id}`}</h2>
                <p className="text-sm text-gray-600 mb-4">Trade ID: {trade?.id}</p>

                {files.length === 0 ? (
                    <p className="text-gray-500">No files or links uploaded yet.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {files.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedPreview(item)}
                                className="border p-3 rounded cursor-pointer hover:shadow-md"
                            >
                                <div className="font-semibold truncate">{item.title}</div>
                                <div className="text-sm text-gray-600">By: {item.uploader_name}</div>
                                <div className="text-xs text-gray-400">{new Date(item.uploaded_at).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
                </div>
            </div>

            {selectedPreview && (
                <div
                    className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="relative bg-white p-4 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <h2 className="text-xl font-bold mb-2">{selectedPreview.title}</h2>
                        <p className="text-sm text-gray-600 mb-4">Uploaded by: {selectedPreview.uploader_name}</p>

                        {renderPreview(selectedPreview)}

                        <button
                            onClick={() => setSelectedPreview(null)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreviewModal;