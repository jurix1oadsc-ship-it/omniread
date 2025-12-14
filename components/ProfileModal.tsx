
import React, { useState, useEffect } from 'react';
import { UserProfile, Achievement, UserApiKey, SoulboundArtifact } from '../types';
import { getUserProfile, saveUserProfile, getAchievements, getReadingStats, getHistory, createArtifact, exportSaveData, importSaveData } from '../services/storageService';
import { getKeyPool, addKeyToPool, removeKeyFromPool, getPoolStatus, getGroqKeyPool, addGroqKeyToPool, removeGroqKeyFromPool } from '../services/keyManager';
import { X, Save, Award, BookOpen, RefreshCw, Trophy, BarChart2, Hexagon, Brain, Loader2, Key, Plus, Trash2, ShieldCheck, AlertTriangle, ExternalLink, Info, CheckCircle, Cpu, Crown, Activity, Eye, EyeOff, Lock, User, Settings, Gem, Hammer, Sparkles, Download, Upload, HardDrive } from 'lucide-react';
import { analyzeReaderSoulAI } from '../services/geminiService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [editedName, setEditedName] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'soulbound' | 'achievements' | 'core' | 'stats' | 'system'>('profile');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<{topTags: {tag: string, count: number}[], totalBooksRead: number}>({topTags: [], totalBooksRead: 0});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Artifact Creation State
  const [artifactName, setArtifactName] = useState('');
  const [artifactType, setArtifactType] = useState<SoulboundArtifact['type']>('Weapon');
  
  // Key Management State
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [keyPoolStatus, setKeyPoolStatus] = useState({ total: 0, active: 0 });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  
  // Groq Key Management
  const [groqApiKeys, setGroqApiKeys] = useState<UserApiKey[]>([]);
  const [newGroqKey, setNewGroqKey] = useState('');
  const [newGroqKeyLabel, setNewGroqKeyLabel] = useState('');

  // Import/Export
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getUserProfile();
      setProfile(current);
      setEditedName(current.username);
      setAchievements(getAchievements());
      setStats(getReadingStats());
      refreshKeyData();
    }
  }, [isOpen]);

  const refreshKeyData = () => {
      setApiKeys(getKeyPool());
      setKeyPoolStatus(getPoolStatus());
      setGroqApiKeys(getGroqKeyPool());
  };

  const handleSave = () => {
    const updated = { ...profile, username: editedName };
    saveUserProfile(updated);
    setProfile(updated);
    onProfileUpdate();
    onClose();
  };

  const randomizeAvatar = () => {
    const seeds = ['Felix', 'Aneka', 'Zack', 'Midnight', 'Lilith', 'Garion', 'Sera'];
    const random = seeds[Math.floor(Math.random() * seeds.length)] + Math.random().toString(36).substring(7);
    const updated = { ...profile, avatarSeed: random };
    setProfile(updated);
  };
  
  const handleAnalyzeSoul = async () => {
      setAnalysisLoading(true);
      const history = getHistory();
      const result = await analyzeReaderSoulAI(history);
      
      const updated = { ...profile, soulTitle: result.title, soulAnalysis: result.analysis };
      saveUserProfile(updated);
      setProfile(updated);
      setAnalysisLoading(false);
  };

  const handleSummonArtifact = () => {
      if (!artifactName.trim()) return;
      const artifact = createArtifact(artifactName, artifactType);
      setProfile({ ...profile, artifact });
      onProfileUpdate();
  };

  const handleAddKey = () => {
      if (!newKey.trim()) return;
      addKeyToPool(newKey.trim(), newKeyLabel.trim());
      setNewKey('');
      setNewKeyLabel('');
      refreshKeyData();
  };

  const handleRemoveKey = (key: string) => {
      removeKeyFromPool(key);
      refreshKeyData();
  };

  const toggleKeyVisibility = (key: string) => {
      const newSet = new Set(visibleKeys);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setVisibleKeys(newSet);
  };

  const handleAddGroqKey = () => {
      if (!newGroqKey.trim()) return;
      addGroqKeyToPool(newGroqKey.trim(), newGroqKeyLabel.trim());
      setNewGroqKey('');
      setNewGroqKeyLabel('');
      refreshKeyData();
  };

  const handleRemoveGroqKey = (key: string) => {
      removeGroqKeyFromPool(key);
      refreshKeyData();
  };
  
  const toggleAdmin = () => {
      const updated = { ...profile, isAdmin: !profile.isAdmin };
      saveUserProfile(updated);
      setProfile(updated);
      onProfileUpdate();
  };

  const handleExport = () => {
      const data = exportSaveData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omniread_souljade_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
      if (!importFile) return;
      const text = await importFile.text();
      const result = importSaveData(text);
      if (result.success) {
          alert(result.message);
          window.location.reload(); // Reload to reflect changes
      } else {
          alert(result.message);
      }
  };

  const IconMap: Record<string, any> = {
      'Book': BookOpen,
      'Pen': Award, 
      'Flame': Award,
      'Zap': RefreshCw,
      'Gem': Gem
  };

  // Helper to generate last 365 days dates
  const generateYearDays = () => {
      const days = [];
      const today = new Date();
      for (let i = 364; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
      }
      return days;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a202c] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        {/* Header - Added flex-shrink-0 to prevent vertical squashing */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Cultivator Profile
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
        </div>

        {/* Navigation Tabs - Added flex-shrink-0 to prevent vertical squashing */}
        <div className="flex-shrink-0 flex border-b border-gray-700 overflow-x-auto bg-gray-900/50 no-scrollbar">
             <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-primary-500 text-primary-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 Profile
             </button>
             <button 
                onClick={() => setActiveTab('stats')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'stats' ? 'border-green-500 text-green-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 Analytics
             </button>
             <button 
                onClick={() => setActiveTab('soulbound')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'soulbound' ? 'border-purple-500 text-purple-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 Artifact
             </button>
             <button 
                onClick={() => setActiveTab('achievements')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'achievements' ? 'border-yellow-500 text-yellow-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 Trophies
             </button>
             <button 
                onClick={() => setActiveTab('core')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'core' ? 'border-red-500 text-red-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 Core
             </button>
             <button 
                onClick={() => setActiveTab('system')}
                className={`flex-none px-6 py-4 font-bold text-xs uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === 'system' ? 'border-blue-500 text-blue-400 bg-gray-800' : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
             >
                 System
             </button>
        </div>

        {/* Content Area - Added flex-1 and min-h-0 to handle scrolling properly */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
          {activeTab === 'profile' && (
            <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar Column */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative group cursor-pointer" onClick={randomizeAvatar}>
                        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 p-[3px] mb-4 shadow-lg shadow-primary-500/30">
                        <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                            <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`} 
                            alt="Avatar" 
                            className="w-full h-full" 
                            />
                        </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                        <RefreshCw className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    
                    <span className="px-3 py-1 bg-primary-900/50 text-primary-300 border border-primary-500/30 rounded-full text-xs font-semibold mb-6 flex items-center gap-1">
                        <Award className="w-3 h-3" /> {profile.rank}
                    </span>
                </div>

                {/* Info Column */}
                <div className="flex-1 w-full">
                     <div className="space-y-4 mb-8">
                        <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        </div>
                        <button 
                        onClick={handleSave}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-900/20"
                        >
                        <Save className="w-4 h-4" /> Save Profile
                        </button>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                             <BarChart2 className="w-5 h-5 text-purple-400" /> Reading DNA
                        </h3>
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-4">
                            {!profile.soulTitle ? (
                                <button onClick={handleAnalyzeSoul} disabled={analysisLoading} className="w-full py-4 text-center border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2">
                                    {analysisLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                                    Analyze My Soul
                                </button>
                            ) : (
                                <div>
                                    <div className="text-purple-400 text-sm uppercase tracking-wider font-bold mb-1">Daoist Title</div>
                                    <div className="text-xl font-bold text-white mb-3">{profile.soulTitle}</div>
                                    <div className="text-gray-400 text-sm italic border-t border-gray-700 pt-2">"{profile.soulAnalysis}"</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          )}
          
          {activeTab === 'stats' && (
              <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-green-400"/> Cultivation Activity</h3>
                  
                  {/* Heatmap */}
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 overflow-x-auto mb-6">
                      <div className="flex gap-1 min-w-max">
                          {generateYearDays().map((day, i) => {
                              const count = profile.readingLog?.[day] || 0;
                              // Basic styling for heatmap squares
                              let bgClass = 'bg-gray-800';
                              if (count > 0) bgClass = 'bg-green-900';
                              if (count > 2) bgClass = 'bg-green-700';
                              if (count > 5) bgClass = 'bg-green-500';
                              if (count > 10) bgClass = 'bg-green-400';
                              
                              return (
                                  <div 
                                    key={day} 
                                    className={`w-3 h-3 rounded-sm ${bgClass}`} 
                                    title={`${day}: ${count} chapters read`}
                                  />
                              )
                          })}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>1 Year Ago</span>
                          <span>Today</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Books</div>
                          <div className="text-2xl font-bold text-white">{stats.totalBooksRead}</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Chapters Read</div>
                          <div className="text-2xl font-bold text-blue-400">{profile.chaptersRead}</div>
                      </div>
                  </div>
                  
                  <div className="mt-6">
                        <div className="text-gray-400 text-xs uppercase tracking-wider mb-3">Favorite Genres</div>
                        <div className="flex flex-wrap gap-2">
                            {stats.topTags.map(tag => (
                                <span key={tag.tag} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm border border-gray-700 flex items-center gap-2">
                                    {tag.tag} <span className="bg-gray-700 px-1.5 rounded-full text-xs text-white">{tag.count}</span>
                                </span>
                            ))}
                        </div>
                  </div>
              </div>
          )}
          
          {activeTab === 'soulbound' && (
              <div>
                  {profile.artifact ? (
                      <div className="flex flex-col items-center text-center">
                          <div className="w-40 h-40 rounded-full bg-gradient-to-b from-gray-800 to-gray-950 border-4 border-gray-700 flex items-center justify-center mb-6 relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                              <Hexagon className={`w-20 h-20 ${profile.artifact.visualColor} animate-pulse`} />
                              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent pointer-events-none"></div>
                          </div>
                          
                          <h2 className={`text-3xl font-bold mb-2 ${profile.artifact.visualColor}`}>{profile.artifact.name}</h2>
                          <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-1 rounded-full text-sm font-bold text-gray-300 border border-gray-700 mb-6">
                              Level {profile.artifact.level} {profile.artifact.type}
                          </div>
                          
                          <p className="text-gray-400 max-w-md italic mb-8">"{profile.artifact.description}"</p>
                          
                          <div className="w-full max-w-md bg-gray-800 rounded-full h-4 mb-2 overflow-hidden border border-gray-700">
                              <div 
                                className="bg-purple-600 h-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (profile.artifact.xp / (profile.artifact.level * 50)) * 100)}%` }}
                              ></div>
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-widest mb-8">Evolution Progress</div>
                          
                          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 w-full text-left">
                              <div className="text-gray-500 text-xs uppercase font-bold mb-2">Personality</div>
                              <div className="text-white font-medium flex items-center gap-2">
                                  {profile.artifact.personality}
                                  <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">Active in Reader</span>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                          <div className="p-6 bg-purple-900/10 border border-purple-500/30 rounded-full mb-6 animate-pulse">
                              <Sparkles className="w-16 h-16 text-purple-400" />
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-2">Summon Soulbound Artifact</h2>
                          <p className="text-gray-400 text-center max-w-md mb-8">
                              You do not yet possess a spirit companion. Forge a pact to receive a unique artifact that evolves as you read.
                          </p>
                          
                          <div className="w-full max-w-sm space-y-4 mb-8">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Artifact Name</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Shadowfang, The Oracle..." 
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                    value={artifactName}
                                    onChange={(e) => setArtifactName(e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Form</label>
                                  <div className="grid grid-cols-2 gap-2">
                                      {['Weapon', 'Tool', 'Beast', 'Spirit'].map(type => (
                                          <button 
                                            key={type}
                                            onClick={() => setArtifactType(type as any)}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-all ${artifactType === type ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                                          >
                                              {type}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          
                          <button 
                            onClick={handleSummonArtifact}
                            disabled={!artifactName}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <Hammer className="w-5 h-5" /> Forge Bond
                          </button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Your Trophies</h2>
                    <span className="text-primary-400 text-sm font-medium">
                        {achievements.filter(a => a.unlockedAt).length} / {achievements.length} Unlocked
                    </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((ach) => {
                         const Icon = IconMap[ach.iconName] || Award;
                         return (
                            <div key={ach.id} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${ach.unlockedAt ? 'bg-primary-900/10 border-primary-500/30' : 'bg-gray-800/30 border-gray-700 opacity-60 grayscale'}`}>
                                <div className={`p-3 rounded-full ${ach.unlockedAt ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-700 text-gray-500'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className={`font-bold ${ach.unlockedAt ? 'text-white' : 'text-gray-400'}`}>{ach.title}</h4>
                                    <p className="text-xs text-gray-400">{ach.description}</p>
                                    {ach.unlockedAt && (
                                        <p className="text-[10px] text-primary-400 mt-1 uppercase tracking-wide">Unlocked</p>
                                    )}
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>
          )}

          {/* Core / Key Management Tab */}
          {activeTab === 'core' && (
              <div className="space-y-6">
                  {/* --- GEMINI KEY SECTION --- */}
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              <ShieldCheck className="w-6 h-6 text-red-500" /> OmniRead Core
                          </h2>
                          <p className="text-gray-400 text-sm mt-1">Pool your API keys to extend generation limits.</p>
                      </div>
                      <div className="bg-gray-900 px-4 py-2 rounded-lg border border-gray-700 text-center">
                          <div className="text-xs text-gray-500 uppercase font-bold">Active Pool</div>
                          <div className="text-xl font-bold text-white">{keyPoolStatus.active} / {keyPoolStatus.total}</div>
                      </div>
                  </div>

                  {/* Gemini Tutorial */}
                  <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl relative overflow-hidden">
                      <div className="relative z-10">
                          <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2 text-base">
                              <Info className="w-5 h-5" /> How to get a Free Google Key
                          </h4>
                          <div className="text-sm text-blue-200/80 space-y-2 mb-5">
                              <div className="flex gap-2">
                                  <span className="bg-blue-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                  <span>Click the button below to open Google AI Studio.</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="bg-blue-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                  <span>Click <strong>"Create API Key"</strong> (It is free).</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="bg-blue-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                  <span>Copy the key string starting with <code>AIza...</code> and paste it here.</span>
                              </div>
                          </div>
                          <a 
                              href="https://aistudio.google.com/app/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20"
                          >
                              Create Free Gemini Key <ExternalLink className="w-4 h-4" />
                          </a>
                      </div>
                      {/* Decoration */}
                      <Key className="absolute -bottom-8 -right-8 w-32 h-32 text-blue-500/10 rotate-12" />
                  </div>

                  <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                       <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Google Key to Pool</h3>
                       <div className="flex flex-col gap-2">
                           <input 
                                type="text" 
                                placeholder="Label (e.g., 'My Free Key')"
                                value={newKeyLabel}
                                onChange={(e) => setNewKeyLabel(e.target.value)}
                                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                           />
                           <div className="flex gap-2">
                               <input 
                                    type="text" 
                                    placeholder="Paste Gemini API Key (AIza...)"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                               />
                               <button 
                                    onClick={handleAddKey}
                                    disabled={!newKey}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 rounded-lg font-bold disabled:opacity-50"
                               >
                                   Add
                               </button>
                           </div>
                       </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Google Key Pool</h3>
                      
                      {/* Community Key Visualization (Hidden System Keys) */}
                      <div className="flex items-center justify-between bg-blue-900/10 p-3 rounded-lg border border-blue-500/10 mb-2 opacity-70">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-900/20 rounded-full text-blue-400">
                                  <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                  <div className="font-bold text-blue-300 text-sm">Community Added Key</div>
                                  <div className="text-xs text-blue-500/50 font-mono tracking-widest">
                                      ••••••••••••••••••••••••••
                                  </div>
                              </div>
                          </div>
                          <div className="text-blue-500/50 p-2">
                              <Lock className="w-4 h-4" />
                          </div>
                      </div>

                      {apiKeys.map((k, i) => {
                          const isVisible = visibleKeys.has(k.key);
                          return (
                              <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800 animate-fade-in">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-green-900/20 rounded-full text-green-400">
                                          <CheckCircle className="w-4 h-4" />
                                      </div>
                                      <div>
                                          <div className="font-bold text-white text-sm">{k.label}</div>
                                          <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                              {isVisible 
                                                ? k.key 
                                                : `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}`}
                                              <span>• Added {k.addedAt}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex gap-1">
                                      <button 
                                        onClick={() => toggleKeyVisibility(k.key)}
                                        className="text-gray-500 hover:text-white p-2 rounded hover:bg-gray-800 transition-colors"
                                      >
                                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                      <button onClick={() => handleRemoveKey(k.key)} className="text-gray-600 hover:text-red-400 p-2 rounded hover:bg-gray-800 transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  
                  {/* --- GROQ SECTION --- */}
                  <div className="mt-8 pt-8 border-t border-gray-800">
                       <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-lg">
                           <Cpu className="w-5 h-5 text-orange-500" /> Groq Fallback Support
                       </h3>
                       <p className="text-xs text-gray-400 mb-6">
                           Enable Groq (gpt-oss-120b) as a high-speed fallback when Gemini quotas are depleted.
                       </p>

                       {/* Groq Tutorial */}
                       <div className="bg-orange-900/10 border border-orange-500/20 p-5 rounded-xl relative overflow-hidden mb-6">
                          <div className="relative z-10">
                              <h4 className="font-bold text-orange-300 mb-3 flex items-center gap-2 text-base">
                                  <Info className="w-5 h-5" /> How to get a Free Groq Key
                              </h4>
                              <div className="text-sm text-orange-200/80 space-y-2 mb-5">
                                  <div className="flex gap-2">
                                      <span className="bg-orange-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                      <span>Click button to visit Groq Console.</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <span className="bg-orange-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                      <span>Go to <strong>"API Keys"</strong> and click <strong>"Create API Key"</strong>.</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <span className="bg-orange-800/50 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                      <span>Copy the key (gsk_...) and paste it here.</span>
                                  </div>
                              </div>
                              <a 
                                  href="https://console.groq.com/keys" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-orange-900/20"
                              >
                                  Get Free Groq Key <ExternalLink className="w-4 h-4" />
                              </a>
                          </div>
                       </div>

                       <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 mb-4">
                           <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Groq Key</h3>
                           <div className="flex flex-col gap-2">
                               <input 
                                    type="text" 
                                    placeholder="Label (e.g., 'Groq Key 1')"
                                    value={newGroqKeyLabel}
                                    onChange={(e) => setNewGroqKeyLabel(e.target.value)}
                                    className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                               />
                               <div className="flex gap-2">
                                   <input 
                                        type="password" 
                                        placeholder="Paste Groq Key (gsk_...)"
                                        value={newGroqKey}
                                        onChange={(e) => setNewGroqKey(e.target.value)}
                                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                   />
                                   <button 
                                        onClick={handleAddGroqKey}
                                        disabled={!newGroqKey}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-lg font-bold disabled:opacity-50"
                                   >
                                       Add
                                   </button>
                               </div>
                           </div>
                       </div>

                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Groq Key Pool</h3>
                          
                          {/* Community Key Visualization (Groq) */}
                          <div className="flex items-center justify-between bg-orange-900/10 p-3 rounded-lg border border-orange-500/10 mb-2 opacity-70">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-900/20 rounded-full text-orange-400">
                                      <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div>
                                      <div className="font-bold text-orange-300 text-sm">Community Added Key</div>
                                      <div className="text-xs text-orange-500/50 font-mono tracking-widest">
                                          ••••••••••••••••••••••••••
                                      </div>
                                  </div>
                              </div>
                              <div className="text-orange-500/50 p-2">
                                  <Lock className="w-4 h-4" />
                              </div>
                          </div>

                          {groqApiKeys.map((k, i) => {
                              const isVisible = visibleKeys.has(k.key);
                              return (
                                  <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800 animate-fade-in">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-orange-900/20 rounded-full text-orange-400">
                                              <CheckCircle className="w-4 h-4" />
                                          </div>
                                          <div>
                                              <div className="font-bold text-white text-sm">{k.label}</div>
                                              <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                                  {isVisible 
                                                    ? k.key 
                                                    : `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}`}
                                                  <span>• Added {k.addedAt}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex gap-1">
                                          <button 
                                            onClick={() => toggleKeyVisibility(k.key)}
                                            className="text-gray-500 hover:text-white p-2 rounded hover:bg-gray-800 transition-colors"
                                          >
                                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                          </button>
                                          <button onClick={() => handleRemoveGroqKey(k.key)} className="text-gray-600 hover:text-red-400 p-2 rounded hover:bg-gray-800 transition-colors">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  
                  {/* ADMIN ASCENSION TOGGLE */}
                  <div className="mt-6 pt-6 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                          <div>
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-yellow-500" /> Ascend to Sect Elder
                              </h3>
                              <p className="text-xs text-gray-500">Enable Admin Tools to approve public novels.</p>
                          </div>
                          <button 
                            onClick={toggleAdmin}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${profile.isAdmin ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                          >
                              {profile.isAdmin ? 'Active' : 'Ascend'}
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* SYSTEM TAB (Backup/Restore) */}
          {activeTab === 'system' && (
              <div className="space-y-8 py-4">
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              <HardDrive className="w-6 h-6 text-cyan-500" /> System Backup
                          </h2>
                          <p className="text-gray-400 text-sm mt-1">Preserve your cultivation base across realms (devices).</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* EXPORT CARD */}
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
                          <div>
                              <div className="w-12 h-12 bg-cyan-900/30 text-cyan-400 rounded-lg flex items-center justify-center mb-4">
                                  <Download className="w-6 h-6" />
                              </div>
                              <h3 className="font-bold text-white text-lg mb-2">Create Soul Jade</h3>
                              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                                  Download a full backup of your progress, including:
                                  <br/>• Reading History & Library
                                  <br/>• Spirit Stones & Unlocks
                                  <br/>• Written Drafts & API Keys
                              </p>
                          </div>
                          <button 
                              onClick={handleExport}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
                          >
                              <Download className="w-4 h-4" /> Download Backup
                          </button>
                      </div>

                      {/* IMPORT CARD */}
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
                          <div>
                              <div className="w-12 h-12 bg-purple-900/30 text-purple-400 rounded-lg flex items-center justify-center mb-4">
                                  <Upload className="w-6 h-6" />
                              </div>
                              <h3 className="font-bold text-white text-lg mb-2">Absorb Soul Jade</h3>
                              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                  Restore progress from a previously saved JSON file.
                                  <br/><span className="text-red-400 font-bold">WARNING:</span> This will overwrite current data.
                              </p>
                              
                              <input 
                                  type="file" 
                                  accept=".json"
                                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700 mb-4"
                              />
                          </div>
                          <button 
                              onClick={handleImport}
                              disabled={!importFile}
                              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <RefreshCw className="w-4 h-4" /> Restore Data
                          </button>
                      </div>
                  </div>

                  <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                          <h4 className="font-bold text-yellow-200 text-sm">Cultivation Warning</h4>
                          <p className="text-xs text-yellow-200/70 mt-1">
                              OmniRead stores data in your browser's LocalStorage. If you clear your cache or use Incognito mode, your progress will be lost unless you save a backup here.
                          </p>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
