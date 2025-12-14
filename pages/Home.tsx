
import React, { useState, useEffect } from 'react';
import { Novel } from '../types';
import NovelCard from '../components/NovelCard';
import { Sparkles, TrendingUp, RefreshCw, Globe, Zap, Activity, ExternalLink, Clock, Layers, Plus, Shuffle } from 'lucide-react';
import { searchNovelsAI, scanNovelSourceAI } from '../services/geminiService';
import { addToDirectory, getDirectory } from '../services/storageService';

interface HomeProps {
  onNovelClick: (novel: Novel) => void;
}

const Home: React.FC<HomeProps> = ({ onNovelClick }) => {
  const [featured, setFeatured] = useState<Novel[]>([]);
  const [liveFeed, setLiveFeed] = useState<Novel[]>([]);
  const [scanningSource, setScanningSource] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'trending' | 'updated'>('updated');
  const [loading, setLoading] = useState(true);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  
  // New State for Directory/Filtering
  const [sourceFilter, setSourceFilter] = useState<'All' | 'RoyalRoad' | 'WebNovel' | 'WTR-LAB' | 'International'>('All');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Load directory cache first
      const dir = getDirectory();
      if (dir.length > 0) {
          setLiveFeed(dir.slice(0, 15));
      }

      // Load initial featured content (if empty)
      if (featured.length === 0) {
          const featuredData = await searchNovelsAI("best rated fantasy novels");
          setFeatured(featuredData.slice(0, 3));
      }
      
      setLoading(false);
      
      // Automatic Daily Scan Logic
      const today = new Date().toDateString();
      const lastScan = localStorage.getItem('omniread_last_scan');
      
      if (lastScan !== today) {
          // Trigger Full Scan Sequence if new day
          await startFullScanSequence();
          localStorage.setItem('omniread_last_scan', today);
      }
    };
    loadData();
  }, []);

  const startFullScanSequence = async () => {
      // Prioritize Updates first (conserve keys for existing readers)
      await runScanBatch('updated');
      // Then look for new trending stuff
      await runScanBatch('trending');
  };

  const runScanBatch = async (mode: 'trending' | 'updated') => {
      const sources: string[] = ['RoyalRoad', 'WebNovel', 'WTR-LAB', 'ScribbleHub', 'Qidian'];
      
      for (const source of sources) {
          setScanningSource(`${source} (${mode})`);
          // Slight delay to not hammer UI/API too instantly
          await new Promise(r => setTimeout(r, 1000));
          
          try {
              const newNovels = await scanNovelSourceAI(source, mode);
              addToDirectory(newNovels);
              
              // Update local feed state
              const updatedDir = getDirectory();
              applyFilters(updatedDir);
          } catch (e) {
              console.error(`Failed to scan ${source}`);
          }
      }
      setScanningSource(null);
  };

  // Manual Trigger (Still allows user to force scan specific source if needed, limits apply via UI/UX convention but system backend check handles keys)
  const handleManualScan = async (mode: 'trending' | 'updated') => {
      await runScanBatch(mode);
  };

  const applyFilters = (novels: Novel[]) => {
      let filtered = novels;
      if (sourceFilter === 'International') {
          filtered = novels.filter(n => ['Qidian', 'Faloo', 'Munpia', 'Syosetu'].includes(n.source));
      } else if (sourceFilter !== 'All') {
          filtered = novels.filter(n => n.source === sourceFilter);
      }
      // Sort by updated (directory is usually updated but verify)
      // Since we want "updates", we sort by date if possible, but ID based timestamp is a good proxy for new additions.
      // For updates, we might need a dedicated `updatedAt` stamp. `lastUpdated` is a string.
      // Let's assume directory is roughly sorted.
      setLiveFeed(filtered.slice(0, page * 15));
  };

  useEffect(() => {
      const dir = getDirectory();
      applyFilters(dir);
  }, [sourceFilter, page]);

  const handleLoadMore = () => {
      setPage(p => p + 1);
  };

  const handleSurpriseMe = async () => {
      setSurpriseLoading(true);
      // 1. Try to find a random novel from directory
      const dir = getDirectory();
      if (dir.length > 5) {
          const random = dir[Math.floor(Math.random() * dir.length)];
          onNovelClick(random);
      } else {
          // 2. Or generate a unique one if directory is sparse
          const novels = await searchNovelsAI("Generate a completely random, unique, creative web novel concept with high ratings.");
          if (novels.length > 0) {
              onNovelClick(novels[0]);
          }
      }
      setSurpriseLoading(false);
  };

  return (
    <div className="space-y-12 pb-20">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/40 to-purple-900/40" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500 rounded-full blur-[100px] opacity-30" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 text-primary-300 px-3 py-1 rounded-full text-xs font-bold mb-4">
             <Sparkles className="w-3 h-3" /> AI Powered Aggregator
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            The Multiverse Library
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            OmniRead automatically scans RoyalRoad, WTR-LAB, WebNovel, and International sites once daily to index the latest chapters.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2">
              Browse Rankings
            </button>
            <button 
                onClick={handleSurpriseMe}
                disabled={surpriseLoading}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border border-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
                {surpriseLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                Surprise Me
            </button>
            
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700 ml-auto md:ml-0">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">Daily Scan Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Aggregator Feed (WTR-LAB / NovelUpdates Style) */}
      <section className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-green-500 w-5 h-5" /> 
                  Daily Updates
              </h2>
              
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  {['All', 'RoyalRoad', 'WebNovel', 'WTR-LAB', 'International'].map((src) => (
                      <button 
                        key={src}
                        onClick={() => { setSourceFilter(src as any); setPage(1); }}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${sourceFilter === src ? 'bg-gray-800 text-white border-gray-600' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'}`}
                      >
                          {src === 'International' ? 'Intl (CN/KR/JP)' : src}
                      </button>
                  ))}
              </div>

              {scanningSource ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full animate-pulse">
                      <Globe className="w-3 h-3" /> Scanning {scanningSource}...
                  </div>
              ) : (
                  <button onClick={() => handleManualScan('updated')} className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Force Update
                  </button>
              )}
          </div>

          <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <div className="col-span-8 md:col-span-5">Novel / Series</div>
                  <div className="col-span-3 md:col-span-2 hidden md:block">Latest Chapter</div>
                  <div className="col-span-2 md:col-span-2 hidden md:block">Source</div>
                  <div className="col-span-4 md:col-span-3 text-right">Updated</div>
              </div>

              {liveFeed.length === 0 && scanningSource && (
                  <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                      <Layers className="w-8 h-8 animate-bounce mb-2 opacity-50" />
                      <p>Crawling the web for updates...</p>
                  </div>
              )}
              
              {liveFeed.map((novel, idx) => (
                  <div 
                    key={`${novel.id}-${idx}`} 
                    onClick={() => onNovelClick(novel)}
                    className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-900/50 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group items-center border-b border-gray-800/30 last:border-0 relative overflow-hidden"
                  >
                      {/* Highlight Effect */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      {/* Title Column */}
                      <div className="col-span-8 md:col-span-5 flex items-center gap-3">
                          <div className="w-8 h-10 bg-gray-800 rounded overflow-hidden flex-shrink-0 hidden sm:block relative">
                              <img src={novel.coverUrl} className="w-full h-full object-cover" alt="cover" />
                              {novel.rating > 4.5 && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-bl-full" />}
                          </div>
                          <div className="min-w-0">
                              <h4 className="font-bold text-gray-200 text-sm truncate group-hover:text-primary-400 transition-colors">
                                  {novel.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500 md:hidden mt-0.5">
                                  <span className={
                                      novel.source === 'RoyalRoad' ? 'text-blue-400' :
                                      novel.source === 'WebNovel' ? 'text-red-400' : 'text-green-400'
                                  }>{novel.source}</span>
                                  <span>•</span>
                                  <span>{novel.chapters[4]?.title}</span>
                              </div>
                              {/* Tags (Desktop only) */}
                              <div className="hidden md:flex gap-1 mt-1">
                                  {novel.tags.slice(0, 2).map(t => (
                                      <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded border border-gray-700">{t}</span>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Chapter Column (Desktop) */}
                      <div className="col-span-2 hidden md:flex items-center gap-1">
                           <div className="bg-gray-800 px-2 py-1 rounded text-xs font-mono text-gray-300 group-hover:bg-primary-900/30 group-hover:text-primary-300 border border-gray-700">
                               {novel.chapters[4]?.title || 'Ch. 1'}
                           </div>
                      </div>

                      {/* Source Column (Desktop) */}
                      <div className="col-span-2 hidden md:flex items-center">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                                  novel.source === 'RoyalRoad' ? 'border-blue-500/30 text-blue-400 bg-blue-900/10' :
                                  novel.source === 'WebNovel' ? 'border-red-500/30 text-red-400 bg-red-900/10' :
                                  ['Qidian', 'Faloo', 'Munpia', 'Syosetu'].includes(novel.source) ? 'border-purple-500/30 text-purple-400 bg-purple-900/10' :
                                  'border-green-500/30 text-green-400 bg-green-900/10'
                              }`}>
                                  {novel.source}
                          </span>
                      </div>

                      {/* Time Column */}
                      <div className="col-span-4 md:col-span-3 text-right flex items-center justify-end gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {novel.lastUpdated}
                      </div>
                  </div>
              ))}
          </div>
          
          {liveFeed.length > 0 && (
              <button 
                onClick={handleLoadMore}
                className="w-full mt-4 py-2 text-sm font-bold text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700"
              >
                  Load More Updates
              </button>
          )}
      </section>

      {/* Featured Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-yellow-500 w-6 h-6" /> 
            Top Rated This Week
          </h2>
        </div>
        
        {loading && featured.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featured.map(novel => (
              <NovelCard key={novel.id} novel={novel} onClick={onNovelClick} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
