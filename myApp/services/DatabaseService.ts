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
        `INSERT OR REPLACE INTO ${TABLE_NAME} (id, userId, title, subtitle, amount, currency, type, icon, color, location, latitude, longitude, time, category, paymentMethod, note, image, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            date: item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString(),
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
                item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString(),
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

export const exportAllTransactions = async (userId: string): Promise<DBTransaction[]> => {
    try {
        if (!userId) return [];
        const db = await getDB();
        return await db.getAllAsync<DBTransaction>(`SELECT * FROM ${TABLE_NAME} WHERE userId = ?`, [userId]);
    } catch (error) {
        console.error('Error exporting transactions:', error);
        return [];
    }
};

export const importAllTransactions = async (transactions: DBTransaction[], userId: string) => {
    try {
        const db = await getDB();
        for (const item of transactions) {
            item.userId = userId;
            try {
                await addTransactionToDB(db, item);
            } catch (e) {
                console.log('Skipping duplicate or error during import:', e);
            }
        }
    } catch (error) {
        console.error('Error importing transactions:', error);
        throw error;
    }
};

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_COLUMNS: (keyof DBTransaction)[] = [
    'id', 'userId', 'title', 'subtitle', 'amount', 'currency', 'type',
    'icon', 'color', 'location', 'latitude', 'longitude', 'time',
    'category', 'paymentMethod', 'note', 'image', 'date',
];

/** Escape a single CSV cell value per RFC 4180 */
const escapeCell = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    // Wrap in quotes if the value contains a comma, double-quote, or newline
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
};

/** Parse a single CSV line into an array of cell strings, handling quoted fields */
const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                current += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
            } else if (ch === ',') {
                result.push(current);
                current = '';
                i++;
            } else {
                current += ch;
                i++;
            }
        }
    }
    result.push(current);
    return result;
};

/**
 * Export all transactions for a user as a CSV string.
 * The first row contains column headers.
 */
export const exportTransactionsAsCSV = async (userId: string): Promise<string> => {
    try {
        if (!userId) return '';
        const db = await getDB();
        const rows = await db.getAllAsync<DBTransaction>(
            `SELECT * FROM ${TABLE_NAME} WHERE userId = ?`,
            [userId]
        );

        const header = CSV_COLUMNS.join(',');
        const dataRows = rows.map(row =>
            CSV_COLUMNS.map(col => escapeCell((row as any)[col])).join(',')
        );

        return [header, ...dataRows].join('\n');
    } catch (error) {
        console.error('Error exporting transactions as CSV:', error);
        return '';
    }
};

/**
 * Import transactions from a CSV string.
 * Expects the first row to be the header row matching CSV_COLUMNS.
 * Rows that cannot be parsed are silently skipped.
 */
export const importTransactionsFromCSV = async (
    csvStr: string,
    userId: string
): Promise<{ imported: number; skipped: number }> => {
    let imported = 0;
    let skipped = 0;
    try {
        const db = await getDB();
        // Normalise line endings
        const lines = csvStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        if (lines.length < 2) return { imported, skipped };

        const headerLine = lines[0];
        const headerCols = parseCsvLine(headerLine);

        // Validate header
        const missingCols = CSV_COLUMNS.filter(c => !headerCols.includes(c));
        if (missingCols.length > 0) {
            console.warn('CSV import: missing columns:', missingCols);
            // Allow partial imports — we'll map what we can
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const cells = parseCsvLine(line);
                const record: Record<string, unknown> = {};
                headerCols.forEach((col, idx) => {
                    record[col] = cells[idx] ?? '';
                });

                const item: DBTransaction = {
                    id: String(record.id || ''),
                    userId,  // always override with current user
                    title: String(record.title || ''),
                    subtitle: String(record.subtitle || ''),
                    amount: parseFloat(String(record.amount)) || 0,
                    currency: String(record.currency || 'INR'),
                    type: String(record.type || 'expense'),
                    icon: String(record.icon || ''),
                    color: String(record.color || ''),
                    location: String(record.location || ''),
                    latitude: record.latitude ? parseFloat(String(record.latitude)) : undefined,
                    longitude: record.longitude ? parseFloat(String(record.longitude)) : undefined,
                    time: String(record.time || ''),
                    category: String(record.category || 'General'),
                    paymentMethod: String(record.paymentMethod || 'Other'),
                    note: String(record.note || ''),
                    image: String(record.image || ''),
                    date: String(record.date || new Date().toISOString()),
                };

                if (!item.id || !item.title || !item.date) {
                    skipped++;
                    continue;
                }

                await addTransactionToDB(db, item);
                imported++;
            } catch (rowErr) {
                console.warn(`CSV import: skipping row ${i}:`, rowErr);
                skipped++;
            }
        }

        return { imported, skipped };
    } catch (error) {
        console.error('Error importing transactions from CSV:', error);
        return { imported, skipped };
    }
};