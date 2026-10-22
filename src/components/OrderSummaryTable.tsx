import React, { useState } from 'react';
import { Plus, Minus, X, Box, Maximize2, Info } from 'lucide-react';

export interface OrderLine {
  sku: string;
  name: string;
  description?: string;
  image?: string;
  uSize: number;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  positions: string[];
  status: 'unplaced' | 'aux' | 'placed';
  enrichedItem?: any;
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
  onProductHover?: (item: any | null, e?: React.MouseEvent) => void;
  onProductClick?: (item: any) => void;
}

export const OrderSummaryTable: React.FC<OrderSummaryTableProps> = ({
  lines = [],
  totals,
  withPrice = true,
  readOnly = false,
  onIncrement,
  onDecrement,
  onRemove,
  onProductHover,
  onProductClick,
}) => {
  const [fallbackModalItem, setFallbackModalItem] = useState<any | null>(null);

  const getItemPreview = (line: OrderLine) => {
    return line.enrichedItem || {
      sku: line.sku,
      name: line.name,
      description: line.description || '',
      image: line.image || '',
      uSize: line.uSize || 0,
      price: line.unitPrice || 0,
      quantity: line.qty || 1,
      zone: line.positions && line.positions.length > 0 && line.positions[0] !== 'לא שובץ' && line.positions[0] !== '0U'
        ? `מסילות U חזיתיות (${line.positions.join(', ')})`
        : (line.uSize === 0 ? 'שלד הארון (0U)' : 'לא שובץ במסד'),
      type: 'optional-accessory',
    };
  };

  const handleItemClick = (line: OrderLine) => {
    const item = getItemPreview(line);
    if (onProductClick) {
      onProductClick(item);
    } else {
      setFallbackModalItem(item);
    }
  };

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
      <div className="overflow-x-auto bg-white border border-[#b3d4f5]/80 shadow-xs print:shadow-none print:border-slate-300">
        <table className="w-full text-right border-collapse text-xs sm:text-sm" dir="rtl">
          <thead>
            <tr className="bg-[#f0f6fc] border-b border-[#b3d4f5] text-[#004387] font-bold text-xs print:bg-slate-100">
              <th className="py-2 px-2 text-center w-12 whitespace-nowrap">תמונה</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">פריט / מק"ט</th>
              <th className="py-2 px-2 text-center whitespace-nowrap">כמות</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">מיקום</th>
              {withPrice && <th className="py-2 px-2 text-right whitespace-nowrap">מחיר יח'</th>}
              {withPrice && <th className="py-2 px-2 text-right whitespace-nowrap">סה"כ</th>}
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
                  {/* תמונה של המוצר */}
                  <td className="py-1.5 px-1.5 text-center w-12">
                    <button
                      type="button"
                      className="relative w-10 h-10 mx-auto bg-white border border-slate-200 rounded-md overflow-hidden flex items-center justify-center p-1 shadow-2xs hover:border-[#004387] hover:ring-2 hover:ring-blue-100 hover:shadow-md transition-all cursor-pointer group/thumb"
                      title="הצבע לצפייה בפרטי מוצר או לחץ להגדלה"
                      aria-label={`פרטי מוצר עבור ${line.sku}`}
                      onMouseEnter={(e) => {
                        const item = getItemPreview(line);
                        onProductHover?.(item, e);
                      }}
                      onMouseMove={(e) => {
                        const item = getItemPreview(line);
                        onProductHover?.(item, e);
                      }}
                      onMouseLeave={() => {
                        onProductHover?.(null);
                      }}
                      onClick={() => handleItemClick(line)}
                    >
                      {line.image ? (
                        <img
                          src={line.image}
                          alt={line.sku}
                          className="w-full h-full object-contain filter drop-shadow-2xs group-hover/thumb:scale-110 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 group-hover/thumb:text-[#004387] transition-colors">
                          <Box size={16} />
                          <span className="text-[8px] font-mono leading-none mt-0.5">{line.uSize > 0 ? `${line.uSize}U` : '0U'}</span>
                        </div>
                      )}
                      
                      {/* Zoom indicator icon on hover */}
                      <span className="absolute inset-0 bg-[#004387]/15 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Maximize2 size={12} className="text-[#004387] bg-white/95 rounded-full p-0.5 shadow-xs" />
                      </span>
                    </button>
                  </td>

                  {/* שם מוצר + מק"ט */}
                  <td className="py-2 px-2 max-w-[140px] sm:max-w-[180px]">
                    <button
                      type="button"
                      className="text-right hover:text-[#004387] cursor-pointer transition-colors block w-full"
                      title={line.name ? `${line.name} (${line.sku})` : line.sku}
                      onMouseEnter={(e) => {
                        const item = getItemPreview(line);
                        onProductHover?.(item, e);
                      }}
                      onMouseMove={(e) => {
                        const item = getItemPreview(line);
                        onProductHover?.(item, e);
                      }}
                      onMouseLeave={() => {
                        onProductHover?.(null);
                      }}
                      onClick={() => handleItemClick(line)}
                    >
                      {line.name && (
                        <span className="block text-[11px] font-semibold text-slate-800 truncate leading-tight">
                          {line.name}
                        </span>
                      )}
                      <span className="font-mono font-bold text-[11px] text-[#004387] hover:underline inline-block" dir="ltr">
                        {line.sku}
                      </span>
                    </button>
                  </td>

                  {/* כמות */}
                  <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                    {readOnly ? (
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {line.qty}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1 sm:gap-0 bg-transparent sm:bg-slate-50 sm:border sm:border-slate-200 sm:rounded-none sm:overflow-hidden sm:h-7 w-fit mx-auto" dir="ltr">
                        <button
                          type="button"
                          title="הוסף 1"
                          onClick={() => onIncrement?.(line.sku)}
                          className="w-8 h-8 sm:w-auto sm:h-full sm:px-2 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded border border-slate-300 sm:border-0 sm:rounded-none sm:bg-transparent text-[#004387] transition-colors cursor-pointer shrink-0"
                          aria-label={`הוסף 1 עבור ${line.sku}`}
                        >
                          <Plus size={13} className="sm:w-3 sm:h-3" />
                        </button>
                        <span className="w-7 h-8 sm:w-7 sm:h-full flex items-center justify-center text-xs font-bold bg-white text-slate-800 font-mono border border-slate-200 rounded sm:border-0 sm:border-x sm:border-slate-200 sm:rounded-none shrink-0">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          title="הפחת 1"
                          onClick={() => onDecrement?.(line.sku)}
                          className="w-8 h-8 sm:w-auto sm:h-full sm:px-2 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded border border-slate-300 sm:border-0 sm:rounded-none sm:bg-transparent text-red-500 transition-colors cursor-pointer shrink-0"
                          aria-label={`הפחת 1 עבור ${line.sku}`}
                        >
                          <Minus size={13} className="sm:w-3 sm:h-3" />
                        </button>
                        <button
                          type="button"
                          title="הסר לחלוטין"
                          onClick={() => onRemove?.(line.sku)}
                          className="w-8 h-8 sm:w-auto sm:h-full sm:px-2 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded border border-rose-300 sm:border-0 sm:border-l sm:border-slate-200 sm:rounded-none sm:bg-transparent text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                          aria-label={`הסר לחלוטין עבור ${line.sku}`}
                        >
                          <X size={13} className="sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* מיקום */}
                  <td className="py-2 px-2 whitespace-nowrap">
                    {isUnplaced ? (
                      <span className="text-red-700 font-semibold text-[11px]">
                        לא שובץ
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded print:bg-slate-50">
                        {line.positions.join(', ')}
                      </span>
                    )}
                  </td>

                  {/* מחיר יח' */}
                  {withPrice && (
                    <td className="py-2 px-2 font-mono text-xs text-slate-700 whitespace-nowrap">
                      ₪{line.unitPrice.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </td>
                  )}

                  {/* סה"כ */}
                  {withPrice && (
                    <td className="py-2 px-2 font-mono text-xs font-bold text-[#004387] whitespace-nowrap">
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

      {/* Fallback inspection modal if onProductClick not provided */}
      {fallbackModalItem && (
        <div
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setFallbackModalItem(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#004387] text-white p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono text-blue-200">
                  מק"ט: {fallbackModalItem.sku} {fallbackModalItem.uSize > 0 ? `| ${fallbackModalItem.uSize}U` : ''}
                </div>
                <h3 className="font-bold text-base truncate mt-0.5">{fallbackModalItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setFallbackModalItem(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {fallbackModalItem.image && (
                <div className="w-full h-48 bg-slate-50 border border-slate-100 rounded flex items-center justify-center p-2">
                  <img
                    src={fallbackModalItem.image}
                    alt={fallbackModalItem.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {fallbackModalItem.description && (
                <p className="text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto">
                  {fallbackModalItem.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-mono">{fallbackModalItem.zone}</span>
                {fallbackModalItem.price > 0 && (
                  <span className="font-bold font-mono text-[#004387] text-sm">
                    ₪{fallbackModalItem.price.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSummaryTable;
