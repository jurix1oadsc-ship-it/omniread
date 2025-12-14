
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import NewsTicker from './components/NewsTicker';
import Footer from './components/Footer';
import Home from './pages/Home';
import NovelDetails from './pages/NovelDetails';
import Reader from './pages/Reader';
import Search from './pages/Search';
import History from './pages/History';
import Library from './pages/Library';
import Rankings from './pages/Rankings';
import Studio from './pages/Studio';
import ReadingSpots from './pages/ReadingSpots';
import Dungeon from './pages/Dungeon';
import Market from './pages/Market';
import Sect from './pages/Sect';
import Nexus from './pages/Nexus'; 
import Translator from './pages/Translator';
import ProfileModal from './components/ProfileModal';
import ToastContainer from './components/Toast';
import DailyReward from './components/DailyReward';
import AudioPlayer from './components/AudioPlayer';
import AdminDashboard from './components/AdminDashboard'; 
import { Novel, Chapter, ToastMessage, AudioState } from './types';
import { getSiteConfig } from './services/storageService';

// App Views Enum
enum View {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  DETAILS = 'DETAILS',
  READER = 'READER',
  HISTORY = 'HISTORY',
  LIBRARY = 'LIBRARY',
  RANKINGS = 'RANKINGS',
  STUDIO = 'STUDIO',
  SPOTS = 'SPOTS',
  DUNGEON = 'DUNGEON',
  MARKET = 'MARKET',
  SECT = 'SECT',
  NEXUS = 'NEXUS',
  TRANSLATOR = 'TRANSLATOR'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [rankingCategory, setRankingCategory] = useState<string>('Top Rated');
  
  // UI State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [profileKey, setProfileKey] = useState(0); 
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [globalBanner, setGlobalBanner] = useState<string | null>(null);

  // Global Audio State
  const [audioState, setAudioState] = useState<AudioState>({
      isPlaying: false,
      isLoading: false,
      currentNovel: null,
      currentChapter: null,
      duration: 0,
      currentTime: 0,
      isExpanded: false
  });

  // Toast Helper
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Add Error Listener & Config Check
  useEffect(() => {
      const handleGlobalError = (e: Event) => {
          const customEvent = e as CustomEvent;
          if (customEvent.detail) {
              addToast(customEvent.detail.message, customEvent.detail.type || 'error');
          }
      };
      
      window.addEventListener('omniread-error', handleGlobalError);
      
      // Load Global Config
      const conf = getSiteConfig();
      if (conf.globalAnnouncement) setGlobalBanner(conf.globalAnnouncement);

      return () => window.removeEventListener('omniread-error', handleGlobalError);
  }, []);

  // Navigation Handlers
  const handleNovelClick = (novel: Novel) => {
    setSelectedNovel(novel);
    setCurrentView(View.DETAILS);
    window.scrollTo(0, 0);
  };

  const handleChapterClick = (novel: Novel, chapter: Chapter) => {
    setSelectedNovel(novel);
    setSelectedChapter(chapter);
    setCurrentView(View.READER);
  };

  const handleBackToDetails = () => {
    setCurrentView(View.DETAILS);
  };

  const handleBackToHome = () => {
    setSelectedNovel(null);
    setCurrentView(View.HOME);
  };

  const handleHistoryClick = () => {
    setSelectedNovel(null);
    setCurrentView(View.HISTORY);
    window.scrollTo(0, 0);
  };

  const handleLibraryClick = () => {
    setSelectedNovel(null);
    setCurrentView(View.LIBRARY);
    window.scrollTo(0, 0);
  };

  const handleRankingsClick = (category: string) => {
    setRankingCategory(category);
    setCurrentView(View.RANKINGS);
    window.scrollTo(0, 0);
  };

  const handleContinueReading = (novel: Novel, chapterId: string) => {
      const chapter = novel.chapters.find(c => c.id === chapterId);
      if (chapter) {
          handleChapterClick(novel, chapter);
      } else {
          handleNovelClick(novel);
          addToast("Could not resume exact chapter, opening details.", 'info');
      }
  };

  // Audio Handlers
  const handlePlayAudio = (novel: Novel, chapter: Chapter) => {
      setAudioState(prev => ({
          ...prev,
          currentNovel: novel,
          currentChapter: chapter,
          isPlaying: false, 
          isLoading: true, 
          currentTime: 0
      }));
  };

  const handleAudioNext = () => {
      const { currentNovel, currentChapter } = audioState;
      if (!currentNovel || !currentChapter) return;
      
      const idx = currentNovel.chapters.findIndex(c => c.number === currentChapter.number);
      if (idx !== -1 && idx < currentNovel.chapters.length - 1) {
          handlePlayAudio(currentNovel, currentNovel.chapters[idx + 1]);
      } else {
          addToast("End of book reached.", 'info');
          setAudioState(p => ({ ...p, isPlaying: false }));
      }
  };

  const handleAudioPrev = () => {
      const { currentNovel, currentChapter } = audioState;
      if (!currentNovel || !currentChapter) return;
      
      const idx = currentNovel.chapters.findIndex(c => c.number === currentChapter.number);
      if (idx > 0) {
          handlePlayAudio(currentNovel, currentNovel.chapters[idx - 1]);
      }
  };

  return (
    <HashRouter>
      <div className={`min-h-screen flex flex-col bg-[#0f172a] text-gray-200 font-sans selection:bg-primary-500/30 ${audioState.currentChapter ? 'pb-24' : ''}`}>
        
        <DailyReward />
        
        {/* Global Announcement Banner from Admin Panel */}
        {globalBanner && !currentView.includes(View.READER) && (
            <div className="bg-red-900/80 text-white text-center text-xs py-1 font-bold tracking-wider">
                {globalBanner}
            </div>
        )}

        {/* Render Navbar only if not in reader mode for immersion */}
        {currentView !== View.READER && (
          <>
            <Navbar 
              onSearchClick={() => setCurrentView(View.SEARCH)}
              onHomeClick={() => setCurrentView(View.HOME)}
              onHistoryClick={handleHistoryClick}
              onLibraryClick={handleLibraryClick}
              onRankingsClick={handleRankingsClick}
              onProfileClick={() => setIsProfileOpen(true)}
              onStudioClick={() => setCurrentView(View.STUDIO)}
              onSpotsClick={() => setCurrentView(View.SPOTS)}
              onDungeonClick={() => setCurrentView(View.DUNGEON)}
              onMarketClick={() => setCurrentView(View.MARKET)}
              onSectClick={() => setCurrentView(View.SECT)}
              onNexusClick={() => setCurrentView(View.NEXUS)}
              onTranslatorClick={() => setCurrentView(View.TRANSLATOR)}
              onContinueReading={handleContinueReading}
              profileKey={profileKey}
            />
            <NewsTicker />
          </>
        )}

        {/* Global Components */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        {audioState.currentChapter && (
            <AudioPlayer 
                state={audioState} 
                setState={setAudioState} 
                onClose={() => setAudioState(p => ({ ...p, currentChapter: null, isPlaying: false }))}
                onNextChapter={handleAudioNext}
                onPrevChapter={handleAudioPrev}
            />
        )}
        
        <ProfileModal 
            isOpen={isProfileOpen} 
            onClose={() => setIsProfileOpen(false)} 
            onProfileUpdate={() => setProfileKey(k => k + 1)}
        />

        <AdminDashboard 
            isOpen={isAdminOpen} 
            onClose={() => setIsAdminOpen(false)} 
            addToast={addToast}
        />

        <main className={`mx-auto w-full flex-1 ${currentView === View.READER ? '' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8'}`}>
          {currentView === View.HOME && (
            <Home onNovelClick={handleNovelClick} />
          )}

          {currentView === View.SEARCH && (
            <Search onNovelClick={handleNovelClick} />
          )}

          {currentView === View.HISTORY && (
            <History onNovelClick={handleNovelClick} />
          )}

          {currentView === View.LIBRARY && (
            <Library onNovelClick={handleNovelClick} addToast={addToast} />
          )}

          {currentView === View.RANKINGS && (
            <Rankings category={rankingCategory} onNovelClick={handleNovelClick} />
          )}

          {currentView === View.STUDIO && (
            <Studio addToast={addToast} />
          )}

          {currentView === View.SPOTS && (
            <ReadingSpots addToast={addToast} />
          )}
          
          {currentView === View.DUNGEON && (
            <Dungeon addToast={addToast} />
          )}
          
          {currentView === View.MARKET && (
             <Market addToast={addToast} />
          )}
          
          {currentView === View.SECT && (
             <Sect addToast={addToast} />
          )}
          
          {currentView === View.NEXUS && (
             <Nexus addToast={addToast} />
          )}
          
          {currentView === View.TRANSLATOR && (
             <Translator />
          )}

          {currentView === View.DETAILS && selectedNovel && (
            <NovelDetails 
              novel={selectedNovel} 
              onChapterClick={handleChapterClick} 
              onBack={handleBackToHome}
            />
          )}

          {currentView === View.READER && selectedNovel && selectedChapter && (
            <Reader 
              novel={selectedNovel} 
              chapter={selectedChapter} 
              onBack={handleBackToDetails}
              onChapterChange={(ch) => setSelectedChapter(ch)}
              addToast={addToast}
              onPlayAudio={() => handlePlayAudio(selectedNovel, selectedChapter)} // Pass play trigger
            />
          )}
        </main>
        
        {/* Footer (Hidden in Reader) */}
        {currentView !== View.READER && <Footer onOpenAdmin={() => setIsAdminOpen(true)} profileKey={profileKey} />}
      </div>
    </HashRouter>
  );
};

export default App;
