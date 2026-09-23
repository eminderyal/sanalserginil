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
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
  };
  if (errMsg.includes('Quota limit exceeded') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
    console.warn('Firestore Free Tier Quota Reached. Operating in offline local storage mode.');
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
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
 * Sync all exhibits (batch update / replace) with diffing and writeBatch
 * to drastically minimize Firestore read/write quota consumption.
 */
export async function syncAllExhibitsToCloud(exhibits: Exhibit[]): Promise<void> {
  try {
    const exhibitsRef = collection(db, EXHIBITS_COLLECTION);
    const existingDocs = await getDocs(exhibitsRef);
    const existingMap = new Map(existingDocs.docs.map((d) => [d.id, { ref: d.ref, data: d.data() }]));
    const newIds = new Set(exhibits.map((e) => e.id));

    let batch = writeBatch(db);
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    // 1. Delete docs that no longer exist in the local exhibits list
    for (const [id, { ref }] of existingMap.entries()) {
      if (!newIds.has(id)) {
        batch.delete(ref);
        opCount++;
        if (opCount >= 400) await commitBatchIfNeeded();
      }
    }

    // 2. Set only new or modified exhibits
    for (const exhibit of exhibits) {
      const sanitized = sanitizeExhibitForFirestore(exhibit);
      const existing = existingMap.get(sanitized.id)?.data;

      // Diff check: only perform write if document is new or key fields changed
      const hasChanged =
        !existing ||
        existing.title !== sanitized.title ||
        existing.imageUrl !== sanitized.imageUrl ||
        existing.description !== sanitized.description ||
        existing.frameStyle !== sanitized.frameStyle ||
        existing.rotationY !== sanitized.rotationY ||
        JSON.stringify(existing.position) !== JSON.stringify(sanitized.position);

      if (hasChanged) {
        const docRef = doc(db, EXHIBITS_COLLECTION, sanitized.id);
        batch.set(docRef, sanitized, { merge: true });
        opCount++;
        if (opCount >= 400) await commitBatchIfNeeded();
      }
    }

    await commitBatchIfNeeded();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EXHIBITS_COLLECTION);
    throw error;
  }
}

