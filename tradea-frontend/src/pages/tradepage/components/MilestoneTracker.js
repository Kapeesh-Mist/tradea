import React from 'react';

const MilestoneTracker = ({ currentStep }) => {
    const steps = [
        { id: 1, label: 'Terms Proposed' },
        { id: 2, label: 'Escrow Secured' },
        { id: 3, label: 'Design Delivered' },
        { id: 4, label: 'Ongoing' },
        { id: 5, label: 'Completed' }
    ];

    // Determine active step index (0-based)
    // Assuming currentStep is a string matching label or an ID. 
    // For now, let's map simple logic or props.
    // If currentStep is "Escrow Deposited", we are at step 2 (index 1 completed, index 2 active).

    const getStepStatus = (index) => {
        // This logic would need to be robust based on actual backend status strings
        // For demo, let's assume currentStep is the index of the *active* step.
        if (index < currentStep) return 'completed';
        if (index === currentStep) return 'active';
        return 'pending';
    };

    return (
        <div className="w-full py-6">
            <div className="relative flex items-center justify-between w-full">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>

                {/* Active Progress Bar (width based on step) */}
                <div
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    return (
                        <div key={step.id} className="flex flex-col items-center bg-white px-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-300
                                ${status === 'completed' ? 'bg-blue-600 border-blue-600' :
                                    status === 'active' ? 'bg-white border-blue-600 scale-125' :
                                        'bg-gray-200 border-gray-200'}`}
                            >
                                {status === 'completed' && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${status === 'active' ? 'text-blue-600' :
                                    status === 'completed' ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MilestoneTracker;
