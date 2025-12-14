import React, { useState } from 'react';
import { MapPin, Search, Loader2, Navigation, Star, Coffee, Book } from 'lucide-react';
import { ReadingSpot } from '../types';
import { findReadingSpotsAI } from '../services/geminiService';

interface ReadingSpotsProps {
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ReadingSpots: React.FC<ReadingSpotsProps> = ({ addToast }) => {
    const [spots, setSpots] = useState<ReadingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState('');
    const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

    const handleFindSpots = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            addToast("Geolocation is not supported by your browser", "error");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });
            
            try {
                const { spots, rawText } = await findReadingSpotsAI(latitude, longitude);
                setSpots(spots);
                setSummary(rawText);
                addToast(`Found ${spots.length} places nearby`, 'success');
            } catch (e) {
                addToast("Failed to find spots via AI", "error");
            } finally {
                setLoading(false);
            }
        }, () => {
            addToast("Unable to retrieve your location", "error");
            setLoading(false);
        });
    };

    return (
        <div className="max-w-5xl mx-auto min-h-[80vh] animate-fade-in">
             <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                    <MapPin className="text-red-500 w-8 h-8" /> Reader's Haven
                </h1>
                <p className="text-gray-400">Find the perfect quiet spot to read your novels nearby.</p>
            </div>

            <div className="flex justify-center mb-12">
                <button 
                    onClick={handleFindSpots}
                    disabled={loading}
                    className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-primary-900/30 flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
                    {loading ? "Scanning Area..." : "Find Reading Spots Near Me"}
                </button>
            </div>

            {summary && (
                <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                    <h3 className="text-primary-400 font-bold mb-2 flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> AI Recommendation</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {spots.map((spot) => (
                    <div key={spot.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl hover:border-gray-600 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{spot.name}</h3>
                            <span className="flex items-center gap-1 bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded-lg text-xs font-bold border border-yellow-500/20">
                                <Star className="w-3 h-3 fill-yellow-500" /> {spot.rating}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                             <MapPin className="w-4 h-4 text-gray-600" /> {spot.address}
                        </p>
                        <div className="flex items-center justify-between">
                             <div className="text-xs text-gray-500 uppercase tracking-wider font-bold bg-gray-800 px-2 py-1 rounded">
                                 {spot.type || 'Place'}
                             </div>
                             <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + " " + spot.address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 text-sm font-medium hover:underline flex items-center gap-1"
                             >
                                 Open Maps <Navigation className="w-3 h-3" />
                             </a>
                        </div>
                    </div>
                ))}
            </div>
            
            {spots.length === 0 && !loading && summary === '' && (
                 <div className="text-center py-20 opacity-30">
                     <Book className="w-24 h-24 mx-auto mb-4" />
                     <p>Tap the button to discover your next reading sanctuary.</p>
                 </div>
            )}
        </div>
    );
};

const SparklesIcon = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
)

export default ReadingSpots;
