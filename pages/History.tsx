import React, { useEffect, useState } from 'react';
import { Clock, BookOpen } from 'lucide-react';
import { Novel } from '../types';
import NovelCard from '../components/NovelCard';
import { getHistory } from '../services/storageService';

interface HistoryProps {
  onNovelClick: (novel: Novel) => void;
}

const History: React.FC<HistoryProps> = ({ onNovelClick }) => {
  const [historyNovels, setHistoryNovels] = useState<Novel[]>([]);

  useEffect(() => {
    setHistoryNovels(getHistory());
  }, []);

  return (
    <div className="max-w-7xl mx-auto min-h-[80vh] animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
           <Clock className="w-8 h-8 text-primary-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Recently Read</h1>
          <p className="text-gray-400">Continue where you left off</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {historyNovels.map(novel => (
          <NovelCard key={novel.id} novel={novel} onClick={onNovelClick} />
        ))}
      </div>
      
      {historyNovels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
           <BookOpen className="w-16 h-16 mb-4 opacity-20" />
           <p>No reading history yet.</p>
        </div>
      )}
    </div>
  );
};

export default History;