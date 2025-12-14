import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { Novel } from '../types';
import NovelCard from '../components/NovelCard';
import { getRankedNovelsAI } from '../services/geminiService';

interface RankingsProps {
  category: string;
  onNovelClick: (novel: Novel) => void;
}

const Rankings: React.FC<RankingsProps> = ({ category, onNovelClick }) => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      const data = await getRankedNovelsAI(category);
      setNovels(data);
      setLoading(false);
    };
    fetchRankings();
  }, [category]);

  const getIcon = () => {
      switch(category) {
          case 'Top Rated': return <Trophy className="w-8 h-8 text-yellow-500" />;
          case 'Trending': return <Flame className="w-8 h-8 text-orange-500" />;
          case 'New Arrivals': return <Calendar className="w-8 h-8 text-blue-500" />;
          case 'Completed': return <CheckCircle className="w-8 h-8 text-green-500" />;
          default: return <Trophy className="w-8 h-8 text-primary-500" />;
      }
  };

  return (
    <div className="max-w-7xl mx-auto min-h-[80vh] animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
           {getIcon()}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{category}</h1>
          <p className="text-gray-400">Discover the best novels in this category</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
             <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
             <p className="text-gray-500">Analyzing global rankings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((novel, index) => (
            <div key={novel.id} className="relative">
                <div className="absolute -left-2 -top-2 w-8 h-8 flex items-center justify-center bg-gray-800 text-white font-bold rounded-full border border-gray-600 z-10 shadow-lg">
                    {index + 1}
                </div>
                <NovelCard novel={novel} onClick={onNovelClick} />
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Rankings;