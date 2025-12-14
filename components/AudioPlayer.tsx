
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Volume2, Loader2, Maximize2, Minimize2, Timer, Mic } from 'lucide-react';
import { AudioState, Novel, Chapter } from '../types';
import { generateChapterAudioAI, getChapterContentAI } from '../services/geminiService';

interface AudioPlayerProps {
  state: AudioState;
  setState: React.Dispatch<React.SetStateAction<AudioState>>;
  onClose: () => void;
  onNextChapter: () => void;
  onPrevChapter: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ state, setState, onClose, onNextChapter, onPrevChapter }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const [volume, setVolume] = useState(1);
  const [showTimer, setShowTimer] = useState(false);
  const [mode, setMode] = useState<'ai' | 'native'>('ai');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Audio
  useEffect(() => {
    if (state.currentChapter && state.currentNovel && !state.isPlaying && !state.isLoading) {
        loadAndPlay();
    }
  }, [state.currentChapter?.id]);

  useEffect(() => {
      // Handle Pause/Play toggle
      if (mode === 'ai') {
          if (state.isPlaying && audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume();
          } else if (!state.isPlaying && audioContextRef.current?.state === 'running') {
              audioContextRef.current.suspend();
          }
      } else {
          // Native Mode
          if (state.isPlaying) {
              window.speechSynthesis.resume();
          } else {
              window.speechSynthesis.pause();
          }
      }
  }, [state.isPlaying, mode]);

  useEffect(() => {
      return () => {
          stopAudio();
      };
  }, []);
  
  // Sleep Timer Logic
  useEffect(() => {
      let timerInterval: any;
      if (state.isPlaying && state.sleepTimer && state.sleepTimer > 0) {
          timerInterval = setInterval(() => {
              setState(prev => {
                  const newTime = (prev.sleepTimer || 0) - 1;
                  if (newTime <= 0) {
                      return { ...prev, isPlaying: false, sleepTimer: undefined };
                  }
                  return { ...prev, sleepTimer: newTime };
              });
          }, 60000); 
      }
      return () => clearInterval(timerInterval);
  }, [state.isPlaying, state.sleepTimer]);

  const stopAudio = () => {
      // Stop Web Audio
      if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch (e) {}
          sourceRef.current = null;
      }
      // Stop Native TTS
      window.speechSynthesis.cancel();
  };

  const playNative = (text: string) => {
      setMode('native');
      window.speechSynthesis.cancel();
      
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = volume;
      
      // Attempt to pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
      if (preferred) utter.voice = preferred;

      utter.onend = () => {
          setState(prev => ({ ...prev, isPlaying: false }));
          onNextChapter();
      };
      
      utter.onboundary = (e) => {
          // Approximate progress tracking based on character index
          if (e.name === 'word') {
             const progress = e.charIndex / text.length;
             // Fake a duration for the progress bar (e.g. 10 mins base) to show movement
             // Native API doesn't give duration beforehand.
             setState(prev => ({ ...prev, currentTime: e.charIndex, duration: text.length })); 
          }
      };

      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
      setState(prev => ({ ...prev, isLoading: false, isPlaying: true, duration: text.length, currentTime: 0 }));
  };

  const loadAndPlay = async () => {
      if (!state.currentNovel || !state.currentChapter) return;

      stopAudio();
      setState(prev => ({ ...prev, isLoading: true, isPlaying: false, currentTime: 0, duration: 0 }));

      let text = state.currentChapter.content;
      
      // Fetch content if missing
      if (!text) {
          try {
              const result = await getChapterContentAI(state.currentNovel.title, state.currentChapter.title);
              text = result.content;
          } catch (e) {
              text = "Failed to load content.";
          }
      }
      
      // Clean HTML for TTS
      const cleanText = text?.replace(/<[^>]*>/g, '') || "";

      // Try AI Audio first if mode is AI
      if (mode === 'ai') {
          try {
              const base64Audio = await generateChapterAudioAI(cleanText);
              if (!base64Audio) throw new Error("AI Audio unavailable");

              if (!audioContextRef.current) {
                  audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
              
              const buffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
              
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              
              const gainNode = audioContextRef.current.createGain();
              gainNode.gain.value = volume;
              source.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);
              
              source.onended = () => {
                  setState(prev => ({ ...prev, isPlaying: false }));
                  onNextChapter(); 
              };
              
              source.start(0);
              sourceRef.current = source;
              startTimeRef.current = audioContextRef.current.currentTime;
              
              setState(prev => ({ 
                  ...prev, 
                  isLoading: false, 
                  isPlaying: true, 
                  duration: buffer.duration 
              }));
              return;

          } catch (e) {
              console.warn("AI Audio failed, falling back to Native.", e);
              // Fallback continues below
          }
      }

      // Native Fallback
      playNative(cleanText);
  };

  useEffect(() => {
      let interval: any;
      if (state.isPlaying && mode === 'ai') {
          interval = setInterval(() => {
              if (audioContextRef.current) {
                  const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
                  setState(prev => ({ ...prev, currentTime: elapsed }));
              }
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [state.isPlaying, mode]);

  const setTimer = (mins: number) => {
      setState(p => ({ ...p, sleepTimer: mins }));
      setShowTimer(false);
  };

  const toggleMode = () => {
      stopAudio();
      const newMode = mode === 'ai' ? 'native' : 'ai';
      setMode(newMode);
      // Wait a tick for state update then reload
      setTimeout(() => loadAndPlay(), 100);
  };

  if (!state.currentNovel || !state.currentChapter) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-300 ${state.isExpanded ? 'h-full md:h-32 bg-gray-900/95' : 'h-20 bg-gray-900/90'} backdrop-blur-xl border-t border-gray-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]`}>
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 cursor-pointer group">
            <div 
                className={`h-full transition-all duration-1000 ease-linear ${mode === 'ai' ? 'bg-gradient-to-r from-primary-500 to-purple-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
                style={{ width: `${Math.min(100, (state.currentTime / (state.duration || 1)) * 100)}%` }}
            />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4 relative">
            
            {/* Background Visualizer (Ambient) */}
            {state.isPlaying && mode === 'ai' && (
                <div className="absolute inset-0 flex items-end justify-center gap-1 opacity-10 pointer-events-none overflow-hidden h-full pb-2">
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i} 
                            className="w-2 bg-primary-500 rounded-t-lg animate-pulse" 
                            style={{ 
                                height: `${Math.random() * 80 + 20}%`, 
                                animationDuration: `${Math.random() * 0.5 + 0.5}s` 
                            }} 
                        />
                    ))}
                </div>
            )}

            {/* Info Section */}
            <div className="flex items-center gap-4 flex-1 min-w-0 z-10">
                <div className={`relative overflow-hidden rounded-lg border border-gray-700 transition-all ${state.isExpanded ? 'w-20 h-28 hidden md:block' : 'w-12 h-16'} shadow-lg`}>
                    <img 
                        src={state.currentNovel.coverUrl} 
                        alt="Cover" 
                        className={`w-full h-full object-cover ${state.isPlaying ? 'scale-105' : 'scale-100'} transition-transform duration-[10s]`} 
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {state.isLoading && <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />}
                        <h4 className="text-white font-bold truncate text-sm md:text-base">
                            {state.currentChapter.title}
                        </h4>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-xs truncate">{state.currentNovel.title}</p>
                        <span 
                            onClick={toggleMode}
                            className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer border ${mode === 'ai' ? 'bg-primary-900/30 text-primary-300 border-primary-500/30' : 'bg-green-900/30 text-green-300 border-green-500/30'}`}
                        >
                            {mode === 'ai' ? 'Neural AI' : 'System TTS'}
                        </span>
                    </div>
                    {state.sleepTimer && (
                        <div className="flex items-center gap-1 text-[10px] text-primary-400 mt-1">
                            <Timer className="w-3 h-3" /> Zzz in {state.sleepTimer}m
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 md:gap-6 z-10">
                <button onClick={onPrevChapter} className="text-gray-400 hover:text-white transition-colors">
                    <SkipBack className="w-5 h-5 fill-current" />
                </button>
                
                <button 
                    onClick={() => setState(p => ({ ...p, isPlaying: !p.isPlaying }))}
                    className={`w-12 h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10 ${state.isPlaying ? 'ring-4 ring-primary-500/20' : ''}`}
                >
                    {state.isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : state.isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                    ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                    )}
                </button>

                <button onClick={onNextChapter} className="text-gray-400 hover:text-white transition-colors">
                    <SkipForward className="w-5 h-5 fill-current" />
                </button>
            </div>

            {/* Extras */}
            <div className="flex items-center gap-4 justify-end flex-1 z-10">
                {/* Sleep Timer Button */}
                <div className="relative">
                    <button 
                        onClick={() => setShowTimer(!showTimer)}
                        className={`p-2 rounded-full hover:bg-gray-800 transition-colors ${state.sleepTimer ? 'text-primary-400' : 'text-gray-400'}`}
                    >
                        <Timer className="w-4 h-4" />
                    </button>
                    {showTimer && (
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-2 flex flex-col gap-1 w-32 shadow-xl animate-fade-in">
                            <button onClick={() => setTimer(15)} className="text-left text-sm text-gray-300 hover:bg-gray-700 p-2 rounded">15 Mins</button>
                            <button onClick={() => setTimer(30)} className="text-left text-sm text-gray-300 hover:bg-gray-700 p-2 rounded">30 Mins</button>
                            <button onClick={() => setTimer(60)} className="text-left text-sm text-gray-300 hover:bg-gray-700 p-2 rounded">60 Mins</button>
                            <button onClick={() => setTimer(0)} className="text-left text-sm text-red-400 hover:bg-gray-700 p-2 rounded border-t border-gray-700">Disable</button>
                        </div>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 group">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none accent-white cursor-pointer"
                    />
                </div>
                
                <button 
                    onClick={() => setState(p => ({ ...p, isExpanded: !p.isExpanded }))}
                    className="hidden md:block text-gray-500 hover:text-white"
                >
                    {state.isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default AudioPlayer;
