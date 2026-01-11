import React from 'react';
import { X, FileText, Download, Copy } from 'lucide-react';
import type { RecordedMove } from '../types';

interface LogViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    moves: RecordedMove[];
    onExport?: () => void;
    onCopy?: () => void;
}

export const LogViewerModal: React.FC<LogViewerModalProps> = ({ isOpen, onClose, moves, onExport, onCopy }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                    <FileText className="text-blue-400" size={24} />
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                        TRAINING LOGS
                    </h2>
                    <span className="ml-auto text-sm text-gray-500 font-mono">
                        {moves.length} MOVES RECORDED
                    </span>
                </div>

                <div className="flex-1 overflow-auto bg-gray-950 rounded-lg border border-gray-800">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900 sticky top-0">
                            <tr>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">#</th>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Player</th>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Action</th>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Pos (X,Y)</th>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Details</th>
                                <th className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Time</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-sm">
                            {moves.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                                        No moves recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                moves.map((move, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                                        <td className="p-3 text-gray-600">{i + 1}</td>
                                        <td className={`p-3 font-bold ${move.turn === 'BLUE' ? 'text-blue-400' : 'text-red-400'}`}>
                                            {move.turn}
                                        </td>
                                        <td className="p-3 text-gray-300">{move.actionType}</td>
                                        <td className="p-3 text-gray-400">
                                            {move.x !== -1 ? `${move.x}, ${move.y}` : '-'}
                                        </td>
                                        <td className="p-3 text-gray-500 text-xs truncate max-w-[200px]" title={move.details}>
                                            {move.details || '-'}
                                        </td>
                                        <td className="p-3 text-gray-600 text-xs">
                                            {new Date(move.timestamp).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-3">
                        {onExport && (
                            <button
                                onClick={onExport}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs shadow-lg shadow-green-900/20"
                            >
                                <Download size={16} />
                                Export Data
                            </button>
                        )}
                        {onCopy && (
                            <button
                                onClick={onCopy}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs shadow-lg shadow-blue-900/20"
                            >
                                <Copy size={16} />
                                Copy JSON
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg font-semibold transition-colors uppercase tracking-wider text-xs"
                    >
                        Close Logs
                    </button>
                </div>
            </div>
        </div>
    );
};
