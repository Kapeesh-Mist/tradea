function MilestoneProgressBar({ milestones }) {
    const steps = [
        { id: 'terms_proposed', label: 'Terms Proposed' },
        { id: 'escrow_deposited', label: 'Escrow Secured' },
        { id: 'product_delivered', label: 'Files Delivered' },
        { id: 'trade_completed', label: 'Trade Completed' }
    ];

    // Determine current step index based on completed milestones
    const completedSteps = milestones.filter(m => m.status === 'completed').map(m => m.type);
    let currentStepIndex = -1;

    // Find the last completed step in our ordered list
    for (let i = steps.length - 1; i >= 0; i--) {
        if (completedSteps.includes(steps[i].id)) {
            currentStepIndex = i;
            break;
        }
    }

    return (
        <div className="w-full py-6 px-4">
            <div className="relative flex items-center justify-between w-full">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-green-500 -z-10 transition-all duration-500"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex + 1;

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-white px-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                                        isCurrent ? 'border-blue-500 text-blue-500 bg-white' : 'border-gray-300 text-gray-300 bg-white'}
                `}
                            >
                                {isCompleted ? '✓' : index + 1}
                            </div>
                            <span
                                className={`mt-2 text-xs font-medium ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MilestoneProgressBar;
