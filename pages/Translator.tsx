
import React, { useState } from 'react';
import { Languages, ArrowRight, Copy, Check, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { translateRawTextAI } from '../services/geminiService';

const Translator: React.FC = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'literal' | 'localized'>('localized');
    const [copied, setCopied] = useState(false);

    const handleTranslate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setOutput('');
        
        try {
            const result = await translateRawTextAI(input, mode);
            setOutput(result);
        } catch (e) {
            setOutput("Meditation interrupted. Please try again.");
        }
        setLoading(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto min-h-[80vh] animate-fade-in p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <Languages className="w-8 h-8 text-blue-400" /> Daoist MTL
                </h1>
                <p className="text-gray-400">Refine raw scriptures into readable cultivation manuals.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[60vh]">
                {/* Input Column */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Raw Text (CN/KR/JP)</label>
                        <button 
                            onClick={() => setInput('')}
                            className="text-xs text-gray-500 hover:text-red-400"
                        >
                            Clear
                        </button>
                    </div>
                    <textarea 
                        className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
                        placeholder="Paste raw text here..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                </div>

                {/* Controls (Mobile: Center, Desktop: Hidden visually but functional flow) */}
                <div className="md:hidden flex justify-center">
                    <ArrowRight className="w-6 h-6 text-gray-600 rotate-90" />
                </div>

                {/* Output Column */}
                <div className="flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">English Dao</label>
                        {output && (
                            <button 
                                onClick={handleCopy}
                                className={`flex items-center gap-1 text-xs font-bold ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                    </div>
                    <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-gray-200 overflow-y-auto font-serif text-lg leading-relaxed relative">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-2xl">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                                <span className="text-blue-300 font-bold animate-pulse">Refining Essence...</span>
                            </div>
                        ) : output ? (
                            <div className="whitespace-pre-wrap">{output}</div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                                <BookOpen className="w-12 h-12 mb-2" />
                                <p>Translation will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4 bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setMode('localized')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'localized' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        Localized (Smooth)
                    </button>
                    <button 
                        onClick={() => setMode('literal')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'literal' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        Literal (Raw)
                    </button>
                </div>
                
                <button 
                    onClick={handleTranslate}
                    disabled={loading || !input}
                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all transform hover:scale-105"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Translate Scripture
                </button>
            </div>
        </div>
    );
};

export default Translator;
