import { TransactionGroup, TransactionItem, TransactionType } from '@/context/TransactionContext';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'finvault.db';
const TABLE_NAME = 'transactions';

export interface DBTransaction {
    id: string;
    userId: string;
    title: string;
    subtitle: string;
    amount: number;
    currency: string;
    type: string;
    icon: string;
    color: string;
    location: string;
    latitude?: number;
    longitude?: number;
    time: string;
    category: string;
    paymentMethod: string;
    note: string;
    image: string;
    date: string; // ISO string
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDB = async () => {
    if (!dbPromise) {
        dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    }
    return dbPromise;
};

export const initDatabase = async () => {
    try {
        const db = await getDB();
        
        // Create table if not exists (base schema)
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id TEXT PRIMARY KEY NOT NULL,
                userId TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL,
                subtitle TEXT,
                amount REAL NOT NULL,
                currency TEXT,
                type TEXT,
                icon TEXT,
                color TEXT,
                location TEXT,
                time TEXT,
                category TEXT,
                paymentMethod TEXT,
                note TEXT,
                image TEXT,
                date TEXT NOT NULL
            );
        `);

        try {
            await db.execAsync(`ALTER TABLE ${TABLE_NAME} ADD COLUMN userId TEXT NOT NULL DEFAULT '';`);
        } catch (e) {
            // Column likely already exists, ignore
        }

        // Migration: Add latitude and longitude columns if they don't exist
        try {
            await db.execAsync(`ALTER TABLE ${TABLE_NAME} ADD COLUMN latitude REAL;`);
        } catch (e) {
            // Column likely already exists, ignore
        }
        
        try {
            await db.execAsync(`ALTER TABLE ${TABLE_NAME} ADD COLUMN longitude REAL;`);
        } catch (e) {
            // Column likely already exists, ignore
        }

        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

const addTransactionToDB = async (db: SQLite.SQLiteDatabase, item: any) => {
    await db.runAsync(
        `INSERT INTO ${TABLE_NAME} (id, userId, title, subtitle, amount, currency, type, icon, color, location, latitude, longitude, time, category, paymentMethod, note, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.id,
            item.userId,
            item.title,
            item.subtitle,
            item.amount,
            item.currency,
            item.type,
            item.icon,
            item.color,
            item.location,
            item.latitude || null,
            item.longitude || null,
            item.time,
            item.category,
            item.paymentMethod,
            item.note,
            item.image,
            item.date
        ]
    );
};

export const addTransaction = async (item: Omit<TransactionItem, 'id'> & { date: Date }, userId: string) => {
    try {
        const db = await getDB();
        const id = Math.random().toString(36).substr(2, 9);
        const newItem = {
            ...item,
            id,
            userId,
            date: item.date.toISOString(),
             // Ensure defaults for optional fields
             location: item.location || 'Kolkata',
             latitude: item.latitude,
             longitude: item.longitude,
             time: item.time || new Date().toLocaleTimeString(),
             category: item.category || 'General',
             paymentMethod: item.paymentMethod || 'UPI',
             image: item.image || '',
             note: item.note || ''
        };
        
        await addTransactionToDB(db, newItem);
        return newItem;
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

export const deleteTransaction = async (id: string, userId: string) => {
    try {
        const db = await getDB();
        await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE id = ? AND userId = ?`, [id, userId]);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

export const updateTransaction = async (
    id: string,
    item: Omit<TransactionItem, 'id'> & { date: Date },
    userId: string
) => {
    try {
        const db = await getDB();
        await db.runAsync(
            `UPDATE ${TABLE_NAME}
             SET title = ?,
                 subtitle = ?,
                 amount = ?,
                 currency = ?,
                 type = ?,
                 icon = ?,
                 color = ?,
                 location = ?,
                 latitude = ?,
                 longitude = ?,
                 time = ?,
                 category = ?,
                 paymentMethod = ?,
                 note = ?,
                 image = ?,
                 date = ?
             WHERE id = ? AND userId = ?`,
            [
                item.title,
                item.subtitle,
                item.amount,
                item.currency,
                item.type,
                item.icon,
                item.color,
                item.location || 'Kolkata',
                item.latitude || null,
                item.longitude || null,
                item.time,
                item.category || 'General',
                item.paymentMethod || 'Other',
                item.note || '',
                item.image || '',
                item.date.toISOString(),
                id,
                userId,
            ]
        );
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
};

export const getTransactions = async (userId: string): Promise<TransactionGroup[]> => {
    try {
        if (!userId) {
            return [];
        }

        const db = await getDB();
        const rows = await db.getAllAsync<DBTransaction>(`SELECT * FROM ${TABLE_NAME} WHERE userId = ? ORDER BY date DESC, time DESC`, [userId]);
        
        // Group by date
        const groups: { [key: string]: TransactionItem[] } = {};
        
        rows.forEach(row => {
            const date = new Date(row.date);
            // reset time to 00:00:00 for grouping key
            const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            
            groups[dateKey].push({
                id: row.id,
                title: row.title,
                subtitle: row.subtitle,
                amount: row.amount,
                currency: row.currency,
                type: row.type as TransactionType,
                icon: row.icon,
                color: row.color,
                location: row.location,
                latitude: row.latitude,
                longitude: row.longitude,
                time: row.time,
                category: row.category,
                paymentMethod: row.paymentMethod,
                note: row.note,
                image: row.image
            });
        });
        
        const result: TransactionGroup[] = Object.keys(groups).map(dateKey => ({
             id: Math.random().toString(36).substr(2, 9), 
             date: new Date(dateKey),
             items: groups[dateKey]
        })).sort((a, b) => b.date.getTime() - a.date.getTime());

        return result;

    } catch (error) {
         console.error('Error fetching transactions:', error);
         return [];
    }
};