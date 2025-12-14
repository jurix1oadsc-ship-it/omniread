
import React, { useState, useEffect } from 'react';
import { Swords, Skull, Heart, Shield, Loader2, ArrowRight, RefreshCcw, Scroll, Ghost, Image as ImageIcon } from 'lucide-react';
import { DungeonState } from '../types';
import { getDungeonState, saveDungeonState, addSpiritStones } from '../services/storageService';
import { generateDungeonStartAI, generateDungeonTurnAI, generateSceneImageAI } from '../services/geminiService';

interface DungeonProps {
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Dungeon: React.FC<DungeonProps> = ({ addToast }) => {
    const [gameState, setGameState] = useState<DungeonState | null>(null);
    const [loading, setLoading] = useState(false);
    const [themeInput, setThemeInput] = useState('');
    const [imageLoading, setImageLoading] = useState(false);

    useEffect(() => {
        const saved = getDungeonState();
        if (saved && saved.isActive) {
            setGameState(saved);
        }
    }, []);

    // Helper to generate visual with State Safety Check (Fixes Race Condition)
    // FAKE_BACKEND - This logic should ideally be server-side to ensure state consistency.
    const generateVisual = async (targetTurnCount: number, context: string, theme: string) => {
        setImageLoading(true);
        const prompt = `Fantasy dungeon scene, ${theme} style. ${context.substring(0, 300)}. Digital art, cinematic lighting.`;
        
        try {
            const base64 = await generateSceneImageAI(prompt);
            
            if (base64) {
                setGameState(current => {
                    // CRITICAL: Only update if the player hasn't moved to a new turn
                    if (current && current.chapterCount === targetTurnCount) {
                        const updated = { ...current, currentImageUrl: `data:image/png;base64,${base64}` };
                        saveDungeonState(updated);
                        return updated;
                    }
                    return current;
                });
            }
        } catch (e) {
            console.error("Visual gen failed");
        } finally {
            setImageLoading(false);
        }
    };

    const startGame = async (theme: string) => {
        if (!theme.trim()) return;
        setLoading(true);
        try {
            const newState = await generateDungeonStartAI(theme);
            setGameState(newState);
            saveDungeonState(newState);
            setThemeInput('');
            // Trigger image gen for turn 1
            generateVisual(1, newState.currentContent, newState.theme);
        } catch (e) {
            addToast("Failed to summon dungeon.", "error");
        }
        setLoading(false);
    };

    const handleChoice = async (index: number) => {
        if (!gameState) return;
        setLoading(true);
        try {
            const nextState = await generateDungeonTurnAI(gameState, index);
            setGameState(nextState);
            saveDungeonState(nextState);
            
            // Reward for surviving a turn
            if (nextState.status === 'alive') {
                addSpiritStones(5); 
                // Trigger image gen for next turn
                generateVisual(nextState.chapterCount, nextState.currentContent, nextState.theme);
            }
        } catch (e) {
            addToast("The dungeon master is silent...", "error");
        }
        setLoading(false);
    };

    const resetGame = () => {
        setGameState(null);
        saveDungeonState(null);
    };

    // --- RENDER: LOBBY ---
    if (!gameState) {
        return (
            <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col items-center justify-center animate-fade-in text-center px-4">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
                    <Swords className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] relative z-10" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">The Visual Dungeon</h1>
                <p className="text-xl text-gray-400 max-w-2xl mb-12">
                    Enter a world where every step is visualized by AI. 
                    Your choices determine your fate. Permadeath is real.
                </p>

                <div className="w-full max-w-md space-y-4">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-20 bg-red-900/10 rounded-full blur-3xl"></div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Choose your Destiny</label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                             {['Dark Fantasy', 'Cyberpunk', 'Eldritch Horror', 'Wuxia Cultivation'].map(t => (
                                 <button key={t} onClick={() => setThemeInput(t)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded-lg transition-colors border border-gray-700">{t}</button>
                             ))}
                        </div>
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="Or type custom theme..." 
                                value={themeInput}
                                onChange={(e) => setThemeInput(e.target.value)}
                                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                             />
                             <button 
                                onClick={() => startGame(themeInput)}
                                disabled={loading || !themeInput}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-red-900/40"
                             >
                                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: GAME OVER ---
    if (gameState.status === 'dead') {
         return (
             <div className="max-w-2xl mx-auto min-h-[80vh] flex flex-col items-center justify-center animate-fade-in text-center">
                 <Ghost className="w-24 h-24 text-gray-600 mb-6" />
                 <h2 className="text-4xl font-bold text-red-500 mb-2">YOU HAVE DIED</h2>
                 <p className="text-gray-400 mb-8">Your journey ends here.</p>
                 
                 <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 w-full">
                     <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Chapters Survived</div>
                     <div className="text-6xl font-bold text-white mb-4">{gameState.chapterCount}</div>
                     <p className="text-gray-400 text-sm italic">"{gameState.theme}"</p>
                 </div>
                 
                 <button 
                    onClick={resetGame}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
                 >
                     <RefreshCcw className="w-4 h-4" /> Try Again
                 </button>
             </div>
         );
    }

    // --- RENDER: PLAYING ---
    return (
        <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
            {/* HUD */}
            <div className="flex items-center justify-between mb-8 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg sticky top-20 z-10 backdrop-blur-md bg-opacity-90">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 text-red-500 font-bold">
                         <Heart className="w-5 h-5 fill-red-500" /> {gameState.health}%
                     </div>
                     <div className="h-8 w-px bg-gray-700" />
                     <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                         <Scroll className="w-4 h-4" /> Chapter {gameState.chapterCount}
                     </div>
                 </div>
                 <div className="text-xs text-gray-500 uppercase font-bold tracking-widest bg-black/50 px-2 py-1 rounded">{gameState.theme}</div>
            </div>

            {/* Visuals */}
            <div className="mb-8 rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 aspect-video relative group shadow-2xl">
                {gameState.currentImageUrl ? (
                    <>
                        <img 
                            src={gameState.currentImageUrl} 
                            alt="Dungeon Scene" 
                            className="w-full h-full object-cover animate-fade-in transition-transform duration-10000 hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-50"></div>
                    </>
                ) : imageLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2 bg-gray-900">
                        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                        <span className="text-xs uppercase tracking-widest font-bold text-red-400">Visualizing Realm...</span>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-900">
                        <ImageIcon className="w-12 h-12 opacity-20" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="prose prose-invert max-w-none mb-12">
                <div className="bg-gray-900/80 p-8 rounded-2xl border border-gray-800 shadow-2xl leading-relaxed text-lg font-serif">
                     {gameState.currentContent.split('\n').map((p, i) => (
                         <p key={i} className="mb-4">{p}</p>
                     ))}
                </div>
            </div>

            {/* Choices */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-gray-800/50 border-dashed">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500 animate-pulse">The Dungeon Master is deciding your fate...</p>
                    </div>
                ) : (
                    gameState.currentChoices.map((choice, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleChoice(idx)}
                            className="w-full text-left bg-gray-900 border border-gray-700 hover:border-red-500/50 hover:bg-gray-800 p-6 rounded-xl group transition-all transform hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                choice.type === 'aggressive' ? 'bg-red-500' :
                                choice.type === 'stealth' ? 'bg-blue-500' :
                                choice.type === 'diplomatic' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex items-center justify-between mb-1 pl-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/30 ${
                                    choice.type === 'aggressive' ? 'text-red-400' :
                                    choice.type === 'stealth' ? 'text-blue-400' :
                                    choice.type === 'diplomatic' ? 'text-green-400' : 'text-yellow-400'
                                }`}>
                                    {choice.type}
                                </span>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-200 group-hover:text-white pl-4">{choice.text}</h3>
                        </button>
                    ))
                )}
            </div>
            
            <div className="mt-12 text-center">
                 <button onClick={resetGame} className="text-xs text-gray-600 hover:text-red-400 underline">Abandon Run</button>
            </div>
        </div>
    );
};

export default Dungeon;
