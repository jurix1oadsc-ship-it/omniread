
import React, { useEffect, useState } from 'react';
import { Gem, X, Calendar, Gift } from 'lucide-react';
import { addSpiritStones } from '../services/storageService';

const DailyReward: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [streak, setStreak] = useState(1);

    useEffect(() => {
        // FAKE_BACKEND – Client-side daily streak tracking via localStorage
        // TODO: REAL IMPLEMENTATION REQUIRED: Server must track login days to prevent local clock manipulation.
        const lastLogin = localStorage.getItem('lastLoginDate');
        const today = new Date().toDateString();

        if (lastLogin !== today) {
            // New Day!
            setIsOpen(true);
            localStorage.setItem('lastLoginDate', today);
            
            // Streak Logic (Simplified)
            const savedStreak = parseInt(localStorage.getItem('loginStreak') || '0');
            const newStreak = savedStreak + 1;
            setStreak(newStreak);
            localStorage.setItem('loginStreak', newStreak.toString());
        }
    }, []);

    const handleClaim = () => {
        // FAKE_BACKEND – Granting reward locally (Reduced for economy balance)
        // TODO: REAL IMPLEMENTATION REQUIRED: Backend should grant rewards to prevent abuse.
        const reward = 10 + (streak * 2); // Base 10 + 2 per streak day
        addSpiritStones(reward);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1a202c] border-2 border-amber-500 rounded-2xl p-8 max-w-sm w-full text-center relative shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-amber-500 p-4 rounded-full border-4 border-[#1a202c]">
                    <Gift className="w-10 h-10 text-white animate-bounce" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mt-6 mb-2">The Daily Dao</h2>
                <p className="text-gray-400 mb-6">Your cultivation consistency is rewarded.</p>
                
                <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Login Streak</div>
                    <div className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                        <Calendar className="w-6 h-6 text-primary-500" /> {streak} Days
                    </div>
                </div>

                <div className="text-4xl font-bold text-amber-400 mb-8 flex items-center justify-center gap-2">
                    <Gem className="w-8 h-8" /> +{10 + (streak * 2)}
                </div>

                <button 
                    onClick={handleClaim}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold py-3 rounded-xl shadow-lg transition-transform hover:scale-105"
                >
                    Claim Spirit Stones
                </button>
            </div>
        </div>
    );
};

export default DailyReward;
