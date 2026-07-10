const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">הזן סיסמת מנהל:</label>
                    <input 
                      type="password" 
                      placeholder="הזן את סיסמת המנהל..." 
                      className="w-full bg-[#fdfdfd] border border-gray-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#004387] transition-all"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      name="admin_pwd_field"
                      autoComplete="current-password"
                    />

                    {/* Checkbox to remember password inside browser */}
                    <div className="flex items-center gap-2 mt-3 select-none">
                      <input 
                        type="checkbox" 
                        id="save-pwd-checkbox"
                        checked={saveAdminPassword}
                        onChange={(e) => setSaveAdminPassword(e.target.checked)}
                        className="w-3.5 h-3.5 border-gray-300 rounded text-[#004387] focus:ring-[#004387]"
                      />
                      <label htmlFor="save-pwd-checkbox" className="text-[11px] text-gray-500 font-medium cursor-pointer">
                        שמור סיסמה במכשיר לצורך סנכרון מהיר בעתיד
                      </label>
                    </div>
                  </div>
                )}`;

const replacement1 = `                ) : (
                  <div className="bg-blue-50/70 p-3 border border-blue-100 text-[11px] text-[#004387] leading-relaxed mb-1">
                    <p className="font-bold mb-1">מחובר כמנהל מערכת</p>
                    <p className="text-gray-500 font-normal">ההרשאה מזוהה אוטומטית מחשבון המנהל שלך — אין צורך בסיסמה. לחץ על הכפתור לסנכרון מיידי.</p>
                  </div>
                )}`;

const target2 = `                        <span>{isAdminAuth ? 'סנכרן כעת בזמן אמת' : 'אמת סיסמה וסנכרן'}</span>`;
const replacement2 = `                        <span>סנכרן כעת בזמן אמת</span>`;

if (content.includes(target1) && content.includes(target2)) {
    content = content.replace(target1, replacement1);
    content = content.replace(target2, replacement2);
    fs.writeFileSync('src/App.tsx', content, 'utf8');
    console.log("Successfully replaced both strings in src/App.tsx");
} else {
    if (!content.includes(target1)) console.error("Target 1 not found");
    if (!content.includes(target2)) console.error("Target 2 not found");
}
