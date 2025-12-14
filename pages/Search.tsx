
import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Loader2, Filter, Globe, Sparkles, Link as LinkIcon, Download, Layers, Compass, Check, X, Ban, Zap, Star } from 'lucide-react';
import { Novel, FinderFilters } from '../types';
import NovelCard from '../components/NovelCard';
import { searchNovelsAI, searchNovelsWeb, parseNovelFromUrlAI, scanNovelSourceAI, findNovelsByFiltersAI } from '../services/geminiService';
import { upsertNovel, getLibrary, getDirectory, addToDirectory } from '../services/storageService';

interface SearchProps {
  onNovelClick: (novel: Novel) => void;
}

const GENRES = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Harem', 'Martial Arts', 'Mecha', 
    'Mystery', 'Psychological', 'Romance', 'Sci-fi', 'Slice of Life', 'Sports', 'Supernatural', 'Tragedy'
];

const TAGS = [
    'Anti-Hero', 'Cultivation', 'Dungeon', 'Game Elements', 'Isekai', 'LitRPG', 'Magic', 'System', 
    'Weak to Strong', 'Overpowered', 'Reincarnation', 'Time Loop', 'Kingdom Building', 'Evolution'
];

const TROPES = [
    'Face Slapping', 'Slow Burn', 'Enemies to Lovers', 'Academy', 'Tournament Arc', 'Misunderstanding', 
    'Revenge', 'Secret Identity', 'Power Fantasy', 'Slice of Life', 'Political Intrigue'
];

const Search: React.FC<SearchProps> = ({ onNovelClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mode, setMode] = useState<'ai' | 'web' | 'scan' | 'finder'>('ai');
  const [webResultText, setWebResultText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done'>('idle');
  
  // Basic Filters
  const [genre, setGenre] = useState('All');
  const [status, setStatus] = useState('All');

  // Finder Filters
  const [finderFilters, setFinderFilters] = useState<FinderFilters>({
      description: '',
      includedGenres: [],
      excludedGenres: [],
      includedTags: [],
      excludedTags: [],
      status: 'All',
      minRating: 4.0,
      sortBy: 'Popular'
  });

  const isUrl = (text: string) => {
      return text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Auto-switch to import if URL detected
    if (isUrl(query)) {
        handleImportUrl();
        return;
    }

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setWebResultText('');
    
    // 1. Local Directory Search (Always include matches from cache first)
    const directory = getDirectory();
    const localMatches = directory.filter(n => n.title.toLowerCase().includes(query.toLowerCase()));

    if (mode === 'ai') {
        const aiData = await searchNovelsAI(query, { genre, status });
        const combined = [...localMatches];
        aiData.forEach(n => {
            if (!combined.some(local => local.title === n.title)) combined.push(n);
        });
        setResults(combined);
    } else if (mode === 'web') {
        const { novels, rawText } = await searchNovelsWeb(query);
        setResults(novels);
        setWebResultText(rawText);
    } else if (mode === 'finder') {
        const finderData = await findNovelsByFiltersAI(finderFilters);
        setResults(finderData);
    }
    
    setLoading(false);
  };

  const handleImportUrl = async () => {
      setImportStatus('importing');
      setLoading(true);
      setResults([]);

      // Check if already exists in directory to save AI tokens and prevent duplicates
      const directory = getDirectory();
      // Normalize URL check (basic)
      const existing = directory.find(n => n.webUrl === query || n.webUrl === query + '/' || n.webUrl === query.replace(/\/$/, ''));
      
      let novel: Novel | null = null;

      if (existing) {
          novel = existing;
      } else {
          novel = await parseNovelFromUrlAI(query);
      }

      if (novel) {
          // Add to public directory (Deduplication handled inside addToDirectory by title)
          addToDirectory([novel]);
          
          // Add to user library
          upsertNovel(novel);
          
          setResults([novel]);
          setImportStatus('done');
      }
      setLoading(false);
  };

  const handleScanSource = async (source: string) => {
      setMode('scan');
      setLoading(true);
      setHasSearched(true);
      setQuery(`Scanning ${source} (Auto-Translating)...`);
      const novels = await scanNovelSourceAI(source);
      setResults(novels);
      setLoading(false);
  };

  const handleQuickAdd = (novel: Novel) => {
      upsertNovel(novel);
      alert(`Added "${novel.title}" to Library!`);
  };

  // 0 = Neutral, 1 = Include, 2 = Exclude
  const getTagState = (item: string, type: 'genre' | 'tag') => {
      const inc = type === 'genre' ? finderFilters.includedGenres : finderFilters.includedTags;
      const exc = type === 'genre' ? finderFilters.excludedGenres : finderFilters.excludedTags;
      if (inc.includes(item)) return 1;
      if (exc.includes(item)) return 2;
      return 0;
  };

  const toggleTag = (item: string, type: 'genre' | 'tag') => {
      setFinderFilters(prev => {
          const inc = type === 'genre' ? [...prev.includedGenres] : [...prev.includedTags];
          const exc = type === 'genre' ? [...prev.excludedGenres] : [...prev.excludedTags];
          
          const currentState = inc.includes(item) ? 1 : exc.includes(item) ? 2 : 0;
          
          // Rotate: Neutral -> Include -> Exclude -> Neutral
          if (currentState === 0) {
              // Add to Include
              inc.push(item);
          } else if (currentState === 1) {
              // Remove from Include, Add to Exclude
              const idx = inc.indexOf(item);
              if (idx > -1) inc.splice(idx, 1);
              exc.push(item);
          } else {
              // Remove from Exclude (Back to Neutral)
              const idx = exc.indexOf(item);
              if (idx > -1) exc.splice(idx, 1);
          }

          return type === 'genre' 
              ? { ...prev, includedGenres: inc, excludedGenres: exc }
              : { ...prev, includedTags: inc, excludedTags: exc };
      });
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[80vh]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-4">Search the Multiverse</h1>
        <p className="text-gray-400">Discover new worlds using our AI-powered catalog, real-time web search, or aggregator channels.</p>
      </div>

      <div className="max-w-4xl mx-auto mb-16">
        {/* Toggle Mode */}
        <div className="flex justify-center mb-6 overflow-x-auto pb-2">
            <div className="bg-gray-800 p-1 rounded-xl flex gap-1 whitespace-nowrap">
                <button 
                    onClick={() => { setMode('ai'); setQuery(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'ai' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sparkles className="w-4 h-4" /> AI Gen
                </button>
                <button 
                    onClick={() => { setMode('finder'); setQuery(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'finder' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Compass className="w-4 h-4" /> Compass
                </button>
                <button 
                    onClick={() => { setMode('web'); setQuery(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'web' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Globe className="w-4 h-4" /> Web Search
                </button>
                <button 
                     onClick={() => { setMode('scan'); setQuery(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'scan' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Layers className="w-4 h-4" /> Aggregator
                </button>
            </div>
        </div>
        
        {/* Aggregator Sources */}
        {mode === 'scan' && (
            <div className="space-y-4 mb-6 animate-fade-in">
                <div className="flex flex-wrap justify-center gap-3">
                    <span className="w-full text-center text-xs font-bold text-gray-500 uppercase tracking-widest">English Sources</span>
                    {['RoyalRoad', 'WebNovel', 'WTR-LAB', 'ScribbleHub'].map(src => (
                        <button key={src} onClick={() => handleScanSource(src)} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                            {src}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <span className="w-full text-center text-xs font-bold text-gray-500 uppercase tracking-widest">International (Auto-Translated)</span>
                    <button onClick={() => handleScanSource('Qidian')} className="bg-gray-800 hover:bg-red-900/30 border border-red-900/50 text-red-300 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                        Qidian (CN)
                    </button>
                    <button onClick={() => handleScanSource('Faloo')} className="bg-gray-800 hover:bg-orange-900/30 border border-orange-900/50 text-orange-300 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                        Faloo (CN)
                    </button>
                    <button onClick={() => handleScanSource('Munpia')} className="bg-gray-800 hover:bg-blue-900/30 border border-blue-900/50 text-blue-300 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                        Munpia (KR)
                    </button>
                    <button onClick={() => handleScanSource('Syosetu')} className="bg-gray-800 hover:bg-pink-900/30 border border-pink-900/50 text-pink-300 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                        Syosetu (JP)
                    </button>
                </div>
            </div>
        )}

        {/* Search Bar (Hidden in Finder Mode) */}
        {mode !== 'finder' && (
            <form onSubmit={handleSearch} className="relative mb-6">
                <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                    mode === 'ai' ? "e.g., 'Weak to strong necromancer'" : 
                    mode === 'web' ? "e.g. 'Best royalroad novels 2024'" :
                    "Paste URL for direct import..."
                }
                className="w-full bg-gray-900 border border-gray-700 text-white px-6 py-4 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xl pr-14"
                />
                <button 
                type="submit"
                disabled={loading}
                className={`absolute right-2 top-2 text-white p-3 rounded-full transition-colors disabled:opacity-50 ${
                    isUrl(query) ? 'bg-green-600 hover:bg-green-500' :
                    mode === 'ai' ? 'bg-primary-600 hover:bg-primary-500' : 
                    mode === 'scan' ? 'bg-purple-600 hover:bg-purple-500' :
                    'bg-blue-600 hover:bg-blue-500'
                }`}
                >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isUrl(query) ? <Download className="w-5 h-5" /> : <SearchIcon className="w-5 h-5" />}
                </button>
            </form>
        )}

        {/* FINDER UI (The Compass) */}
        {mode === 'finder' && (
            <div className="bg-[#0f172a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -z-10" />

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-900/30 rounded-full text-emerald-400 border border-emerald-500/30">
                            <Compass className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">The Story Compass</h2>
                            <p className="text-xs text-gray-400">Divine the coordinates of your next adventure.</p>
                        </div>
                    </div>

                    {/* Magic Input */}
                    <div className="mb-8 relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-purple-400" /> What do you desire?
                        </label>
                        <textarea 
                            value={finderFilters.description}
                            onChange={(e) => setFinderFilters({...finderFilters, description: e.target.value})}
                            placeholder="e.g., I want a melancholic story about a robot learning to love in a post-apocalyptic world..."
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24 text-sm leading-relaxed"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Filters */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Genres */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest border-b border-gray-800 pb-2">The Core (Genres)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {GENRES.map(g => {
                                        const state = getTagState(g, 'genre');
                                        return (
                                            <button 
                                                key={g} 
                                                onClick={() => toggleTag(g, 'genre')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                    state === 1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                                    state === 2 ? 'bg-red-500/10 border-red-500/50 text-red-400 line-through opacity-70' :
                                                    'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                                                }`}
                                            >
                                                {g}
                                                {state === 1 && <Check className="w-3 h-3" />}
                                                {state === 2 && <X className="w-3 h-3" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Tags & Tropes */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest border-b border-gray-800 pb-2">The Elements (Tags & Tropes)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[...TAGS, ...TROPES].map(t => {
                                        const state = getTagState(t, 'tag');
                                        return (
                                            <button 
                                                key={t} 
                                                onClick={() => toggleTag(t, 'tag')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                    state === 1 ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' :
                                                    state === 2 ? 'bg-red-500/10 border-red-500/50 text-red-400 line-through opacity-70' :
                                                    'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                                                }`}
                                            >
                                                {t}
                                                {state === 1 && <Check className="w-3 h-3" />}
                                                {state === 2 && <X className="w-3 h-3" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Settings */}
                        <div className="lg:col-span-4 bg-gray-950/50 p-6 rounded-xl border border-gray-800 h-fit">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Parameters</h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
                                    <div className="grid grid-cols-3 gap-1 bg-gray-900 p-1 rounded-lg">
                                        {['All', 'Ongoing', 'Completed'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setFinderFilters({...finderFilters, status: s as any})}
                                                className={`text-xs py-1.5 rounded-md font-bold transition-all ${finderFilters.status === s ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="block text-xs font-medium text-gray-500">Min Rating</label>
                                        <span className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                                            {finderFilters.minRating} <Star className="w-3 h-3 fill-yellow-500" />
                                        </span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="5" step="0.5"
                                        value={finderFilters.minRating}
                                        onChange={(e) => setFinderFilters({...finderFilters, minRating: parseFloat(e.target.value)})}
                                        className="w-full accent-yellow-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Sort Priority</label>
                                    <select 
                                        value={finderFilters.sortBy}
                                        onChange={(e) => setFinderFilters({...finderFilters, sortBy: e.target.value as any})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                                    >
                                        <option value="Popular">Most Popular</option>
                                        <option value="Rating">Highest Rated</option>
                                        <option value="New">Newly Updated</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={(e) => handleSearch(e)}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all mt-4"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    Divinate Results
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Filters (AI Mode Only) */}
        {mode === 'ai' && (
            <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Filter className="w-4 h-4" /> Filters:
                </div>
                
                <select 
                    value={genre} 
                    onChange={(e) => setGenre(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                    {['All', ...GENRES].map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                    {['All', 'Ongoing', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        )}
      </div>

      {/* Results Area */}
      <div>
        {loading ? (
          <div className="text-center py-20">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                  {importStatus === 'importing' ? 'Analyzing URL content & extracting metadata...' : 
                   mode === 'scan' ? 'Scanning external source for top novels...' :
                   mode === 'finder' ? 'Consulting the Oracle...' :
                   'Querying the multiverse...'}
              </p>
          </div>
        ) : hasSearched && results.length === 0 && !webResultText ? (
          <div className="text-center text-gray-500 mt-10">
            No novels found matching your description.
          </div>
        ) : (
          <div>
              {/* Special Import Success Message */}
              {importStatus === 'done' && (
                  <div className="bg-green-900/20 border border-green-500/40 p-4 rounded-xl mb-6 flex items-center gap-3 animate-fade-in">
                      <div className="bg-green-500 rounded-full p-1"><LinkIcon className="w-4 h-4 text-white" /></div>
                      <div className="text-green-300 font-medium">Novel imported successfully! It has been added to your Library and the Public Directory.</div>
                  </div>
              )}

              {mode === 'web' && webResultText && (
                  <div className="mb-8 p-6 bg-blue-900/10 border border-blue-500/20 rounded-2xl">
                      <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> AI Web Summary</h3>
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{webResultText}</p>
                  </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map(novel => (
                    <div key={novel.id} className="relative group">
                         <NovelCard 
                            novel={novel} 
                            onClick={onNovelClick} 
                        />
                        {/* Quick Add Overlay for Scanned Items */}
                        {(mode === 'scan' || mode === 'web' || mode === 'ai' || mode === 'finder') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleQuickAdd(novel); }}
                                className="absolute top-4 right-4 bg-primary-600 hover:bg-primary-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-20"
                                title="Add to Library"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
