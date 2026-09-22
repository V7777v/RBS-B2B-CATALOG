import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const t1 = `                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100/50">
                            {/* Edit/View quote button */}
                            <button
                              onClick={() => openQuoteEditor(customerObj, q)}
                              className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg border-none cursor-pointer flex items-center justify-center gap-1"
                            >
                              <FileText size={12} /> {q.status === 'approved' ? 'צפה בהצעה' : 'ערוך הצעה ✍️'}
                            </button>

                            {/* Sign Quote (For sent status) */}`;

const r1 = `                          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-100/50">
                            {/* Edit/View quote button */}
                            <button
                              onClick={() => q.status === 'approved' ? setViewedQuote(q) : openQuoteEditor(customerObj, q)}
                              className={\`flex-1 py-1.5 font-bold text-[11px] rounded-lg border-none cursor-pointer flex items-center justify-center gap-1 \${q.status === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}\`}
                            >
                              <FileText size={12} /> {q.status === 'approved' ? 'צפה במסמך חתום / PDF' : 'ערוך הצעה ✍️'}
                            </button>

                            {/* Sign Quote (For sent status) */}`;

if (content.includes(t1)) {
  content = content.replace(t1, r1);
  fs.writeFileSync('src/App.tsx', content);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
