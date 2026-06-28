// Firestore data access for the distributor personal area (cart, orders, favorites)
import { db } from './firebase';
import {
  doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, onSnapshot, deleteDoc, orderBy, limit,
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
function sanitizeForFirestore(value: any): any {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((v) => (Array.isArray(v) ? JSON.stringify(v) : sanitizeForFirestore(v)));
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) {
      if (!k) continue;
      const v = (value as any)[k];
      if (v === undefined || typeof v === 'function') continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out;
  }
  if (typeof value === 'number' && !isFinite(value)) return null;
  return value;
}

let lastOrderError = '';
export function getLastOrderError(): string { return lastOrderError; }

export async function addOrderRecord(order: { uid: string; email: string } & Record<string, any>): Promise<string | null> {
  try {
    lastOrderError = '';
    const slimItems = Array.isArray(order.items) ? order.items.map((it: any) => ({
      id: it.id || it.sku || '',
      sku: it.sku || '',
      name: it.name || '',
      description: it.description || '',
      images: (it.images && it.images[0]) ? [it.images[0]] : [],
      price: Number(it.price) || 0,
      quantity: it.quantity || 1,
      optionals: Array.isArray(it.optionals) ? it.optionals.map((o: any) => ({ id: o.id || o.sku || '', sku: o.sku || '', name: o.name || '', price: Number(o.price) || 0, quantity: o.quantity || 1 })) : [],
    })) : order.items;
    const clean = sanitizeForFirestore({ ...order, items: slimItems });
    const ref = await addDoc(collection(db, 'orders'), { ...clean, status: 'sent', createdAt: serverTimestamp() });
    return ref.id;
  } catch (e: any) {
    lastOrderError = e && e.code ? String(e.code) : String((e && e.message) || e);
    console.error('addOrderRecord failed:', e);
    return null;
  }
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
    const res = sortNewestFirst(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    console.log('[RBS] loadAgentOrders agent=', JSON.stringify(agentName), '→', res.length, 'orders');
    return res;
  } catch (e) {
    console.error('loadAgentOrders failed:', e);
    return [];
  }
}

export async function loadAllOrders(): Promise<any[]> {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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
    await setDoc(doc(db, 'orders', orderId), { ...sanitizeForFirestore(fields), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) { console.error('updateOrder failed:', e); }
}

// ---------- Real-time order notifications (agent/manager) ----------
export function subscribeAgentOrders(agentName: string, cb: (orders: any[]) => void): () => void {
  try {
    const qq = query(collection(db, 'orders'), where('agent', '==', agentName));
    return onSnapshot(qq, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), (e) => console.error('subscribeAgentOrders error:', e));
  } catch (e) {
    console.error('subscribeAgentOrders failed:', e);
    return () => {};
  }
}

export function subscribeAllOrders(cb: (orders: any[]) => void): () => void {
  try {
    const qq = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(qq, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => {});
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

export async function loadAllQuotes(): Promise<any[]> {
  try {
    const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'), limit(200));
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

export async function updateQuote(quoteId: string, fields: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(db, 'quotes', quoteId), { ...sanitizeForFirestore(fields), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) { console.error('updateQuote failed:', e); }
}

export async function deleteQuote(quoteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'quotes', quoteId));
  } catch (e) { console.error('deleteQuote failed:', e); }
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
