import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `              <div className="fixed inset-0 z-50 flex md:hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setMobileMenuOpen(false)}
                ></div>
                <div className="relative w-4/5 max-w-sm bg-white h-full shadow-xl p-4 overflow-y-auto">
                  <button
                    className="absolute top-4 left-4 !p-2 !m-0 bg-[#f2f2f2] text-gray-600 hover:text-[#004387] border-none"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="סגור תפריט"
                  >
                    <X size={20} />
                  </button>
                  <h2
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (!isAdmin) return;
                      setAdminError("");
                      setSyncSuccessMsg("");
                      setShowAdminSyncModal(true);
                    }}
                    className="font-bold text-xl mb-6 mt-2 text-[#0c2d57] cursor-pointer select-none active:text-[#c2410c] transition-colors"
                  >
                    ניווט מהיר
                  </h2>
                  <ul className="space-y-4">`;

const replacement = `              <div className="fixed inset-0 z-50 flex md:hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setMobileMenuOpen(false)}
                ></div>
                <div className="relative w-4/5 max-w-sm bg-white h-full shadow-xl flex flex-col">
                  <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
                    <h2
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (!isAdmin) return;
                        setAdminError("");
                        setSyncSuccessMsg("");
                        setShowAdminSyncModal(true);
                      }}
                      className="font-bold text-xl text-[#0c2d57] cursor-pointer select-none active:text-[#c2410c] transition-colors"
                    >
                      ניווט מהיר
                    </h2>
                    <button
                      className="!p-2 !m-0 bg-[#f2f2f2] text-gray-600 hover:text-[#004387] border-none rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="סגור תפריט"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-4">`;

content = content.replace(target, replacement);

const targetEnd = `                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>`;
const replacementEnd = `                        </button>
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>
              </div>`;

content = content.replace(targetEnd, replacementEnd);
fs.writeFileSync('src/App.tsx', content);
