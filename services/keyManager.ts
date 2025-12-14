
import { UserApiKey } from "../types";

// FAKE_BACKEND – Using localStorage to simulate a database for API keys.
// TODO: REAL IMPLEMENTATION REQUIRED: Use a backend proxy with a secure vault (e.g. HashiCorp Vault, AWS Secrets Manager).
// INSECURE: Storing API keys in localStorage exposes them to XSS attacks.
const STORAGE_KEY = 'omniread_api_keys';
const GROQ_STORAGE_KEY = 'omniread_groq_key';
const GROQ_POOL_STORAGE_KEY = 'omniread_groq_key_pool';
const KEYS_UPDATE_EVENT = 'omniread-keys-update';

// In-memory cooldown list to avoid hitting dead keys repeatedly in one session
const cooldownKeys = new Set<string>();

const dispatchUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(KEYS_UPDATE_EVENT));
    }
};

// FAKE_BACKEND – Fetching keys from localStorage
export const getKeyPool = (): UserApiKey[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// FAKE_BACKEND – Adding key to localStorage
export const addKeyToPool = (key: string, label: string) => {
    const pool = getKeyPool();
    if (pool.some(k => k.key === key)) return; // No duplicates
    
    const newKey: UserApiKey = {
        key,
        label: label || `Key ${pool.length + 1}`,
        addedAt: new Date().toLocaleDateString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...pool, newKey]));
    dispatchUpdate();
};

// FAKE_BACKEND – Removing key from localStorage
export const removeKeyFromPool = (key: string) => {
    const pool = getKeyPool();
    const updated = pool.filter(k => k.key !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatchUpdate();
};

// Global index for round-robin rotation
let keyIndex = 0;

// FAKE_BACKEND – Client-side round-robin logic. 
// TODO: REAL IMPLEMENTATION REQUIRED: Should be handled by a proxy server to hide keys from client.
export const getNextKey = (): string => {
    const userKeys = getKeyPool().filter(k => !cooldownKeys.has(k.key));
    const systemKey = process.env.API_KEY || '';
    
    // If no user keys, fallback to system key
    if (userKeys.length === 0) return systemKey;
    
    // Round robin selection
    const keyObj = userKeys[keyIndex % userKeys.length];
    
    // Increment index for next call
    keyIndex = (keyIndex + 1) % userKeys.length;
    
    return keyObj.key;
};

// FAKE_BACKEND – In-memory rate limiting logic.
export const markKeyAsRateLimited = (key: string) => {
    if (key === process.env.API_KEY) return; 
    cooldownKeys.add(key);
    console.warn(`Key ${key.substring(0, 8)}... marked as rate limited. Switching...`);
    dispatchUpdate();
    
    // Reset cooldown after 1 minute (simple heuristic)
    setTimeout(() => {
        cooldownKeys.delete(key);
        dispatchUpdate();
    }, 60000);
};

export const getPoolStatus = () => {
    const pool = getKeyPool();
    const active = pool.filter(k => !cooldownKeys.has(k.key)).length;
    return {
        total: pool.length,
        active: active,
        exhausted: pool.length - active
    };
};

// --- Logic for Capacity Management ---

export type SystemModule = 'reading' | 'imaging' | 'video' | 'scanning' | 'chat';

export const getSystemHealth = (): number => {
    const { total, active } = getPoolStatus();
    const hasSystemKey = !!process.env.API_KEY;

    if (total === 0) {
        // If no user keys, check system key. 
        // If system key exists, 100% (or maybe 50% to encourage user keys). Let's say 100 for simplicity.
        // If no system key, 0%.
        return hasSystemKey ? 100 : 0;
    }
    return Math.floor((active / total) * 100);
};

// FAKE_BACKEND – Simulating load shedding/feature gating based on client-side key pool health
export const isModuleActive = (module: SystemModule): boolean => {
    const health = getSystemHealth();
    
    // Logic: How much percent of API key content should be used for which function
    switch (module) {
        case 'reading': 
            return true; // Always try to keep reading alive (Critical)
        case 'chat':
            return health > 10; // Disable chat if critical (10%)
        case 'scanning':
            return health > 30; // Disable aggregator if low (30%)
        case 'imaging':
            return health > 50; // Disable heavy image gen if medium (50%)
        case 'video':
            return health > 70; // Disable video unless healthy (70%)
        default:
            return true;
    }
};

// --- Groq Support ---

// FAKE_BACKEND – Groq key storage in localStorage
export const getGroqKeyPool = (): UserApiKey[] => {
    try {
        const stored = localStorage.getItem(GROQ_POOL_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addGroqKeyToPool = (key: string, label: string) => {
    const pool = getGroqKeyPool();
    if (pool.some(k => k.key === key)) return; // No duplicates
    
    const newKey: UserApiKey = {
        key,
        label: label || `Groq Key ${pool.length + 1}`,
        addedAt: new Date().toLocaleDateString()
    };
    
    localStorage.setItem(GROQ_POOL_STORAGE_KEY, JSON.stringify([...pool, newKey]));
    dispatchUpdate();
};

export const removeGroqKeyFromPool = (key: string) => {
    const pool = getGroqKeyPool();
    const updated = pool.filter(k => k.key !== key);
    localStorage.setItem(GROQ_POOL_STORAGE_KEY, JSON.stringify(updated));
    dispatchUpdate();
};

let groqKeyIndex = 0;

export const getGroqKey = (): string => {
    const pool = getGroqKeyPool();
    if (pool.length > 0) {
        const keyObj = pool[groqKeyIndex % pool.length];
        groqKeyIndex = (groqKeyIndex + 1) % pool.length;
        return keyObj.key;
    }
    // Fallback
    return localStorage.getItem(GROQ_STORAGE_KEY) || process.env.GROQ_API_KEY || '';
};

export const saveGroqKey = (key: string) => {
    localStorage.setItem(GROQ_STORAGE_KEY, key);
};
