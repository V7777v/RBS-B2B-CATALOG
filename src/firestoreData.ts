// Firestore data access for the distributor personal area (cart, orders, favorites)
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp,
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
export async function addOrderRecord(order: { uid: string; email: string } & Record<string, any>): Promise<void> {
  try {
    await addDoc(collection(db, 'orders'), { ...order, status: 'sent', createdAt: serverTimestamp() });
  } catch { /* ignore */ }
}

export async function loadOrders(uid: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'orders'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    // sort newest-first client-side (avoids needing a composite Firestore index)
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return list;
  } catch {
    return [];
  }
}

// ---------- Agent / Sales-manager order views ----------
function sortNewestFirst(list: any[]): any[] {
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
  return list;
}

export async function loadAgentOrders(agentName: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'orders'), where('agent', '==', agentName));
    const snap = await getDocs(q);
    return sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  } catch {
    return [];
  }
}

export async function loadAllOrders(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    return sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  } catch {
    return [];
  }
}

// ---------- Favorites (favorites/{uid}) ----------
export async function loadFavorites(uid: string): Promise<any[]> {
  try {
    const snap = await getDoc(doc(db, 'favorites', uid));
    return snap.exists() ? ((snap.data() as any).items || []) : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(uid: string, items: any[]): Promise<void> {
  try {
    await setDoc(doc(db, 'favorites', uid), { items, updatedAt: Date.now() });
  } catch { /* ignore */ }
}
