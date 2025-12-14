
import React from 'react';
import { AlertCircle, Zap, Gift, Link, Heart, Cpu, Compass } from 'lucide-react';

const NewsTicker: React.FC = () => {
  return (
    <div className="bg-[#0b1221] border-b border-blue-500/20 h-8 overflow-hidden flex items-center relative z-40">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 120s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* Gradient Fades for smoothness */}
      <div className="absolute left-0 top-0 bottom-0 z-10 bg-gradient-to-r from-[#0f172a] to-transparent w-16 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 z-10 bg-gradient-to-l from-[#0f172a] to-transparent w-16 pointer-events-none"></div>
      
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-xs font-medium text-blue-200 px-4">
        <span className="flex items-center gap-2 text-emerald-400">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span className="font-bold">v22.0 RELEASE:</span> 
            Soulbound Artifacts have evolved! Check your profile for new evolution paths and faster leveling.
        </span>

        <span className="flex items-center gap-2 text-orange-400">
            <Cpu className="w-3 h-3 text-orange-400" />
            <span className="font-bold">GROQ ENABLED:</span> 
            Smart Routing active! Short chapters now prioritized on Groq LPU™. Fallback to openai/gpt-oss-120b when Gemini quota depletes.
        </span>

        <span className="flex items-center gap-2 text-yellow-300">
            <Heart className="w-3 h-3 fill-yellow-300" />
            <span className="font-bold">WE NEED YOUR HELP:</span> 
            OmniRead is community powered! Please add your FREE Gemini API Key in your Profile to keep our generators running fast.
        </span>

        <span className="flex items-center gap-2">
            <Link className="w-3 h-3 text-green-400" /> 
            <span className="text-green-100 font-bold">NEW CRAWLER:</span> 
            The auto-aggregator is live! We are now scanning RoyalRoad and WebNovel for updates in real-time.
        </span>
        
        <span className="flex items-center gap-2 text-purple-300">
            <Zap className="w-3 h-3" />
            <span className="font-bold">TIP:</span> 
            Pooling keys automatically switches to fresh ones when limits are reached, ensuring uninterrupted reading.
        </span>
      </div>
    </div>
  );
};

export default NewsTicker;
