
export interface Chapter {
  id: string;
  title: string;
  content?: string;
  releaseDate: string;
  number: number;
  isFractured?: boolean; 
}

export type LibraryStatus = 'Reading' | 'On Hold' | 'Plan to Read' | 'Dropped' | 'Completed';

export interface Novel {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  tags: string[];
  source: 'RoyalRoad' | 'WebNovel' | 'WTR-LAB' | 'ScribbleHub' | 'Qidian' | 'Faloo' | 'Munpia' | 'Syosetu' | 'OmniRead Original' | 'Web Search';
  rating: number;
  status: 'Ongoing' | 'Completed' | 'Hiatus';
  views: string;
  votes?: number; // New: Power Stone Votes
  totalGifts?: number; // New: Spirit Stones gifted
  chapters: Chapter[];
  lastUpdated: string;
  webUrl?: string; 
  lastReadChapterId?: string;
  libraryStatus?: LibraryStatus;
  contextSummary?: string; // AI Memory Palace
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentNovel: Novel | null;
  currentChapter: Chapter | null;
  duration: number;
  currentTime: number;
  isExpanded: boolean;
  sleepTimer?: number; // Minutes remaining
  playbackRate?: number; // Narrator Tempo
}

export interface Comment {
  id: string;
  user: string;
  avatarSeed: string;
  content: string;
  likes: number;
  timeAgo: string;
  role?: 'Author' | 'Top Fan' | 'Sect Elder';
}

export type SearchFilters = {
  genre?: string;
  status?: string;
  query: string;
};

export interface FinderFilters {
  description?: string; // New field for natural language query
  includedGenres: string[];
  excludedGenres: string[];
  includedTags: string[];
  excludedTags: string[];
  status: 'All' | 'Ongoing' | 'Completed';
  minRating: number;
  sortBy: 'Popular' | 'Rating' | 'New';
}

export interface ReadingSettings {
  fontSize: number;
  fontFamily: 'sans' | 'serif';
  theme: string; // 'custom' is now a valid option
  lineHeight: number; 
  paragraphSpacing: number; 
  fontWeight: 'normal' | 'bold'; 
  customThemeColors?: {
      bg: string;
      text: string;
      accent: string;
  };
}

// --- New Soulbound Types ---
export interface SoulboundArtifact {
  id: string;
  name: string;
  type: 'Weapon' | 'Tool' | 'Beast' | 'Spirit';
  level: number;
  xp: number;
  personality: 'Wise' | 'Bloodthirsty' | 'Sarcastic' | 'Mysterious';
  description: string;
  visualColor: string; 
}

export interface UserProfile {
  id?: string; // Added ID for admin management
  username: string;
  avatarSeed: string;
  chaptersRead: number;
  rank: string; 
  spiritStones: number; 
  cultivationRealm: string; 
  cultivationLevel: number; 
  unlockedThemes: string[];
  sect?: string; 
  sectRank?: string;
  sectContribution?: number;
  artifact?: SoulboundArtifact; 
  soulTitle?: string; 
  soulAnalysis?: string; 
  isAdmin?: boolean; 
  isBanned?: boolean; // New
  isMuted?: boolean; // New
  joinDate?: string; // New
  dailyAiUsage: { date: string; count: number }; 
  readingLog?: Record<string, number>; // date "YYYY-MM-DD" -> count
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Review {
  id: string;
  author: string;
  avatarSeed: string;
  rating: number;
  content: string;
  date: string;
  isUser?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: 'Book' | 'Pen' | 'Flame' | 'Headphones' | 'Zap' | 'Gem'; 
  unlockedAt?: string;
  condition?: (stats: any) => boolean; 
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarUrl?: string;
}

export interface Draft {
  id: string;
  title: string;
  description: string;
  tags: string[];
  characters: Character[];
  content: string;
  lastEdited: string;
}

export interface ReadingSpot {
  id: string;
  name: string;
  address: string;
  rating: string;
  type: string;
}

// --- Dungeon Types ---

export interface DungeonChoice {
  id: string;
  text: string;
  type: 'aggressive' | 'stealth' | 'diplomatic' | 'risk';
}

export interface DungeonState {
  isActive: boolean;
  theme: string;
  chapterCount: number;
  history: string[]; 
  currentContent: string;
  currentImageUrl?: string; 
  currentChoices: DungeonChoice[];
  status: 'alive' | 'dead' | 'victory';
  health: number; 
  inventory: string[];
}

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'theme' | 'item';
  value: string;
}

// --- Sect Types ---

export interface SectMission {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  type: 'read' | 'review' | 'dungeon';
}

export interface SectData {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  missions: SectMission[];
}

// --- Key Management ---
export interface UserApiKey {
    key: string;
    label: string;
    addedAt: string;
    isRateLimited?: boolean; 
}

// --- Admin/Approval Types ---
export interface ApprovalItem {
    id: string;
    novel: Novel;
    submittedBy: string;
    submittedAt: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface AdminReport {
    id: string;
    type: 'DMCA' | 'Error' | 'Missing_Chapter' | 'Bug' | 'Contact';
    targetId?: string; // Novel ID or Chapter ID
    targetName?: string;
    description: string;
    submittedBy: string;
    submittedAt: string;
    status: 'open' | 'resolved' | 'dismissed';
}

export interface AuditLog {
    id: string;
    action: string;
    admin: string;
    target: string;
    timestamp: string;
    details?: string;
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'purchase' | 'gift' | 'reward' | 'admin_grant';
    description: string;
    timestamp: string;
}

export interface FooterContent {
    intro: string;
    about: string;
    contact: string;
    dmca: string;
    privacy: string;
    terms: string;
}

export interface SiteConfig {
    maintenanceMode: boolean;
    globalAnnouncement: string | null;
    allowSignups: boolean;
    autoApproval: boolean;
    defaultTheme: string;
    footerContent: FooterContent;
}

// --- Notebook Types ---
export interface NovelNote {
    id: string;
    content: string;
    updatedAt: string;
}

// --- Lore Keeper Types ---
export interface LoreEntry {
    category: 'Character' | 'Location' | 'System' | 'Item';
    name: string;
    description: string;
}

// --- Paragraph Comments ---
export interface ParagraphComment {
    id: string;
    paragraphIndex: number;
    content: string;
    user: string; // 'AI' or 'User'
    avatarSeed: string;
    timestamp: string;
}
