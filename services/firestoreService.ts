import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppState } from '../types';
import { normalizeAppState } from './storage';

const APP_STATE_PATH = (userId: string) => `users/${userId}/data/appState`;
const FIRESTORE_QUOTA_PAUSE_KEY = 'teacherlife_firestore_quota_pause_until';
const FIRESTORE_DEV_PAUSE = import.meta.env.DEV;

const getTodayKey = () => new Date().toISOString().split('T')[0];

const getStoredQuotaPause = () => {
  try {
    return window.localStorage.getItem(FIRESTORE_QUOTA_PAUSE_KEY) === getTodayKey();
  } catch {
    return false;
  }
};

const storeQuotaPause = () => {
  try {
    window.localStorage.setItem(FIRESTORE_QUOTA_PAUSE_KEY, getTodayKey());
  } catch {
    // Ignore storage failures and keep the in-memory pause.
  }
};

let firestoreSyncPaused = FIRESTORE_DEV_PAUSE || getStoredQuotaPause();

const isQuotaExceededError = (error: unknown) => {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'resource-exhausted';
};

export const isFirestoreQuotaExceededError = isQuotaExceededError;

const pauseFirestoreSync = () => {
  firestoreSyncPaused = true;
  storeQuotaPause();
};

export const pauseFirestoreForToday = pauseFirestoreSync;
export const isFirestoreSyncPaused = () => firestoreSyncPaused;

export const saveAppStateToFirestore = async (userId: string, state: AppState) => {
  if (firestoreSyncPaused) return;

  try {
    const docRef = doc(db, APP_STATE_PATH(userId));
    await setDoc(docRef, {
      ...state,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      pauseFirestoreSync();
      console.warn('Firestore quota exceeded. Falling back to local-only saves for the rest of today.');
      return;
    }

    console.error("Error saving app state to Firestore:", error);
    // We don't throw here to avoid crashing the app, but we log it.
  }
};

export const getAppStateFromFirestore = async (userId: string): Promise<AppState | null> => {
  if (firestoreSyncPaused) return null;

  try {
    const docRef = doc(db, APP_STATE_PATH(userId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeAppState(docSnap.data() as Partial<AppState>);
    }
    return null;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      pauseFirestoreSync();
      console.warn('Firestore quota exceeded while loading remote state. Using local data instead.');
      return null;
    }

    console.error("Error getting app state from Firestore:", error);
    return null;
  }
};

export const subscribeToAppState = (
  userId: string,
  callback: (state: AppState) => void,
  onReady?: () => void,
) => {
  if (firestoreSyncPaused) {
    onReady?.();
    return () => {};
  }

  const docRef = doc(db, APP_STATE_PATH(userId));
  let didResolveInitialState = false;

  const resolveInitialState = () => {
    if (didResolveInitialState) return;

    didResolveInitialState = true;
    onReady?.();
  };

  return onSnapshot(docRef, (docSnap) => {
    resolveInitialState();

    // If the change originated locally (pending writes), we ignore it
    // because our local state is already up to date.
    if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
      callback(normalizeAppState(docSnap.data() as Partial<AppState>));
    }
  }, (error) => {
    if (isQuotaExceededError(error)) {
      pauseFirestoreSync();
      console.warn('Firestore quota exceeded while syncing. Continuing in local-only mode.');
    } else {
      console.error("Error subscribing to app state:", error);
    }

    resolveInitialState();
  });
};
