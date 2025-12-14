
import React, { useState, useEffect } from 'react';
import { X, Check, Eye, Trash2, Clock, Crown, AlertTriangle } from 'lucide-react';
import { getPendingQueue, approveNovel, rejectNovel } from '../services/storageService';
import { ApprovalItem } from '../types';

interface ApprovalQueueProps {
    isOpen: boolean;
    onClose: () => void;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ isOpen, onClose, addToast }) => {
    const [queue, setQueue] = useState<ApprovalItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setQueue(getPendingQueue());
        }
    }, [isOpen]);

    const handleApprove = (id: string, title: string) => {
        approveNovel(id);
        setQueue(prev => prev.filter(i => i.id !== id));
        addToast(`Approved "${title}" for public directory.`, 'success');
    };

    const handleReject = (id: string) => {
        rejectNovel(id);
        setQueue(prev => prev.filter(i => i.id !== id));
        addToast("Novel rejected.", 'info');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1a202c] border-2 border-red-900 w-full max-w-4xl rounded-2xl shadow-[0_0_50px_rgba(127,29,29,0.3)] relative flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-red-950/20">
                    <div>
                        <h2 className="text-2xl font-bold text-red-100 flex items-center gap-3">
                            <Crown className="w-6 h-6 text-red-500" /> Sect Pavilion
                        </h2>
                        <p className="text-red-400 text-sm mt-1">Review pending scriptures before they enter the library.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {queue.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                            <p className="text-xl font-medium text-gray-300">All scriptures have been processed.</p>
                            <p className="text-sm text-gray-500">The queue is empty, Elder.</p>
                        </div>
                    ) : (
                        queue.map((item) => (
                            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-6 animate-slide-up group hover:border-gray-700 transition-colors">
                                {/* Cover & Basic Info */}
                                <div className="flex gap-4 flex-1">
                                    <div className="w-16 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={item.novel.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white text-lg truncate mb-1">{item.novel.title}</h3>
                                        <p className="text-gray-400 text-sm mb-2">by {item.novel.author}</p>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {item.novel.tags.slice(0, 3).map(t => (
                                                <span key={t} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded border border-gray-700">{t}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submitted: {item.submittedAt}</span>
                                            <span className="text-primary-400">By: {item.submittedBy}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex md:flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6">
                                    <button 
                                        onClick={() => handleApprove(item.id, item.novel.title)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-900/30 hover:bg-green-600 text-green-400 hover:text-white border border-green-900/50 rounded-lg transition-all font-bold text-sm"
                                    >
                                        <Check className="w-4 h-4" /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleReject(item.id)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 rounded-lg transition-all font-bold text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-950/50 border-t border-red-900/30 text-center">
                    <div className="inline-flex items-center gap-2 text-xs text-red-400 bg-red-900/10 px-3 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Only approved novels appear in the Global Directory & Search.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovalQueue;
