import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const actionModalHTML = `
      {actionConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#004387] p-4 text-white text-lg font-bold text-center">
              {actionConfirm === 'whatsapp' ? 'שליחת הזמנה ב-WhatsApp' : 'שליחת הזמנה ב-Email'}
            </div>
            <div className="p-6 text-center text-gray-700 font-medium">
              לאחר השליחה מומלץ לאפס את העגלה כדי למנוע בלבול בהזמנות הבאות.
            </div>
            <div className="p-4 flex flex-col gap-2 bg-gray-50">
              <button onClick={() => executeSendAction(true)} className="w-full py-2.5 bg-[#004387] hover:bg-[#0c2d57] text-white font-bold rounded-lg transition-colors">
                שלח ונקה עגלה
              </button>
              <button onClick={() => executeSendAction(false)} className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition-colors">
                שלח בלי לנקות
              </button>
              <button onClick={() => setActionConfirm(null)} className="w-full py-2.5 mt-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  "    if (orderPlaced) {\n      return (\n        <div className=\"bg-white rounded-none shadow-sm border border-gray-100 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-10\">",
  "    if (orderPlaced) {\n      return (\n        <div className=\"bg-white rounded-none shadow-sm border border-gray-100 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-10\">\n" + actionModalHTML
);

fs.writeFileSync('src/App.tsx', content);
