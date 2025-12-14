
import React, { useState, useEffect, useRef } from 'react';
import { Novel, Chapter, ReadingSettings, UserProfile, Comment, LoreEntry, ParagraphComment } from '../types';
import { getChapterContentAI, generateSceneImageAI, askChapterContextAI, generatePodcastAudioAI, fractureChapterAI, getArtifactCommentaryAI, generateCommentsAI, generateLoreWikiAI, generateParagraphReactionAI } from '../services/geminiService';
import { getSettings, saveSettings, addToHistory, incrementChaptersRead, getUserProfile, saveChapterProgress, saveNote, getNote, getParagraphComments, saveParagraphComment, subscribeToProfileUpdates } from '../services/storageService';
import { createBlob, decodeAudioData } from '../services/audioUtils';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { ArrowLeft, Type, Loader2, ChevronLeft, ChevronRight, List, X, Play, Pause, Headphones, Image as ImageIcon, MessageSquare, Send, Phone, Eye, Split, Sparkles, Hexagon, Zap, ThumbsUp, Hash, Book, PenTool, Check, Palette, Save, Brain, MessageCircle } from 'lucide-react';

interface ReaderProps {
  novel: Novel;
  chapter: Chapter;
  onBack: () => void;
  onChapterChange: (chapter: Chapter) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPlayAudio: () => void; 
}

const Reader: React.FC<ReaderProps> = ({ novel, chapter, onBack, onChapterChange, addToast, onPlayAudio }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReadingSettings>(getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  
  // Immersion Features State
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Visual Mode
  const [visualMode, setVisualMode] = useState(false);
  const [visualBg, setVisualBg] = useState<string | null>(null);
  
  // Notebook & Lore Keeper
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [loreOpen, setLoreOpen] = useState(false);
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [loreLoading, setLoreLoading] = useState(false);
  
  // Fracture
  const [fractureOpen, setFractureOpen] = useState(false);
  const [fracturePrompt, setFracturePrompt] = useState('');
  const [fractureLoading, setFractureLoading] = useState(false);

  // Artifact Widget
  const [artifactComment, setArtifactComment] = useState('');
  const [artifactVisible, setArtifactVisible] = useState(false);

  // LIVE API
  const [liveCallOpen, setLiveCallOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Connecting...');
  
  // Zen Mode
  const [zenModeOpen, setZenModeOpen] = useState(false);
  const [zenWords, setZenWords] = useState<string[]>([]);
  const [zenIndex, setZenIndex] = useState(0);
  const [zenPlaying, setZenPlaying] = useState(false);
  const [zenSpeed, setZenSpeed] = useState(300);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Paragraph System
  const [parsedParagraphs, setParsedParagraphs] = useState<string[]>([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [paraComments, setParaComments] = useState<Record<number, ParagraphComment[]>>({});
  const [generatingReaction, setGeneratingReaction] = useState(false);

  // Swipe State
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const scrollInterval = useRef<any>(null);
  const zenInterval = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveNextStartTimeRef = useRef<number>(0);
  const liveSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Init
  useEffect(() => {
    addToHistory(novel, chapter.id);
    incrementChaptersRead();
    // Use fresh profile logic via subscription below, but set initial state here
    setProfile(getUserProfile());
    
    // Load Note
    const savedNote = getNote(novel.id);
    if (savedNote) setNoteContent(savedNote.content);
    
    // Reset state
    setParsedParagraphs([]);
    setParaComments({});
    setLoreEntries([]);
  }, [novel, chapter]);

  // Subscribe to Profile Updates (Fixes State Synchronization)
  useEffect(() => {
      const unsubscribe = subscribeToProfileUpdates((updatedProfile) => {
          setProfile(updatedProfile);
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (autoScroll) {
      scrollInterval.current = setInterval(() => {
        window.scrollBy(0, 1);
      }, 30);
    } else {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    }
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    };
  }, [autoScroll]);

  // Load Content
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      
      let text = "";
      if (chapter.isFractured && chapter.content) {
          text = chapter.content;
      } else {
          const result = await getChapterContentAI(novel.title, chapter.title);
          text = result.content;
      }
      
      setContent(text);
      
      // Parse paragraphs for interaction
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const pNodes = Array.from(doc.body.querySelectorAll('p'));
      const pTexts = pNodes.map(p => p.innerHTML).filter(t => t.trim().length > 0);
      setParsedParagraphs(pTexts);
      
      // Load saved paragraph comments
      const savedParaComments = getParagraphComments(novel.id, chapter.id);
      const commentsMap: Record<number, ParagraphComment[]> = {};
      savedParaComments.forEach(c => {
          if (!commentsMap[c.paragraphIndex]) commentsMap[c.paragraphIndex] = [];
          commentsMap[c.paragraphIndex].push(c);
      });
      setParaComments(commentsMap);

      setLoading(false);
      
      // Background tasks
      setLoadingComments(true);
      const generatedComments = await generateCommentsAI(text);
      setComments(generatedComments);
      setLoadingComments(false);

      const cleanText = text.replace(/<[^>]*>/g, ' ');
      setZenWords(cleanText.split(/\s+/).filter(w => w.length > 0));
      
      setGeneratedImage(null);
      setVisualBg(null);
      setArtifactVisible(true);
      if (isLiveConnected) disconnectLive();

      if (profile.artifact) {
          const comment = await getArtifactCommentaryAI(profile.artifact, text);
          setArtifactComment(comment);
      }

      if (visualMode) {
          generateVisualBackground(text);
      }
    };
    fetchContent();
  }, [novel.title, chapter]);

  useEffect(() => {
      if (visualMode && content && !visualBg) {
          generateVisualBackground(content);
      }
  }, [visualMode]);

  // Zen Mode Logic
  useEffect(() => {
      if (zenPlaying && zenModeOpen) {
          const msPerWord = 60000 / zenSpeed;
          zenInterval.current = setInterval(() => {
              setZenIndex(prev => {
                  if (prev >= zenWords.length - 1) {
                      setZenPlaying(false);
                      return prev;
                  }
                  return prev + 1;
              });
          }, msPerWord);
      } else {
          clearInterval(zenInterval.current);
      }
      return () => clearInterval(zenInterval.current);
  }, [zenPlaying, zenModeOpen, zenSpeed, zenWords]);

  const generateVisualBackground = async (text: string) => {
      const bg = await generateSceneImageAI(text.substring(0, 300));
      if (bg) setVisualBg(`data:image/png;base64,${bg}`);
  };

  const handleVisualize = async () => {
      setVisualizerOpen(true);
      if (generatedImage) return;

      setImageLoading(true);
      const base64Image = await generateSceneImageAI(content);
      if (base64Image) {
          setGeneratedImage(`data:image/png;base64,${base64Image}`);
      } else {
          addToast("Could not generate image.", 'error');
          setVisualizerOpen(false);
      }
      setImageLoading(false);
  };

  const handleChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatQuery.trim()) return;
      
      setChatLoading(true);
      const answer = await askChapterContextAI(content, chatQuery);
      setChatResponse(answer);
      setChatLoading(false);
      setChatQuery('');
  };
  
  const handleFracture = async () => {
      if (!fracturePrompt.trim()) return;
      setFractureLoading(true);
      const newContent = await fractureChapterAI(novel.title, content, fracturePrompt);
      
      const fracturedChapter: Chapter = {
          ...chapter,
          id: `${chapter.id}-fractured-${Date.now()}`,
          title: `${chapter.title} (Fractured)`,
          content: newContent,
          isFractured: true
      };
      
      onChapterChange(fracturedChapter);
      setFractureLoading(false);
      setFractureOpen(false);
      addToast("Reality Fractured successfully!", 'success');
  };
  
  const handleSaveNote = () => {
      saveNote(novel.id, noteContent);
      addToast("Notes saved to scroll.", "success");
  };

  const handleLoadLore = async () => {
      setLoreOpen(true);
      if (loreEntries.length === 0) {
          setLoreLoading(true);
          // Combine current content with novel description for context
          const ctx = `${novel.description}\n\n${content.substring(0, 2000)}`;
          const entries = await generateLoreWikiAI(novel.title, ctx);
          setLoreEntries(entries);
          setLoreLoading(false);
      }
  };

  const handleGenerateParaReaction = async (index: number, text: string) => {
      setGeneratingReaction(true);
      const reaction = await generateParagraphReactionAI(text, content);
      
      const newComment: ParagraphComment = {
          id: Date.now().toString(),
          paragraphIndex: index,
          content: reaction,
          user: 'OmniAI',
          avatarSeed: 'AI',
          timestamp: 'Just now'
      };
      
      saveParagraphComment(novel.id, chapter.id, newComment);
      setParaComments(prev => ({
          ...prev,
          [index]: [...(prev[index] || []), newComment]
      }));
      setGeneratingReaction(false);
  };

  // --- LIVE API LOGIC ---
  const startLiveCall = async () => {
    setLiveCallOpen(true);
    setLiveStatus('Initializing Holo-Call...');
    try {
        const apiKey = process.env.API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputAudioCtxRef.current = inputCtx;
        outputAudioCtxRef.current = outputCtx;

        setLiveStatus('Accessing Microphone...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        setLiveStatus('Connecting to Neural Network...');
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setLiveStatus('Connected. Speak now.');
                    setIsLiveConnected(true);
                    const source = inputCtx.createMediaStreamSource(stream);
                    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData); 
                        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(processor);
                    processor.connect(inputCtx.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioCtxRef.current) {
                        const ctx = outputAudioCtxRef.current;
                        liveNextStartTimeRef.current = Math.max(liveNextStartTimeRef.current, ctx.currentTime);
                        const audioBuffer = await decodeAudioData(
                            new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0))),
                            ctx,
                            24000
                        );
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        source.onended = () => liveSourcesRef.current.delete(source);
                        source.start(liveNextStartTimeRef.current);
                        liveNextStartTimeRef.current += audioBuffer.duration;
                        liveSourcesRef.current.add(source);
                    }
                    if (msg.serverContent?.interrupted) {
                        liveSourcesRef.current.forEach(s => s.stop());
                        liveSourcesRef.current.clear();
                        liveNextStartTimeRef.current = 0;
                    }
                },
                onclose: () => {
                    setLiveStatus("Call Ended.");
                    setIsLiveConnected(false);
                },
                onerror: (e) => {
                    setLiveStatus("Connection Error.");
                }
            },
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                },
                systemInstruction: `You are a character from the novel "${novel.title}". Context of current chapter: ${content.substring(0, 500)}. Roleplay as if you are talking to the reader on a magical phone call. Be immersive.`
            }
        });
        liveSessionRef.current = sessionPromise;
    } catch (e) {
        setLiveStatus("Failed to connect.");
        setIsLiveConnected(false);
    }
  };

  const disconnectLive = () => {
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
      liveSourcesRef.current.forEach(s => s.stop());
      liveSourcesRef.current.clear();
      if (liveSessionRef.current) {
          liveSessionRef.current.then((s: any) => s.close());
      }
      setIsLiveConnected(false);
      setLiveCallOpen(false);
  };

  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'light': return 'bg-white text-gray-900';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      case 'matrix': return 'bg-black text-[#00ff00] font-mono';
      case 'royal': return 'bg-[#2a1b3d] text-[#e3d7ff]';
      case 'rose': return 'bg-[#1a0505] text-[#ffcccc]';
      case 'ocean': return 'bg-[#001a2c] text-[#d6eaf8]';
      case 'void': return 'bg-black text-[#555]';
      case 'custom': return 'transition-colors'; 
      default: return 'bg-[#0f172a] text-gray-300';
    }
  };
  
  const getCustomStyle = () => {
      if (settings.theme === 'custom' && settings.customThemeColors) {
          return { backgroundColor: settings.customThemeColors.bg, color: settings.customThemeColors.text };
      }
      return {};
  };

  const handleNext = () => {
    if (chapter.isFractured) {
        const originalIndex = novel.chapters.findIndex(c => c.number === chapter.number); 
        if (originalIndex !== -1 && originalIndex + 1 < novel.chapters.length) {
             onChapterChange(novel.chapters[originalIndex + 1]);
             return;
        }
    }
    const nextIdx = novel.chapters.findIndex(c => c.id === chapter.id) + 1;
    if (nextIdx < novel.chapters.length) {
      onChapterChange(novel.chapters[nextIdx]);
      addToast("Next chapter loaded", 'success');
    }
  };

  const handlePrev = () => {
    const prevIdx = novel.chapters.findIndex(c => c.id === chapter.id) - 1;
    if (prevIdx >= 0) {
      onChapterChange(novel.chapters[prevIdx]);
    }
  };

  // --- SWIPE GESTURES ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchEndRef.current = null; 
      touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (!touchStartRef.current || !touchEndRef.current) return;
      
      const distance = touchStartRef.current - touchEndRef.current;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
          handleNext();
      }
      if (isRightSwipe) {
          handlePrev();
      }
  };

  return (
    <div 
        className={`min-h-screen flex flex-col ${getThemeClasses()} transition-colors duration-500 relative overflow-hidden`}
        style={getCustomStyle()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      
      {/* Visual Mode Background */}
      {visualMode && visualBg && (
          <div className="absolute inset-0 z-0 transition-opacity duration-1000 opacity-30 pointer-events-none">
              <div 
                  className="absolute inset-0 bg-cover bg-center filter blur-sm scale-105"
                  style={{ backgroundImage: `url(${visualBg})` }}
              />
              <div className={`absolute inset-0 ${settings.theme === 'light' ? 'bg-white/80' : 'bg-black/80'}`} />
          </div>
      )}

      {/* Artifact Widget */}
      {artifactVisible && profile.artifact && artifactComment && (
          <div className="fixed bottom-24 right-4 z-40 max-w-xs animate-slide-up pointer-events-none">
              <div className="bg-gray-900/90 border border-purple-500/50 p-4 rounded-2xl shadow-2xl backdrop-blur-md relative pointer-events-auto">
                  <button onClick={() => setArtifactVisible(false)} className="absolute -top-2 -right-2 bg-gray-800 text-gray-400 rounded-full p-1 hover:text-white"><X className="w-3 h-3"/></button>
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-900/50 rounded-full border border-purple-500/30">
                          <Hexagon className={`w-6 h-6 ${profile.artifact.visualColor}`} />
                      </div>
                      <div>
                          <div className={`text-xs font-bold uppercase mb-1 ${profile.artifact.visualColor}`}>{profile.artifact.name}</div>
                          <p className="text-sm text-gray-200 italic">"{artifactComment}"</p>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* Sidebar: Notebook & Lore Keeper */}
      <div className={`fixed top-14 bottom-0 right-0 w-80 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700 z-40 transform transition-transform duration-300 shadow-2xl flex flex-col ${notebookOpen || loreOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-black/20">
              <h3 className="text-white font-bold flex items-center gap-2">
                  {loreOpen ? <Brain className="w-4 h-4 text-cyan-400" /> : <Book className="w-4 h-4 text-amber-400" />}
                  {loreOpen ? 'Lore Keeper' : "Scribe's Notebook"}
              </h3>
              <button onClick={() => { setNotebookOpen(false); setLoreOpen(false); }}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notebookOpen && (
                  <div className="h-full flex flex-col">
                      <textarea 
                        className="flex-1 w-full bg-transparent text-gray-300 resize-none focus:outline-none font-serif leading-relaxed p-4"
                        placeholder="Record your insights here, cultivator..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                      />
                      <div className="p-4 border-t border-gray-700">
                        <button onClick={handleSaveNote} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> Save Notes
                        </button>
                      </div>
                  </div>
              )}

              {loreOpen && (
                  <div className="p-4 space-y-4">
                      {loreLoading ? (
                          <div className="text-center py-10 opacity-50">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                              <p className="text-sm">Analyzing ancient texts...</p>
                          </div>
                      ) : loreEntries.length === 0 ? (
                          <div className="text-center py-10 text-gray-500">
                              <p>No lore entries found.</p>
                          </div>
                      ) : (
                          loreEntries.map((entry, idx) => (
                              <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-white text-sm">{entry.name}</span>
                                      <span className={`text-[10px] px-1.5 rounded uppercase ${
                                          entry.category === 'Character' ? 'bg-blue-900/50 text-blue-400' :
                                          entry.category === 'Location' ? 'bg-green-900/50 text-green-400' :
                                          entry.category === 'System' ? 'bg-purple-900/50 text-purple-400' :
                                          'bg-yellow-900/50 text-yellow-400'
                                      }`}>{entry.category}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 leading-relaxed">{entry.description}</p>
                              </div>
                          ))
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* --- Zen Mode Modal --- */}
      {zenModeOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setZenPlaying(!zenPlaying)}>
              <div className="absolute top-4 right-4 z-10" onClick={(e) => { e.stopPropagation(); setZenModeOpen(false); setZenPlaying(false); }}>
                  <X className="w-8 h-8 text-gray-500 hover:text-white" />
              </div>
              <div className="text-6xl md:text-8xl font-bold text-white text-center select-none font-serif">
                  {zenWords[zenIndex]}
              </div>
              {!zenPlaying && (
                  <div className="absolute bottom-40 text-gray-500 animate-pulse">
                      Tap to Resume
                  </div>
              )}
          </div>
      )}

      {/* Reader Header */}
      <header className={`sticky top-0 z-30 border-b px-4 h-14 flex items-center justify-between transition-colors ${
        settings.theme.includes('dark') || settings.theme === 'matrix' || settings.theme === 'royal' || settings.theme === 'void' || settings.theme === 'custom' ? 'bg-[#0f172a]/95 border-gray-800' : 
        settings.theme === 'light' ? 'bg-white/95 border-gray-200' : 'bg-[#f4ecd8]/95 border-[#e3dcc8]'
      } backdrop-blur`} style={settings.theme === 'custom' && settings.customThemeColors ? {backgroundColor: settings.customThemeColors.bg, borderColor: settings.customThemeColors.text + '20'} : {}}>
        <div className="flex items-center gap-4">
             <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium hover:opacity-70">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
            </button>
            <button onClick={() => setShowTOC(true)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
                <List className="w-5 h-5" />
            </button>
        </div>
        
        <div className="flex items-center gap-1 md:gap-4">
             {/* Notebook Toggle */}
             <button onClick={() => { setNotebookOpen(!notebookOpen); setLoreOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${notebookOpen ? 'bg-amber-600 text-white' : 'bg-gray-500/10 text-gray-400'}`}>
                 <Book className="w-4 h-4" />
             </button>

             {/* Lore Toggle */}
             <button onClick={handleLoadLore} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${loreOpen ? 'bg-cyan-600 text-white' : 'bg-gray-500/10 text-gray-400'}`}>
                 <Brain className="w-4 h-4" /> <span className="hidden md:inline">Wiki</span>
             </button>

             <button onClick={() => setVisualMode(!visualMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${visualMode ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-500/10 text-gray-400'}`}>
                 <Eye className="w-4 h-4" />
             </button>

             {/* TRIGGER GLOBAL AUDIO PLAYER */}
             <button onClick={onPlayAudio} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-500/10 hover:bg-gray-500/20 text-gray-400`}>
                 <Headphones className="w-4 h-4" />
             </button>
             
             <button onClick={() => setZenModeOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all border border-cyan-500/20">
                 <Zap className="w-4 h-4" />
             </button>
             
             <button onClick={() => setFractureOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-all border border-pink-500/20">
                 <Split className="w-4 h-4" />
             </button>

             <button onClick={handleVisualize} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all">
                 <ImageIcon className="w-4 h-4" />
             </button>
             
             <button onClick={startLiveCall} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition-all shadow-lg shadow-primary-900/30">
                 <Phone className="w-4 h-4" />
             </button>

             <button onClick={() => setChatOpen(!chatOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all">
                 <MessageSquare className="w-4 h-4" />
             </button>
        </div>

        <div className="relative flex items-center gap-2">
           <button onClick={() => setAutoScroll(!autoScroll)} className={`p-2 rounded-full transition-colors ${autoScroll ? 'bg-primary-500 text-white animate-pulse' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
            {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <Type className="w-5 h-5" />
          </button>
          
          {/* Settings Modal */}
          {showSettings && (
            <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 text-gray-200 z-50 animate-slide-up">
              {/* Settings content same as before... */}
              <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Appearance</h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span>Font Size</span>
                    <span>{settings.fontSize}px</span>
                </div>
                <input 
                    type="range" min="12" max="32" 
                    value={settings.fontSize} 
                    onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                    className="w-full accent-primary-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span>Line Height</span>
                    <span>{settings.lineHeight || 1.8}</span>
                </div>
                <input 
                    type="range" min="1.0" max="2.5" step="0.1"
                    value={settings.lineHeight || 1.8} 
                    onChange={(e) => setSettings({...settings, lineHeight: parseFloat(e.target.value)})}
                    className="w-full accent-primary-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span>Paragraph Spacing</span>
                    <span>{settings.paragraphSpacing || 1.5}rem</span>
                </div>
                <input 
                    type="range" min="0.5" max="3.0" step="0.25"
                    value={settings.paragraphSpacing || 1.5} 
                    onChange={(e) => setSettings({...settings, paragraphSpacing: parseFloat(e.target.value)})}
                    className="w-full accent-primary-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setSettings({...settings, fontWeight: settings.fontWeight === 'bold' ? 'normal' : 'bold'})}
                    className={`flex-1 py-1.5 rounded border text-xs font-bold ${settings.fontWeight === 'bold' ? 'bg-primary-600 border-primary-500 text-white' : 'border-gray-600 text-gray-400'}`}
                  >
                      Bold Text
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, fontFamily: settings.fontFamily === 'serif' ? 'sans' : 'serif'})}
                    className="flex-1 py-1.5 rounded border border-gray-600 text-xs font-medium hover:bg-gray-800"
                  >
                      {settings.fontFamily === 'serif' ? 'Sans-Serif' : 'Serif'}
                  </button>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Theme</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {profile.unlockedThemes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettings(s => ({ ...s, theme: t }))}
                      className={`h-8 rounded-md border text-[10px] capitalize font-bold ${
                        settings.theme === t ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-600 bg-gray-800'
                      }`}
                    >
                        {t}
                    </button>
                  ))}
                </div>
                
                {/* Custom Theme Builder */}
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                            <Palette className="w-3 h-3" /> Custom Theme
                        </span>
                        <button 
                            onClick={() => setSettings(s => ({...s, theme: 'custom'}))}
                            className={`w-4 h-4 rounded-full border ${settings.theme === 'custom' ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}
                        />
                    </div>
                    <div className={`grid grid-cols-3 gap-2 ${settings.theme !== 'custom' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1">BG</label>
                            <input 
                                type="color" 
                                value={settings.customThemeColors?.bg || '#000000'}
                                onChange={(e) => setSettings(s => ({...s, customThemeColors: {...s.customThemeColors!, bg: e.target.value}}))}
                                className="w-full h-6 rounded cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1">Text</label>
                            <input 
                                type="color" 
                                value={settings.customThemeColors?.text || '#ffffff'}
                                onChange={(e) => setSettings(s => ({...s, customThemeColors: {...s.customThemeColors!, text: e.target.value}}))}
                                className="w-full h-6 rounded cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1">Accent</label>
                            <input 
                                type="color" 
                                value={settings.customThemeColors?.accent || '#ff0000'}
                                onChange={(e) => setSettings(s => ({...s, customThemeColors: {...s.customThemeColors!, accent: e.target.value}}))}
                                className="w-full h-6 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:py-10 md:px-8 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
             <p className="text-sm opacity-60">Generating chapter content with AI...</p>
          </div>
        ) : (
          <div 
            className={`prose max-w-none ${settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} ${settings.fontWeight === 'bold' ? 'font-bold' : 'font-normal'}`}
            style={{ 
                fontSize: `${settings.fontSize}px`, 
                lineHeight: settings.lineHeight || 1.8,
                '--tw-prose-p-margin': `${settings.paragraphSpacing || 1.5}rem`,
                ...(settings.theme === 'custom' && settings.customThemeColors ? {color: settings.customThemeColors.text} : {})
            } as React.CSSProperties}
          >
             <style>{`
                .prose p { margin-bottom: ${settings.paragraphSpacing || 1.5}rem; }
                ::selection { background-color: ${settings.theme === 'custom' ? settings.customThemeColors?.accent + '40' : ''}; }
             `}</style>
             
             {chapter.isFractured && (
                 <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg mb-6 flex items-center gap-3">
                     <Split className="w-5 h-5 text-purple-400" />
                     <p className="text-sm text-purple-200 m-0">This is a fractured timeline. The events here diverge from the original story.</p>
                 </div>
             )}
             
             {/* Interactive Paragraph Rendering */}
             {parsedParagraphs.length > 0 ? (
                 parsedParagraphs.map((paraText, idx) => (
                     <div key={idx} className="relative group paragraph-container">
                         <p dangerouslySetInnerHTML={{ __html: paraText }} />
                         
                         {/* Comment Bubble Trigger */}
                         <button 
                            onClick={() => setActiveParagraphIndex(activeParagraphIndex === idx ? null : idx)}
                            className={`absolute right-[-30px] top-0 p-1.5 rounded-full transition-opacity opacity-0 group-hover:opacity-100 ${
                                (paraComments[idx]?.length || 0) > 0 ? 'text-primary-400 opacity-100' : 'text-gray-500 hover:text-primary-400'
                            }`}
                         >
                             <MessageCircle className="w-4 h-4" />
                             {(paraComments[idx]?.length || 0) > 0 && (
                                 <span className="absolute -top-1 -right-1 text-[8px] bg-primary-600 text-white px-1 rounded-full">
                                     {paraComments[idx].length}
                                 </span>
                             )}
                         </button>

                         {/* Inline Comments Section */}
                         {activeParagraphIndex === idx && (
                             <div className="bg-gray-800/90 border-l-2 border-primary-500 p-4 mb-4 rounded-r-lg backdrop-blur-sm animate-fade-in text-sm">
                                 <div className="flex justify-between items-center mb-3">
                                     <span className="font-bold text-gray-300">Thoughts on this line</span>
                                     <button 
                                        onClick={() => handleGenerateParaReaction(idx, paraText)}
                                        disabled={generatingReaction}
                                        className="text-xs bg-primary-600/20 text-primary-400 px-2 py-1 rounded hover:bg-primary-600/30 transition-colors flex items-center gap-1"
                                     >
                                         {generatingReaction ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                         AI React
                                     </button>
                                 </div>
                                 
                                 <div className="space-y-3 max-h-48 overflow-y-auto mb-3 custom-scrollbar">
                                     {paraComments[idx]?.length > 0 ? (
                                         paraComments[idx].map((c) => (
                                             <div key={c.id} className="bg-black/20 p-2 rounded">
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="font-bold text-primary-300 text-xs">{c.user}</span>
                                                     <span className="text-[10px] text-gray-500">{c.timestamp}</span>
                                                 </div>
                                                 <p className="text-gray-300">{c.content}</p>
                                             </div>
                                         ))
                                     ) : (
                                         <p className="text-gray-500 italic text-xs">No comments yet. Be the first!</p>
                                     )}
                                 </div>
                             </div>
                         )}
                     </div>
                 ))
             ) : (
                 <div dangerouslySetInnerHTML={{ __html: content }} />
             )}
          </div>
        )}
      </main>

      {/* Spirit Net Comments (Bottom) */}
      <div className="max-w-3xl mx-auto px-4 pb-12 pt-8 relative z-10">
          <div className={`border-t pt-8 ${settings.theme === 'custom' ? 'border-current opacity-20' : 'border-gray-800'}`}>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 opacity-80">
                  <Hash className="w-5 h-5" /> The Spirit Net
              </h3>
              
              {loadingComments ? (
                  <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                  </div>
              ) : (
                  <div className="space-y-6">
                      {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4 group">
                              <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.avatarSeed}`} alt={comment.user} />
                                  </div>
                              </div>
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold opacity-90 text-sm">{comment.user}</span>
                                      {comment.role && (
                                          <span className={`text-[10px] px-1.5 rounded font-bold uppercase ${
                                              comment.role === 'Author' ? 'bg-red-500/20 text-red-400' :
                                              comment.role === 'Sect Elder' ? 'bg-purple-500/20 text-purple-400' :
                                              'bg-blue-500/20 text-blue-400'
                                          }`}>
                                              {comment.role}
                                          </span>
                                      )}
                                      <span className="text-xs opacity-50">{comment.timeAgo}</span>
                                  </div>
                                  <p className="opacity-80 text-sm leading-relaxed">{comment.content}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      <footer className={`border-t py-6 mt-10 relative z-10 ${settings.theme === 'custom' ? 'border-current opacity-20' : settings.theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-3xl mx-auto px-4 flex justify-between gap-4">
          <button onClick={handlePrev} disabled={novel.chapters.findIndex(c => c.id === chapter.id) === 0} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-500/10 hover:bg-gray-500/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button onClick={handleNext} disabled={novel.chapters.findIndex(c => c.id === chapter.id) === novel.chapters.length - 1} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-lg transition-all" style={settings.theme === 'custom' && settings.customThemeColors ? { backgroundColor: settings.customThemeColors.accent } : {}}>
            Next Chapter <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Reader;
