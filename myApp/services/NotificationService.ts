import { NativeModules, DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';

export interface AppNotification {
    id: string;
    packageName: string;
    appName: string;
    title: string;
    text: string;
    timestamp: number;
    isOngoing: boolean;
}

const { NotificationModule } = NativeModules;

const NotificationService = {
    /**
     * Returns true if the user has granted notification listener access to FinVault.
     */
    hasPermission: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return false;
        try {
            return await NotificationModule.hasNotificationPermission();
        } catch {
            return false;
        }
    },

    /**
     * Opens Android's Notification Access settings screen.
     */
    openSettings: async (): Promise<void> => {
        if (Platform.OS !== 'android') return;
        try {
            await NotificationModule.openNotificationSettings();
        } catch (e) {
            console.warn('Could not open notification settings:', e);
        }
    },

    /**
     * Returns the current list of active notifications on the device.
     * Requires permission to have been granted.
     */
    getActiveNotifications: async (): Promise<AppNotification[]> => {
        if (Platform.OS !== 'android') return [];
        try {
            const raw: string = await NotificationModule.getActiveNotifications();
            return JSON.parse(raw) as AppNotification[];
        } catch {
            return [];
        }
    },

    /**
     * Subscribe to newly posted notifications.
     * Returns an unsubscribe function.
     */
    onNotificationPosted: (callback: (n: AppNotification) => void) => {
        const sub = DeviceEventEmitter.addListener('onNotificationPosted', (data: string) => {
            try {
                callback(JSON.parse(data) as AppNotification);
            } catch { /* ignore malformed events */ }
        });
        return () => sub.remove();
    },

    /**
     * Subscribe to removed notifications (returns the notification key/id as string).
     * Returns an unsubscribe function.
     */
    onNotificationRemoved: (callback: (id: string) => void) => {
        const sub = DeviceEventEmitter.addListener('onNotificationRemoved', (id: string) => {
            callback(id);
        });
        return () => sub.remove();
    },
};

export default NotificationService;
