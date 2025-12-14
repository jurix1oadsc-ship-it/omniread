import React from 'react';
import { Star, Clock, User, Globe } from 'lucide-react';
import { Novel } from '../types';

interface NovelCardProps {
  novel: Novel;
  onClick: (novel: Novel) => void;
  compact?: boolean;
}

const NovelCard: React.FC<NovelCardProps> = ({ novel, onClick, compact = false }) => {
  if (compact) {
    return (
      <div 
        onClick={() => onClick(novel)}
        className="group flex gap-4 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 p-3 rounded-xl transition-all cursor-pointer"
      >
        <div className="relative w-16 h-24 flex-shrink-0 overflow-hidden rounded-md">
           <img 
            src={novel.coverUrl} 
            alt={novel.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
          <h4 className="text-sm font-semibold text-gray-100 truncate group-hover:text-primary-400 transition-colors">
            {novel.title}
          </h4>
          <div className="flex items-center text-xs text-gray-500 mt-1">
             <Clock className="w-3 h-3 mr-1" /> {novel.lastUpdated}
          </div>
           <div className="flex items-center text-xs text-gray-400 mt-1">
             <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-300 border border-gray-700">
               {novel.source}
             </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onClick(novel)}
      className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-900/10 cursor-pointer flex flex-col h-full"
    >
      {/* Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white shadow-lg ${
          novel.source === 'RoyalRoad' ? 'bg-blue-600' : 
          novel.source === 'WebNovel' ? 'bg-red-600' : 'bg-purple-600'
        }`}>
          {novel.source}
        </span>
      </div>

      <div className="relative aspect-[2/3] overflow-hidden">
        <img 
          src={novel.coverUrl} 
          alt={novel.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />
        
        {/* Rating Overlay */}
        <div className="absolute bottom-2 right-2 flex items-center bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
          <span className="text-xs font-bold text-white">{novel.rating}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-gray-100 mb-1 line-clamp-1 group-hover:text-primary-400 transition-colors">
          {novel.title}
        </h3>
        <div className="flex items-center text-xs text-gray-400 mb-3">
          <User className="w-3 h-3 mr-1" /> {novel.author}
        </div>
        
        <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">
          {novel.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-auto">
          {novel.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-1 rounded-md border border-gray-700">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NovelCard;
