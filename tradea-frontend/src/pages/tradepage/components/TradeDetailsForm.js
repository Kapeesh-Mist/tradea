import React, { useEffect, useState } from 'react';

const TradeDetailsForm = ({ tradeId, requestId, userAvatar, role, youProceeded, onProceed }) => {
    const [formData, setFormData] = useState({
        item: '',
        price: '0',
        date: '',
        hour: '12',
        minute: '00',
        ampm: 'AM',
        demand: '',
        other_user_name: '',
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [checkingProceed, setCheckingProceed] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        setMessage('');
        if (!tradeId || !token) {
            if (!token) setMessage('You are not logged in.');
            return;
        }

        const fetchDetails = async () => {
            try {
                const res = await fetch(`http://localhost:8000/trade/details/fetch?trade_id=${tradeId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                if (data.status !== 'ok') {
                    setMessage(data.details || 'Failed to load trade details.');
                    return;
                }

                const deadline = data.deadline || '';
                const [datePart, timePart] = deadline.split('T');
                let [hour, minute] = (timePart || '00:00').split(':');
                let ampm = 'AM';
                hour = parseInt(hour, 10);
                if (hour >= 12) {
                    ampm = 'PM';
                    if (hour > 12) hour -= 12;
                } else if (hour === 0) {
                    hour = 12;
                }

                setFormData({
                    item: data.item || '',
                    price: data.price?.toString() || '0',
                    date: datePart || '',
                    hour: hour.toString().padStart(2, '0'),
                    minute: minute || '00',
                    ampm,
                    demand: data.demand || '',
                    other_user_name: data.other_user_name || '',
                });

                if (youProceeded) {
                    setMessage('✅ Your part is saved. Waiting for the other party...');
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setMessage('Error fetching trade details.');
            } finally {
                setLoading(false);
                setCheckingProceed(false);
            }
        };

        fetchDetails();
    }, [tradeId, token, youProceeded]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'price' && parseFloat(value) < 0) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (youProceeded) return;

        setSubmitting(true);
        setMessage('');

        try {
            let hour = parseInt(formData.hour);
            if (formData.ampm === 'PM' && hour !== 12) hour += 12;
            if (formData.ampm === 'AM' && hour === 12) hour = 0;
            const hourStr = hour.toString().padStart(2, '0');
            const deadline = `${formData.date}T${hourStr}:${formData.minute}`;

            const sanitizedPrice = Math.max(0, parseFloat(formData.price) || 0);

            const payload = new FormData();
            payload.append('trade_id', tradeId);
            payload.append('item', formData.item);
            payload.append('price', sanitizedPrice.toString());
            payload.append('deadline', deadline);
            payload.append('demand', formData.demand);

            const res = await fetch('http://localhost:8000/trade/details/update', {
                method: 'PUT',
                body: payload,
                headers: { Authorization: `Bearer ${token}` },
            });

            const result = await res.json();

            if (result.message) {
                const intentRes = await fetch('http://localhost:8000/trade/intent/proceed', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        request_id: requestId,
                        role: role,
                    }),
                });

                const intentData = await intentRes.json();

                if (intentData.buyer_proceeded && intentData.seller_proceeded) {
                    setMessage('✅ Both parties have proceeded. Generating terms...');

                    const genRes = await fetch('http://localhost:8000/trade/terms/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ request_id: tradeId }),
                    });

                    const genData = await genRes.json();
                    if (genData.status === 'ok') {
                        setMessage('✅ Terms generated. Redirecting...');
                        if (typeof onProceed === 'function') onProceed();
                    } else {
                        setMessage('Terms generation failed.');
                    }
                } else {
                    setMessage('✅ Your part is saved. Waiting for the other party...');
                }
            } else {
                setMessage(result.details || 'Update failed.');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setMessage('Error submitting form.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-10">Loading trade details...</div>;
    if (checkingProceed) return <div className="text-center py-10">Checking trade status...</div>;

    const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-green-800 max-w-xl mx-auto shadow-sm my-4">
            <div className="flex items-center gap-4 mb-6">
                <img
                    src={userAvatar}
                    alt="User avatar"
                    className="w-12 h-12 rounded-full border border-gray-300 shadow-sm object-cover"
                />
                <div>
                    <p className="text-xl font-bold text-gray-800">{formData.other_user_name}</p>
                    <p className="text-xs text-gray-400">Trade initiated on {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <h2 className="text-4xl font-normal text-gray-800 mb-8 font-sans tracking-tight">TRADE DETAILS</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wide">TRADE NAME*</label>
                    <input
                        type="text"
                        name="item"
                        value={formData.item}
                        onChange={handleChange}
                        required
                        className="w-full border border-red-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wide">TRADE END DATE and TIME*</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-1/2 border border-red-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm"
                        />
                        <select name="hour" value={formData.hour} onChange={handleChange} className="w-1/6 border border-red-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm">
                            {hourOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-600 pt-2">:</span>
                        <select name="minute" value={formData.minute} onChange={handleChange} className="w-1/6 border border-red-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm">
                            {minuteOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select name="ampm" value={formData.ampm} onChange={handleChange} className="w-1/6 border border-red-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm">
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wide">PRICE</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 text-sm shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-gray-600 text-xs font-bold mb-1 uppercase tracking-wide">
                        HAVE ANY DEMAND FOR TRADE?
                    </label>
                    <textarea
                        name="demand"
                        value={formData.demand}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 h-20 text-sm shadow-sm resize-none"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={submitting || youProceeded}
                        className={`w-full ${youProceeded ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#fde047] hover:bg-yellow-300'
                            } text-gray-900 font-bold py-3 px-4 rounded-full shadow-md uppercase tracking-wide transition-colors text-lg`}
                    >
                        {youProceeded ? 'Waiting for other user...' : submitting ? 'Submitting...' : 'Proceed'}
                    </button>
                </div>

                {message && (
                    <div className="text-center text-sm text-blue-700 mt-4 font-medium">
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
};

export default TradeDetailsForm;