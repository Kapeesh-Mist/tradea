import { useState } from 'react';

function TermsSection({ terms, onGenerate, onAccept, onEdit, isBuyer, buyerAccepted, sellerAccepted }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTerms, setEditedTerms] = useState(terms || "");

    const handleSave = () => {
        onEdit(editedTerms);
        setIsEditing(false);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📜 Terms & Conditions</h2>
                <div className="space-x-2">
                    {terms && (
                        <button
                            onClick={() => {
                                const element = document.createElement("a");
                                const file = new Blob([terms], { type: 'text/plain' });
                                element.href = URL.createObjectURL(file);
                                element.download = "trade_terms.txt";
                                document.body.appendChild(element); // Required for this to work in FireFox
                                element.click();
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium mr-2"
                        >
                            📥 Download
                        </button>
                    )}
                    {!terms && (
                        <button
                            onClick={onGenerate}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                        >
                            ✨ Generate with Gemini
                        </button>
                    )}
                    {terms && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-gray-600 hover:text-gray-900 underline"
                        >
                            Edit Terms
                        </button>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div>
                    <textarea
                        className="w-full h-64 p-4 border rounded-md font-mono text-sm"
                        value={editedTerms}
                        onChange={(e) => setEditedTerms(e.target.value)}
                    />
                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <div className="prose max-w-none bg-gray-50 p-4 rounded-md border">
                    {terms ? (
                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{terms}</pre>
                    ) : (
                        <p className="text-gray-500 italic text-center py-8">
                            No terms generated yet. Use the button above to draft terms based on your chat history.
                        </p>
                    )}
                </div>
            )}

            {terms && !isEditing && (
                <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between items-center">
                        <div className="flex space-x-8">
                            <div className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${buyerAccepted ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span className={buyerAccepted ? 'text-green-700 font-medium' : 'text-gray-500'}>Buyer Consent</span>
                            </div>
                            <div className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${sellerAccepted ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span className={sellerAccepted ? 'text-green-700 font-medium' : 'text-gray-500'}>Seller Consent</span>
                            </div>
                        </div>

                        {((isBuyer && !buyerAccepted) || (!isBuyer && !sellerAccepted)) && (
                            <button
                                onClick={onAccept}
                                className="bg-green-600 text-white px-6 py-2 rounded-full font-bold hover:bg-green-700 shadow-lg transform hover:scale-105 transition"
                            >
                                ✅ Accept Terms
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TermsSection;
