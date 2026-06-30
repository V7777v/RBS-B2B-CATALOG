import React from 'react';

// ====================================================================
// QuoteDocument — single source of truth for a quote.
// Same PDF-style layout everywhere: agent edit, customer view, signing, saved.
// mode='edit'  → agent can change qty / price / discount, sees secret margin.
// mode='view'  → read-only clean document (customer / preview / signed / print).
// Print/PDF: parent calls window.print(); agent-only blocks carry .qd-agent-only
//            which is hidden via @media print and in view mode.
// ====================================================================

const VAT = 1.18; // Israeli VAT 18%
const RBS_LOGO = 'https://rbs-telecom.com/wp-content/uploads/2021/01/LOGO-RBS_FINAL.png';

export type QuoteLine = {
  id?: string; name?: string; sku?: string; qty?: number;
  listPrice?: number; wholesalePrice?: number; quotedPrice?: number; costPrice?: number;
  discountPercent?: number; promoBuy?: number; promoFree?: number; promoText?: string;
  isAutoGift?: boolean; isCustom?: boolean;
};

export type QuoteDocData = {
  id?: string; agentName?: string; customerCompany?: string; customerEmail?: string;
  customerPhone?: string; items?: QuoteLine[]; note?: string; createdAt?: any; signature?: string; signerName?: string;
};

type Props = {
  data: QuoteDocData;
  mode?: 'edit' | 'view';
  onLineChange?: (idx: number, field: keyof QuoteLine, value: any) => void;
  onRemoveLine?: (idx: number) => void;
  onPromoChange?: (idx: number, text: string) => void;
};

const ils = (n: number) => '₪' + Math.round(n || 0).toLocaleString('he-IL');

export function computeLine(line: QuoteLine) {
  const qty = Number(line.qty) || 0;
  const price = Number(line.quotedPrice) || 0;
  const cost = Number(line.costPrice) || 0;
  const buy = Number(line.promoBuy) || 0;
  const free = Number(line.promoFree) || 0;
  const freeQty = buy > 0 && free > 0 ? Math.floor(qty / buy) * free : 0;
  const suppliedQty = qty + freeQty;            // units the customer receives
  const lineCharged = qty * price;              // what customer pays
  const effectiveUnit = suppliedQty > 0 ? lineCharged / suppliedQty : price;
  const promoDiscount = suppliedQty > 0 ? Math.round((freeQty / suppliedQty) * 100) : 0; // 10+2 → 17%
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0; // (price-cost)/price
  return { qty, price, freeQty, suppliedQty, lineCharged, effectiveUnit, promoDiscount, margin };
}

const QuoteDocument: React.FC<Props> = ({ data, mode = 'view', onLineChange, onRemoveLine, onPromoChange }) => {
  const edit = mode === 'edit';
  const items = data.items || [];
  let subtotal = 0; let totalCost = 0;
  items.forEach((l) => { const c = computeLine(l); subtotal += c.lineCharged; totalCost += (Number(l.costPrice) || 0) * c.qty; });
  const vatAmount = subtotal * (VAT - 1);
  const grandTotal = subtotal * VAT;
  const totalMargin = subtotal > 0 ? Math.round(((subtotal - totalCost) / subtotal) * 100) : 0;
  const dateStr = (() => { try { const d = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()); return d.toLocaleDateString('he-IL'); } catch { return new Date().toLocaleDateString('he-IL'); } })();
  const quoteNo = (data.id || '').slice(-6).toUpperCase() || '—';

  const cellInput = (idx: number, field: keyof QuoteLine, value: any, cls = '') => (
    <input
      type="number" min={0} value={value}
      onChange={(e) => onLineChange && onLineChange(idx, field, Math.max(0, parseFloat(e.target.value) || 0))}
      aria-label={String(field)}
      className={'w-20 border border-gray-300 rounded-md p-1.5 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#004387] ' + cls}
    />
  );

  return (
    <div dir="rtl" className="qd-root bg-white text-gray-900 mx-auto" style={{ maxWidth: 800 }}>
      <style>{`
        @media print {
          .qd-agent-only { display: none !important; }
          .qd-no-print { display: none !important; }
          body * { visibility: hidden; }
          .qd-root, .qd-root * { visibility: visible; }
          .qd-root { position: absolute; inset: 0; margin: 0; max-width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-[#004387] pb-4 mb-4">
        <div>
          <img src={RBS_LOGO} alt="רבס טלקום" style={{ height: 46 }} />
          <div className="text-[11px] text-gray-500 mt-1">רבס טלקום בע״מ · ח.פ 514373679</div>
          <div className="text-[11px] text-gray-500">נתניה, לנטוס טום 10 · 077-2045522</div>
        </div>
        <div className="text-left">
          <div className="text-xl font-extrabold text-[#0c2d57]">הצעת מחיר</div>
          <div className="text-sm text-gray-600 mt-1">מס׳ <span className="font-bold font-mono">{quoteNo}</span></div>
          <div className="text-sm text-gray-600">תאריך: {dateStr}</div>
        </div>
      </div>

      {/* Customer */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-[11px] font-bold text-gray-400 mb-1">לכבוד</div>
          <div className="font-bold text-[#0c2d57]">{data.customerCompany || '—'}</div>
          {data.customerEmail && <div className="text-gray-500 text-xs">{data.customerEmail}</div>}
          {data.customerPhone && <div className="text-gray-500 text-xs">{data.customerPhone}</div>}
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-[11px] font-bold text-gray-400 mb-1">נציג מכירות</div>
          <div className="font-bold text-[#0c2d57]">{data.agentName || '—'}</div>
        </div>
      </div>

      {/* Items */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-[#004387] text-white text-xs">
              <th className="p-2 font-bold w-8 text-center">#</th>
              <th className="p-2 font-bold">מוצר</th>
              <th className="p-2 font-bold w-16 text-center">כמות</th>
              <th className="p-2 font-bold w-24 text-center">מחיר ליחידה</th>
              <th className="p-2 font-bold w-24 text-center">סה״כ</th>
              {edit && <th className="p-2 font-bold w-16 text-center qd-agent-only">רווח</th>}
              {edit && <th className="p-2 w-8 qd-agent-only qd-no-print"></th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((line, idx) => {
              const c = computeLine(line);
              const hasPromo = c.freeQty > 0;
              return (
                <tr key={line.id || idx} className="border-b border-gray-100 align-top">
                  <td className="p-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                  <td className="p-2">
                    <div className="font-bold text-[#0c2d57]">{line.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">מק״ט: {line.sku || '—'}{line.isAutoGift && <span className="text-emerald-700 bg-emerald-50 px-1 rounded mr-1 font-sans font-bold">מתנה</span>}</div>
                    {hasPromo && (
                      <div className="mt-1 inline-block text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">
                        🎁 מבצע {line.promoBuy}+{line.promoFree} · אספקה {c.suppliedQty} יח׳ · <strong>{ils(c.effectiveUnit)}/יח׳</strong> · חיסכון {c.promoDiscount}%
                      </div>
                    )}
                    {!hasPromo && line.promoText && <div className="mt-1 text-[11px] text-emerald-700">🎁 {line.promoText}</div>}
                    {edit && (
                      <div className="qd-agent-only qd-no-print mt-1 flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 font-bold">מבצע</span>
                        <input type="text" placeholder="10+2 / 10%" value={line.promoText || ''}
                          onChange={(e) => onPromoChange && onPromoChange(idx, e.target.value)} aria-label="מבצע"
                          className="w-24 border border-emerald-200 bg-emerald-50/50 rounded px-1 py-0.5 text-center text-[10px] font-bold text-emerald-800" />
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {edit && !line.isAutoGift ? cellInput(idx, 'qty', line.qty, 'w-14') : <span className="font-bold font-mono">{c.qty}</span>}
                  </td>
                  <td className="p-2 text-center">
                    {edit && !line.isAutoGift ? cellInput(idx, 'quotedPrice', line.quotedPrice, 'w-24 border-amber-300 bg-amber-50') : <span className="font-mono font-bold">{ils(c.price)}</span>}
                  </td>
                  <td className="p-2 text-center font-extrabold font-mono text-[#004387]">{ils(c.lineCharged)}</td>
                  {edit && (
                    <td className="p-2 text-center qd-agent-only">
                      <span className={'font-bold text-xs px-1.5 py-0.5 rounded ' + (c.margin < 0 ? 'text-red-600 bg-red-50' : c.margin >= 35 ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50')}>{c.margin}%</span>
                    </td>
                  )}
                  {edit && (
                    <td className="p-2 text-center qd-agent-only qd-no-print">
                      <button onClick={() => onRemoveLine && onRemoveLine(idx)} disabled={line.isAutoGift} aria-label="הסר שורה" className="text-red-500 hover:text-red-700 disabled:opacity-20 bg-transparent border-none cursor-pointer">✕</button>
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={edit ? 7 : 5} className="p-6 text-center text-gray-400 text-sm">אין פריטים בהצעה</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mt-4">
        <div className="w-64 text-sm">
          <div className="flex justify-between py-1 text-gray-600"><span>סכום ביניים</span><span className="font-mono font-bold">{ils(subtotal)}</span></div>
          <div className="flex justify-between py-1 text-gray-600"><span>מע״מ (18%)</span><span className="font-mono font-bold">{ils(vatAmount)}</span></div>
          <div className="flex justify-between py-2 mt-1 border-t-2 border-[#004387] text-[#0c2d57] font-extrabold text-base"><span>סה״כ לתשלום</span><span className="font-mono">{ils(grandTotal)}</span></div>
          {edit && <div className="qd-agent-only flex justify-between py-1 mt-1 text-xs text-gray-400"><span>רווחיות כוללת</span><span className="font-bold">{totalMargin}%</span></div>}
        </div>
      </div>

      {/* Note */}
      {data.note && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
          <div className="font-bold text-gray-400 mb-1">הערות ותנאים</div>
          {data.note}
        </div>
      )}

      {/* Signature */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-end justify-between">
        <div className="text-[11px] text-gray-400 max-w-[55%] leading-relaxed">
          הצעת מחיר זו אינה מהווה התחייבות לאספקה עד לאישור סופי. המחירים בתוקף בכפוף לזמינות מלאי.
        </div>
        <div className="text-center">
          <div className="text-[11px] font-bold text-gray-400 mb-1">חתימת הלקוח</div>
          {data.signature
            ? <img src={data.signature} alt="חתימה" className="h-16 w-44 object-contain border border-gray-200 rounded bg-white" />
            : <div className="h-16 w-44 border-b-2 border-gray-300" />}
          {data.signerName && <div className="text-xs text-gray-600 mt-1">{data.signerName}</div>}
        </div>
      </div>
    </div>
  );
};

export default QuoteDocument;
