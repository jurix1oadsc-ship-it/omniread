
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Gem, Lock, Check, Loader2, Info } from 'lucide-react';
import { MarketItem, UserProfile } from '../types';
import { getUserProfile, MARKET_ITEMS, purchaseItem } from '../services/storageService';

interface MarketProps {
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Market: React.FC<MarketProps> = ({ addToast }) => {
    const [profile, setProfile] = useState<UserProfile>(getUserProfile());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setProfile(getUserProfile());
    }, []);

    const handleBuy = (item: MarketItem) => {
        setLoading(true);
        // MOCK_API – Simulating network delay for transaction
        // TODO: REAL IMPLEMENTATION REQUIRED: Call backend API endpoint /api/market/buy
        setTimeout(() => {
            const success = purchaseItem(item.id);
            if (success) {
                setProfile(getUserProfile());
                // Instructive Toast
                if (item.type === 'theme') {
                    addToast(`Unlocked ${item.name}! Go to Reader > Settings (Aa) to apply it.`, 'success');
                } else {
                    addToast(`Purchased ${item.name}!`, 'success');
                }
            } else {
                addToast("Not enough Spirit Stones!", 'error');
            }
            setLoading(false);
        }, 500);
    };

    const isOwned = (item: MarketItem) => {
        if (item.type === 'theme') {
            return profile.unlockedThemes.includes(item.value);
        }
        return false;
    };

    return (
        <div className="max-w-5xl mx-auto min-h-[80vh] animate-fade-in">
             <div className="flex items-center justify-between mb-6">
                <div>
                     <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ShoppingBag className="text-amber-500 w-8 h-8" /> The Spirit Pavilion
                    </h1>
                    <p className="text-gray-400">Trade your cultivation effort for rare treasures.</p>
                </div>
                
                <div className="bg-gray-900 border border-amber-500/30 px-6 py-3 rounded-full flex items-center gap-3">
                    <Gem className="text-amber-400 w-5 h-5" />
                    <span className="text-2xl font-bold text-white">{profile.spiritStones}</span>
                </div>
            </div>

            {/* Usage Hint */}
            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl mb-10 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-200">
                    <strong>How to use Themes:</strong> Once purchased, open any novel chapter, click the 
                    <span className="inline-block bg-gray-800 border border-gray-600 rounded px-1 mx-1 font-bold text-xs">Aa</span> 
                    icon in the top right, and select your new theme from the Appearance menu.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MARKET_ITEMS.map((item) => {
                    const owned = isOwned(item);
                    return (
                        <div key={item.id} className={`relative bg-gray-900 border ${owned ? 'border-green-500/30' : 'border-gray-800'} p-6 rounded-2xl transition-all hover:transform hover:-translate-y-1 hover:shadow-xl`}>
                            {owned && (
                                <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 p-1 rounded-full">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                            
                            <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                            <p className="text-gray-400 text-sm mb-6 h-10">{item.description}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-1 text-amber-400 font-bold">
                                    <Gem className="w-4 h-4" /> {item.cost}
                                </div>
                                <button 
                                    onClick={() => handleBuy(item)}
                                    disabled={owned || loading || profile.spiritStones < item.cost}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                                        owned 
                                        ? 'bg-gray-800 text-gray-500 cursor-default' 
                                        : profile.spiritStones < item.cost
                                            ? 'bg-gray-800 text-gray-500 opacity-50 cursor-not-allowed'
                                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                                    }`}
                                >
                                    {owned ? 'Owned' : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Purchase'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Market;
