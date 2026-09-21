import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Exhibit } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with configured database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const EXHIBITS_COLLECTION = 'exhibits';

/**
 * Strips undefined values and ensures proper types so Firestore never throws unsupported value errors
 */
export function sanitizeExhibitForFirestore(exhibit: Exhibit): Record<string, any> {
  const clean: Record<string, any> = {
    id: exhibit.id || `exhibit-${Date.now()}`,
    title: exhibit.title || '',
    subtitle: exhibit.subtitle || '',
    era: exhibit.era || '',
    provenance: exhibit.provenance || '',
    material: exhibit.material || '',
    dimensions: exhibit.dimensions || '',
    description: exhibit.description || '',
    curatorNotes: exhibit.curatorNotes || '',
    imageUrl: exhibit.imageUrl || '',
    frameStyle: exhibit.frameStyle || 'stone_pedestal',
    position: Array.isArray(exhibit.position) ? exhibit.position : [0, 0, 0],
    rotationY: typeof exhibit.rotationY === 'number' ? exhibit.rotationY : 0,
    tags: Array.isArray(exhibit.tags) ? exhibit.tags : [],
    createdAt: typeof exhibit.createdAt === 'number' ? exhibit.createdAt : Date.now(),
  };

  if (exhibit.thumbnailUrl) clean.thumbnailUrl = exhibit.thumbnailUrl;
  if (exhibit.highlightColor) clean.highlightColor = exhibit.highlightColor;
  if (exhibit.audioGuideText) clean.audioGuideText = exhibit.audioGuideText;
  if (typeof exhibit.scale === 'number') clean.scale = exhibit.scale;
  if (typeof exhibit.aspectRatio === 'number') clean.aspectRatio = exhibit.aspectRatio;

  return clean;
}

/**
 * Test initial Firestore cloud connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, EXHIBITS_COLLECTION, 'health_check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline, check connection.');
    }
    return false;
  }
}

/**
 * Subscribe to real-time updates of all exhibition artifacts in Firestore.
 */
export function subscribeToExhibits(
  onExhibitsUpdated: (exhibits: Exhibit[]) => void,
  onError?: (error: Error) => void
) {
  const exhibitsRef = collection(db, EXHIBITS_COLLECTION);

  // Set up real-time listener
  const unsubscribe = onSnapshot(
    exhibitsRef,
    (snapshot) => {
      if (snapshot.empty) {
        onExhibitsUpdated([]);
        return;
      }

      const items: Exhibit[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Exhibit;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by createdAt ascending
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      onExhibitsUpdated(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, EXHIBITS_COLLECTION);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a single exhibit in Firestore
 */
export async function saveExhibitToCloud(exhibit: Exhibit): Promise<void> {
  const sanitized = sanitizeExhibitForFirestore(exhibit);
  const docRef = doc(db, EXHIBITS_COLLECTION, sanitized.id);
  try {
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${EXHIBITS_COLLECTION}/${sanitized.id}`);
    throw error;
  }
}

/**
 * Delete an exhibit from Firestore
 */
export async function deleteExhibitFromCloud(exhibitId: string): Promise<void> {
  const docRef = doc(db, EXHIBITS_COLLECTION, exhibitId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EXHIBITS_COLLECTION}/${exhibitId}`);
    throw error;
  }
}

/**
 * Sync all exhibits (batch update / replace)
 */
export async function syncAllExhibitsToCloud(exhibits: Exhibit[]): Promise<void> {
  try {
    const exhibitsRef = collection(db, EXHIBITS_COLLECTION);
    const existingDocs = await getDocs(exhibitsRef);
    const existingIds = new Set(existingDocs.docs.map((d) => d.id));
    const newIds = new Set(exhibits.map((e) => e.id));

    // 1. Delete removed exhibits individually or via batch
    for (const docSnap of existingDocs.docs) {
      if (!newIds.has(docSnap.id)) {
        await deleteDoc(docSnap.ref);
      }
    }

    // 2. Set all current exhibits with sanitized data
    for (const exhibit of exhibits) {
      const sanitized = sanitizeExhibitForFirestore(exhibit);
      const docRef = doc(db, EXHIBITS_COLLECTION, sanitized.id);
      await setDoc(docRef, sanitized, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EXHIBITS_COLLECTION);
    throw error;
  }
}

