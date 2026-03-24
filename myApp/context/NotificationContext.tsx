import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import NotificationService, { AppNotification } from '@/services/NotificationService';
import { ParserService } from '@/services/ParserService';

const STORAGE_KEY = '@finvault_notifications';
const PENDING_STORAGE_KEY = '@finvault_pending_transactions';
const MAX_STORED = 100; // cap to avoid excessive storage

interface NotificationContextType {
    notifications: AppNotification[];
    pendingTransactions: any[]; // We can refine the type if needed
    hasPermission: boolean;
    isLoading: boolean;
    refreshNotifications: () => Promise<void>;
    clearAll: () => void;
    clearOne: (id: string) => void;
    confirmTransaction: (id: string) => void;
    dismissTransaction: (id: string) => void;
    openPermissionSettings: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    pendingTransactions: [],
    hasPermission: false,
    isLoading: false,
    refreshNotifications: async () => {},
    clearAll: () => {},
    clearOne: () => {},
    confirmTransaction: () => {},
    dismissTransaction: () => {},
    openPermissionSettings: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
    const [hasPermission, setHasPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Persist notifications to AsyncStorage
    const persist = useCallback(async (notifs: AppNotification[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
        } catch { /* ignore */ }
    }, []);

    // Persist pending transactions to AsyncStorage
    const persistPending = useCallback(async (pending: any[]) => {
        try {
            await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
        } catch { /* ignore */ }
    }, []);

    // Load persisted data from storage
    const loadPersisted = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: AppNotification[] = JSON.parse(raw);
                setNotifications(parsed);
            }
            const rawPending = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
            if (rawPending) {
                const parsedPending = JSON.parse(rawPending);
                setPendingTransactions(parsedPending);
            }
        } catch { /* ignore */ }
    }, []);

    // Merge new notifications with existing ones (newest first, deduplicated by id)
    const mergeNotifications = useCallback((incoming: AppNotification[]) => {
        setNotifications(prev => {
            const map = new Map<string, AppNotification>();
            // Existing first, then incoming overrides
            for (const n of prev) map.set(n.id, n);
            for (const n of incoming) map.set(n.id, n);
            const merged = Array.from(map.values())
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_STORED);
            persist(merged);
            return merged;
        });

        // Detect potential transactions
        incoming.forEach(n => {
            if (n.text) {
                const parsed = ParserService.parseText(n.text);
                if (parsed.amount && parsed.amount > 0) {
                    setPendingTransactions(prev => {
                        // Avoid duplicates if notification re-posted
                        if (prev.some(p => p.id === n.id)) return prev;
                        const newPending = [...prev, {
                            id: n.id,
                            amount: parsed.amount,
                            title: parsed.merchant || n.appName,
                            category: parsed.category,
                            type: parsed.type,
                            date: new Date(n.timestamp),
                            originalText: n.text,
                        }];
                        persistPending(newPending);
                        return newPending;
                    });
                }
            }
        });
    }, [persist, persistPending]);

    // Full refresh: check permission, then fetch active notifications
    const refreshNotifications = useCallback(async () => {
        const perm = await NotificationService.hasPermission();
        setHasPermission(perm);
        if (perm) {
            const active = await NotificationService.getActiveNotifications();
            mergeNotifications(active);
        }
    }, [mergeNotifications]);

    // Initial load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadPersisted();
            await refreshNotifications();
            setIsLoading(false);
        };
        init();
    }, []);

    // Listen for real-time notification events from native
    useEffect(() => {
        const unsubPost = NotificationService.onNotificationPosted((n) => {
            mergeNotifications([n]);
        });

        const unsubRemove = NotificationService.onNotificationRemoved((id) => {
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id);
                persist(updated);
                return updated;
            });
        });

        return () => {
            unsubPost();
            unsubRemove();
        };
    }, [mergeNotifications, persist]);

    // Re-check permission when app comes back to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
            if (state === 'active') {
                await refreshNotifications();
            }
        });
        return () => sub.remove();
    }, [refreshNotifications]);

    const clearAll = useCallback(() => {
        setNotifications([]);
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }, []);

    const clearOne = useCallback((id: string) => {
        setNotifications(prev => {
            const updated = prev.filter(n => n.id !== id);
            persist(updated);
            return updated;
        });
    }, [persist]);

    const confirmTransaction = useCallback((id: string) => {
        setPendingTransactions(prev => {
            const updated = prev.filter(p => p.id !== id);
            persistPending(updated);
            return updated;
        });
    }, [persistPending]);

    const dismissTransaction = useCallback((id: string) => {
        setPendingTransactions(prev => {
            const updated = prev.filter(p => p.id !== id);
            persistPending(updated);
            return updated;
        });
    }, [persistPending]);

    const openPermissionSettings = useCallback(async () => {
        await NotificationService.openSettings();
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            pendingTransactions,
            hasPermission,
            isLoading,
            refreshNotifications,
            clearAll,
            clearOne,
            confirmTransaction,
            dismissTransaction,
            openPermissionSettings,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
