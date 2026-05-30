import { StoredMaterial, StoredMaterialWithFiles, StoredFolder, InlineNote, SRSState } from '../types';

const DB_NAME = 'AudioSyncReaderDB';
const DB_VERSION = 2;
const STORE_NAME = 'materials';
const FOLDER_STORE_NAME = 'folders';

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
          dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      }
      if (oldVersion < 2) {
        if (!dbInstance.objectStoreNames.contains(FOLDER_STORE_NAME)) {
            dbInstance.createObjectStore(FOLDER_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
        const transaction = request.transaction;
        if(transaction){
            const materialStore = transaction.objectStore(STORE_NAME);
            if (!materialStore.indexNames.contains('folderId')) {
                materialStore.createIndex('folderId', 'folderId', { unique: false });
            }
        }
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(true);
    };

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(false);
    };
  });
};

export const saveMaterial = (material: { 
    name: string; 
    mediaFile?: File; 
    textFile?: File; 
    duration?: number; 
    wordFile?: File;
    thumbnail?: string;
}): Promise<number> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ ...material, createdAt: new Date() });

    transaction.oncomplete = () => {
        resolve(request.result as number);
    };
    transaction.onerror = () => {
        console.error('Transaction error on saveMaterial:', transaction.error);
        reject(transaction.error);
    };
  });
};

export const getAllMaterials = (): Promise<StoredMaterial[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor(null, 'prev');
        const materials: StoredMaterial[] = [];

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const { id, name, createdAt, thumbnail, duration, folderId, bgmFile, wordFile, textFile, quizFile, annotationFile, quizBookmarks, globalMemo, inlineNotes, cardStats } = cursor.value;
                materials.push({ 
                    id, 
                    name, 
                    createdAt, 
                    thumbnail, 
                    duration, 
                    folderId, 
                    hasBgm: !!bgmFile, 
                    hasWordFile: !!wordFile, 
                    hasTextFile: !!textFile, 
                    hasQuizFile: !!quizFile,
                    hasAnnotationFile: !!annotationFile,
                    quizBookmarks: quizBookmarks || [],
                    globalMemo: globalMemo || '',
                    inlineNotes: inlineNotes || [],
                    cardStats: cardStats
                });
                cursor.continue();
            } else {
                resolve(materials);
            }
        };

        request.onerror = () => {
            console.error('Error fetching all materials:', request.error);
            reject(request.error);
        };
    });
};

export const getMaterialById = (id: number): Promise<StoredMaterialWithFiles> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            if (request.result) {
                const material = request.result;
                material.quizBookmarks = material.quizBookmarks || [];
                material.globalMemo = material.globalMemo || '';
                material.inlineNotes = material.inlineNotes || [];
                resolve(material);
            } else {
                reject(new Error('Material not found'));
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateMaterial = (
    id: number, 
    data: { 
        name?: string; 
        thumbnail?: string; 
        folderId?: number | null; 
        bgmFile?: File | null; 
        wordFile?: File | null; 
        mediaFile?: File | null; 
        textFile?: File | null; 
        duration?: number; 
        quizFile?: File | null;
        annotationFile?: File | null;
        quizBookmarks?: number[];
        globalMemo?: string;
        inlineNotes?: InlineNote[];
        cardStats?: Record<number, SRSState>;
    }
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const material = getRequest.result;
            if (material) {
                if (data.name) material.name = data.name;
                if (data.thumbnail) material.thumbnail = data.thumbnail;
                if (data.folderId !== undefined) {
                    if (data.folderId === null) {
                        delete material.folderId;
                    } else {
                        material.folderId = data.folderId;
                    }
                }
                if (data.bgmFile !== undefined) {
                    if (data.bgmFile === null) {
                        delete material.bgmFile;
                    } else {
                        material.bgmFile = data.bgmFile;
                    }
                }
                if (data.wordFile !== undefined) {
                    if (data.wordFile === null) {
                        delete material.wordFile;
                    } else {
                        material.wordFile = data.wordFile;
                    }
                }
                if (data.mediaFile !== undefined) {
                    if (data.mediaFile === null) {
                        delete material.mediaFile;
                        delete material.duration;
                    } else {
                        material.mediaFile = data.mediaFile;
                    }
                }
                if (data.textFile !== undefined) {
                    if (data.textFile === null) {
                        delete material.textFile;
                    } else {
                        material.textFile = data.textFile;
                    }
                }
                if (data.duration !== undefined) {
                    material.duration = data.duration;
                }
                if (data.quizFile !== undefined) {
                    if (data.quizFile === null) {
                        delete material.quizFile;
                    } else {
                        material.quizFile = data.quizFile;
                    }
                }
                if (data.annotationFile !== undefined) {
                    if (data.annotationFile === null) {
                        delete material.annotationFile;
                    } else {
                        material.annotationFile = data.annotationFile;
                    }
                }
                if (data.quizBookmarks !== undefined) {
                    material.quizBookmarks = data.quizBookmarks;
                }
                if (data.globalMemo !== undefined) {
                    material.globalMemo = data.globalMemo;
                }
                if (data.inlineNotes !== undefined) {
                    material.inlineNotes = data.inlineNotes;
                }
                if (data.cardStats !== undefined) {
                    material.cardStats = data.cardStats;
                }
                
                const updateRequest = store.put(material);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject(new Error('Material not found for update'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const deleteMaterial = (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Folder Functions ---

export const addFolder = (name: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([FOLDER_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const request = store.add({ name, createdAt: new Date() });

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllFolders = (): Promise<StoredFolder[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([FOLDER_STORE_NAME], 'readonly');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateFolder = (id: number, name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([FOLDER_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const folder = getRequest.result;
            if (folder) {
                folder.name = name;
                const updateRequest = store.put(folder);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject(new Error('Folder not found for update'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const deleteFolderAndReassign = (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME, FOLDER_STORE_NAME], 'readwrite');
        const materialStore = transaction.objectStore(STORE_NAME);
        const folderStore = transaction.objectStore(FOLDER_STORE_NAME);
        
        const folderIdIndex = materialStore.index('folderId');
        const getRequest = folderIdIndex.getAll(id);

        getRequest.onsuccess = () => {
            const materialsToUpdate = getRequest.result;
            let completedUpdates = 0;

            const checkCompletion = () => {
                if (completedUpdates === materialsToUpdate.length) {
                    const deleteRequest = folderStore.delete(id);
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                }
            };
            
            if (materialsToUpdate.length === 0) {
                 const deleteRequest = folderStore.delete(id);
                 deleteRequest.onerror = () => reject(deleteRequest.error);
            } else {
                materialsToUpdate.forEach(material => {
                    delete material.folderId;
                    const updateRequest = materialStore.put(material);
                    updateRequest.onsuccess = () => {
                        completedUpdates++;
                        checkCompletion();
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                });
            }
        };
        getRequest.onerror = () => reject(getRequest.error);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};