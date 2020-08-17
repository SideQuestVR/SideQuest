import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

export interface EnvironmentConfig {
    userDataPath: string;
}

interface LogService {
    error(error: any);
}

/**
 * @returns whether the provided parameter is undefined.
 */
export function isUndefined(obj: any): obj is undefined {
    return typeof obj === 'undefined';
}

/**
 * @returns whether the provided parameter is undefined or null.
 */
export function isUndefinedOrNull(obj: any): obj is undefined | null {
    return isUndefined(obj) || obj === null;
}

type StorageDatabase = { [key: string]: any };

export class FileStorage {
    private _database: StorageDatabase | null = null;
    private lastFlushedSerializedDatabase: string | null = null;

    constructor(private dbPath: string, private onError: (error: Error) => void) {}

    private get database(): StorageDatabase {
        if (!this._database) {
            this._database = this.loadSync();
        }

        return this._database;
    }

    async init(): Promise<void> {
        if (this._database) {
            return;
        }

        const database = await this.loadAsync();

        if (this._database) {
            return;
        }

        this._database = database;
    }

    private loadSync(): StorageDatabase {
        try {
            this.lastFlushedSerializedDatabase = fs.readFileSync(this.dbPath).toString();

            return JSON.parse(this.lastFlushedSerializedDatabase);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.onError(error);
            }

            return {};
        }
    }

    private async loadAsync(): Promise<StorageDatabase> {
        try {
            const readFile = promisify(fs.readFile);
            this.lastFlushedSerializedDatabase = (await readFile(this.dbPath)).toString();

            return JSON.parse(this.lastFlushedSerializedDatabase);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.onError(error);
            }

            return {};
        }
    }

    getItem<T>(key: string, defaultValue: T): T;
    getItem<T>(key: string, defaultValue?: T): T | undefined;
    getItem<T>(key: string, defaultValue?: T): T | undefined {
        const res = this.database[key];
        if (isUndefinedOrNull(res)) {
            return defaultValue;
        }

        return res;
    }

    setItem(key: string, data?: object | string | number | boolean | undefined | null): void {
        if (isUndefinedOrNull(data)) {
            return this.removeItem(key);
        }

        const isPrimitive = typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean';
        const noUpdateNeeded = isPrimitive && this.database[key] === data;
        if (noUpdateNeeded) {
            return;
        }

        this.database[key] = data;
        this.saveSync();
    }

    removeItem(key: string): void {
        if (!isUndefined(this.database[key])) {
            this.database[key] = undefined;
            this.saveSync();
        }
    }

    private saveSync(): void {
        const serializedDatabase = JSON.stringify(this.database, null, 4);
        const hasNotChanged = serializedDatabase === this.lastFlushedSerializedDatabase;
        if (hasNotChanged) {
            return;
        }

        try {
            fs.writeFileSync(this.dbPath, serializedDatabase);
            this.lastFlushedSerializedDatabase = serializedDatabase;
        } catch (error) {
            this.onError(error);
        }
    }
}

export class StateStorage {
    private static readonly STATE_FILE = 'state-storage.json';

    private fileStorage: FileStorage;

    constructor(environment: EnvironmentConfig, logService: LogService) {
        const storagePath = path.join(environment.userDataPath, StateStorage.STATE_FILE);
        this.fileStorage = new FileStorage(storagePath, error => logService.error(error));
    }

    init(): Promise<void> {
        return this.fileStorage.init();
    }

    getItem<T>(key: string, defaultValue: T): T;
    getItem<T>(key: string, defaultValue: T | undefined): T | undefined;
    getItem<T>(key: string, defaultValue?: T): T | undefined {
        return this.fileStorage.getItem(key, defaultValue);
    }

    setItem(key: string, data?: object | string | number | boolean | undefined | null): void {
        this.fileStorage.setItem(key, data);
    }

    removeItem(key: string): void {
        this.fileStorage.removeItem(key);
    }
}
