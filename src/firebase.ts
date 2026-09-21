import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Exhibit } from './types';
import { DEFAULT_EXHIBITS } from './data/defaultExhibits';

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with configured database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const EXHIBITS_COLLECTION = 'exhibits';

/**
 * Subscribe to real-time updates of all exhibition artifacts in Firestore.
 * If the collection is empty on first boot, seed it with DEFAULT_EXHIBITS.
 */
export function subscribeToExhibits(
  onExhibitsUpdated: (exhibits: Exhibit[]) => void,
  onError?: (error: Error) => void
) {
  const exhibitsRef = collection(db, EXHIBITS_COLLECTION);

  // Set up real-time listener
  const unsubscribe = onSnapshot(
    exhibitsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // First-time database initialization: seed with default exhibits
        console.log('Seeding initial archaeological exhibits to Firestore...');
        await seedDefaultExhibits();
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

      // Sort by createdAt ascending (or default order)
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      onExhibitsUpdated(items);
    },
    (error) => {
      console.error('Firestore real-time subscription error:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Seed the initial exhibition data if the cloud collection is empty
 */
export async function seedDefaultExhibits() {
  try {
    const batch = writeBatch(db);
    for (const exhibit of DEFAULT_EXHIBITS) {
      const docRef = doc(db, EXHIBITS_COLLECTION, exhibit.id);
      batch.set(docRef, exhibit);
    }
    await batch.commit();
  } catch (err) {
    console.error('Failed to seed default exhibits to Firestore:', err);
  }
}

/**
 * Save or update an exhibit in Firestore
 */
export async function saveExhibitToCloud(exhibit: Exhibit): Promise<void> {
  const docRef = doc(db, EXHIBITS_COLLECTION, exhibit.id);
  await setDoc(docRef, exhibit, { merge: true });
}

/**
 * Delete an exhibit from Firestore
 */
export async function deleteExhibitFromCloud(exhibitId: string): Promise<void> {
  const docRef = doc(db, EXHIBITS_COLLECTION, exhibitId);
  await deleteDoc(docRef);
}

/**
 * Sync all exhibits (batch update / replace)
 */
export async function syncAllExhibitsToCloud(exhibits: Exhibit[]): Promise<void> {
  const exhibitsRef = collection(db, EXHIBITS_COLLECTION);
  const existingDocs = await getDocs(exhibitsRef);
  const existingIds = new Set(existingDocs.docs.map((d) => d.id));
  const newIds = new Set(exhibits.map((e) => e.id));

  const batch = writeBatch(db);

  // 1. Delete removed exhibits
  existingDocs.docs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  // 2. Set all current exhibits
  exhibits.forEach((exhibit) => {
    const docRef = doc(db, EXHIBITS_COLLECTION, exhibit.id);
    batch.set(docRef, exhibit);
  });

  await batch.commit();
}
