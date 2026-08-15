import type { BakeLog } from './api';

const DB_NAME = 'CulinaryLabDB';
const STORE_NAME = 'localBakeLogs';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    };
  });
};

export const saveLocalBakeLog = async (log: Partial<BakeLog>, fileData: {file: File, label: string}[]): Promise<BakeLog> => {
  const db = await initDB();
  
  // Convert files to data URLs for local storage display
  const imageData = await Promise.all(fileData.map(async item => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(item.file);
    });
    return { url: dataUrl, label: item.label };
  }));

  const localLog: BakeLog = {
    ...log,
    _id: 'local-' + Date.now().toString(),
    imageUrls: [...(log.imageUrls || []), ...imageData.map(d => d.url)],
    images: [...(log.images || []), ...imageData],
    date: new Date().toISOString(),
  } as BakeLog;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(localLog);
    request.onsuccess = () => resolve(localLog);
    request.onerror = () => reject(request.error);
  });
};

export const getLocalBakeLogs = async (recipeId: string): Promise<BakeLog[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as BakeLog[];
      resolve(all.filter(log => typeof log.recipeId === 'string' ? log.recipeId === recipeId : log.recipeId._id === recipeId));
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateLocalBakeLog = async (id: string, updates: Partial<BakeLog>): Promise<BakeLog> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const data = { ...getReq.result, ...updates };
      const putReq = store.put(data);
      putReq.onsuccess = () => resolve(data);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

export const deleteLocalBakeLog = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
