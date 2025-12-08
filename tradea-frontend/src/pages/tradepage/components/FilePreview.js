function FilePreview({ fileUrl, fileType, uploaderName, uploaderAvatar }) {
    return (
        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center group">
            {/* Watermark Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center opacity-30 select-none">
                <div className="transform -rotate-12 flex flex-col items-center">
                    {uploaderAvatar && (
                        <img
                            src={uploaderAvatar}
                            alt="Watermark"
                            className="w-16 h-16 rounded-full mb-2 grayscale"
                        />
                    )}
                    <span className="text-4xl font-bold text-gray-500 uppercase tracking-widest">
                        {uploaderName}
                    </span>
                    <span className="text-sm text-gray-400">PREVIEW ONLY</span>
                </div>
            </div>

            {/* Content */}
            {fileType.startsWith('image/') ? (
                <img src={fileUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
            ) : fileType.startsWith('video/') ? (
                <video src={fileUrl} controls className="max-h-full max-w-full" />
            ) : (
                <div className="text-center p-4">
                    <div className="text-5xl mb-2">📄</div>
                    <p className="text-gray-600 font-medium">Document Preview</p>
                    <p className="text-xs text-gray-400">(Download to view full content)</p>
                </div>
            )}

            {/* Protection Layer */}
            <div className="absolute inset-0 bg-transparent z-20" onContextMenu={(e) => e.preventDefault()}></div>
        </div>
    );
}

export default FilePreview;
