
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Swords, Ghost, CheckCircle, Lock, Users, Star, MessageSquare, Send, Hourglass, Gem, Sparkles } from 'lucide-react';
import { SectData, UserProfile } from '../types';
import { getSectData, getUserProfile, joinSect, addSpiritStones } from '../services/storageService';

interface SectProps {
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SECT_OPTIONS = [
    { id: 'cloud', name: 'Cloud Sword Sect', description: 'Masters of the blade and sky. Noble and swift.', color: 'text-blue-400', icon: 'Swords' },
    { id: 'blood', name: 'Blood Lotus Sect', description: 'Ruthless cultivators who seek power at any cost.', color: 'text-red-500', icon: 'Ghost' },
    { id: 'spirit', name: 'Spirit Beast Pavilion', description: 'One with nature. They command mighty beasts.', color: 'text-green-400', icon: 'Shield' },
];

const Sect: React.FC<SectProps> = ({ addToast }) => {
    const [profile, setProfile] = useState<UserProfile>(getUserProfile());
    const [sectData, setSectData] = useState<SectData | null>(getSectData());
    const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'seclusion'>('overview');
    
    // Chat State
    // MOCK_DATA – Simulated chat history
    const [messages, setMessages] = useState<{id: string, user: string, text: string, type: 'user' | 'npc'}[]>([
        { id: '1', user: 'Elder Wu', text: 'Welcome to the Sect, disciples. Focus on your breathing technique today.', type: 'npc' },
        { id: '2', user: 'Daoist Fire', text: 'Has anyone seen the new Spirit Stones exchange rate?', type: 'npc' }
    ]);
    const [inputMsg, setInputMsg] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Seclusion State
    const [isSecluded, setIsSecluded] = useState(false);
    const [seclusionTime, setSeclusionTime] = useState(0);
    const [accumulatedStones, setAccumulatedStones] = useState(0);
    const seclusionInterval = useRef<any>(null);

    useEffect(() => {
        setProfile(getUserProfile());
        setSectData(getSectData());
        
        return () => {
            if (seclusionInterval.current) clearInterval(seclusionInterval.current);
        };
    }, []);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    // MOCK_API – Simulating real-time chat messages via interval
    // TODO: REAL IMPLEMENTATION REQUIRED: Replace with WebSocket/Socket.io subscription
    useEffect(() => {
        if (!sectData) return;
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const names = ['Junior Sister Lin', 'Fatty Wang', 'Iron Fist', 'Jade Beauty', 'Old Monster'];
                const texts = [
                    'This scripture is too hard to comprehend!',
                    'Going to the dungeon later, who wants to join?',
                    'Just broke through to Qi Condensation layer 5!',
                    'Anyone have spare healing pills?',
                    'The sect leader is looking intense today.'
                ];
                const newMsg = {
                    id: Date.now().toString(),
                    user: names[Math.floor(Math.random() * names.length)],
                    text: texts[Math.floor(Math.random() * texts.length)],
                    type: 'npc' as const
                };
                setMessages(prev => [...prev.slice(-19), newMsg]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [sectData]);

    const handleJoin = (id: string) => {
        const option = SECT_OPTIONS.find(s => s.id === id);
        if (option) {
            joinSect(option.id, option.name, option.color, option.icon);
            setSectData(getSectData());
            setProfile(getUserProfile());
            addToast(`Joined ${option.name}!`, 'success');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;
        
        // FAKE_BACKEND – Sending message to local state only
        // TODO: REAL IMPLEMENTATION REQUIRED: Send message to backend API
        const msg = {
            id: Date.now().toString(),
            user: profile.username,
            text: inputMsg,
            type: 'user' as const
        };
        setMessages(prev => [...prev, msg]);
        setInputMsg('');
    };

    // FAKE_BACKEND - Client-side timer logic for rewards
    // TODO: REAL IMPLEMENTATION REQUIRED: Server must track seclusion time to prevent cheating.
    const toggleSeclusion = () => {
        if (isSecluded) {
            // End Seclusion
            clearInterval(seclusionInterval.current);
            if (accumulatedStones > 0) {
                addSpiritStones(accumulatedStones);
                addToast(`Seclusion ended. Gained ${accumulatedStones} Stones.`, 'success');
                setProfile(getUserProfile());
            }
            setIsSecluded(false);
            setSeclusionTime(0);
            setAccumulatedStones(0);
        } else {
            // Start Seclusion
            setIsSecluded(true);
            seclusionInterval.current = setInterval(() => {
                setSeclusionTime(prev => {
                    const newTime = prev + 1;
                    // Earn 1 stone every 5 seconds
                    if (newTime % 5 === 0) {
                        setAccumulatedStones(s => s + 1);
                    }
                    return newTime;
                });
            }, 1000);
        }
    };

    if (!sectData) {
        // Selection Screen
        return (
            <div className="max-w-5xl mx-auto min-h-[80vh] flex flex-col items-center justify-center animate-fade-in text-center px-4">
                <Users className="w-24 h-24 text-cyan-400 mb-6" />
                <h1 className="text-4xl font-bold text-white mb-4">Choose Your Allegiance</h1>
                <p className="text-gray-400 max-w-2xl mb-12">
                    The cultivation world is dangerous. Join a Sect to receive protection, daily missions, and exclusive rewards.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    {SECT_OPTIONS.map(sect => (
                        <div key={sect.id} className="bg-gray-900 border border-gray-800 p-8 rounded-2xl hover:border-cyan-500 transition-all cursor-pointer group hover:-translate-y-2" onClick={() => handleJoin(sect.id)}>
                            <div className={`p-4 rounded-full bg-gray-800 w-16 h-16 flex items-center justify-center mx-auto mb-6 ${sect.color}`}>
                                {sect.id === 'cloud' && <Swords className="w-8 h-8" />}
                                {sect.id === 'blood' && <Ghost className="w-8 h-8" />}
                                {sect.id === 'spirit' && <Shield className="w-8 h-8" />}
                            </div>
                            <h3 className={`text-xl font-bold mb-2 group-hover:text-white ${sect.color}`}>{sect.name}</h3>
                            <p className="text-gray-500 text-sm mb-6">{sect.description}</p>
                            <button className="w-full py-2 rounded-lg bg-gray-800 text-gray-300 group-hover:bg-cyan-600 group-hover:text-white font-bold transition-colors">
                                Join Sect
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto min-h-[80vh] animate-fade-in pb-20">
            {/* Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[100px] rounded-full" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className={`p-6 rounded-full bg-gray-800 border-2 border-gray-700 w-32 h-32 flex items-center justify-center ${sectData.color.replace('text', 'border')}`}>
                        {sectData.id === 'cloud' && <Swords className={`w-16 h-16 ${sectData.color}`} />}
                        {sectData.id === 'blood' && <Ghost className={`w-16 h-16 ${sectData.color}`} />}
                        {sectData.id === 'spirit' && <Shield className={`w-16 h-16 ${sectData.color}`} />}
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{sectData.name}</h1>
                        <p className="text-gray-400 mb-4">{sectData.description}</p>
                        
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <span className="bg-gray-800 px-3 py-1 rounded-full text-sm font-bold text-gray-300 border border-gray-700">
                                {profile.sectRank || 'Outer Disciple'}
                            </span>
                             <span className="bg-gray-800 px-3 py-1 rounded-full text-sm font-bold text-amber-400 border border-gray-700 flex items-center gap-2">
                                <Star className="w-3 h-3 fill-amber-400" /> Contribution: {profile.sectContribution || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-800 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 font-bold text-sm uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`pb-4 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                    Spirit Link <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">LIVE</span>
                </button>
                <button 
                    onClick={() => setActiveTab('seclusion')}
                    className={`pb-4 font-bold text-sm uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'seclusion' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white'}`}
                >
                    Seclusion
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" /> Sect Missions (Daily)
                    </h2>
                    
                    <div className="grid gap-4">
                        {sectData.missions.map(mission => (
                            <div key={mission.id} className={`p-6 rounded-xl border flex items-center justify-between ${mission.completed ? 'bg-green-900/10 border-green-500/30' : 'bg-gray-900 border-gray-800'}`}>
                                <div>
                                    <h3 className={`font-bold text-lg mb-1 ${mission.completed ? 'text-green-400' : 'text-gray-200'}`}>
                                        {mission.description}
                                    </h3>
                                    <div className="text-sm text-gray-500">
                                        Progress: <span className="text-white">{mission.current}</span> / {mission.target}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="text-amber-400 font-bold text-sm bg-amber-900/20 px-3 py-1 rounded-lg">
                                        +{mission.reward} Stones
                                    </div>
                                    {mission.completed ? (
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="text-center text-gray-500 text-sm mt-12">
                        Sect Rank updates weekly based on total contribution.
                    </div>
                </div>
            )}

            {activeTab === 'seclusion' && (
                <div className="animate-fade-in flex flex-col items-center text-center">
                    <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full relative overflow-hidden">
                        {/* Background Effect */}
                        {isSecluded && (
                            <div className="absolute inset-0 bg-cyan-900/10 animate-pulse">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 blur-[80px] rounded-full"></div>
                            </div>
                        )}

                        <div className="relative z-10">
                            <Hourglass className={`w-16 h-16 mx-auto mb-6 ${isSecluded ? 'text-cyan-400 animate-spin-slow' : 'text-gray-600'}`} />
                            <h2 className="text-2xl font-bold text-white mb-2">Seclusion Chamber</h2>
                            <p className="text-gray-400 text-sm mb-8">
                                Meditate to passively gather Spirit Qi from the environment. Stay on this screen to cultivate.
                            </p>

                            <div className="flex items-center justify-center gap-8 mb-8">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Duration</div>
                                    <div className="text-2xl font-mono text-white">{new Date(seclusionTime * 1000).toISOString().substr(11, 8)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Gathered</div>
                                    <div className="text-2xl font-bold text-amber-400 flex items-center gap-1">
                                        <Gem className="w-5 h-5" /> +{accumulatedStones}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={toggleSeclusion}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    isSecluded 
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30' 
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
                                }`}
                            >
                                {isSecluded ? 'Exit Seclusion' : 'Enter Seclusion'}
                                {isSecluded && <Sparkles className="w-5 h-5 animate-pulse" />}
                            </button>
                            
                            <div className="mt-4 text-xs text-gray-500">
                                Rate: ~12 Spirit Stones / Minute
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'chat' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col h-[500px] animate-fade-in">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-cyan-400" /> Spirit Link Channel
                        </h3>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> 142 Disciples Online
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${msg.type === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                    {msg.user[0]}
                                </div>
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${msg.type === 'user' ? 'bg-primary-900/50 text-white rounded-tr-none' : 'bg-gray-800 text-gray-300 rounded-tl-none'}`}>
                                    <div className={`text-xs font-bold mb-1 opacity-50 ${msg.type === 'user' ? 'text-right' : ''}`}>{msg.user}</div>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-2xl">
                        <div className="relative">
                            <input 
                                type="text" 
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                placeholder="Transmit a message to the sect..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-2 p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Sect;
