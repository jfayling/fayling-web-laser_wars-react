import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error';
    isAlert?: boolean; // If true, only shows one button (OK)
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    isAlert = false
}) => {
    if (!isOpen) return null;

    const getBorderColor = () => {
        switch (type) {
            case 'error': return 'border-red-500';
            case 'warning': return 'border-yellow-500';
            default: return 'border-blue-500';
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'error': return 'text-red-500';
            case 'warning': return 'text-yellow-500';
            default: return 'text-blue-500';
        }
    };

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`bg-gray-900 border ${getBorderColor()} p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200`}>
                <h3 className={`text-xl font-bold mb-2 ${getTitleColor()}`}>{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>

                <div className="flex gap-4 justify-end">
                    {!isAlert && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-semibold"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={isAlert ? onCancel : onConfirm}
                        className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${type === 'error' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        {isAlert ? 'OK' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
