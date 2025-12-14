
import React, { useState, useEffect } from 'react';
import { X, Check, Eye, Trash2, Clock, Crown, AlertTriangle, Shield, Settings, FileText, Ban, Power, Flag, Search, CheckCircle, XCircle, Edit, Save, Coins, Gift, Send, Users, BarChart2, Activity, Database, ShoppingBag, Terminal, User } from 'lucide-react';
import { getPendingQueue, approveNovel, rejectNovel, getDirectory, deleteNovelFromDirectory, getReports, updateReportStatus, submitReport, getSiteConfig, saveSiteConfig, addSpiritStones, getAllUsers, updateUserStatus, getAuditLogs, getTransactions, clearSystemCache, updateNovelInDirectory, MARKET_ITEMS, saveMarketItems } from '../services/storageService';
import { ApprovalItem, Novel, AdminReport, SiteConfig, FooterContent, UserProfile, AuditLog, Transaction, MarketItem } from '../types';
import { getSystemHealth, getPoolStatus } from '../services/keyManager';

interface AdminDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, addToast }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'sanctum' | 'users' | 'approvals' | 'library' | 'reports' | 'economy' | 'config'>('sanctum');
    
    // Data States
    const [queue, setQueue] = useState<ApprovalItem[]>([]);
    const [directory, setDirectory] = useState<Novel[]>([]);
    const [reports, setReports] = useState<AdminReport[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [config, setConfig] = useState<SiteConfig>({
        maintenanceMode: false,
        globalAnnouncement: null,
        allowSignups: true,
        autoApproval: false,
        defaultTheme: 'dark',
        footerContent: { intro: '', about: '', contact: '', dmca: '', privacy: '', terms: '' }
    });
    
    // Edit States
    const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
    const [editForm, setEditForm] = useState<Partial<Novel>>({});
    const [marketItems, setMarketItems] = useState<MarketItem[]>(MARKET_ITEMS);
    
    // Search Filters
    const [librarySearch, setLibrarySearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    // Treasury State
    const [grantAmount, setGrantAmount] = useState('');
    const [targetUser, setTargetUser] = useState('');
    
    // Stats
    const [health, setHealth] = useState(100);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            refreshData();
            const interval = setInterval(() => {
                setHealth(getSystemHealth());
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isOpen, isAuthenticated, activeTab]);

    const refreshData = () => {
        setQueue(getPendingQueue());
        setDirectory(getDirectory());
        setReports(getReports());
        setUsers(getAllUsers());
        setAuditLogs(getAuditLogs());
        setTransactions(getTransactions());
        setConfig(getSiteConfig());
        setMarketItems(MARKET_ITEMS);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // FAKE_BACKEND – Auth Simulation
        // TODO: REAL IMPLEMENTATION REQUIRED: Connect to backend authentication service (JWT/Session).
        if (password === 'admin' || password === 'sect_master') {
            setIsAuthenticated(true);
            refreshData();
        } else {
            addToast("Invalid Elder Token.", "error");
        }
    };

    // --- USER MANAGEMENT ---
    const handleBanUser = (id: string, currentStatus?: boolean) => {
        updateUserStatus(id, { isBanned: !currentStatus });
        refreshData();
        addToast(`User ${!currentStatus ? 'banned' : 'unbanned'}.`, 'info');
    };

    const handleMuteUser = (id: string, currentStatus?: boolean) => {
        updateUserStatus(id, { isMuted: !currentStatus });
        refreshData();
        addToast(`User ${!currentStatus ? 'muted' : 'unmuted'}.`, 'info');
    };

    const handleResetAvatar = (id: string) => {
        updateUserStatus(id, { avatarSeed: `reset_${Date.now()}` });
        refreshData();
        addToast("Avatar reset.", 'success');
    };

    // --- CONTENT MANAGEMENT ---
    const startEditNovel = (novel: Novel) => {
        setEditingNovel(novel);
        setEditForm({ ...novel });
    };

    const saveEditedNovel = () => {
        if (editingNovel && editForm.title) {
            const updated = { ...editingNovel, ...editForm };
            updateNovelInDirectory(updated as Novel);
            setEditingNovel(null);
            refreshData();
            addToast("Novel updated successfully.", 'success');
        }
    };

    const deleteChapter = (chapterId: string) => {
        if (editForm.chapters) {
            setEditForm({
                ...editForm,
                chapters: editForm.chapters.filter(c => c.id !== chapterId)
            });
        }
    };

    const handleDeleteNovel = (id: string) => {
        if (confirm("Are you sure? This cannot be undone.")) {
            deleteNovelFromDirectory(id);
            addToast("Novel deleted from public records.", "success");
            refreshData();
        }
    };

    // --- ECONOMY ---
    const handleGrantStones = () => {
        const amount = parseInt(grantAmount);
        if (isNaN(amount) || amount <= 0) return;
        
        // Find user
        const user = users.find(u => u.username === targetUser || u.id === targetUser);
        if (user) {
            addSpiritStones(amount, 'Admin Grant', user.id);
            addToast(`Granted ${amount} Stones to ${user.username}.`, 'success');
            setGrantAmount('');
            setTargetUser('');
            refreshData();
        } else {
            addToast("User not found.", "error");
        }
    };

    const updateMarketItem = (index: number, field: keyof MarketItem, value: any) => {
        const newItems = [...marketItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setMarketItems(newItems);
    };

    const saveMarket = () => {
        saveMarketItems(marketItems);
        addToast("Market catalog updated.", 'success');
    };

    const addNewItem = () => {
        const newItem: MarketItem = {
            id: `item-${Date.now()}`,
            name: 'New Item',
            description: 'Description here',
            cost: 100,
            type: 'item',
            value: 'value'
        };
        setMarketItems([...marketItems, newItem]);
    };

    const deleteItem = (idx: number) => {
        const newItems = [...marketItems];
        newItems.splice(idx, 1);
        setMarketItems(newItems);
    };

    // --- SYSTEM ---
    const handleClearCache = () => {
        if (confirm("This will wipe all data except accounts and config. Proceed?")) {
            clearSystemCache();
            refreshData();
            addToast("System cache purged.", 'info');
        }
    };

    const handleSaveFooter = () => {
        saveSiteConfig(config);
        addToast("Global configuration saved.", 'success');
    };

    if (!isOpen) return null;

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="bg-gray-900 border-2 border-red-900/50 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden p-8 text-center">
                    <div className="mx-auto bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                        <Crown className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Sect Pavilion Access</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input 
                            type="password" 
                            placeholder="Enter Elder Token"
                            className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-center text-white focus:border-red-500 focus:outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-lg">Verify</button>
                    </form>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-800">
                
                {/* Sidebar */}
                <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                    <div className="p-6 border-b border-gray-800">
                        <h3 className="font-bold text-white flex items-center gap-2"><Crown className="w-5 h-5 text-red-500" /> Sect Admin</h3>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        {[
                            { id: 'sanctum', label: 'Dashboard', icon: Activity },
                            { id: 'users', label: 'Disciples', icon: Users },
                            { id: 'approvals', label: 'Approvals', icon: CheckCircle, count: queue.length },
                            { id: 'library', label: 'Library', icon: Database },
                            { id: 'reports', label: 'Reports', icon: Flag, count: reports.filter(r => r.status === 'open').length },
                            { id: 'economy', label: 'Economy', icon: Coins },
                            { id: 'config', label: 'System', icon: Settings },
                        ].map(item => (
                            <button 
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <item.icon className="w-4 h-4" /> {item.label}
                                {item.count ? <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 rounded-full">{item.count}</span> : null}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-gray-800 text-center">
                        <button onClick={onClose} className="text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2"><Power className="w-4 h-4" /> Log Out</button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden relative">
                    <div className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900/50">
                        <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
                        <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${health > 70 ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>System: {health}%</span>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        
                        {/* 1. DASHBOARD */}
                        {activeTab === 'sanctum' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                        <div className="text-gray-500 text-xs uppercase font-bold">Total Users</div>
                                        <div className="text-3xl font-bold text-white">{users.length}</div>
                                    </div>
                                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                        <div className="text-gray-500 text-xs uppercase font-bold">Library Size</div>
                                        <div className="text-3xl font-bold text-blue-400">{directory.length}</div>
                                    </div>
                                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                        <div className="text-gray-500 text-xs uppercase font-bold">Pending</div>
                                        <div className="text-3xl font-bold text-yellow-400">{queue.length}</div>
                                    </div>
                                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                                        <div className="text-gray-500 text-xs uppercase font-bold">Transactions</div>
                                        <div className="text-3xl font-bold text-green-400">{transactions.length}</div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Terminal className="w-4 h-4" /> Recent Audit Logs</h3>
                                    <div className="space-y-2">
                                        {auditLogs.slice(0, 8).map(log => (
                                            <div key={log.id} className="text-sm flex justify-between border-b border-gray-800 pb-2">
                                                <span className="text-gray-400 font-mono">[{log.timestamp}]</span>
                                                <span className="text-white font-bold">{log.action}</span>
                                                <span className="text-gray-400">{log.target}</span>
                                                <span className="text-gray-500 text-xs max-w-xs truncate">{log.details}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. USER MANAGEMENT */}
                        {activeTab === 'users' && (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <input type="text" placeholder="Search user..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white flex-1" />
                                </div>
                                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-gray-950 text-gray-500 uppercase font-bold">
                                            <tr>
                                                <th className="p-4">User</th>
                                                <th className="p-4">Rank</th>
                                                <th className="p-4">Stones</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                                                <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                                    <td className="p-4 font-bold text-white">{user.username} <span className="text-gray-600 text-xs">({user.id})</span></td>
                                                    <td className="p-4">{user.rank}</td>
                                                    <td className="p-4 text-amber-400">{user.spiritStones}</td>
                                                    <td className="p-4">
                                                        {user.isBanned && <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs">BANNED</span>}
                                                        {user.isMuted && <span className="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-xs ml-2">MUTED</span>}
                                                        {!user.isBanned && !user.isMuted && <span className="text-green-500">Active</span>}
                                                    </td>
                                                    <td className="p-4 flex justify-end gap-2">
                                                        <button onClick={() => handleBanUser(user.id!, user.isBanned)} className="p-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/50 rounded" title="Ban/Unban"><Ban className="w-4 h-4" /></button>
                                                        <button onClick={() => handleMuteUser(user.id!, user.isMuted)} className="p-1.5 bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/50 rounded" title="Mute/Unmute"><Settings className="w-4 h-4" /></button>
                                                        <button onClick={() => handleResetAvatar(user.id!)} className="p-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded" title="Reset Avatar"><User className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 3. CONTENT (LIBRARY) */}
                        {activeTab === 'library' && (
                            <div className="space-y-4">
                                {editingNovel ? (
                                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
                                        <h3 className="font-bold text-white flex items-center gap-2"><Edit className="w-4 h-4" /> Editing: {editingNovel.title}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                                <input className="w-full bg-black border border-gray-700 rounded p-2 text-white" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Author</label>
                                                <input className="w-full bg-black border border-gray-700 rounded p-2 text-white" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs text-gray-500 mb-1">Description</label>
                                                <textarea className="w-full bg-black border border-gray-700 rounded p-2 text-white h-24" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-800 pt-4">
                                            <h4 className="text-sm font-bold text-white mb-2">Chapters</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {editForm.chapters?.map(c => (
                                                    <div key={c.id} className="flex justify-between items-center bg-black p-2 rounded text-sm">
                                                        <span className="text-gray-300">{c.title}</span>
                                                        <button onClick={() => deleteChapter(c.id)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingNovel(null)} className="px-4 py-2 bg-gray-800 rounded text-white">Cancel</button>
                                            <button onClick={saveEditedNovel} className="px-4 py-2 bg-green-600 rounded text-white font-bold">Save Changes</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                            <input type="text" placeholder="Search directory..." className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            {directory.filter(n => n.title.toLowerCase().includes(librarySearch.toLowerCase())).map(novel => (
                                                <div key={novel.id} className="flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-800 hover:border-gray-600">
                                                    <div className="flex items-center gap-4">
                                                        <img src={novel.coverUrl} className="w-10 h-14 object-cover rounded" />
                                                        <div>
                                                            <div className="text-white font-bold">{novel.title}</div>
                                                            <div className="text-xs text-gray-500">{novel.author} • {novel.chapters.length} Ch</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => startEditNovel(novel)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"><Edit className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteNovel(novel.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 4. APPROVALS */}
                        {activeTab === 'approvals' && (
                            <div className="space-y-4">
                                {queue.map(item => (
                                    <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
                                        <div className="flex gap-4">
                                            <img src={item.novel.coverUrl} className="w-12 h-16 object-cover rounded" />
                                            <div>
                                                <h4 className="font-bold text-white">{item.novel.title}</h4>
                                                <p className="text-xs text-gray-400">By {item.novel.author}</p>
                                                <div className="text-xs text-blue-400 mt-1">Submitted by: {item.submittedBy}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { approveNovel(item.id); refreshData(); addToast("Approved", 'success'); }} className="bg-green-600/20 text-green-400 p-2 rounded hover:bg-green-600 hover:text-white"><Check className="w-5 h-5" /></button>
                                            <button onClick={() => { rejectNovel(item.id); refreshData(); addToast("Rejected", 'info'); }} className="bg-red-600/20 text-red-400 p-2 rounded hover:bg-red-600 hover:text-white"><X className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                                {queue.length === 0 && <div className="text-center py-20 text-gray-500">Queue empty.</div>}
                            </div>
                        )}

                        {/* 5. REPORTS */}
                        {activeTab === 'reports' && (
                            <div className="space-y-4">
                                {reports.map(report => (
                                    <div key={report.id} className={`p-4 rounded-xl border ${report.status === 'open' ? 'bg-gray-900 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-50'}`}>
                                        <div className="flex justify-between mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${report.type === 'DMCA' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>{report.type}</span>
                                            <span className="text-xs text-gray-500">{report.submittedAt}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm mb-2">{report.description}</p>
                                        {report.status === 'open' && (
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => { updateReportStatus(report.id, 'resolved'); refreshData(); }} className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded">Resolve</button>
                                                <button onClick={() => { updateReportStatus(report.id, 'dismissed'); refreshData(); }} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">Dismiss</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 6. ECONOMY (Market + Treasury) */}
                        {activeTab === 'economy' && (
                            <div className="space-y-8">
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2"><Gift className="w-5 h-5" /> Grant Stones</h3>
                                    <div className="flex gap-4">
                                        <input type="text" placeholder="Username / ID" className="bg-black border border-gray-700 rounded px-4 py-2 text-white flex-1" value={targetUser} onChange={e => setTargetUser(e.target.value)} />
                                        <input type="number" placeholder="Amount" className="bg-black border border-gray-700 rounded px-4 py-2 text-white w-32" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
                                        <button onClick={handleGrantStones} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded font-bold">Send</button>
                                    </div>
                                </div>

                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <div className="flex justify-between mb-4">
                                        <h3 className="font-bold text-white flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Market Catalog</h3>
                                        <div className="flex gap-2">
                                            <button onClick={addNewItem} className="text-xs bg-blue-600 px-3 py-1 rounded text-white">Add Item</button>
                                            <button onClick={saveMarket} className="text-xs bg-green-600 px-3 py-1 rounded text-white">Save Changes</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {marketItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-black p-2 rounded border border-gray-800">
                                                <input className="bg-transparent text-white border border-gray-700 rounded px-2 py-1 w-32 text-sm" value={item.name} onChange={e => updateMarketItem(idx, 'name', e.target.value)} />
                                                <input className="bg-transparent text-gray-400 border border-gray-700 rounded px-2 py-1 flex-1 text-sm" value={item.description} onChange={e => updateMarketItem(idx, 'description', e.target.value)} />
                                                <input className="bg-transparent text-amber-400 border border-gray-700 rounded px-2 py-1 w-20 text-sm font-bold" type="number" value={item.cost} onChange={e => updateMarketItem(idx, 'cost', parseInt(e.target.value))} />
                                                <button onClick={() => deleteItem(idx)} className="text-red-500 hover:bg-red-900/20 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <h3 className="font-bold text-white mb-4">Transaction Ledger</h3>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {transactions.map(tx => (
                                            <div key={tx.id} className="text-xs flex justify-between border-b border-gray-800 pb-1">
                                                <span className="text-gray-500">{tx.timestamp}</span>
                                                <span className="text-gray-300 w-32 truncate">{tx.userId}</span>
                                                <span className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                                                <span className="text-gray-400 flex-1 text-right">{tx.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 7. CONFIG & SYSTEM */}
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <h3 className="font-bold text-white mb-4">Maintenance Controls</h3>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-gray-400">Maintenance Mode</span>
                                        <button onClick={() => { const n = {...config, maintenanceMode: !config.maintenanceMode}; setConfig(n); saveSiteConfig(n); }} className={`w-12 h-6 rounded-full relative transition-colors ${config.maintenanceMode ? 'bg-red-600' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.maintenanceMode ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Allow Signups</span>
                                        <button onClick={() => { const n = {...config, allowSignups: !config.allowSignups}; setConfig(n); saveSiteConfig(n); }} className={`w-12 h-6 rounded-full relative transition-colors ${config.allowSignups ? 'bg-green-600' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.allowSignups ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Footer Editor */}
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Portal Inscriptions (Footer)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">Intro Text (Short)</label>
                                            <textarea 
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs h-16 resize-none"
                                                value={config.footerContent.intro}
                                                onChange={e => setConfig({...config, footerContent: {...config.footerContent, intro: e.target.value}})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">About Us</label>
                                            <textarea 
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs h-24"
                                                value={config.footerContent.about}
                                                onChange={e => setConfig({...config, footerContent: {...config.footerContent, about: e.target.value}})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Contact Info</label>
                                            <textarea 
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs h-24"
                                                value={config.footerContent.contact}
                                                onChange={e => setConfig({...config, footerContent: {...config.footerContent, contact: e.target.value}})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">DMCA Notice</label>
                                            <textarea 
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs h-24"
                                                value={config.footerContent.dmca}
                                                onChange={e => setConfig({...config, footerContent: {...config.footerContent, dmca: e.target.value}})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Privacy & Terms</label>
                                            <textarea 
                                                className="w-full bg-black border border-gray-700 rounded p-2 text-white text-xs h-24"
                                                value={config.footerContent.privacy}
                                                onChange={e => setConfig({...config, footerContent: {...config.footerContent, privacy: e.target.value, terms: e.target.value}})}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={handleSaveFooter} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2">
                                            <Save className="w-3 h-3" /> Save Configuration
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                                    <h3 className="font-bold text-white mb-4">Danger Zone</h3>
                                    <button onClick={handleClearCache} className="bg-red-900/20 text-red-500 border border-red-500/50 w-full py-3 rounded-lg font-bold hover:bg-red-900/40 transition-colors">
                                        PURGE SYSTEM CACHE
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">Clears all temporary data. Accounts and Config remain safe.</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
