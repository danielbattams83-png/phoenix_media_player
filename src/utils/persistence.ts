import type { Track, ImageAsset, ImageCollection, Playlist } from '../types';

const DATABASE_NAME = 'phoenix-media-player';
const DATABASE_VERSION = 2;
const HISTORY_STORE = 'listening-history';

export interface ListeningEntry { id: string; position: number; playedAt: number }

export async function loadListeningHistory(): Promise<ListeningEntry[]> {
  return storeRequest<ListeningEntry[]>(HISTORY_STORE, 'readonly', (store) => store.getAll());
}

export async function saveListeningEntry(entry: ListeningEntry): Promise<void> {
  await storeRequest(HISTORY_STORE, 'readwrite', (store) => store.put(entry));
}
const TRACKS_STORE = 'tracks';
const IMAGES_STORE = 'images';
const PLAYLISTS_KEY = 'phoenix-playlists';
const SETTINGS_KEY = 'phoenix-settings';
const COLLECTIONS_KEY = 'phoenix-image-collections';

interface StoredTrack {
  id: string;
  track: Omit<Track, 'mediaUrl' | 'fileRef'>;
  blob: Blob;
}

interface StoredImage {
  id: string;
  name: string;
  collectionId: string;
  blob: Blob;
}

let databasePromise: Promise<IDBDatabase> | undefined;

export async function requestPersistentStorage(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!navigator.storage?.persist || !navigator.storage.persisted) return 'unsupported';
  if (await navigator.storage.persisted()) return 'granted';
  return (await navigator.storage.persist()) ? 'granted' : 'denied';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(HISTORY_STORE)) database.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(TRACKS_STORE)) {
          database.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(IMAGES_STORE)) {
          database.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'));
    }).catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

function storeRequest<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    let requestResult: { value: T } | undefined;
    request.onsuccess = () => {
      requestResult = { value: request.result };
    };
    request.onerror = () => reject(request.error ?? new Error('Could not access local media storage.'));
    transaction.oncomplete = () => {
      if (requestResult) resolve(requestResult.value);
      else reject(new Error('Local media storage transaction completed without a result.'));
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Local media storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local media storage transaction failed.'));
  }));
}

export async function saveImportedTrack(track: Track): Promise<void> {
  const blob = track.fileRef;
  if (!blob) return;
  const { mediaUrl: _mediaUrl, fileRef: _fileRef, ...metadata } = track;
  const record: StoredTrack = { id: track.id, track: metadata, blob };
  await storeRequest<IDBValidKey>(TRACKS_STORE, 'readwrite', (store) => store.put(record));
}

export async function loadImportedTracks(): Promise<Track[]> {
  const records = await storeRequest<StoredTrack[]>(TRACKS_STORE, 'readonly', (store) => store.getAll());
  return records.map(({ track, blob }) => ({
    ...track,
    mediaUrl: URL.createObjectURL(blob),
    fileRef: new File([blob], track.path.split(/[\\/]/).pop() || `${track.title}.${track.format.toLowerCase()}`, { type: blob.type }),
    isLocal: true
  }));
}

export async function deleteImportedTrack(id: string): Promise<void> {
  await storeRequest<undefined>(TRACKS_STORE, 'readwrite', (store) => store.delete(id));
}

export async function saveImage(image: ImageAsset, file: Blob): Promise<void> {
  const record: StoredImage = { id: image.id, name: image.name, collectionId: image.collectionId, blob: file };
  await storeRequest<IDBValidKey>(IMAGES_STORE, 'readwrite', (store) => store.put(record));
}

export async function loadImages(): Promise<ImageAsset[]> {
  const records = await storeRequest<StoredImage[]>(IMAGES_STORE, 'readonly', (store) => store.getAll());
  return records.map(({ id, name, collectionId, blob }) => ({
    id,
    name,
    collectionId,
    url: URL.createObjectURL(blob)
  }));
}

export async function deleteImage(id: string): Promise<void> {
  await storeRequest<undefined>(IMAGES_STORE, 'readwrite', (store) => store.delete(id));
}

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  return stored === null ? fallback : JSON.parse(stored) as T;
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadPlaylists(): Playlist[] {
  return readJson<Playlist[]>(PLAYLISTS_KEY, []);
}

export function savePlaylists(playlists: Playlist[]): void {
  writeJson(PLAYLISTS_KEY, playlists);
}

export function loadImageCollections(): ImageCollection[] {
  return readJson<ImageCollection[]>(COLLECTIONS_KEY, []);
}

export function saveImageCollections(collections: ImageCollection[]): void {
  writeJson(COLLECTIONS_KEY, collections);
}

export interface PlayerSettings {
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  playbackSpeed: number;
  selectedEqPreset: string;
  eqBands: number[];
}

export function loadSettings(fallback: PlayerSettings): PlayerSettings {
  return { ...fallback, ...readJson<Partial<PlayerSettings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: PlayerSettings): void {
  writeJson(SETTINGS_KEY, settings);
}
