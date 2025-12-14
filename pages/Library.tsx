
import React, { useEffect, useState } from 'react';
import { Bookmark, BookOpen, RefreshCw, Link as LinkIcon, Plus, Loader2, Gem, AlertTriangle, SortAsc, Filter, Search, Layers } from 'lucide-react';
import { Novel, UserProfile, LibraryStatus } from '../types';
import NovelCard from '../components/NovelCard';
import { getLibrary, upsertNovel, getUserProfile, submitForApproval } from '../services/storageService';
import { parseNovelFromUrlAI } from '../services/geminiService';

interface LibraryProps {
  onNovelClick: (novel: Novel) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Library: React.FC<LibraryProps> = ({ onNovelClick, addToast }) => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [displayedNovels, setDisplayedNovels] = useState<Novel[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  
  // Sorting & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'alpha' | 'rating'>('recent');
  const [activeShelf, setActiveShelf] = useState<LibraryStatus | 'All'>('Reading');

  useEffect(() => {
    const lib = getLibrary();
    setNovels(lib);
    setProfile(getUserProfile());
  }, []);

  useEffect(() => {
      let filtered = [...novels];

      // 1. Search
      if (searchQuery.trim()) {
          filtered = filtered.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }

      // 2. Shelf Filter
      if (activeShelf !== 'All') {
          filtered = filtered.filter(n => (n.libraryStatus || 'Reading') === activeShelf);
      }

      // 3. Sort
      filtered.sort((a, b) => {
          if (sortMode === 'alpha') return a.title.localeCompare(b.title);
          if (sortMode === 'rating') return b.rating - a.rating;
          return 0; 
      });

      setDisplayedNovels(filtered);
  }, [novels, searchQuery, sortMode, activeShelf]);

  const handleSync = async () => {
      setSyncing(true);
      const library = getLibrary();
      const ongoingNovels = library.filter(n => n.status === 'Ongoing' && n.webUrl && n.webUrl.startsWith('http'));
      
      if (ongoingNovels.length === 0) {
          addToast("No ongoing novels with linked URLs to sync.", 'info');
          setSyncing(false);
          return;
      }

      addToast(`Syncing ${ongoingNovels.length} novels...`, 'info');
      
      let updateCount = 0;
      
      for (const novel of ongoingNovels) {
          try {
             const updatedData = await parseNovelFromUrlAI(novel.webUrl!);
             
             if (updatedData) {
                 const result = upsertNovel(updatedData);
                 if (result.action === 'updated' && result.novel.chapters.length > novel.chapters.length) {
                     updateCount++;
                 }
             }
          } catch (e) {
              console.error(`Failed to sync ${novel.title}`, e);
          }
      }
      
      setNovels(getLibrary()); 
      setSyncing(false);
      
      if (updateCount > 0) {
          addToast(`Success! Found updates for ${updateCount} novels.`, 'success');
      } else {
          addToast("Library is up to date.", 'success');
      }
  };

  const handleImport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!importUrl.trim()) return;

      if (profile.spiritStones < 100) {
          addToast("Not enough Spirit Stones! You need 100 to import.", "error");
          return;
      }

      setIsImporting(true);
      try {
          const importedNovel = await parseNovelFromUrlAI(importUrl);

          if (importedNovel) {
              const submitted = submitForApproval(importedNovel);
              
              if (submitted) {
                  const result = upsertNovel(importedNovel);
                  
                  setNovels(getLibrary());
                  setProfile(getUserProfile());
                  setImportUrl('');
                  
                  addToast(`Imported to Library! Pending public approval.`, 'success');
              } else {
                  addToast("Error: Not enough stones or already pending.", 'error');
              }
          } else {
              addToast("Failed to parse novel. Please check the URL.", 'error');
          }
      } catch (e) {
          addToast("An error occurred during import.", 'error');
      }
      setIsImporting(false);
  };

  const SHELVES: (LibraryStatus | 'All')[] = ['Reading', 'Plan to Read', 'On Hold', 'Completed', 'Dropped', 'All'];

  return (
    <div className="max-w-7xl mx-auto min-h-[80vh] animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20 shrink-0">
                <Bookmark className="w-8 h-8 text-primary-500" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Your Library</h1>
                <p className="text-gray-400">Manage your collection across dimensions</p>
            </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                 <input 
                    type="text" 
                    placeholder="Filter..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                 />
             </div>
             
             <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1">
                 <button 
                    onClick={() => setSortMode('recent')}
                    className={`p-1.5 rounded-md transition-colors ${sortMode === 'recent' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    title="Recent"
                 >
                     <SortAsc className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setSortMode('alpha')}
                    className={`p-1.5 rounded-md transition-colors ${sortMode === 'alpha' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    title="A-Z"
                 >
                     <span className="text-xs font-bold px-1">AZ</span>
                 </button>
                 <button 
                    onClick={() => setSortMode('rating')}
                    className={`p-1.5 rounded-md transition-colors ${sortMode === 'rating' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    title="Rating"
                 >
                     <Gem className="w-4 h-4" />
                 </button>
             </div>

             {novels.length > 0 && (
                <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors disabled:opacity-50 border border-gray-700"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync'}
                </button>
            )}
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-blue-400" /> Import Novel from URL
              </h3>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-gray-700">
                  <span className="text-xs text-gray-400">Balance:</span>
                  <Gem className="w-3 h-3 text-amber-400" />
                  <span className={`font-bold ${profile.spiritStones < 100 ? 'text-red-400' : 'text-white'}`}>{profile.spiritStones}</span>
              </div>
          </div>
          
          <form onSubmit={handleImport} className="flex gap-3">
              <div className="flex-1 relative">
                  <input 
                      type="url"
                      placeholder="Paste novel URL (RoyalRoad, WebNovel, etc.)"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                  />
              </div>
              <button 
                  type="submit" 
                  disabled={isImporting || !importUrl || profile.spiritStones < 100}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg whitespace-nowrap disabled:bg-gray-700 disabled:text-gray-500"
              >
                  {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gem className="w-4 h-4 text-amber-200" />}
                  Import (100)
              </button>
          </form>
          
          <div className="flex items-start gap-2 mt-3 text-xs text-gray-500">
              <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-600" />
              <p>Importing adds the novel to your <strong>Private Library</strong> immediately. It will be submitted to the <strong>Sect Pavilion</strong> for Elder approval before appearing in the public search.</p>
          </div>
      </div>

      {/* SHELVES TABS */}
      <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
          {SHELVES.map(shelf => (
              <button
                key={shelf}
                onClick={() => setActiveShelf(shelf)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeShelf === shelf 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                  {shelf}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeShelf === shelf ? 'bg-black/20' : 'bg-gray-700'}`}>
                      {shelf === 'All' ? novels.length : novels.filter(n => (n.libraryStatus || 'Reading') === shelf).length}
                  </span>
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedNovels.map(novel => (
          <NovelCard key={novel.id} novel={novel} onClick={onNovelClick} />
        ))}
      </div>
      
      {displayedNovels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
           <Layers className="w-16 h-16 mb-4 opacity-20" />
           <p className="text-lg">This shelf is empty.</p>
           <p className="text-sm">Move novels here from your library management.</p>
        </div>
      )}
    </div>
  );
};

export default Library;
