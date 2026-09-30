// Persist the profile in IndexedDB, with a localStorage mirror as a safety net.
import { exportJson, migrateV3, PROFILE_VERSION } from './profile.js';

const DB = 'koudaozi';
const STORE = 'kv';
const KEY = 'profile';
const OLD_KEY = 'state';
const LS_KEY = 'koudaozi_profile';

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get(key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function put(key, value) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Returns { profile, migrated } or null for a first visit. */
export async function loadProfile() {
  try { navigator.storage?.persist?.(); } catch { /* best effort */ }
  let saved = null;
  try { saved = await get(KEY); } catch { /* fall back */ }
  const local = readLocal(LS_KEY);
  // Keep whichever copy is newer.
  if (local?.v === PROFILE_VERSION && (!saved || (local.savedAt || 0) > (saved.savedAt || 0))) saved = local;
  if (saved?.v === PROFILE_VERSION) return { profile: saved, migrated: false };

  let old = null;
  try { old = await get(OLD_KEY); } catch { /* none */ }
  old = old?.words?.length ? old : readLocal('koudaozi_v3');
  if (old?.words?.length) {
    const profile = migrateV3(old);
    if (Object.keys(profile.words).length) return { profile, migrated: true };
  }
  return null;
}

export async function saveProfile(profile) {
  const stamped = { ...profile, savedAt: Date.now() };
  try {
    await put(KEY, stamped);
  } catch (error) {
    console.error('IndexedDB save failed', error);
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(stamped)); } catch { /* quota */ }
}

export function downloadBackup(profile) {
  const blob = new Blob([exportJson(profile)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `koudaozi-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
