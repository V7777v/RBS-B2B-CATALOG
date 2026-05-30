import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle2, ChevronDown, Search, Loader2, Landmark, HelpCircle, RefreshCw, AlertCircle, Edit, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  theme: {
    bg: string;
    text: string;
    border: string;
    accent: string;
    hover: string;
  };
}

interface CityItem {
  cleanName: string;
  rawName: string;
}

interface StreetItem {
  cleanName: string;
  rawName: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  theme
}) => {
  // Mode toggle for ultimate safety (in case they want custom names not in governmental registry)
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(value || '');

  // Step state values
  const [selectedCity, setSelectedCity] = useState<CityItem | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<StreetItem | null>(null);
  const [houseNumber, setHouseNumber] = useState('');

  // Buffer search terms
  const [cityQuery, setCityQuery] = useState('');
  const [streetQuery, setStreetQuery] = useState('');

  // Dropdown options
  const [citySuggestions, setCitySuggestions] = useState<CityItem[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<StreetItem[]>([]);

  // Loading flags
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [isStreetLoading, setIsStreetLoading] = useState(false);

  // Focus and visual active states
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isStreetDropdownOpen, setIsStreetDropdownOpen] = useState(false);

  // Refs for tracking clicks outside specific search boxes
  const cityBoxRef = useRef<HTMLDivElement>(null);
  const streetBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Synchronize composite address whenever parts change
  useEffect(() => {
    if (isManualMode) {
      onChange(manualAddress);
    } else {
      if (selectedCity) {
        const parts = [];
        if (selectedStreet) {
          parts.push(selectedStreet.cleanName);
          if (houseNumber) {
            parts.push(houseNumber);
          }
        }
        parts.push(selectedCity.cleanName);
        onChange(parts.join(', '));
      } else {
        onChange('');
      }
    }
  }, [selectedCity, selectedStreet, houseNumber, isManualMode, manualAddress]);

  // Click outside listener to dismiss dropdown screens
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (cityBoxRef.current && !cityBoxRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
      if (streetBoxRef.current && !streetBoxRef.current.contains(e.target as Node)) {
        setIsStreetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // --- CITY SEARCH WORKFLOW ---
  const handleCityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCityQuery(val);
    setSelectedCity(null);
    setSelectedStreet(null);
    setStreetQuery('');
    setHouseNumber('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length < 2) {
      setCitySuggestions([]);
      setIsCityDropdownOpen(false);
      return;
    }

    setIsCityLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      // Query the official Israel Government dataset for cities
      const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&q=${encodeURIComponent(val)}&limit=15`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setIsCityLoading(false);
          if (data.success && data.result?.records) {
            const mapped: CityItem[] = data.result.records.map((r: any) => ({
              cleanName: r['שם_ישוב'].trim(),
              rawName: r['שם_ישוב'] // retain raw for exact backend street filter
            }));

            // Filter out exact duplicate display names
            const unique = mapped.filter((v, i, self) => 
              self.findIndex(t => t.cleanName === v.cleanName) === i
            );

            setCitySuggestions(unique);
            setIsCityDropdownOpen(unique.length > 0);
          }
        })
        .catch(err => {
          setIsCityLoading(false);
          console.error('Failed to load cities from official database:', err);
        });
    }, 350);
  };

  const handleSelectCity = (cityItem: CityItem) => {
    setSelectedCity(cityItem);
    setCityQuery(cityItem.cleanName);
    setIsCityDropdownOpen(false);
    setCitySuggestions([]);
    
    // Auto focus street if applicable
    setTimeout(() => {
      const streetInput = document.getElementById('street-search-input');
      if (streetInput) streetInput.focus();
    }, 150);
  };

  // --- STREET SEARCH WORKFLOW ---
  const handleStreetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStreetQuery(val);
    setSelectedStreet(null);
    setHouseNumber('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length < 2 || !selectedCity) {
      setStreetSuggestions([]);
      setIsStreetDropdownOpen(false);
      return;
    }

    setIsStreetLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      // Query the official Israel Government database for streets under selected city
      const filterObj = { "שם_ישוב": selectedCity.rawName };
      const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&filters=${encodeURIComponent(JSON.stringify(filterObj))}&q=${encodeURIComponent(val)}&limit=15`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setIsStreetLoading(false);
          if (data.success && data.result?.records) {
            const mapped: StreetItem[] = data.result.records.map((r: any) => ({
              cleanName: r['שם_רחוב'].trim(),
              rawName: r['שם_רחוב']
            }));

            const unique = mapped.filter((v, i, self) => 
              self.findIndex(t => t.cleanName === v.cleanName) === i
            );

            setStreetSuggestions(unique);
            setIsStreetDropdownOpen(unique.length > 0);
          }
        })
        .catch(err => {
          setIsStreetLoading(false);
          console.error('Failed to load streets from official database:', err);
        });
    }, 350);
  };

  const handleSelectStreet = (streetItem: StreetItem) => {
    setSelectedStreet(streetItem);
    setStreetQuery(streetItem.cleanName);
    setIsStreetDropdownOpen(false);
    setStreetSuggestions([]);

    // Focus house number input
    setTimeout(() => {
      const numInput = document.getElementById('house-number-input');
      if (numInput) numInput.focus();
    }, 150);
  };

  // Quick reset to start city selection anew
  const handleReset = () => {
    setSelectedCity(null);
    setSelectedStreet(null);
    setHouseNumber('');
    setCityQuery('');
    setStreetQuery('');
    setCitySuggestions([]);
    setStreetSuggestions([]);
  };

  return (
    <div className="w-full text-right" dir="rtl">
      
      {/* Header controls for choosing mode */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-[13px] font-extrabold text-[#0c2d57] flex items-center gap-1.5">
          <Map size={14} className="text-[#004387]" />
          <span>כתובת אספקה למשלוח:</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setIsManualMode(!isManualMode);
            handleReset();
          }}
          className="text-xs font-bold text-[#004387] hover:underline flex items-center gap-1 cursor-pointer bg-none border-none p-0"
        >
          {isManualMode ? (
            <>
              <RefreshCw size={12} />
              <span>עבור לחיפוש רשמי מונחה</span>
            </>
          ) : (
            <>
              <Edit size={12} />
              <span>הקלד כתובת חופשית (ידנית)</span>
            </>
          )}
        </button>
      </div>

      {isManualMode ? (
        /* MANUAL INPUT SCREEN */
        <motion.div 
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex flex-col gap-1.5"
        >
          <input
            type="text"
            placeholder="הקלד כתובת מלאה כאן (למשל: הרצל 15, כפר יונה)"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            className="w-full px-3.5 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm font-semibold text-[#0c2d57] placeholder-gray-400"
          />
          <p className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 border-r-2 border-amber-500 font-medium">
            הזנת כתובת חופשית מופעלת. אנא ודא שהרחוב ומספר הבית מדויקים לצורך מסירה תקינה.
          </p>
        </motion.div>
      ) : (
        /* GOVERNMENT HIERARCHICAL INTEGRATED SEARCH SCREEN */
        <div className="w-full flex flex-col gap-3.5">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            
            {/* Step 1: City Look-Up */}
            <div className="md:col-span-5 relative" ref={cityBoxRef}>
              <span className="block text-[11px] font-extrabold text-gray-500 mb-1">א. ישוב / עיר:</span>
              
              {selectedCity ? (
                // Success selected UI for city
                <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 px-3 py-3 text-sm text-[#0c2d57] font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{selectedCity.cleanName}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleReset}
                    className="text-xs text-red-500 hover:underline font-bold bg-transparent border-none cursor-pointer pr-2"
                  >
                    שנה
                  </button>
                </div>
              ) : (
                // Interactive Input UI for city
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="הקלד שם ישוב (למשל: כפר יונה, חולון)"
                    value={cityQuery}
                    onChange={handleCityInput}
                    onFocus={() => { if (citySuggestions.length > 0) setIsCityDropdownOpen(true); }}
                    className="w-full pl-9 pr-3.5 py-3 border border-gray-200 bg-white rounded-none focus:ring-2 focus:ring-[#004387] outline-none text-sm font-semibold transition-all text-[#0c2d57]"
                  />
                  <div className="absolute left-3 text-gray-400">
                    {isCityLoading ? <Loader2 className="animate-spin text-blue-600" size={16} /> : <Search size={15} />}
                  </div>

                  {/* Dropdown list of city recommendations */}
                  <AnimatePresence>
                    {isCityDropdownOpen && citySuggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100"
                      >
                        {citySuggestions.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectCity(item)}
                            className="w-full px-4 py-2.5 text-right text-xs sm:text-sm font-bold text-gray-700 hover:bg-[#004387]/5 hover:text-[#004387] flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
                          >
                            <Landmark size={13} className="text-gray-400" />
                            <span>{item.cleanName}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Step 2: Street Look-Up */}
            <div className="md:col-span-5 relative" ref={streetBoxRef}>
              <span className="block text-[11px] font-extrabold text-gray-400 mb-1">
                ב. רחוב: {!selectedCity && <span className="text-amber-600 font-bold">(בחר עיר תחילה)</span>}
              </span>

              {selectedStreet ? (
                // Success selected UI for street
                <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 px-3 py-3 text-sm text-[#0c2d57] font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{selectedStreet.cleanName}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedStreet(null);
                      setStreetQuery('');
                      setHouseNumber('');
                    }}
                    className="text-xs text-red-500 hover:underline font-bold bg-transparent border-none cursor-pointer pr-2"
                  >
                    שנה רחוב
                  </button>
                </div>
              ) : (
                // Input street search box
                <div className="relative flex items-center">
                  <input
                    id="street-search-input"
                    type="text"
                    placeholder={selectedCity ? "הקלד שם רחוב..." : "נא לבחור עיר תחילה"}
                    value={streetQuery}
                    onChange={handleStreetInput}
                    disabled={!selectedCity}
                    onFocus={() => { if (streetSuggestions.length > 0) setIsStreetDropdownOpen(true); }}
                    className={`w-full pl-9 pr-3.5 py-3 border rounded-none outline-none text-sm transition-all text-[#0c2d57] ${
                      !selectedCity 
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed font-medium' 
                        : 'border-gray-200 focus:ring-2 focus:ring-[#004387] bg-white font-bold'
                    }`}
                  />
                  <div className="absolute left-3 text-gray-400">
                    {isStreetLoading ? <Loader2 className="animate-spin text-blue-600" size={16} /> : <Search size={15} />}
                  </div>

                  {/* Dropdown list of street recommendations under the selected city */}
                  <AnimatePresence>
                    {isStreetDropdownOpen && streetSuggestions.length > 0 && selectedCity && (
                      <motion.div 
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100"
                      >
                        {streetSuggestions.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectStreet(item)}
                            className="w-full px-4 py-2.5 text-right text-xs sm:text-sm font-bold text-gray-700 hover:bg-[#004387]/5 hover:text-[#004387] flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
                          >
                            <MapPin size={13} className="text-gray-400" />
                            <span>{item.cleanName}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Step 3: House Number (Free fill as requested) */}
            <div className="md:col-span-2">
              <span className="block text-[11px] font-extrabold text-gray-400 mb-1">ג. מספר בית:</span>
              <input
                id="house-number-input"
                type="text"
                placeholder="---"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                disabled={!selectedStreet}
                className={`w-full px-2 py-3 border rounded-none outline-none text-sm transition-all text-center font-extrabold ${
                  !selectedStreet 
                    ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-200 focus:ring-2 focus:ring-[#004387] bg-white text-[#0c2d57]'
                }`}
              />
            </div>

          </div>

          {/* Helper feedback cards if no street found or guidance status */}
          <AnimatePresence>
            {selectedCity && !selectedStreet && streetQuery.trim().length > 2 && !isStreetLoading && streetSuggestions.length === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-amber-50/70 border border-amber-200 p-3 flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-bold text-amber-800">הרחוב לא נמצא במאגר הרשמי של עיריית {selectedCity.cleanName}</span>
                  <p className="text-gray-600">
                    האם מדובר ברחוב חדש או שכונה חדשה? אתה יכול לעבור למצב 
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsManualMode(true);
                        setManualAddress(`${streetQuery}, ${selectedCity.cleanName}`);
                      }} 
                      className="text-[#004387] hover:underline font-extrabold mx-1 bg-transparent border-none p-0 cursor-pointer"
                    >
                      הקלדה חופשית ידנית
                    </button> 
                    כדי להשלים את ההזמנה ללא הגבלה.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clean state confirmation card */}
          {selectedCity && (
            <div className="bg-gray-50/80 border border-gray-200/60 p-3 sm:p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#004387]/15 flex items-center justify-center text-[#004387]">
                  <MapPin size={15} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest leading-none mb-1">כתובת למשלוח שתירשם בהזמנה</span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#0c2d57]">
                    {selectedStreet ? `${selectedStreet.cleanName} ` : ''}
                    {selectedStreet && houseNumber ? `מספר ${houseNumber}, ` : ''}
                    {selectedCity.cleanName}
                  </span>
                </div>
              </div>
              <div>
                {selectedStreet && houseNumber ? (
                  <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-extrabold px-2 py-1 border border-emerald-200">כתובת מושלמת</span>
                ) : selectedStreet ? (
                  <span className="bg-amber-100/80 text-amber-800 text-[10px] font-extrabold px-2 py-1 border border-amber-200 animate-pulse">נא להזין מספר בית</span>
                ) : (
                  <span className="bg-blue-100/80 text-blue-800 text-[10px] font-extrabold px-2 py-1 border border-blue-200">נא לבחור רחוב בהמשך</span>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
