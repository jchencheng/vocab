import type { Word, AppSettings, AIContext } from '../types';
import { DB_NAME, DB_VERSION, STORE_WORDS, STORE_SETTINGS, STORE_CONTEXTS } from '../constants';

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_WORDS)) {
          const store = db.createObjectStore(STORE_WORDS, { keyPath: 'id' });
          store.createIndex('word', 'word', { unique: false });
          store.createIndex('nextReviewAt', 'nextReviewAt', { unique: false });
          store.createIndex('tags', 'tags', { multiEntry: true });
        }

        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_CONTEXTS)) {
          db.createObjectStore(STORE_CONTEXTS, { keyPath: 'id' });
        }
      };
    });
  }

  private async getStore(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  async addWord(word: Word): Promise<void> {
    const store = await this.getStore(STORE_WORDS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(word);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateWord(word: Word): Promise<void> {
    const store = await this.getStore(STORE_WORDS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(word);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWord(id: string): Promise<void> {
    const store = await this.getStore(STORE_WORDS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWord(id: string): Promise<Word | undefined> {
    const store = await this.getStore(STORE_WORDS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllWords(): Promise<Word[]> {
    const store = await this.getStore(STORE_WORDS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getWordsByTag(tag: string): Promise<Word[]> {
    const store = await this.getStore(STORE_WORDS);
    const index = store.index('tags');
    return new Promise((resolve, reject) => {
      const request = index.getAll(tag);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getDueWords(): Promise<Word[]> {
    const store = await this.getStore(STORE_WORDS);
    const index = store.index('nextReviewAt');
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.upperBound(now);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const store = await this.getStore(STORE_SETTINGS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ ...settings, id: 'default' });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings(): Promise<AppSettings | undefined> {
    const store = await this.getStore(STORE_SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.get('default');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addContext(context: AIContext): Promise<void> {
    const store = await this.getStore(STORE_CONTEXTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(context);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllContexts(): Promise<AIContext[]> {
    const store = await this.getStore(STORE_CONTEXTS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteContext(id: string): Promise<void> {
    const store = await this.getStore(STORE_CONTEXTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new IndexedDBService();
