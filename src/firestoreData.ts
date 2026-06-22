// Firestore data access for the distributor personal area (cart, orders, favorites)
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, onSnapshot,
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

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
  } catch { /* ignore */ }
}

export async function updateOrder(orderId: string, fields: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'orders', orderId), { ...fields, updatedAt: serverTimestamp() }, { merge: true });
  } catch { /* ignore */ }
}

// ---------- Real-time order notifications (agent/manager) ----------
export function subscribeAgentOrders(agentName: string, cb: (orders: any[]) => void): () => void {
  try {
    const qq = query(collection(db, 'orders'), where('agent', '==', agentName));
    return onSnapshot(qq, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
  } catch {
    return () => {};
  }
}

export function subscribeAllOrders(cb: (orders: any[]) => void): () => void {
  try {
    return onSnapshot(collection(db, 'orders'), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
  } catch {
    return () => {};
  }
}

// ---------- Quotes (quotes/{quoteId}) ----------
export async function saveQuote(data: Record<string, any>, quoteId?: string | null): Promise<string | null> {
  try {
    if (quoteId) {
      await setDoc(doc(db, 'quotes', quoteId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      return quoteId;
    }
    const ref = await addDoc(collection(db, 'quotes'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch {
    return null;
  }
}

export async function loadAgentQuotes(agentName: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'quotes'), where('agentName', '==', agentName));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    return [];
  }
}

export async function loadCustomerQuotes(email: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'quotes'), where('customerEmail', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    return [];
  }
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  try {
    await setDoc(doc(db, 'quotes', quoteId), { status, updatedAt: serverTimestamp() }, { merge: true });
  } catch { /* ignore */ }
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

export async function loadUserProfile(uid: string): Promise<any> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(uid: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch { /* ignore */ }
}
