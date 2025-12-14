import React, { useState, useEffect } from 'react';
import { PenTool, Plus, Book, Trash2, Edit3, UserPlus, Sparkles, Save, User, ChevronRight, Wand2, Loader2, Microscope } from 'lucide-react';
import { Draft, Character } from '../types';
import { getDrafts, saveDraft, deleteDraft } from '../services/storageService';
import { generateStoryConceptAI, generateCharacterAI, autoContinueStoryAI, generateCritiqueAI } from '../services/geminiService';

interface StudioProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Studio: React.FC<StudioProps> = ({ addToast }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  
  // Editor State
  const [activeTab, setActiveTab] = useState<'concept' | 'characters' | 'write' | 'critique'>('concept');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Concept Gen
  const [conceptPrompt, setConceptPrompt] = useState('');
  
  // Critique
  const [critique, setCritique] = useState<{pacing: string, dialogue: string, suggestions: string} | null>(null);

  useEffect(() => {
    setDrafts(getDrafts());
  }, []);

  const handleCreateDraft = () => {
    const newDraft: Draft = {
      id: Date.now().toString(),
      title: 'Untitled Story',
      description: 'A new adventure begins...',
      tags: [],
      characters: [],
      content: '',
      lastEdited: new Date().toLocaleDateString()
    };
    saveDraft(newDraft);
    setDrafts(prev => [newDraft, ...prev]);
    setCurrentDraft(newDraft);
    setActiveTab('concept');
  };

  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this draft permanently?')) {
        deleteDraft(id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (currentDraft?.id === id) setCurrentDraft(null);
    }
  };

  const handleSaveCurrent = () => {
    if (currentDraft) {
      const updated = { ...currentDraft, lastEdited: new Date().toLocaleDateString() };
      saveDraft(updated);
      setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
      addToast('Draft saved successfully', 'success');
    }
  };

  // --- AI Functions ---

  const handleGenerateConcept = async () => {
    if (!conceptPrompt) return;
    setAiLoading(true);
    const result = await generateStoryConceptAI(conceptPrompt);
    if (result && currentDraft) {
      const updated = { 
        ...currentDraft, 
        title: result.title, 
        description: result.description, 
        tags: result.tags 
      };
      setCurrentDraft(updated);
      addToast('Story concept generated!', 'success');
    } else {
      addToast('Failed to generate concept', 'error');
    }
    setAiLoading(false);
  };

  const handleGenerateCharacter = async () => {
    if (!currentDraft) return;
    setAiLoading(true);
    const char = await generateCharacterAI(currentDraft.description);
    if (char) {
      const updated = { ...currentDraft, characters: [...currentDraft.characters, char] };
      setCurrentDraft(updated);
      addToast(`Character ${char.name} created!`, 'success');
    } else {
      addToast('Failed to create character', 'error');
    }
    setAiLoading(false);
  };

  const handleAutoWrite = async () => {
    if (!currentDraft) return;
    setAiLoading(true);
    const addedText = await autoContinueStoryAI(currentDraft.description, currentDraft.content);
    if (addedText) {
        const updated = { ...currentDraft, content: currentDraft.content + (currentDraft.content ? "\n\n" : "") + addedText };
        setCurrentDraft(updated);
        addToast('AI added new content', 'success');
    }
    setAiLoading(false);
  };
  
  const handleCritique = async () => {
      if (!currentDraft || !currentDraft.content) {
          addToast("Write something first!", "info");
          return;
      }
      setAiLoading(true);
      const res = await generateCritiqueAI(currentDraft.content);
      setCritique(res);
      setAiLoading(false);
  };

  // --- Renders ---

  if (!currentDraft) {
    return (
      <div className="max-w-5xl mx-auto min-h-[80vh] animate-fade-in">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
                    <PenTool className="w-8 h-8 text-primary-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Creator Studio</h1>
                    <p className="text-gray-400">Manage your stories and unleash your creativity</p>
                </div>
            </div>
            <button 
                onClick={handleCreateDraft}
                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
            >
                <Plus className="w-5 h-5" /> New Story
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map(draft => (
                <div 
                    key={draft.id}
                    onClick={() => setCurrentDraft(draft)}
                    className="group bg-gray-900 border border-gray-800 hover:border-primary-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-primary-900/10 relative"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-primary-500/10 transition-colors">
                            <Book className="w-6 h-6 text-gray-400 group-hover:text-primary-400" />
                        </div>
                        <button 
                            onClick={(e) => handleDeleteDraft(e, draft.id)}
                            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <h3 className="text-xl font-bold text-gray-200 mb-2 group-hover:text-white truncate">{draft.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-3 mb-4 h-14">{draft.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600 mt-auto">
                        <span>Last edited: {draft.lastEdited}</span>
                        <div className="flex items-center gap-1 text-primary-500/0 group-hover:text-primary-400 transition-colors">
                            Open Studio <ChevronRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            ))}
            {drafts.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No stories yet. Start your journey!</p>
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- EDITOR UI ---
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fade-in">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
             <button onClick={() => handleSaveCurrent()} className="bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-500/30 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                 <Save className="w-4 h-4" /> Save Changes
             </button>
             <button onClick={() => setCurrentDraft(null)} className="bg-gray-800 hover:bg-gray-700 text-gray-400 p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all mb-4">
                 <ChevronRight className="w-4 h-4 rotate-180" /> Back to List
             </button>

             <nav className="flex flex-col gap-1">
                 {[
                     { id: 'concept', label: 'Story Concept', icon: Sparkles },
                     { id: 'characters', label: 'Characters', icon: User },
                     { id: 'write', label: 'Write Chapter', icon: Edit3 },
                     { id: 'critique', label: 'AI Critique', icon: Microscope },
                 ].map(item => (
                     <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`p-3 rounded-lg text-left font-medium flex items-center gap-3 transition-colors ${
                            activeTab === item.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                     >
                         <item.icon className="w-4 h-4" /> {item.label}
                     </button>
                 ))}
             </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-y-auto">
            
            {/* TAB: CONCEPT */}
            {activeTab === 'concept' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Story Concept</h2>
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                placeholder="e.g. Cyberpunk wizard detective" 
                                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white w-64"
                                value={conceptPrompt}
                                onChange={(e) => setConceptPrompt(e.target.value)}
                             />
                             <button 
                                onClick={handleGenerateConcept}
                                disabled={aiLoading || !conceptPrompt}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-50"
                             >
                                 {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Auto
                             </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Title</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            value={currentDraft.title}
                            onChange={(e) => setCurrentDraft({ ...currentDraft, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Synopsis</label>
                        <textarea 
                            className="w-full h-40 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                            value={currentDraft.description}
                            onChange={(e) => setCurrentDraft({ ...currentDraft, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {currentDraft.tags.map(tag => (
                                <span key={tag} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    {tag}
                                    <button onClick={() => setCurrentDraft({...currentDraft, tags: currentDraft.tags.filter(t => t !== tag)})}>&times;</button>
                                </span>
                            ))}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Add tag and press Enter"
                            className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                        setCurrentDraft({ ...currentDraft, tags: [...currentDraft.tags, val] });
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* TAB: CHARACTERS */}
            {activeTab === 'characters' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                         <h2 className="text-2xl font-bold text-white">Cast of Characters</h2>
                         <button 
                            onClick={handleGenerateCharacter}
                            disabled={aiLoading}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                         >
                            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} 
                            Generate Agent
                         </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentDraft.characters.map((char) => (
                            <div key={char.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="h-48 w-full bg-gray-900 relative">
                                    {char.avatarUrl ? (
                                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-bold text-white">
                                        {char.role}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-white text-lg">{char.name}</h3>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-3">{char.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {currentDraft.characters.length === 0 && (
                        <div className="text-center py-20 text-gray-600">No characters yet. Summon one!</div>
                    )}
                </div>
            )}

            {/* TAB: WRITE */}
            {activeTab === 'write' && (
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Drafting</h2>
                        <button 
                             onClick={handleAutoWrite}
                             disabled={aiLoading}
                             className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/20"
                        >
                             {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                             Continue Story
                        </button>
                    </div>
                    <textarea 
                        className="flex-1 w-full bg-gray-950 border border-gray-800 rounded-xl p-6 text-gray-300 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none font-serif"
                        placeholder="Once upon a time..."
                        value={currentDraft.content}
                        onChange={(e) => setCurrentDraft({ ...currentDraft, content: e.target.value })}
                    />
                    <div className="text-right text-xs text-gray-600 mt-2">
                        {currentDraft.content.length} characters
                    </div>
                </div>
            )}
            
            {/* TAB: CRITIQUE */}
            {activeTab === 'critique' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                         <h2 className="text-2xl font-bold text-white">AI Editor Feedback</h2>
                         <button 
                            onClick={handleCritique}
                            disabled={aiLoading}
                            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                         >
                            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />} 
                            Analyze Draft
                         </button>
                    </div>
                    
                    {!critique ? (
                         <div className="text-center py-20 opacity-30">
                            <Microscope className="w-16 h-16 mx-auto mb-4" />
                            <p>Request an analysis to see feedback on your pacing and dialogue.</p>
                         </div>
                    ) : (
                         <div className="grid gap-6">
                             <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl">
                                 <h3 className="text-blue-400 font-bold mb-2 uppercase tracking-wider text-xs">Pacing Analysis</h3>
                                 <p className="text-gray-300 leading-relaxed">{critique.pacing}</p>
                             </div>
                             <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl">
                                 <h3 className="text-green-400 font-bold mb-2 uppercase tracking-wider text-xs">Dialogue Check</h3>
                                 <p className="text-gray-300 leading-relaxed">{critique.dialogue}</p>
                             </div>
                             <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl">
                                 <h3 className="text-yellow-400 font-bold mb-2 uppercase tracking-wider text-xs">Improvement Suggestions</h3>
                                 <p className="text-gray-300 leading-relaxed">{critique.suggestions}</p>
                             </div>
                         </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Studio;
