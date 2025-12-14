
import { Novel, ReadingSettings, UserProfile, Review, Achievement, Draft, DungeonState, MarketItem, SectData, SectMission, SoulboundArtifact, ApprovalItem, NovelNote, LibraryStatus, ParagraphComment, AdminReport, SiteConfig, AuditLog, Transaction } from '../types';

// FAKE_BACKEND – Simulating database keys for localStorage. 
// TODO: REAL IMPLEMENTATION REQUIRED: Replace with actual Database tables/collections (Postgres/MongoDB).
const KEYS = {
  HISTORY: 'omniread_history',
  LIBRARY: 'omniread_library',
  SETTINGS: 'omniread_settings',
  PROFILE: 'omniread_profile_v2', 
  USERS: 'omniread_users_db', // MOCK_DATA: Simulates a user table
  REVIEWS: 'omniread_reviews',
  ACHIEVEMENTS: 'omniread_achievements',
  DRAFTS: 'omniread_drafts',
  DUNGEON: 'omniread_dungeon',
  SECT: 'omniread_sect',
  PROGRESS: 'omniread_progress',
  DIRECTORY: 'omniread_directory',
  PENDING: 'omniread_pending_queue',
  NOTES: 'omniread_notes',
  PARA_COMMENTS: 'omniread_para_comments',
  REPORTS: 'omniread_admin_reports',
  SITE_CONFIG: 'omniread_site_config',
  DAILY_LIMIT: 'omniread_daily_limit',
  AUDIT_LOGS: 'omniread_audit_logs', 
  TRANSACTIONS: 'omniread_transactions',
  MARKET_ITEMS: 'omniread_market_items',
  API_KEYS: 'omniread_api_keys',
  GROQ_KEYS: 'omniread_groq_key_pool'
};

const PROFILE_UPDATE_EVENT = 'omniread-profile-update';

// MOCK_DATA – Hardcoded market items (Defaults). 
// TODO: REAL IMPLEMENTATION REQUIRED: Fetch from backend product catalog.
const DEFAULT_MARKET_ITEMS: MarketItem[] = [
    { id: 'theme-matrix', name: 'Matrix Theme', description: 'Unlock the digital rain reading theme.', cost: 2000, type: 'theme', value: 'matrix' },
    { id: 'theme-royal', name: 'Royal Theme', description: 'Purple and gold elegance for young masters.', cost: 5000, type: 'theme', value: 'royal' },
    { id: 'theme-rose', name: 'Blood Rose Theme', description: 'Dark red aesthetics for demonic cultivators.', cost: 5000, type: 'theme', value: 'rose' },
    { id: 'theme-ocean', name: 'Deep Ocean Theme', description: 'Calming blue depths.', cost: 3500, type: 'theme', value: 'ocean' },
    { id: 'theme-void', name: 'Void Theme', description: 'Absolute darkness.', cost: 10000, type: 'theme', value: 'void' },
];

export let MARKET_ITEMS: MarketItem[] = [];

// FAKE_BACKEND - Load Market Items with fallback
try {
    const stored = localStorage.getItem(KEYS.MARKET_ITEMS);
    MARKET_ITEMS = stored ? JSON.parse(stored) : DEFAULT_MARKET_ITEMS;
} catch {
    MARKET_ITEMS = DEFAULT_MARKET_ITEMS;
}

// MOCK_DATA – Default user profile template.
const DEFAULT_PROFILE: UserProfile = {
  id: 'user-001',
  username: 'Daoist Initiate',
  avatarSeed: 'Felix',
  chaptersRead: 0,
  rank: 'Mortal',
  spiritStones: 50, // MOCK_DATA: Starting currency
  cultivationRealm: 'Qi Condensation',
  cultivationLevel: 1,
  unlockedThemes: ['light', 'dark', 'sepia'],
  dailyAiUsage: { date: new Date().toDateString(), count: 0 },
  isAdmin: false,
  joinDate: new Date().toISOString()
};

// MOCK_DATA – Default settings.
const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: 'sans',
  theme: 'dark',
  lineHeight: 1.8,
  paragraphSpacing: 1.5,
  fontWeight: 'normal'
};

// MOCK_DATA – Default site configuration.
const DEFAULT_CONFIG: SiteConfig = {
    maintenanceMode: false,
    globalAnnouncement: null,
    allowSignups: true,
    autoApproval: false,
    defaultTheme: 'dark',
    footerContent: {
        intro: "OmniRead is a next-gen web novel reader powered by Gemini.",
        about: "We aim to provide the best reading experience across the multiverse.",
        contact: "Contact us via the form below.",
        dmca: "We respect intellectual property. Submit takedown requests here.",
        privacy: "Your data is stored locally in your browser.",
        terms: "By using this site, you agree to cultivate responsibly."
    }
};

// --- Helper Functions (Internal) ---

// FAKE_BACKEND – Logging system actions locally.
// TODO: REAL IMPLEMENTATION REQUIRED: Replace with server-side logging (ELK/Datadog).
const logAdminAction = (action: string, target: string, details?: string) => {
    const logs = getAuditLogs();
    const newLog: AuditLog = {
        id: Date.now().toString(),
        action,
        admin: 'Current Admin', // PLACEHOLDER: In real app, get current authenticated user ID
        target,
        timestamp: new Date().toLocaleString(),
        details
    };
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify([newLog, ...logs].slice(0, 100)));
};

// FAKE_BACKEND - Local transaction logging
const logTransaction = (userId: string, amount: number, type: Transaction['type'], description: string) => {
    const txs = getTransactions();
    const newTx: Transaction = {
        id: Date.now().toString(),
        userId,
        amount,
        type,
        description,
        timestamp: new Date().toLocaleString()
    };
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([newTx, ...txs].slice(0, 200)));
};

// FAKE_BACKEND – Simulating server-side quest progress tracking.
// TODO: REAL IMPLEMENTATION REQUIRED: Move mission logic to backend API.
const updateSectProgress = (type: 'read' | 'review' | 'dungeon', amount: number) => {
    const sect = getSectData();
    if (!sect) return;
    
    let updated = false;
    sect.missions = sect.missions.map(m => {
        if (m.type === type && !m.completed) {
            const newCurrent = Math.min(m.target, m.current + amount);
            if (newCurrent >= m.target) {
                m.completed = true;
                addSpiritStones(m.reward, 'Mission Reward');
                const profile = getUserProfile();
                profile.sectContribution = (profile.sectContribution || 0) + 2; 
                saveUserProfile(profile);
            }
            m.current = newCurrent;
            updated = true;
        }
        return m;
    });

    if (updated) {
        localStorage.setItem(KEYS.SECT, JSON.stringify(sect));
    }
};

const evolveArtifact = (xp: number) => {
    const profile = getUserProfile();
    if (!profile.artifact) return;

    profile.artifact.xp += xp;
    const threshold = profile.artifact.level * 100; 
    
    if (profile.artifact.xp >= threshold) {
        profile.artifact.level += 1;
        profile.artifact.xp -= threshold;
        if (profile.artifact.level === 5) profile.artifact.description = "The artifact hums with awakened power.";
        if (profile.artifact.level === 10) profile.artifact.description = "A blinding light radiates from its core.";
    }
    
    saveUserProfile(profile);
};

// --- Profile & Event Bus ---

export const subscribeToProfileUpdates = (callback: (profile: UserProfile) => void) => {
    const handler = () => {
        callback(getUserProfile());
    };
    window.addEventListener(PROFILE_UPDATE_EVENT, handler);
    window.addEventListener('storage', handler); 
    return () => {
        window.removeEventListener(PROFILE_UPDATE_EVENT, handler);
        window.removeEventListener('storage', handler);
    };
};

export const getUserProfile = (): UserProfile => {
    try {
        const data = localStorage.getItem(KEYS.PROFILE);
        return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
    } catch {
        return DEFAULT_PROFILE;
    }
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  
  // FAKE_BACKEND: Also update this user in the mock database
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === profile.id);
  if (idx >= 0) {
      users[idx] = profile;
  } else {
      users.push(profile);
  }
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));

  if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATE_EVENT, { detail: profile }));
  }
};

// FAKE_BACKEND – User Management
// TODO: REAL IMPLEMENTATION REQUIRED: Replace with API call to GET /users
export const getAllUsers = (): UserProfile[] => {
    try {
        const data = localStorage.getItem(KEYS.USERS);
        if (data) return JSON.parse(data);
        
        // MOCK_DATA: Generate Mock Users if empty
        const mockUsers: UserProfile[] = Array.from({length: 10}, (_, i) => ({
            ...DEFAULT_PROFILE,
            id: `user-${100+i}`,
            username: `Daoist_${Math.floor(Math.random() * 10000)}`,
            avatarSeed: `user${i}`,
            spiritStones: Math.floor(Math.random() * 5000),
            cultivationRealm: ['Qi Condensation', 'Foundation', 'Core Formation'][Math.floor(Math.random() * 3)],
            joinDate: new Date(Date.now() - Math.random() * 10000000000).toISOString()
        }));
        // Add current user
        mockUsers.unshift(getUserProfile());
        
        localStorage.setItem(KEYS.USERS, JSON.stringify(mockUsers));
        return mockUsers;
    } catch { return []; }
};

export const updateUserStatus = (userId: string, updates: Partial<UserProfile>) => {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
        const updatedUser = { ...users[idx], ...updates };
        users[idx] = updatedUser;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
        
        // Log it
        const action = updates.isBanned !== undefined ? (updates.isBanned ? 'BAN' : 'UNBAN') : 'UPDATE';
        logAdminAction(action, updatedUser.username, JSON.stringify(updates));

        // If updating current user, sync profile
        const currentUser = getUserProfile();
        if (currentUser.id === userId) {
            saveUserProfile(updatedUser);
        }
    }
};

// FAKE_BACKEND – Helper to create new artifact locally.
// TODO: REAL IMPLEMENTATION REQUIRED: Backend should generate ID and stats.
export const createArtifact = (name: string, type: SoulboundArtifact['type']): SoulboundArtifact => {
    const personalities = ['Wise', 'Bloodthirsty', 'Sarcastic', 'Mysterious'] as const;
    const colors = ['text-red-500', 'text-blue-500', 'text-green-500', 'text-purple-500', 'text-yellow-500', 'text-pink-500', 'text-cyan-500'];
    
    const newArtifact: SoulboundArtifact = {
        id: Date.now().toString(),
        name,
        type,
        level: 1,
        xp: 0,
        personality: personalities[Math.floor(Math.random() * personalities.length)],
        description: `A newborn ${type.toLowerCase()} forged from your spiritual energy.`,
        visualColor: colors[Math.floor(Math.random() * colors.length)]
    };
    
    const profile = getUserProfile();
    profile.artifact = newArtifact;
    saveUserProfile(profile);
    return newArtifact;
};

// FAKE_BACKEND – Client-side rate limiting.
// TODO: REAL IMPLEMENTATION REQUIRED: This is INSECURE. Implement server-side rate limiting (Redis).
export const checkAndIncrementDailyLimit = (): boolean => {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem(KEYS.DAILY_LIMIT) || '{}');
    
    if (data.date !== today) {
        data.date = today;
        data.count = 0;
    }
    
    if (data.count >= 50) return false; 
    
    data.count++;
    localStorage.setItem(KEYS.DAILY_LIMIT, JSON.stringify(data));
    
    const profile = getUserProfile();
    profile.dailyAiUsage = { date: today, count: data.count };
    saveUserProfile(profile);
    
    return true;
};

// --- Settings ---

export const getSettings = (): ReadingSettings => {
    try {
        const data = localStorage.getItem(KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = (settings: ReadingSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

// --- Core Storage (FAKE_BACKEND: Simulating Database) ---

export const getHistory = (): Novel[] => {
  try {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const addToHistory = (novel: Novel, chapterId?: string) => {
  const history = getHistory();
  const existingIndex = history.findIndex(n => n.id === novel.id);
  
  const updatedNovel = { ...novel };
  if (chapterId) {
      updatedNovel.lastReadChapterId = chapterId;
  } else if (existingIndex >= 0 && history[existingIndex].lastReadChapterId) {
      updatedNovel.lastReadChapterId = history[existingIndex].lastReadChapterId;
  }

  const filtered = history.filter(n => n.id !== novel.id);
  const updated = [updatedNovel, ...filtered].slice(0, 50);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
  
  if (chapterId) {
      updateSectProgress('read', 1);
      evolveArtifact(5); 
      
      const profile = getUserProfile();
      const today = new Date().toISOString().split('T')[0];
      if (!profile.readingLog) profile.readingLog = {};
      profile.readingLog[today] = (profile.readingLog[today] || 0) + 1;
      saveUserProfile(profile);
  }
};

export const getChapterProgress = (novelId: string, chapterId: string): number => {
    const key = `${KEYS.PROGRESS}_${novelId}_${chapterId}`;
    return parseFloat(localStorage.getItem(key) || '0');
};

export const saveChapterProgress = (novelId: string, chapterId: string, progress: number) => {
    const key = `${KEYS.PROGRESS}_${novelId}_${chapterId}`;
    localStorage.setItem(key, progress.toString());
};

export const incrementChaptersRead = () => {
    const profile = getUserProfile();
    profile.chaptersRead += 1;
    saveUserProfile(profile);
};

// --- Directory (FAKE_BACKEND: Aggregator Cache) ---

export const getDirectory = (): Novel[] => {
    try {
        const data = localStorage.getItem(KEYS.DIRECTORY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const addToDirectory = (novels: Novel[]) => {
    try {
        const current = getDirectory();
        const map = new Map(current.map(n => [n.title.toLowerCase(), n]));
        
        novels.forEach(n => {
             const key = n.title.toLowerCase();
             if (!map.has(key)) {
                 map.set(key, n);
             } else {
                 const existing = map.get(key)!;
                 if (n.lastUpdated === 'Just now' || n.chapters.length > existing.chapters.length) {
                     map.set(key, { 
                         ...existing, 
                         lastUpdated: n.lastUpdated,
                         chapters: n.chapters,
                         views: n.views 
                     });
                 }
             }
        });
        
        const updated = Array.from(map.values()).slice(0, 300); 
        localStorage.setItem(KEYS.DIRECTORY, JSON.stringify(updated));
    } catch (e) {
        console.error("Directory storage full", e);
    }
};

// CMS Features
export const updateNovelInDirectory = (novel: Novel) => {
    try {
        const current = getDirectory();
        const updated = current.map(n => n.id === novel.id ? novel : n);
        localStorage.setItem(KEYS.DIRECTORY, JSON.stringify(updated));
        logAdminAction('UPDATE_NOVEL', novel.title, `Updated metadata`);
    } catch (e) { console.error(e); }
}

export const deleteNovelFromDirectory = (novelId: string) => {
    try {
        const current = getDirectory();
        const novel = current.find(n => n.id === novelId);
        const updated = current.filter(n => n.id !== novelId);
        localStorage.setItem(KEYS.DIRECTORY, JSON.stringify(updated));
        if (novel) logAdminAction('DELETE_NOVEL', novel.title);
    } catch (e) {
        console.error("Error deleting novel", e);
    }
}

// --- Library (FAKE_BACKEND) ---

export const getLibrary = (): Novel[] => {
    try {
        const data = localStorage.getItem(KEYS.LIBRARY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const saveLibrary = (novels: Novel[]) => {
    localStorage.setItem(KEYS.LIBRARY, JSON.stringify(novels));
};

export const toggleLibrary = (novel: Novel): boolean => {
    const lib = getLibrary();
    const exists = lib.find(n => n.id === novel.id);
    
    if (exists) {
        const updated = lib.filter(n => n.id !== novel.id);
        saveLibrary(updated);
        return false;
    } else {
        saveLibrary([novel, ...lib]);
        return true;
    }
};

export const isInLibrary = (novelId: string): boolean => {
    const lib = getLibrary();
    return lib.some(n => n.id === novelId);
};

export const updateLibraryStatus = (novelId: string, status: LibraryStatus) => {
    const lib = getLibrary();
    const updated = lib.map(n => n.id === novelId ? { ...n, libraryStatus: status } : n);
    saveLibrary(updated);
};

export const upsertNovel = (novel: Novel): {action: 'added' | 'updated', novel: Novel} => {
    const lib = getLibrary();
    const idx = lib.findIndex(n => n.id === novel.id);
    
    if (idx >= 0) {
        const updatedNovel = { ...lib[idx], ...novel };
        lib[idx] = updatedNovel;
        saveLibrary(lib);
        return { action: 'updated', novel: updatedNovel };
    } else {
        const newNovel = { ...novel, libraryStatus: 'Reading' as const };
        saveLibrary([newNovel, ...lib]);
        return { action: 'added', novel: newNovel };
    }
};

// --- Reviews (FAKE_BACKEND) ---

export const getLocalReviews = (novelId: string): Review[] => {
    const data = localStorage.getItem(`${KEYS.REVIEWS}_${novelId}`);
    return data ? JSON.parse(data) : [];
};

export const addLocalReview = (novelId: string, review: Review) => {
    const reviews = getLocalReviews(novelId);
    localStorage.setItem(`${KEYS.REVIEWS}_${novelId}`, JSON.stringify([review, ...reviews]));
    
    updateSectProgress('review', 1);
};

// --- Notes (FAKE_BACKEND) ---

export const saveNote = (novelId: string, content: string) => {
    const note: NovelNote = { id: novelId, content, updatedAt: new Date().toISOString() };
    const allNotes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '{}');
    allNotes[novelId] = note;
    localStorage.setItem(KEYS.NOTES, JSON.stringify(allNotes));
};

export const getNote = (novelId: string): NovelNote | null => {
    const allNotes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '{}');
    return allNotes[novelId] || null;
};

// --- Paragraph Comments (FAKE_BACKEND) ---

export const getParagraphComments = (novelId: string, chapterId: string): ParagraphComment[] => {
    const key = `${KEYS.PARA_COMMENTS}_${novelId}_${chapterId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

export const saveParagraphComment = (novelId: string, chapterId: string, comment: ParagraphComment) => {
    const key = `${KEYS.PARA_COMMENTS}_${novelId}_${chapterId}`;
    const current = getParagraphComments(novelId, chapterId);
    localStorage.setItem(key, JSON.stringify([...current, comment]));
};

// --- Achievements & Stats (MOCK_DATA) ---

export const getAchievements = (): Achievement[] => {
    const profile = getUserProfile();
    return [
        { id: '1', title: 'First Step', description: 'Read your first chapter.', iconName: 'Book', unlockedAt: profile.chaptersRead > 0 ? '2024-01-01' : undefined },
        { id: '2', title: 'Bookworm', description: 'Read 100 chapters.', iconName: 'Book', unlockedAt: profile.chaptersRead >= 100 ? '2024-01-01' : undefined },
        { id: '3', title: 'Daoist Master', description: 'Reach Core Formation realm.', iconName: 'Zap', unlockedAt: profile.cultivationRealm === 'Core Formation' ? '2024-01-01' : undefined },
        { id: '4', title: 'Wealthy', description: 'Accumulate 1000 Spirit Stones.', iconName: 'Gem', unlockedAt: profile.spiritStones >= 1000 ? '2024-01-01' : undefined },
    ];
};

export const getReadingStats = () => {
    const history = getHistory();
    const tagCounts: Record<string, number> = {};
    history.forEach(n => {
        n.tags.forEach(t => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
    });
    
    const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        topTags: sortedTags,
        totalBooksRead: history.length
    };
};

// --- Drafts (Studio) (FAKE_BACKEND) ---

export const getDrafts = (): Draft[] => {
    const data = localStorage.getItem(KEYS.DRAFTS);
    return data ? JSON.parse(data) : [];
};

export const saveDraft = (draft: Draft) => {
    const drafts = getDrafts();
    const idx = drafts.findIndex(d => d.id === draft.id);
    if (idx >= 0) {
        drafts[idx] = draft;
    } else {
        drafts.unshift(draft);
    }
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
};

export const deleteDraft = (id: string) => {
    const drafts = getDrafts();
    const updated = drafts.filter(d => d.id !== id);
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(updated));
};

// --- Dungeon (FAKE_BACKEND) ---

export const getDungeonState = (): DungeonState | null => {
    const data = localStorage.getItem(KEYS.DUNGEON);
    return data ? JSON.parse(data) : null;
};

export const saveDungeonState = (state: DungeonState | null) => {
    if (state) localStorage.setItem(KEYS.DUNGEON, JSON.stringify(state));
    else localStorage.removeItem(KEYS.DUNGEON);
};

// --- Market & Currency (FAKE_BACKEND: Simulating Server Economy) ---

export const addSpiritStones = (amount: number, reason: string = 'System Grant', targetUserId?: string) => {
    const profile = getUserProfile();
    const users = getAllUsers();
    const targetId = targetUserId || profile.id;
    
    const targetIdx = users.findIndex(u => u.id === targetId);
    if (targetIdx >= 0) {
        users[targetIdx].spiritStones += amount;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
        logTransaction(targetId, amount, 'admin_grant', reason);
    }

    // If target is current logged in user
    if (targetId === profile.id) {
        profile.spiritStones += amount;
        saveUserProfile(profile);
    }
};

export const voteForNovel = (novelId: string): boolean => {
    const COST = 10;
    const profile = getUserProfile();
    
    if (profile.spiritStones < COST) return false;
    
    profile.spiritStones -= COST;
    saveUserProfile(profile);
    logTransaction(profile.id!, -COST, 'purchase', `Vote for ${novelId}`);
    
    const directory = getDirectory();
    const library = getLibrary();
    
    const updateList = (list: Novel[], saveFn: (n: Novel[]) => void) => {
        const idx = list.findIndex(n => n.id === novelId);
        if (idx >= 0) {
            list[idx].votes = (list[idx].votes || 0) + 1;
            saveFn(list);
        }
    };
    
    updateList(directory, (n) => localStorage.setItem(KEYS.DIRECTORY, JSON.stringify(n)));
    updateList(library, saveLibrary);
    
    return true;
};

export const giftNovel = (novelId: string, amount: number): boolean => {
    const profile = getUserProfile();
    if (profile.spiritStones < amount) return false;
    
    profile.spiritStones -= amount;
    saveUserProfile(profile);
    logTransaction(profile.id!, -amount, 'gift', `Gift to ${novelId}`);
    
    const directory = getDirectory();
    const library = getLibrary();
    
    const updateList = (list: Novel[], saveFn: (n: Novel[]) => void) => {
        const idx = list.findIndex(n => n.id === novelId);
        if (idx >= 0) {
            list[idx].totalGifts = (list[idx].totalGifts || 0) + amount;
            saveFn(list);
        }
    };
    
    updateList(directory, (n) => localStorage.setItem(KEYS.DIRECTORY, JSON.stringify(n)));
    updateList(library, saveLibrary);
    
    return true;
};

export const purchaseItem = (itemId: string): boolean => {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    
    const profile = getUserProfile();
    if (profile.spiritStones >= item.cost) {
        profile.spiritStones -= item.cost;
        if (item.type === 'theme') {
            if (!profile.unlockedThemes.includes(item.value)) {
                profile.unlockedThemes.push(item.value);
            }
        }
        saveUserProfile(profile);
        logTransaction(profile.id!, -item.cost, 'purchase', `Bought ${item.name}`);
        return true;
    }
    return false;
};

export const saveMarketItems = (items: MarketItem[]) => {
    MARKET_ITEMS = items;
    localStorage.setItem(KEYS.MARKET_ITEMS, JSON.stringify(items));
    logAdminAction('UPDATE_MARKET', 'Global', 'Updated market catalog');
};

// --- Sect (FAKE_BACKEND) ---

export const getSectData = (): SectData | null => {
    const data = localStorage.getItem(KEYS.SECT);
    return data ? JSON.parse(data) : null;
};

export const joinSect = (id: string, name: string, color: string, icon: string) => {
    const newSect: SectData = {
        id, name, description: '', color, icon,
        missions: [
            { id: 'm1', description: 'Read 5 Chapters', target: 5, current: 0, reward: 5, completed: false, type: 'read' },
            { id: 'm2', description: 'Leave a Review', target: 1, current: 0, reward: 10, completed: false, type: 'review' },
            { id: 'm3', description: 'Enter Dungeon', target: 1, current: 0, reward: 5, completed: false, type: 'dungeon' },
        ]
    };
    localStorage.setItem(KEYS.SECT, JSON.stringify(newSect));
    
    const profile = getUserProfile();
    profile.sect = id;
    profile.sectRank = 'Outer Disciple';
    saveUserProfile(profile);
};

// --- Admin / Approvals (FAKE_BACKEND) ---

export const getPendingQueue = (): ApprovalItem[] => {
    const data = localStorage.getItem(KEYS.PENDING);
    return data ? JSON.parse(data) : [];
};

export const submitForApproval = (novel: Novel): boolean => {
    const profile = getUserProfile();
    if (profile.spiritStones < 100) return false;

    profile.spiritStones -= 100;
    saveUserProfile(profile);
    logTransaction(profile.id!, -100, 'purchase', 'Approval Submission Fee');

    const queue = getPendingQueue();
    if (queue.some(i => i.novel.id === novel.id)) return false;

    const item: ApprovalItem = {
        id: Date.now().toString(),
        novel,
        submittedBy: profile.username,
        submittedAt: new Date().toLocaleDateString(),
        status: 'pending'
    };

    localStorage.setItem(KEYS.PENDING, JSON.stringify([...queue, item]));
    return true;
};

export const approveNovel = (approvalId: string) => {
    const queue = getPendingQueue();
    const item = queue.find(i => i.id === approvalId);
    if (item) {
        addToDirectory([item.novel]);
        const updated = queue.filter(i => i.id !== approvalId);
        localStorage.setItem(KEYS.PENDING, JSON.stringify(updated));
        logAdminAction('APPROVE_NOVEL', item.novel.title);
    }
};

export const rejectNovel = (approvalId: string) => {
    const queue = getPendingQueue();
    const updated = queue.filter(i => i.id !== approvalId);
    localStorage.setItem(KEYS.PENDING, JSON.stringify(updated));
    logAdminAction('REJECT_NOVEL', approvalId);
};

export const getReports = (): AdminReport[] => {
    const data = localStorage.getItem(KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
};

export const submitReport = (report: Omit<AdminReport, 'id' | 'status' | 'submittedAt'>) => {
    const reports = getReports();
    const newReport: AdminReport = {
        ...report,
        id: Date.now().toString(),
        status: 'open',
        submittedAt: new Date().toLocaleString()
    };
    localStorage.setItem(KEYS.REPORTS, JSON.stringify([newReport, ...reports]));
};

export const updateReportStatus = (id: string, status: 'resolved' | 'dismissed') => {
    const reports = getReports();
    const updated = reports.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(updated));
    logAdminAction('RESOLVE_REPORT', id, status);
};

// --- Audit & Logs (FAKE_BACKEND) ---

export const getAuditLogs = (): AuditLog[] => {
    try {
        const data = localStorage.getItem(KEYS.AUDIT_LOGS);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const getTransactions = (): Transaction[] => {
    try {
        const data = localStorage.getItem(KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const clearSystemCache = () => {
    // Keeps User Profile and Settings, clears everything else
    const keepKeys = [KEYS.PROFILE, KEYS.SETTINGS, KEYS.USERS, KEYS.MARKET_ITEMS, KEYS.SITE_CONFIG];
    const user = getUserProfile();
    const settings = getSettings();
    const users = getAllUsers();
    const market = MARKET_ITEMS;
    const config = getSiteConfig();

    localStorage.clear();
    
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(user));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(KEYS.MARKET_ITEMS, JSON.stringify(market));
    localStorage.setItem(KEYS.SITE_CONFIG, JSON.stringify(config));
    
    logAdminAction('SYSTEM_CLEAR', 'Cache', 'Manual admin purge');
};

// --- Site Config (FAKE_BACKEND) ---

export const getSiteConfig = (): SiteConfig => {
    try {
        const data = localStorage.getItem(KEYS.SITE_CONFIG);
        return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
};

export const saveSiteConfig = (config: SiteConfig) => {
    localStorage.setItem(KEYS.SITE_CONFIG, JSON.stringify(config));
    logAdminAction('UPDATE_CONFIG', 'Global Settings');
};

// --- Data Persistence (Save/Load) (FAKE_BACKEND) ---

export const exportSaveData = (): string => {
    const allData: Record<string, any> = {};
    
    // Collect all relevant keys from localStorage
    Object.values(KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
            allData[key] = JSON.parse(item);
        }
    });
    
    return JSON.stringify(allData, null, 2);
};

export const importSaveData = (jsonString: string): { success: boolean, message: string } => {
    try {
        const data = JSON.parse(jsonString);
        
        // Basic validation: check if it contains a profile or settings
        if (!data[KEYS.PROFILE] && !data[KEYS.SETTINGS]) {
            return { success: false, message: 'Invalid Soul Jade file format.' };
        }
        
        // Restore keys
        Object.entries(data).forEach(([key, value]) => {
            if (Object.values(KEYS).includes(key)) {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
        
        return { success: true, message: 'Cultivation base restored successfully.' };
    } catch (e) {
        return { success: false, message: 'Failed to absorb Soul Jade. File corrupted.' };
    }
};
