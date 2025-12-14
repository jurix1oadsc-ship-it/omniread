
import React, { useState, useEffect } from 'react';
import { X, FileText, Info, Mail, Activity, Shield, BarChart2, BookOpen, Crown, Compass, Circle, Send } from 'lucide-react';
import { getUserProfile, getSiteConfig, submitReport } from '../services/storageService';
import { getSystemHealth, getPoolStatus } from '../services/keyManager';
import { FooterContent } from '../types';

interface FooterProps {
    onOpenAdmin?: () => void;
    profileKey?: number; // Add profileKey prop for reactivity
}

const Footer: React.FC<FooterProps> = ({ onOpenAdmin, profileKey }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemHealth, setSystemHealth] = useState(100);
  const [poolStatus, setPoolStatus] = useState({ total: 0, active: 0, exhausted: 0 });
  const [footerConfig, setFooterConfig] = useState<FooterContent | null>(null);
  
  // Form States
  const [formInput, setFormInput] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');

  useEffect(() => {
      const profile = getUserProfile();
      setIsAdmin(!!profile.isAdmin);
      
      const config = getSiteConfig();
      setFooterConfig(config.footerContent);
      
      const updateStats = () => {
          setSystemHealth(getSystemHealth());
          setPoolStatus(getPoolStatus());
      };

      // Initial Call
      updateStats();
      
      // Listen for Key Updates (Instant Reactivity)
      window.addEventListener('omniread-keys-update', updateStats);

      // Fallback Polling (e.g. for cooldown expiry if event missed)
      const interval = setInterval(updateStats, 5000); 
      
      return () => {
          clearInterval(interval);
          window.removeEventListener('omniread-keys-update', updateStats);
      };
  }, [profileKey, activeModal]); 

  const handleReportSubmit = (type: 'Contact' | 'DMCA') => {
      if (!formInput.trim()) return;
      
      submitReport({
          type,
          targetName: formSubject || 'General Inquiry',
          description: formInput,
          submittedBy: formEmail || 'Guest'
      });
      
      setActiveModal(null);
      setFormInput('');
      setFormEmail('');
      setFormSubject('');
      
      window.dispatchEvent(new CustomEvent('omniread-error', { detail: { message: 'Message sent to Sect Pavilion.', type: 'success' } }));
  };

  const links = [
    { label: 'Intro', id: 'intro' },
    { label: 'About Us', id: 'about' },
    { label: 'Contact Us', id: 'contact' },
    { label: 'Changelog', id: 'changelog' },
    { label: 'DMCA', id: 'dmca' },
    { label: 'Privacy', id: 'privacy' },
    { label: 'Terms', id: 'terms' },
    { label: 'Stats', id: 'stats' },
  ];

  const getHealthColor = () => {
      if (systemHealth > 70) return 'text-green-400 bg-green-500';
      if (systemHealth > 30) return 'text-yellow-400 bg-yellow-500';
      return 'text-red-400 bg-red-500';
  };

  const getContent = (id: string) => {
      const text = (footerConfig as any)?.[id] || "Loading...";

      switch(id) {
          case 'intro': return { 
              title: 'Welcome to OmniRead', 
              icon: BookOpen,
              content: <p className="whitespace-pre-wrap">{text}</p>
          };
          case 'about': return { 
              title: 'About Us', 
              icon: Info,
              content: <p className="whitespace-pre-wrap">{text}</p>
          };
          case 'contact': return { 
              title: 'Contact Us', 
              icon: Mail,
              content: (
                  <div className="space-y-4">
                      <p className="text-sm text-gray-400 mb-4">{text}</p>
                      <input 
                        type="text" 
                        placeholder="Subject / Topic"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                      />
                      <input 
                        type="email" 
                        placeholder="Your Email (Optional)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                      <textarea 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 h-32 resize-none"
                        placeholder="Your message to the Elders..."
                        value={formInput}
                        onChange={(e) => setFormInput(e.target.value)}
                      />
                      <button 
                        onClick={() => handleReportSubmit('Contact')}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                          <Send className="w-4 h-4" /> Send Message
                      </button>
                  </div>
              )
          };
          case 'changelog': return { 
              title: 'Changelog v22.0', 
              icon: Activity,
              content: (
                  <div className="space-y-4">
                      <div className="flex items-start gap-3">
                          <div className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-1">NEW</div>
                          <div>
                              <p className="font-bold text-white">Soulbound Evolution</p>
                              <p className="text-sm text-gray-400">Artifacts now gain experience faster and have unique reactions to Horror and Romance genres.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <div className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold mt-1">UPDATE</div>
                          <div>
                              <p className="font-bold text-white">Nexus Stability</p>
                              <p className="text-sm text-gray-400">Fixed dimensional rifts causing text artifacts during crossover events.</p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold mt-1">SYSTEM</div>
                          <div>
                              <p className="font-bold text-white">Quantum Caching</p>
                              <p className="text-sm text-gray-400">Aggregator scan times reduced by 40% using speculative pre-fetching.</p>
                          </div>
                      </div>
                  </div>
              )
          };
          case 'dmca': return { 
              title: 'DMCA & Copyright', 
              icon: Shield,
              content: (
                  <div className="space-y-4">
                      <p className="text-sm text-gray-400 mb-4 whitespace-pre-wrap">{text}</p>
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                          <h4 className="font-bold text-white text-sm mb-3">Submit Takedown Notice</h4>
                          <input 
                            type="text" 
                            placeholder="Link to Infringing Content (OmniRead URL)"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm mb-3 focus:outline-none focus:border-red-500"
                            value={formSubject}
                            onChange={(e) => setFormSubject(e.target.value)}
                          />
                          <textarea 
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-red-500 h-24 resize-none mb-3"
                            placeholder="Proof of ownership and description..."
                            value={formInput}
                            onChange={(e) => setFormInput(e.target.value)}
                          />
                          <button 
                            onClick={() => handleReportSubmit('DMCA')}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                              <Shield className="w-4 h-4" /> Submit Report
                          </button>
                      </div>
                  </div>
              )
          };
          case 'privacy': return {
              title: 'Privacy Policy',
              icon: FileText,
              content: <p className="whitespace-pre-wrap">{text}</p>
          };
          case 'terms': return {
              title: 'Terms of Use',
              icon: FileText,
              content: <p className="whitespace-pre-wrap">{text}</p>
          };
          case 'stats': return { 
              title: 'System Statistics', 
              icon: BarChart2,
              content: (
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                          <div className="text-2xl font-bold text-white mb-1">14,501</div>
                          <div className="text-xs text-gray-500 uppercase font-bold">Novels Indexed</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                          <div className="text-2xl font-bold text-blue-400 mb-1">1.4M+</div>
                          <div className="text-xs text-gray-500 uppercase font-bold">Chapters Analyzed</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                          <div className="text-2xl font-bold text-green-400 mb-1">{poolStatus.active}</div>
                          <div className="text-xs text-gray-500 uppercase font-bold">Active Keys</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
                          <div className="text-2xl font-bold text-purple-400 mb-1">99.99%</div>
                          <div className="text-xs text-gray-500 uppercase font-bold">Uptime</div>
                      </div>
                  </div>
              )
          };
          default: return { 
              title: 'Legal Information', 
              icon: FileText,
              content: (
                  <div className="space-y-4 text-sm text-gray-400">
                      <p>Content not found.</p>
                  </div>
              )
          };
      }
  };

  const modalData = activeModal ? getContent(activeModal) : null;

  return (
    <>
        <footer className="bg-[#0b1221] border-t border-gray-800 py-10 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-6">
            
            {/* --- SYSTEM HEALTH MONITOR --- */}
            <div className="w-full max-w-2xl bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs uppercase font-bold tracking-widest text-gray-500">
                    <span>Neural Network Capacity</span>
                    <span className={getHealthColor().split(' ')[0]}>{systemHealth}% Available</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative">
                    <div 
                        className={`h-full transition-all duration-1000 ${getHealthColor().split(' ')[1]}`} 
                        style={{ width: `${systemHealth}%` }}
                    />
                </div>

                {/* Module Status Indicators */}
                <div className="flex justify-between items-center text-[10px] mt-1">
                    <div className="flex gap-4">
                        <span className={`flex items-center gap-1 ${systemHealth > 0 ? 'text-green-400' : 'text-red-500'}`}>
                            <Circle className={`w-2 h-2 ${systemHealth > 0 ? 'fill-green-400' : 'fill-red-500'}`} /> Reading
                        </span>
                        <span className={`flex items-center gap-1 ${systemHealth > 30 ? 'text-green-400' : 'text-gray-600'}`}>
                            <Circle className={`w-2 h-2 ${systemHealth > 30 ? 'fill-green-400' : 'fill-gray-600'}`} /> Aggregator
                        </span>
                        <span className={`flex items-center gap-1 ${systemHealth > 50 ? 'text-green-400' : 'text-gray-600'}`}>
                            <Circle className={`w-2 h-2 ${systemHealth > 50 ? 'fill-green-400' : 'fill-gray-600'}`} /> Imaging
                        </span>
                        <span className={`flex items-center gap-1 ${systemHealth > 70 ? 'text-green-400' : 'text-gray-600'}`}>
                            <Circle className={`w-2 h-2 ${systemHealth > 70 ? 'fill-green-400' : 'fill-gray-600'}`} /> Video
                        </span>
                    </div>
                    <span className="text-gray-600">
                        Keys: {poolStatus.active}/{poolStatus.total} ({poolStatus.exhausted} Limited)
                    </span>
                </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-gray-400">
              {links.map((link) => (
                <button 
                  key={link.id} 
                  onClick={() => setActiveModal(link.id)}
                  className="hover:text-primary-400 transition-colors hover:underline decoration-primary-500/30 underline-offset-4 bg-transparent border-none cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              
              {/* Admin Link */}
              {isAdmin && (
                  <button 
                    onClick={onOpenAdmin}
                    className="text-red-400 hover:text-red-300 font-bold transition-colors flex items-center gap-1"
                  >
                      <Crown className="w-3 h-3" /> Sect Pavilion
                  </button>
              )}
            </div>

            {/* Separator */}
            <div className="w-24 h-0.5 bg-gray-800 rounded-full"></div>

            {/* Copyright */}
            <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">
                Copyright © 2025 - <span className="text-gray-500">OmniRead v22.0</span>
                </p>
                <p className="text-[10px] text-gray-700 mt-2">
                    All novels are fiction. Any resemblance to real cultivation sects is purely coincidental.
                </p>
            </div>
          </div>
        </footer>

        {/* Modal Overlay */}
        {activeModal && modalData && (
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" 
                onClick={() => setActiveModal(null)}
            >
                <div 
                    className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden animate-slide-up flex flex-col max-h-[80vh]" 
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-950/50 flex-shrink-0">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-gray-800 rounded-lg">
                                <modalData.icon className="w-5 h-5 text-primary-400" />
                            </div>
                            {modalData.title}
                        </h3>
                        <button 
                            onClick={() => setActiveModal(null)} 
                            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 text-gray-300 leading-relaxed overflow-y-auto">
                        {modalData.content}
                    </div>

                    {/* Footer Action (Optional) */}
                    <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-end flex-shrink-0">
                        <button 
                            onClick={() => setActiveModal(null)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default Footer;
