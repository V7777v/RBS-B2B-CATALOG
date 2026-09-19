import React from 'react';
import { Plus, Minus, X } from 'lucide-react';

export interface OrderLine {
  sku: string;
  name: string;
  uSize: number;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  positions: string[];
  status: 'unplaced' | 'aux' | 'placed';
}

export interface OrderTotals {
  accessoriesTotal: number;
  cabinetPrice: number;
  grandTotal: number;
  unplacedCount: number;
  extraCount: number;
}

export interface OrderSummaryTableProps {
  lines: OrderLine[];
  totals: OrderTotals;
  withPrice?: boolean;
  readOnly?: boolean;
  onIncrement?: (sku: string) => void;
  onDecrement?: (sku: string) => void;
  onRemove?: (sku: string) => void;
}

export const OrderSummaryTable: React.FC<OrderSummaryTableProps> = ({
  lines = [],
  totals,
  withPrice = true,
  readOnly = false,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  if (!lines || lines.length === 0) {
    return (
      <div>
        <div className="py-6 text-center text-gray-500 text-sm italic bg-white border border-[#b3d4f5]/60">
          טרם בחרתם אביזרים נוספים.
          {!readOnly && (
            <>
              <br />
              בחרו אביזרי הרחבה בהמשך או לחצו על תאים פנויים בארון משמאל!
            </>
          )}
        </div>
        {withPrice && totals && (
          <div className="mt-3 pt-2.5 border-t border-[#b3d4f5] text-xs sm:text-sm font-semibold text-[#004387]" dir="rtl">
            ארון ₪{totals.cabinetPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })} · אביזרים ₪{totals.accessoriesTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })} · סה"כ ₪{totals.grandTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto bg-white border border-[#b3d4f5]/80 shadow-sm print:shadow-none print:border-slate-300">
        <table className="w-full text-right border-collapse text-xs sm:text-sm" dir="rtl">
          <thead>
            <tr className="bg-[#f0f6fc] border-b border-[#b3d4f5] text-[#004387] font-bold text-xs print:bg-slate-100">
              <th className="py-2.5 px-3 text-right">מוצר</th>
              <th className="py-2.5 px-3 text-right">מק"ט</th>
              <th className="py-2.5 px-3 text-center">כמות</th>
              <th className="py-2.5 px-3 text-right">מיקום</th>
              {withPrice && <th className="py-2.5 px-3 text-right whitespace-nowrap">מחיר יח'</th>}
              {withPrice && <th className="py-2.5 px-3 text-right whitespace-nowrap">סה"כ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((line) => {
              const isUnplaced = line.status === 'unplaced';
              return (
                <tr
                  key={line.sku}
                  className={`border-b transition-colors ${
                    isUnplaced
                      ? 'bg-red-50 hover:bg-red-100/70 text-red-950 border-red-200 print:bg-red-50'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  {/* מוצר */}
                  <td className="py-2.5 px-3 font-medium text-slate-900 leading-tight">
                    {line.name}
                  </td>

                  {/* מק"ט */}
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap" dir="ltr">
                    {line.sku}
                  </td>

                  {/* כמות */}
                  <td className="py-2 px-3 text-center">
                    {readOnly ? (
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {line.qty}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-none overflow-hidden h-7 w-fit mx-auto" dir="ltr">
                        <button
                          type="button"
                          title="הוסף 1"
                          onClick={() => onIncrement?.(line.sku)}
                          className="px-2 hover:bg-slate-200 text-[#004387] transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <span className="w-7 flex items-center justify-center border-x border-slate-200 text-xs font-bold bg-white text-slate-800 font-mono">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          title="הפחת 1"
                          onClick={() => onDecrement?.(line.sku)}
                          className="px-2 hover:bg-slate-200 text-red-500 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          type="button"
                          title="הסר לחלוטין"
                          onClick={() => onRemove?.(line.sku)}
                          className="px-2 border-l border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* מיקום */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {isUnplaced ? (
                      <span className="text-red-700 font-semibold text-xs">
                        לא שובץ — אין מקום פנוי
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded print:bg-slate-50">
                        {line.positions.join(', ')}
                      </span>
                    )}
                  </td>

                  {/* מחיר יח' */}
                  {withPrice && (
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      ₪{line.unitPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* סה"כ */}
                  {withPrice && (
                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-[#004387] whitespace-nowrap">
                      ₪{line.lineTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary below table */}
      {withPrice && totals && (
        <div className="mt-3.5 pt-3 border-t border-[#b3d4f5] text-xs sm:text-sm font-semibold text-[#004387]" dir="rtl">
          <div>
            ארון ₪{totals.cabinetPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })} · אביזרים ₪{totals.accessoriesTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })} · סה"כ ₪{totals.grandTotal.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </div>
          {readOnly && (
            <div className="text-[11px] font-normal text-slate-500 mt-1">
              * מחיר מומלץ, לפני מע״מ
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderSummaryTable;
