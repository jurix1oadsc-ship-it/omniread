
import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Menu, Zap, ChevronDown, Trophy, Flame, Calendar, CheckCircle, Bookmark, Download, History, PenTool, MapPin, Swords, Gem, ShoppingBag, Users, Play, Merge, Languages } from 'lucide-react';
import { getUserProfile, subscribeToProfileUpdates } from '../services/storageService';
import { UserProfile, Novel } from '../types';

interface NavbarProps {
  onSearchClick: () => void;
  onHomeClick: () => void;
  onHistoryClick: () => void;
  onLibraryClick: () => void;
  onRankingsClick: (category: string) => void;
  onProfileClick: () => void;
  onStudioClick: () => void;
  onSpotsClick: () => void;
  onDungeonClick: () => void;
  onMarketClick: () => void;
  onSectClick: () => void;
  onNexusClick: () => void; 
  onTranslatorClick: () => void; // New prop
  onContinueReading: (novel: Novel, chapterId: string) => void;
  profileKey: number; 
}

const Navbar: React.FC<NavbarProps> = ({ onSearchClick, onHomeClick, onHistoryClick, onLibraryClick, onRankingsClick, onProfileClick, onStudioClick, onSpotsClick, onDungeonClick, onMarketClick, onSectClick, onNexusClick, onTranslatorClick, onContinueReading, profileKey }) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [currencyChanged, setCurrencyChanged] = useState(false);

  useEffect(() => {
    // Initial fetch
    setProfile(getUserProfile());
    
    // Subscribe to global updates
    const unsubscribe = subscribeToProfileUpdates((updatedProfile) => {
        setProfile(prev => {
            if (prev.spiritStones !== updatedProfile.spiritStones) {
                setCurrencyChanged(true);
                setTimeout(() => setCurrencyChanged(false), 1000);
            }
            return updatedProfile;
        });
    });
    
    return () => unsubscribe();
  }, [profileKey]); 

  const NavDropdown = ({ label, items }: { label: string, items: { label: string, icon: React.ElementType, onClick?: () => void }[] }) => (
    <div className="relative group h-full flex items-center">
      <button className="flex items-center gap-1.5 text-gray-300 group-hover:text-white transition-colors text-sm font-medium px-3 py-2 rounded-lg group-hover:bg-gray-800/50">
        {label}
        <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" />
      </button>
      
      {/* Dropdown Menu */}
      <div className="absolute top-full left-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left -translate-y-2 group-hover:translate-y-0 z-50">
        <div className="bg-[#1a202c] border border-gray-800 rounded-xl shadow-2xl overflow-hidden p-1.5 ring-1 ring-black/5 backdrop-blur-sm">
          {items.map((item, idx) => (
            <button 
              key={idx}
              onClick={(e) => {
                e.currentTarget.blur(); // Remove focus
                if (item.onClick) item.onClick();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all group/item text-left"
            >
              <item.icon className="w-4 h-4 text-gray-500 group-hover/item:text-primary-400 transition-colors" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={onHomeClick}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <div className="relative w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg flex items-center justify-center shadow-lg group-hover:border-primary-500/50 transition-colors">
                <BookOpen className="text-primary-400 w-4 h-4" />
              </div>
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 tracking-tight">
              OmniRead
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <button 
              onClick={onHomeClick} 
              className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all text-sm font-medium"
            >
              Browse
            </button>

            <NavDropdown 
              label="Rankings" 
              items={[
                { label: 'Top Rated', icon: Trophy, onClick: () => onRankingsClick('Top Rated') },
                { label: 'Trending', icon: Flame, onClick: () => onRankingsClick('Trending') },
                { label: 'New Arrivals', icon: Calendar, onClick: () => onRankingsClick('New Arrivals') },
                { label: 'Completed', icon: CheckCircle, onClick: () => onRankingsClick('Completed') },
              ]}
            />

            <NavDropdown 
              label="Library" 
              items={[
                { label: 'Recently Read', icon: History, onClick: onHistoryClick },
                { label: 'Bookmarks', icon: Bookmark, onClick: onLibraryClick },
                { label: 'Downloads', icon: Download },
              ]}
            />
            
            <button 
              onClick={onNexusClick}
              className="px-3 py-2 text-purple-400 hover:text-white hover:bg-purple-900/20 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5"
            >
              <Merge className="w-4 h-4" /> Nexus
            </button>
            
            <button 
              onClick={onTranslatorClick}
              className="px-3 py-2 text-blue-400 hover:text-white hover:bg-blue-900/20 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5"
            >
              <Languages className="w-4 h-4" /> MTL
            </button>
            
            <button 
              onClick={onSectClick}
              className="px-3 py-2 text-cyan-400 hover:text-white hover:bg-cyan-900/20 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              Sects
            </button>
            
            <button 
              onClick={onStudioClick}
              className="px-3 py-2 text-primary-300 hover:text-white hover:bg-primary-900/20 rounded-lg transition-all text-sm font-bold flex items-center gap-2 group border border-primary-500/20 ml-2"
            >
              <PenTool className="w-4 h-4 text-primary-400 group-hover:text-primary-300 transition-colors" />
              Studio
            </button>
          </div>

          {/* Search & Profile */}
          <div className="flex items-center gap-4">
             {/* Currency Display */}
            <div className="hidden md:flex flex-col items-end leading-none cursor-pointer group" onClick={onMarketClick}>
                <div className={`flex items-center gap-1 text-xs font-bold transition-all duration-300 ${currencyChanged ? 'text-green-400 scale-110' : 'text-amber-400 group-hover:text-amber-300'}`}>
                    <Gem className={`w-3 h-3 ${currencyChanged ? 'animate-spin' : ''}`} /> {profile.spiritStones}
                </div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider group-hover:text-gray-400 transition-colors">
                    Market <ShoppingBag className="w-3 h-3 inline ml-0.5" />
                </div>
            </div>

            <button 
              onClick={onSearchClick}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all group"
              aria-label="Search"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            
            <div 
              onClick={onProfileClick}
              className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 p-[2px] cursor-pointer hover:shadow-lg hover:shadow-primary-500/20 transition-all"
            >
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`} 
                  alt="Avatar" 
                  className="w-full h-full" 
                />
              </div>
            </div>

            <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
