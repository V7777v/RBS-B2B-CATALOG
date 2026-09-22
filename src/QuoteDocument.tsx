import React from 'react';

// ====================================================================
// QuoteDocument — single source of truth for a quote.
// Same PDF-style layout everywhere: agent edit, customer view, signing, saved.
// mode='edit' → agent edits qty/price/promo, sees secret margin + wholesale ref.
// mode='view' → read-only clean document (customer / preview / signed / print).
// Promo model: a "10+2" line stays as a paid row (qty 10) + a separate gift row
// (qty 2 @ 0) created by reconcileGifts in App. This file computes the TRUE
// economics: effective unit price, true margin (free units cost money), and a
// clear order summary (list value → discounts → final → savings).
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
  onReplaceLine?: (idx: number) => void;
};

const ils = (n: number) => '₪' + Math.round(n || 0).toLocaleString('he-IL');

export function computeLine(line: QuoteLine) {
  const qty = Number(line.qty) || 0;
  const price = Number(line.quotedPrice) || 0;
  const cost = Number(line.costPrice) || 0;
  const listUnit = Number(line.listPrice) || 0;
  // reference = the customer's NORMAL price (wholesale); fallback to list, then price
  const refUnit = Number(line.wholesalePrice) || listUnit || price;
  const buy = Number(line.promoBuy) || 0;
  const free = Number(line.promoFree) || 0;
  const freeQty = buy > 0 && free > 0 ? Math.floor(qty / buy) * free : 0;
  const suppliedQty = qty + freeQty;                 // units the customer actually receives
  const lineCharged = qty * price;                   // what the customer pays for this row
  const effectiveUnit = suppliedQty > 0 ? lineCharged / suppliedQty : price; // real per-unit
  // TRUE margin: revenue minus cost of ALL supplied units (free units cost money)
  const margin = lineCharged > 0 ? Math.round(((lineCharged - suppliedQty * cost) / lineCharged) * 100) : 0;
  // special/manual discount vs the wholesale reference (shown so the customer sees it's special)
  const manualDiscount = (!line.isAutoGift && refUnit > 0 && price > 0 && price < refUnit)
    ? Math.round(((refUnit - price) / refUnit) * 100) : 0;
  return { qty, price, cost, refUnit, freeQty, suppliedQty, lineCharged, effectiveUnit, margin, manualDiscount };
}

const QuoteDocument: React.FC<Props> = ({ data, mode = 'view', onLineChange, onRemoveLine, onPromoChange, onReplaceLine }) => {
  const edit = mode === 'edit';
  const items = data.items || [];

  // ---- Order economics (single pass) ----
  let charged = 0;      // final price before VAT
  let refTotal = 0;     // list/wholesale value of all supplied units (no discounts)
  let totalCost = 0;    // agent: cost of all supplied units
  let totalUnits = 0;   // units delivered (incl. gifts)
  items.forEach((l) => {
    const c = computeLine(l);
    charged += c.lineCharged;
    totalCost += c.cost * c.qty;
    totalUnits += c.qty;
    // reference uses the PARENT line's supplied qty (incl. its free units); skip gift rows to avoid double count
    if (!l.isAutoGift) refTotal += c.suppliedQty * c.refUnit;
  });
  const savings = Math.max(0, Math.round(refTotal - charged));
  const savingsPct = refTotal > 0 ? Math.round((savings / refTotal) * 100) : 0;
  const hasDiscount = savings > 0 && refTotal > charged;
  const vatAmount = charged * (VAT - 1);
  const grandTotal = charged * VAT;
  const totalMargin = charged > 0 ? Math.round(((charged - totalCost) / charged) * 100) : 0;

  const dateStr = (() => { try { const d = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()); return d.toLocaleDateString('he-IL'); } catch { return new Date().toLocaleDateString('he-IL'); } })();
  const quoteNo = (data.id || '').slice(-6).toUpperCase() || '—';

  const cellInput = (idx: number, field: keyof QuoteLine, value: any, cls = '') => (
    <input
      type="number" min={0} value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onLineChange && onLineChange(idx, field, Math.max(0, parseFloat(e.target.value) || 0))}
      aria-label={String(field)}
      className={'border border-gray-300 rounded-md p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#004387] ' + cls}
    />
  );

  return (
    <div dir="rtl" className="qd-root bg-white text-gray-900 mx-auto" style={{ maxWidth: 800 }}>
      <style>{`
        @media print {
          .qd-agent-only { display: none !important; }
          .qd-no-print { display: none !important; }
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
              <th className="p-2 font-bold w-28 text-center">מחיר ליחידה</th>
              <th className="p-2 font-bold w-24 text-center">סה״כ</th>
              {edit && <th className="p-2 font-bold w-14 text-center qd-agent-only">רווח</th>}
              {edit && <th className="p-2 w-8 qd-agent-only qd-no-print"></th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((line, idx) => {
              const c = computeLine(line);
              const showEffective = c.freeQty > 0 && Math.round(c.effectiveUnit) !== Math.round(c.price);
              return (
                <tr key={line.id || idx} className={'border-b border-gray-100 align-top ' + (line.isAutoGift ? 'bg-emerald-50/40' : '')}>
                  <td className="p-2 text-center text-gray-400 font-mono">{line.isAutoGift ? '🎁' : idx + 1}</td>
                  <td className="p-2">
                    <div className="font-bold text-[#0c2d57]">{line.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">מק״ט: {line.sku || '—'}</div>
                    {/* badges (shown to customer too) */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {line.isAutoGift && <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 font-bold">🎁 מתנה — 0 ₪</span>}
                      {!line.isAutoGift && c.manualDiscount > 0 && <span className="text-[10px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 font-bold">מחיר מיוחד −{c.manualDiscount}% ממחירון</span>}
                      {!line.isAutoGift && c.freeQty > 0 && <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-bold">מבצע {line.promoBuy}+{line.promoFree} · +{c.freeQty} מתנה</span>}
                    </div>
                    {edit && !line.isAutoGift && (
                      <div className="qd-agent-only qd-no-print mt-1.5 flex items-center gap-1">
                        <span className="text-[9px] text-gray-400 font-bold">מבצע</span>
                        <input type="text" placeholder="10+2 / 10%" value={line.promoText || ''}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => onPromoChange && onPromoChange(idx, e.target.value)} aria-label="מבצע"
                          className="w-24 border border-emerald-200 bg-emerald-50/50 rounded px-1.5 py-1 text-center text-[11px] font-bold text-emerald-800" />
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {edit && !line.isAutoGift ? cellInput(idx, 'qty', line.qty, 'w-16') : <span className="font-bold font-mono">{c.qty}</span>}
                  </td>
                  <td className="p-2 text-center">
                    {edit && !line.isAutoGift
                      ? (<div className="flex flex-col items-center gap-0.5">
                          {cellInput(idx, 'quotedPrice', line.quotedPrice, 'w-24 border-amber-300 bg-amber-50')}
                          {line.wholesalePrice ? <span className="qd-agent-only text-[9px] text-blue-600 font-medium">בסיס מפיץ ₪{Number(line.wholesalePrice).toLocaleString('he-IL')}</span> : null}
                          {showEffective ? <span className="text-[9px] text-emerald-700 font-bold">בפועל ≈{ils(c.effectiveUnit)}/יח׳</span> : null}
                        </div>)
                      : (<div className="flex flex-col items-center">
                          <span className="font-mono font-bold">{ils(c.price)}</span>
                          {showEffective ? <span className="text-[9px] text-emerald-700 font-bold">בפועל ≈{ils(c.effectiveUnit)}/יח׳</span> : null}
                        </div>)}
                  </td>
                  <td className="p-2 text-center font-extrabold font-mono text-[#004387]">{ils(c.lineCharged)}</td>
                  {edit && (
                    <td className="p-2 text-center qd-agent-only">
                      {line.isAutoGift
                        ? <span className="text-gray-300 text-xs">—</span>
                        : <span className={'font-bold text-xs px-1.5 py-0.5 rounded ' + (c.margin < 0 ? 'text-red-600 bg-red-50' : c.margin >= 35 ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50')}>{c.margin}%</span>}
                    </td>
                  )}
                  {edit && (
                    <td className="p-2 text-center qd-agent-only qd-no-print">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onReplaceLine && onReplaceLine(idx)} disabled={line.isAutoGift} title="החלף מוצר" className="text-blue-500 hover:text-blue-700 disabled:opacity-20 bg-transparent border-none cursor-pointer text-xs flex items-center gap-0.5">
                          <span>🔄</span>
                          <span className="hidden sm:inline">החלף</span>
                        </button>
                        <button onClick={() => onRemoveLine && onRemoveLine(idx)} disabled={line.isAutoGift} aria-label="הסר שורה" className="text-red-500 hover:text-red-700 disabled:opacity-20 bg-transparent border-none cursor-pointer">✕</button>
                      </div>
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

      {/* Order summary — clear discounts/promos breakdown */}
      <div className="flex justify-end mt-4">
        <div className="w-72 text-sm">
          {hasDiscount && (
            <>
              <div className="flex justify-between py-1 text-gray-500"><span>מחיר מחירון ({totalUnits} יח׳)</span><span className="font-mono line-through">{ils(refTotal)}</span></div>
              <div className="flex justify-between py-1 text-emerald-700 font-bold"><span>הנחות ומבצעים</span><span className="font-mono">−{ils(savings)} ({savingsPct}%)</span></div>
              <div className="border-t border-gray-200 my-1"></div>
            </>
          )}
          <div className="flex justify-between py-1 text-gray-600"><span>סה״כ לפני מע״מ</span><span className="font-mono font-bold">{ils(charged)}</span></div>
          <div className="flex justify-between py-1 text-gray-600"><span>מע״מ (18%)</span><span className="font-mono font-bold">{ils(vatAmount)}</span></div>
          <div className="flex justify-between py-2 mt-1 border-t-2 border-[#004387] text-[#0c2d57] font-extrabold text-base"><span>סה״כ לתשלום</span><span className="font-mono">{ils(grandTotal)}</span></div>
          {hasDiscount && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 text-center text-emerald-800 font-bold text-sm">
              🎉 חסכת {ils(savings)} בהצעה זו!
            </div>
          )}
          {edit && <div className="qd-agent-only flex justify-between py-1 mt-2 text-xs text-gray-400 border-t border-dashed border-gray-200"><span>רווחיות כוללת (אמיתית)</span><span className="font-bold">{totalMargin}%</span></div>}
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
