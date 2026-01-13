import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { GameSession } from '../types';

interface JsonViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionData: GameSession;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({ isOpen, onClose, sessionData }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const prettyJson = JSON.stringify(sessionData, null, 2);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(prettyJson);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-cyan-300">
                            TRAINING SESSION JSON
                        </h2>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs shadow-lg shadow-green-900/20"
                    >
                        {copied ? (
                            <>
                                <Check size={16} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={16} />
                                Copy to Clipboard
                            </>
                        )}
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-950 rounded-lg border border-gray-800 p-4">
                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-words">
                        <code>{prettyJson}</code>
                    </pre>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
