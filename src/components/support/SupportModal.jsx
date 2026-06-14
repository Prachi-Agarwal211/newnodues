'use client';

export default function SupportModal({
    isOpen,
    onClose,
    title = "Support",
    description = "This feature is currently under development.",
    buttonText = "Close"
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-2xl border border-white/10 
                      min-w-[320px] max-w-lg w-full mx-auto">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                </div>
                <div className="px-6 py-6">
                    <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
                        {description}
                    </p>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}