
import React, { useEffect, useState } from 'react';
import { Novel, Chapter, Review, LibraryStatus } from '../types';
import { BookOpen, Share2, Bookmark, Eye, List, Star, Check, Download, MessageCircle, Send, User, Film, PlayCircle, Loader2, GitGraph, ChevronDown, Gem, Zap } from 'lucide-react';
import { toggleLibrary, isInLibrary, getLocalReviews, addLocalReview, getUserProfile, getChapterProgress, getHistory, updateLibraryStatus, getLibrary, voteForNovel, giftNovel } from '../services/storageService';
import { generateReviewsAI, generateNovelTrailerAI, generateFateMapAI } from '../services/geminiService';
import JSZip from 'jszip';

interface NovelDetailsProps {
  novel: Novel;
  onChapterClick: (novel: Novel, chapter: Chapter) => void;
  onBack: () => void;
}

const NovelDetails: React.FC<NovelDetailsProps> = ({ novel, onChapterClick, onBack }) => {
  const [inLibrary, setInLibrary] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [continueChapter, setContinueChapter] = useState<Chapter | null>(null);
  
  // Library Status
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('Reading');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Veo State
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isGeneratingTrailer, setIsGeneratingTrailer] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Fate Map State
  const [fateMapSvg, setFateMapSvg] = useState<string | null>(null);
  const [fateMapLoading, setFateMapLoading] = useState(false);

  // EPUB State
  const [epubLoading, setEpubLoading] = useState(false);

  // Economy Interactions
  const [voteCount, setVoteCount] = useState(novel.votes || 0);
  const [giftCount, setGiftCount] = useState(novel.totalGifts || 0);
  const [showGiftMenu, setShowGiftMenu] = useState(false);

  useEffect(() => {
    const inLib = isInLibrary(novel.id);
    setInLibrary(inLib);
    if (inLib) {
        const lib = getLibrary();
        const n = lib.find(item => item.id === novel.id);
        if (n && n.libraryStatus) setLibraryStatus(n.libraryStatus);
    }

    loadReviews();
    setTrailerUrl(null);
    setVideoError(null);
    setFateMapSvg(null);
    setVoteCount(novel.votes || 0);
    setGiftCount(novel.totalGifts || 0);
    
    const history = getHistory();
    const historyItem = history.find(n => n.id === novel.id);
    if (historyItem?.lastReadChapterId) {
        const ch = novel.chapters.find(c => c.id === historyItem.lastReadChapterId);
        if (ch) setContinueChapter(ch);
    } else {
        setContinueChapter(null);
    }
  }, [novel.id]);

  const loadReviews = async () => {
      const local = getLocalReviews(novel.id);
      if (local.length === 0 && !sessionStorage.getItem(`has_gen_reviews_${novel.id}`)) {
          setReviewsLoading(true);
          const aiReviews = await generateReviewsAI(novel.title, novel.description);
          setReviews([...local, ...aiReviews]);
          sessionStorage.setItem(`has_gen_reviews_${novel.id}`, JSON.stringify(aiReviews));
          setReviewsLoading(false);
      } else if (sessionStorage.getItem(`has_gen_reviews_${novel.id}`)) {
          const aiReviews = JSON.parse(sessionStorage.getItem(`has_gen_reviews_${novel.id}`)!);
          setReviews([...local, ...aiReviews]);
      } else {
          setReviews(local);
      }
  };

  const handleToggleLibrary = () => {
    const newState = toggleLibrary(novel);
    setInLibrary(newState);
    if (newState) {
        // Default
        setLibraryStatus('Reading');
    }
  };

  const handleChangeStatus = (status: LibraryStatus) => {
      setLibraryStatus(status);
      updateLibraryStatus(novel.id, status);
      setShowStatusMenu(false);
      if (!inLibrary) setInLibrary(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newReviewText.trim()) return;

      const profile = getUserProfile();
      const review: Review = {
          id: Date.now().toString(),
          author: profile.username,
          avatarSeed: profile.avatarSeed,
          rating: newReviewRating,
          content: newReviewText,
          date: 'Just now',
          isUser: true
      };

      addLocalReview(novel.id, review);
      setReviews(prev => [review, ...prev]);
      setNewReviewText('');
  };

  const handleDownloadEpub = async () => {
      setEpubLoading(true);
      try {
          const zip = new JSZip();
          const safeTitle = novel.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

          // 1. Mimetype
          zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

          // 2. Container
          zip.folder("META-INF")?.file("container.xml", 
            `<?xml version="1.0"?>
            <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                <rootfiles>
                    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                </rootfiles>
            </container>`
          );

          // 3. Content.opf (Metadata)
          const oebps = zip.folder("OEBPS");
          if (!oebps) throw new Error("Failed to create folder");

          const manifestItems = novel.chapters.map((c, i) => `<item id="ch${i}" href="chapter${i}.html" media-type="application/xhtml+xml"/>`).join('\n');
          const spineItems = novel.chapters.map((c, i) => `<itemref idref="ch${i}"/>`).join('\n');

          const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
                <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
                    <dc:title>${novel.title}</dc:title>
                    <dc:creator opf:role="aut">${novel.author}</dc:creator>
                    <dc:language>en</dc:language>
                    <dc:identifier id="BookID" opf:scheme="UUID">${novel.id}</dc:identifier>
                </metadata>
                <manifest>
                    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                    ${manifestItems}
                </manifest>
                <spine toc="ncx">
                    ${spineItems}
                </spine>
            </package>`;
          
          oebps.file("content.opf", contentOpf);

          // 4. NCX (TOC)
          const navPoints = novel.chapters.map((c, i) => 
            `<navPoint id="navPoint-${i+1}" playOrder="${i+1}">
                <navLabel><text>${c.title}</text></navLabel>
                <content src="chapter${i}.html"/>
            </navPoint>`
          ).join('\n');

          const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
            <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                <head><meta name="dtb:uid" content="${novel.id}"/></head>
                <docTitle><text>${novel.title}</text></docTitle>
                <navMap>
                    ${navPoints}
                </navMap>
            </ncx>`;
          
          oebps.file("toc.ncx", tocNcx);

          // 5. Chapters (Empty placeholders for now as we don't have full text locally usually, but we will put title)
          // In a real app, we would fetch content. Here we put a placeholder.
          novel.chapters.forEach((c, i) => {
              oebps.file(`chapter${i}.html`, `
                <?xml version="1.0" encoding="utf-8"?>
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head><title>${c.title}</title></head>
                <body>
                    <h1>${c.title}</h1>
                    <p><i>(Content dynamically generated in app. This is an export placeholder.)</i></p>
                </body>
                </html>
              `);
          });

          // Generate
          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${safeTitle}.epub`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

      } catch (e) {
          console.error(e);
          alert("Failed to generate EPUB.");
      }
      setEpubLoading(false);
  };

  const handleGenerateTrailer = async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if (typeof window.aistudio.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
        } else {
          setVideoError("API Key selection not supported in this environment.");
          return;
        }
      }
    }

    setIsGeneratingTrailer(true);
    setVideoError(null);
    try {
      const url = await generateNovelTrailerAI(novel.title, novel.description);
      if (url) {
        setTrailerUrl(url);
      } else {
        setVideoError("Failed to generate trailer. Please try again.");
      }
    } catch (e) {
      setVideoError("An error occurred during generation.");
    } finally {
      setIsGeneratingTrailer(false);
    }
  };
  
  const handleGenerateFateMap = async () => {
      setFateMapLoading(true);
      const svg = await generateFateMapAI(novel.title, novel.description);
      setFateMapSvg(svg);
      setFateMapLoading(false);
  };
  
  const handleReadClick = () => {
      if (continueChapter) {
          onChapterClick(novel, continueChapter);
      } else if (novel.chapters.length > 0) {
          onChapterClick(novel, novel.chapters[0]);
      }
  };

  const handleVote = () => {
      const success = voteForNovel(novel.id);
      if (success) {
          setVoteCount(prev => prev + 1);
          alert("Voted! (-10 Stones)");
      } else {
          alert("Not enough Spirit Stones (Need 10).");
      }
  };

  const handleGift = (amount: number) => {
      const success = giftNovel(novel.id, amount);
      if (success) {
          setGiftCount(prev => prev + amount);
          setShowGiftMenu(false);
          alert(`Sent ${amount} Stones to Author!`);
      } else {
          alert("Not enough Spirit Stones.");
      }
  };

  return (
    <div className="animate-fade-in pb-20">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
        ← Back to Browse
      </button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-gray-800 relative group">
            <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
            
            {!trailerUrl && !isGeneratingTrailer && (
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer" onClick={handleGenerateTrailer}>
                     <div className="bg-red-600/90 text-white rounded-full p-4 transform group-hover:scale-110 transition-transform">
                         <PlayCircle className="w-8 h-8" />
                     </div>
                     <span className="absolute bottom-4 font-bold text-white text-sm">Generate Trailer</span>
                 </div>
            )}
            
            {isGeneratingTrailer && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                    <span className="text-white text-xs font-bold">Directing Scene...</span>
                </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3 mt-4 relative">
            <button 
                onClick={handleReadClick}
                disabled={novel.chapters.length === 0}
                className="w-full font-bold py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
            >
                <BookOpen className="w-5 h-5" /> 
                {continueChapter ? `Continue Ch. ${continueChapter.number}` : 'Read Now'}
            </button>

            {/* Library Button with Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => {
                        if (!inLibrary) handleToggleLibrary();
                        else setShowStatusMenu(!showStatusMenu);
                    }}
                    className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                        inLibrary 
                        ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700' 
                        : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/20'
                    }`}
                >
                    {inLibrary ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />} 
                    {inLibrary ? libraryStatus : 'Add to Library'}
                    {inLibrary && <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
                
                {showStatusMenu && inLibrary && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                        {['Reading', 'Plan to Read', 'On Hold', 'Completed', 'Dropped'].map((s) => (
                            <button 
                                key={s}
                                onClick={() => handleChangeStatus(s as LibraryStatus)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-800 flex items-center justify-between ${libraryStatus === s ? 'text-primary-400 font-bold' : 'text-gray-400'}`}
                            >
                                {s}
                                {libraryStatus === s && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                        <div className="border-t border-gray-700"></div>
                        <button 
                            onClick={handleToggleLibrary}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 font-medium"
                        >
                            Remove from Library
                        </button>
                    </div>
                )}
            </div>
            
             <button 
                onClick={handleDownloadEpub}
                disabled={epubLoading}
                className="w-full font-bold py-3 rounded-xl bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
            >
                {epubLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} 
                Export .EPUB
            </button>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap gap-2 mb-4">
             {novel.tags.map(tag => (
               <span key={tag} className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300">
                 {tag}
               </span>
             ))}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{novel.title}</h1>
          <p className="text-xl text-gray-400 mb-6 font-medium">by {novel.author}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl">
               <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rating</div>
               <div className="flex items-center text-lg font-bold text-white">
                 <Star className="w-4 h-4 text-yellow-500 mr-2" /> {novel.rating}/5.0
               </div>
             </div>
             <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl">
               <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Views</div>
               <div className="flex items-center text-lg font-bold text-white">
                 <Eye className="w-4 h-4 text-blue-500 mr-2" /> {novel.views}
               </div>
             </div>
             <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl">
               <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Source</div>
               <div className="flex items-center text-lg font-bold text-white">
                 <GitGraph className="w-4 h-4 text-purple-500 mr-2" /> {novel.source}
               </div>
             </div>
             <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl">
               <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
               <div className="flex items-center text-lg font-bold text-white">
                 <div className={`w-2 h-2 rounded-full mr-2 ${novel.status === 'Ongoing' ? 'bg-green-500' : 'bg-red-500'}`} /> 
                 {novel.status}
               </div>
             </div>
          </div>

          {/* POWER STONE & GIFTING AREA */}
          <div className="flex gap-4 mb-8">
              <button 
                onClick={handleVote}
                className="flex-1 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between hover:border-cyan-400 transition-all group"
              >
                  <div className="flex items-center gap-3">
                      <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                          <Zap className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                          <div className="text-xs text-cyan-400 font-bold uppercase tracking-wide">Power Vote</div>
                          <div className="text-white font-bold">{voteCount}</div>
                      </div>
                  </div>
                  <div className="text-xs text-gray-500 font-medium group-hover:text-white">-10 Stones</div>
              </button>

              <div className="relative flex-1">
                  <button 
                    onClick={() => setShowGiftMenu(!showGiftMenu)}
                    className="w-full bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-pink-500/30 rounded-xl p-4 flex items-center justify-between hover:border-pink-400 transition-all group"
                  >
                      <div className="flex items-center gap-3">
                          <div className="bg-pink-500/20 p-2 rounded-lg text-pink-400 group-hover:scale-110 transition-transform">
                              <Gem className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                              <div className="text-xs text-pink-400 font-bold uppercase tracking-wide">Gift Author</div>
                              <div className="text-white font-bold">{giftCount}</div>
                          </div>
                      </div>
                      <div className="text-xs text-gray-500 font-medium group-hover:text-white">Support</div>
                  </button>
                  
                  {showGiftMenu && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-pink-500/30 rounded-xl shadow-xl p-2 z-20 flex gap-2 animate-slide-up">
                          {[10, 50, 100, 500].map(amt => (
                              <button 
                                key={amt}
                                onClick={() => handleGift(amt)}
                                className="flex-1 bg-gray-800 hover:bg-pink-600/20 hover:text-pink-300 hover:border-pink-500/50 border border-gray-700 rounded-lg py-2 text-sm font-bold text-gray-300 transition-colors"
                              >
                                  {amt}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
          
          {/* Veo Player */}
          {trailerUrl && (
              <div className="mb-8 animate-fade-in">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <Film className="w-5 h-5 text-red-500" /> Cinematic Trailer
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-gray-700 bg-black aspect-video relative group">
                      <video 
                        src={trailerUrl} 
                        controls 
                        autoPlay 
                        className="w-full h-full"
                      />
                  </div>
              </div>
          )}
          {videoError && (
              <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {videoError}
              </div>
          )}

          <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl mb-8">
            <h3 className="text-lg font-bold text-white mb-2">Synopsis</h3>
            <p className="text-gray-400 leading-relaxed">
              {novel.description}
            </p>
          </div>
          
          {/* FATE MAP (Relationship Graph) */}
          <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl mb-8">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><GitGraph className="w-5 h-5 text-purple-400" /> The Fate Web</h3>
                  {!fateMapSvg && (
                      <button 
                        onClick={handleGenerateFateMap} 
                        disabled={fateMapLoading}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                          {fateMapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitGraph className="w-4 h-4" />}
                          Reveal Relationships
                      </button>
                  )}
              </div>
              
              {fateMapSvg && (
                  <div className="w-full overflow-hidden bg-gray-950 rounded-xl p-4 flex items-center justify-center border border-gray-800 animate-fade-in">
                      <div dangerouslySetInnerHTML={{ __html: fateMapSvg }} className="w-full h-auto max-w-2xl" />
                  </div>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
        {/* Chapters List */}
        <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <List className="w-6 h-6" /> Chapters ({novel.chapters.length})
            </h3>
            <button className="text-xs text-gray-500 hover:text-white">Reverse Order</button>
            </div>

            <div className="grid gap-2">
            {novel.chapters.map((chapter) => {
                const progress = getChapterProgress(novel.id, chapter.id);
                return (
                    <div 
                    key={chapter.id}
                    onClick={() => onChapterClick(novel, chapter)}
                    className="group flex flex-col bg-gray-900 border border-gray-800 rounded-lg hover:border-primary-500/50 cursor-pointer transition-all overflow-hidden relative"
                    >
                    <div className="flex items-center justify-between p-4 z-10">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-600 font-mono w-8">#{chapter.number}</span>
                            <span className="text-gray-200 font-medium group-hover:text-primary-400 transition-colors">
                            {chapter.title}
                            </span>
                        </div>
                        <span className="text-xs text-gray-600">{chapter.releaseDate}</span>
                    </div>
                    {progress > 0 && (
                        <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
                    )}
                    </div>
                );
            })}
            </div>
        </div>

        {/* Reviews Section */}
        <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6" /> Community Reviews
                </h3>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-bold text-gray-300 mb-2">Write a Review</h4>
                <form onSubmit={handleSubmitReview}>
                    <div className="flex gap-1 mb-2">
                        {[1,2,3,4,5].map(star => (
                            <button type="button" key={star} onClick={() => setNewReviewRating(star)}>
                                <Star className={`w-4 h-4 ${star <= newReviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />
                            </button>
                        ))}
                    </div>
                    <textarea 
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        placeholder="What did you think?"
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[80px] mb-2"
                    />
                    <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Post Review
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {reviewsLoading && (
                    <div className="text-center py-4 text-gray-500 italic">Summoning community opinions...</div>
                )}
                
                {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden">
                                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.avatarSeed}`} alt="avatar" />
                                </div>
                                <span className={`text-sm font-bold ${review.isUser ? 'text-primary-400' : 'text-gray-300'}`}>
                                    {review.author}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500">{review.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                             {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={`w-3 h-3 ${i < Math.floor(review.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'}`} />
                             ))}
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">"{review.content}"</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default NovelDetails;
