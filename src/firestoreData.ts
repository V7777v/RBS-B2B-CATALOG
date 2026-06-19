// Firestore data access for the distributor personal area (cart, orders, favorites)
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp,
} from 'firebase/firestore';

// ---------- Saved cart (carts/{uid}) ----------
export async function loadCart(uid: string): Promise<any[] | null> {
  try {
    const snap = await getDoc(doc(db, 'carts', uid));
    return snap.exists() ? ((snap.data() as any).items || []) : null;
  } catch {
    return null;
  }
}

export async function saveCart(uid: string, items: any[]): Promise<void> {
  try {
    await setDoc(doc(db, 'carts', uid), { items, updatedAt: Date.now() });
  } catch { /* ignore */ }
}

// ---------- Orders (orders/{auto-id}) ----------
export async function addOrderRecord(order: {
  uid: string; email: string; customerNumber?: string; items: any[]; total?: number; method?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'orders'), { ...order, status: 'sent', createdAt: serverTimestamp() });
  } catch { /* ignore */ }
}

export async function loadOrders(uid: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'orders'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    return [];
  }
}

// ---------- Favorites (favorites/{uid}) ----------
export async function loadFavorites(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'favorites', uid));
    return snap.exists() ? ((snap.data() as any).skus || []) : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(uid: string, skus: string[]): Promise<void> {
  try {
    await setDoc(doc(db, 'favorites', uid), { skus, updatedAt: Date.now() });
  } catch { /* ignore */ }
}
