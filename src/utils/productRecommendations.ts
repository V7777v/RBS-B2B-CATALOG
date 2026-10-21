export interface RecommendedItem {
  product: any;
  badge: string;
  isComplementary: boolean;
}

/**
 * Smart Complementary & Compatible Recommendations Engine for RBS B2B Catalog.
 * Prioritizes true complementary accessories (e.g. thermostat & fan for metal enclosures,
 * matching CAT5e/CAT6/CAT6A/CAT7 keystones/connectors/tools for network cables,
 * BNC connectors for RG59/RG6 coax, brackets for magnetic locks, etc.)
 * before falling back to same-subcategory alternatives.
 */
export function getSmartProductRecommendations(
  selectedProduct: any,
  catalogData: any[],
  maxCount: number = 8
): RecommendedItem[] {
  if (!selectedProduct || !Array.isArray(catalogData) || catalogData.length === 0) {
    return [];
  }

  const activeCatalog = catalogData.filter(
    (p) =>
      p &&
      p.active !== "FALSE" &&
      p.active !== false &&
      p.id !== selectedProduct.id &&
      p.sku !== selectedProduct.sku &&
      p.name !== "קטגוריית אם" &&
      p.name !== "מוצר הדגמה"
  );

  const sku = String(selectedProduct.sku || "").trim().toUpperCase();
  const name = String(selectedProduct.name || "").trim();
  const desc = String(selectedProduct.description || "").trim();
  const cat = String(selectedProduct.category || "").trim();
  const sub = String(selectedProduct.subcategory || "").trim();
  const nested = String(
    selectedProduct.nestedSubcategory || selectedProduct["Nested subcategory"] || ""
  ).trim();
  const fullText = `${sku} ${name} ${desc} ${cat} ${sub} ${nested}`.toLowerCase();

  const results: RecommendedItem[] = [];
  const addedIds = new Set<string>();

  const addBySku = (targetSku: string, badge: string, isComplementary = true) => {
    const cleanTarget = targetSku.trim().toUpperCase();
    const found = activeCatalog.find(
      (p) => String(p.sku || "").trim().toUpperCase() === cleanTarget
    );
    if (found && !addedIds.has(found.id || found.sku)) {
      addedIds.add(found.id || found.sku);
      results.push({ product: found, badge, isComplementary });
    }
  };

  const addByFilter = (
    predicate: (p: any) => boolean,
    badge: string,
    limit: number = 3,
    isComplementary = true
  ) => {
    let count = 0;
    for (const p of activeCatalog) {
      if (count >= limit) break;
      const key = p.id || p.sku;
      if (addedIds.has(key)) continue;
      if (predicate(p)) {
        addedIds.add(key);
        results.push({ product: p, badge, isComplementary });
        count++;
      }
    }
  };

  // ============================================================================
  // 1. OUTDOOR METAL & POLYESTER ENCLOSURES (ארונות מתכת / פוליאסטר חיצוניים ואביזרים)
  // ============================================================================
  const isOutdoorCabinetOrAcc =
    nested.includes("מתכת חיצוני") ||
    nested.includes("פוליאסטר חיצוני") ||
    sku === "55403020" ||
    sku === "55504020" ||
    sku === "66403020" ||
    sku === "66604023" ||
    sku === "66806030" ||
    sku === "22332" ||
    sku === "22331" ||
    (sub.includes("ארונות") && (name.includes("מתכת") || name.includes("פוליאסטר") || name.includes("IP66")));

  if (isOutdoorCabinetOrAcc) {
    if (sku === "22332" || sku === "22331") {
      // User is viewing the Thermostat (22332) or 8x8 Fan (22331)
      if (sku === "22332") {
        addBySku("22331", "מאוורר תואם לבקר");
        addBySku("2233", "מאוורר 220V תואם");
      } else {
        addBySku("22332", "בקר טמפרטורה תואם למאוורר");
      }
      // Recommend the outdoor metal & polyester cabinets this accessory fits
      addBySku("55403020", "ארון מתכת חיצוני מתאים");
      addBySku("55504020", "ארון מתכת חיצוני מתאים");
      addBySku("66403020", "ארון פוליאסטר חיצוני מתאים");
      addBySku("66604023", "ארון פוליאסטר חיצוני מתאים");
      addBySku("66806030", "ארון פוליאסטר חיצוני מתאים");
    } else {
      // User is viewing an Outdoor Metal or Polyester Cabinet -> Recommend Thermostat & Fan FIRST!
      addBySku("22332", "בקר טמפרטורה מומלץ לארון");
      addBySku("22331", "מאוורר תואם לארון");
      addBySku("2233", "מאוורר 220V לארון");
      // Also recommend outdoor/industrial switches & power supplies often mounted inside outdoor cabinets
      addBySku("DS-3T0506HP-E_HS", "מתג תעשייתי מוקשח לארון חוץ");
      addBySku("823510", "ספק כוח מזווד להתקנה בארון");
      addBySku("2136", "ספק כוח 12V");
      // Then other sizes of the same outdoor cabinet family
      addByFilter(
        (p) => {
          const pNested = String(p.nestedSubcategory || p["Nested subcategory"] || "").trim();
          return pNested === nested && p.sku !== "22332" && p.sku !== "22331";
        },
        "מידה נוספת באותה סדרה",
        2,
        false
      );
    }
  }

  // ============================================================================
  // 2. NETWORK LAN CABLE ROLLS (כבלי רשת LAN גלילים + כבלי רשת HIKVISION)
  // ============================================================================
  const isLanCableRoll =
    sub === "כבלי רשת LAN גלילים" ||
    (sub === "כבלים ואביזרים" && name.includes("כבל רשת"));

  if (isLanCableRoll && results.length === 0) {
    const isCat7 = /cat\s*7/i.test(fullText);
    const isCat6A = /cat\s*6\s*a/i.test(fullText);
    const isCat6 = !isCat6A && /cat\s*6/i.test(fullText);
    const isCat5e = /cat\s*5/i.test(fullText);
    const isShielded = /\b(ftp|sftp|s\/ftp|f\/utp|מסוכך)\b/i.test(fullText) && !/לא מסוכך/i.test(fullText);

    if (isCat7 || isCat6A) {
      // Keystones matching CAT7 / CAT6A
      addBySku("221318", "שקע קיסטון מסוכך CAT6A תואם");
      addBySku("2213NG", "שקע קיסטון מסוכך CAT6A תואם");
      addBySku("221315", "שקע קיסטון CAT6A תואם 3M");
      addBySku("221321", "שקע קיסטון מסוכך CAT8/CAT7");
      // RJ45 Connectors & Field Plugs matching CAT7 / CAT6A
      addBySku("2075", "קונקטור RJ45 מסוכך תואם CAT7");
      addBySku("221319", "קונקטור זכר מסוכך ללא לחיצה");
      addBySku("1176", "כיסוי הגנה לקונקטור CAT7");
      // Couplers & Patch Panels matching CAT6A/CAT7
      addBySku("101080", "מופה מסוככת CAT6A ללא לוחץ");
      addBySku("2513", "פאץ' פאנל 24 פורט CAT6A מסוכך");
      // Matching Crimping & Punch Tools
      addBySku("407129", "לוחץ פטנט תואם למחברי CAT7");
      addBySku("2131", "נועץ קרונה לקיסטונים");
    } else if (isCat6) {
      // Connectors matching CAT6 (Shielded FTP vs Unshielded UTP)
      if (isShielded) {
        addBySku("2184", "קונקטור CAT6 מסוכך FTP תואם");
        addBySku("101778", "קונקטור CAT6 מסוכך חוטים יוצאים");
      } else {
        addBySku("2183", "קונקטור CAT6 UTP תואם");
        addBySku("101777", "קונקטור CAT6 UTP חוטים יוצאים");
      }
      // Keystones matching CAT6
      addBySku("2213NG", "שקע קיסטון מסוכך תואם");
      addBySku("221318", "שקע קיסטון מסוכך + תריס אבק");
      addBySku("221319", "מחבר קיסטון זכר CAT6 ללא לחיצה");
      addBySku("108937", "שקע רשת גויס תואם");
      // Boot cover, Coupler, Patch panel & Tools
      addBySku("1028", "כיסוי הגנה לקונקטור CAT6");
      addBySku("101670", "מופה נקבה-נקבה FTP CAT6");
      addBySku("2236", "פאץ' פאנל 12 פורט CAT6 מסוכך");
      addBySku("101332", "לוחץ למחברי רשת חוטים יוצאים");
      addBySku("2131", "נועץ קרונה לשקעים וקיסטונים");
    } else if (isCat5e) {
      // Connectors matching CAT5e (Shielded FTP vs Unshielded UTP)
      if (isShielded) {
        addBySku("2132", "קונקטור CAT5e מסוכך FTP תואם");
        addBySku("101886", "קונקטור CAT5e מסוכך חוטים יוצאים");
      } else {
        addBySku("373650", "קונקטור CAT5e UTP תואם");
        addBySku("101776", "קונקטור CAT5e UTP חוטים יוצאים");
      }
      // Keystones & Sockets matching CAT5e
      addBySku("2025", "שקע קיסטון מסוכך CAT5e תואם");
      addBySku("108937", "שקע רשת גויס תואם");
      addBySku("583071823", "שקע תקשורת מעל הטיח");
      // Boot cover & Tools
      addBySku("1028", "כיסוי הגנה לקונקטור CAT5e");
      addBySku("101332", "לוחץ מחברי רשת חוטים יוצאים");
      addBySku("204345", "לוחץ מחברי רשת CAT5/CAT6");
      addBySku("2131", "נועץ קרונה לשקעים");
    }
  }

  // ============================================================================
  // 3. KEYSTONES, RJ45 PLUGS & NETWORK SOCKETS (שקעי רשת, תקעים ואביזרים)
  // ============================================================================
  if (sub === "שקעי רשת, תקעים ואביזרים" && results.length === 0) {
    const isKeystone = name.includes("קיסטון") || name.toLowerCase().includes("keyston");
    const isPlug = name.includes("תקע") || name.includes("קונקטור");
    const isWallBoxOrAdapter =
      name.includes("מתאם גויס") ||
      name.includes("מארז") ||
      name.includes("בסיס לשקע");

    if (isKeystone) {
      // Recommend wall adapters, surface boxes, empty patch panels, punch tool, and matching cable
      addBySku("1138", "מתאם גויס תואם לקיסטון");
      addBySku("104001", "מארז יחיד בזווית 45° לקיסטון");
      addBySku("104002", "מארז כפול בזווית 45° לקיסטון");
      addBySku("103001", "מארז כיסוי יחיד לשקע רשת");
      addBySku("2512", "פאץ' פאנל 24 פורט תואם קיסטונים");
      addBySku("2131", "נועץ קרונה לחיבור הקיסטון");
      if (/cat\s*5/i.test(name)) {
        addBySku("2191", "כבל רשת CAT5e תואם");
      } else if (/cat\s*7|cat\s*8/i.test(name)) {
        addBySku("101010", "כבל רשת CAT7 SFTP תואם");
      } else {
        addBySku("201910FY", "כבל רשת CAT6 נחושת תואם");
        addBySku("101010", "כבל רשת CAT7 SFTP תואם");
      }
    } else if (isPlug) {
      const isCat7Plug = /cat\s*7/i.test(name);
      const isPassThrough = name.includes("חוטים יוצאים");
      if (isCat7Plug) {
        addBySku("1176", "כיסוי הגנה תואם לקונקטור CAT7");
        addBySku("407129", "לוחץ פטנט תואם למחבר CAT7");
        addBySku("407201", "לוחץ מחברים CAT5e/6/7");
        addBySku("101010", "כבל רשת CAT7 תואם");
      } else {
        addBySku("1028", "כיסוי הגנה תואם לקונקטור");
        if (isPassThrough) {
          addBySku("101332", "לוחץ ייעודי למחבר חוטים יוצאים");
        }
        addBySku("204345", "לוחץ מחברי רשת CAT5/CAT6");
        addBySku("407201", "לוחץ מקצועי CAT5e/6/7");
        if (/cat\s*5/i.test(name)) {
          addBySku("2191", "כבל רשת CAT5e תואם");
        } else {
          addBySku("201910FY", "כבל רשת CAT6 תואם");
        }
      }
      addBySku("2064", "בודק כבלי רשת וטלפון");
    } else if (isWallBoxOrAdapter) {
      addBySku("221318", "שקע קיסטון CAT6A מתאים למארז");
      addBySku("2213NG", "שקע קיסטון מסוכך מתאים");
      addBySku("2025", "שקע קיסטון CAT5e מתאים");
      addBySku("221330", "שקע קיסטון אופטי מתאים");
      addBySku("2099", "בסיס הגבהה מעל הטיח");
      addBySku("113800", "מתאם דמי גויס להשלמה");
      addBySku("2028", "קופסה גויס 3 מקום");
    }
  }

  // ============================================================================
  // 4. COAX CABLES & CONNECTORS (כבלי קואקס ומחברי BNC / F-TYPE)
  // ============================================================================
  if (sub === "כבלי קואקס" && results.length === 0) {
    const isCable = name.includes("כבל") || name.includes("גליל");
    const isRg6 = /rg[\s-]*6\b/i.test(fullText);
    const isRg59 = /rg[\s-]*59\b/i.test(fullText) || !isRg6;

    if (isCable) {
      if (isRg6) {
        addBySku("1041", "מחבר BNC 3 חלקים תואם לכבל RG6");
        addBySku("373638", "מחבר קואקס RG6 אינג'יניום");
        addBySku("1018", "מתאם F-TYPE ל-BNC");
        addBySku("2171", "מתאם F-TYPE ל-IEC 90°");
      } else {
        addBySku("104777", "מחבר BNC בסיבוב תואם לכבל RG59");
        addBySku("1175", "מחבר BNC בהברגה תואם לכבל RG59");
        addBySku("2185", "מחבר BNC 3 חלקים תואם לכבל RG59");
        addBySku("373637", "מחבר קואקס RG59 אינג'יניום");
        addBySku("393651", "מחבר RG59 ל-RCA בלחיצה");
      }
      if (name.includes("DC") || name.includes("מצלמות")) {
        addBySku("2031", "שקע DC עם חוטים למצלמות");
        addBySku("823510", "ספק כוח מזווד למצלמות 8 יציאות");
        addBySku("8235", "ספק כוח מזווד למצלמות 9 יציאות");
      }
      addBySku("111013", "מגלף כבל קואקס RG59/RG6");
      addBySku("205800", "לוחץ מקצועי למחברי BNC");
      addBySku("2074", "לוחץ למחברי קואקס RG59/6");
    } else {
      // Viewing a Coax Connector -> recommend matching Coax cable & tools
      if (isRg6) {
        addBySku("102650", "כבל קואקס RG6 תואם (305 מ')");
        addBySku("373630", "כבל קואקס RG6 תואם (100 מ')");
      } else if (isRg59) {
        addBySku("1026", "כבל מצלמות RG59+DC תואם (100 מ')");
        addBySku("114040", "כבל מצלמות RG59+DC תואם (305 מ')");
      }
      addBySku("111013", "מגלף כבל קואקס RG59/RG6");
      addBySku("205800", "לוחץ למחברי קואקס 3 חלקים");
      addBySku("2074", "לוחץ למחברי RG59/RG6");
    }
  }

  // ============================================================================
  // 5. TELEPHONY CABLES & ACCESSORIES (טלפוניה ואביזרים)
  // ============================================================================
  if (sub === "טלפוניה ואביזרים" && results.length === 0) {
    const isTelCable = name.includes("כבל טלפוניה");
    if (isTelCable) {
      addBySku("108936", "שקע טלפוניה בריטי גויס");
      addBySku("333103", "שקע טלפוניה יחיד מעל הטיח");
      addBySku("333104", "שקע טלפוניה כפול מתחת הטיח");
      addBySku("103900003000", "מחבר טלפוניה RJ11 תואם");
      addBySku("222821", "פאטצ' פאנל טלפוניה 25 פורטים");
      addBySku("2131", "נועץ קרונה לחיבור שקעים ופאנל");
      addBySku("700490115", "לוחץ מחברי טלפון RJ11/RJ12");
      addBySku("143104", "טלפון בדיקה לטכנאי TCT-1900");
    } else {
      addBySku("14141102", "כבל טלפוניה 2 זוג 100 מ' נחושת");
      addBySku("14141101", "כבל טלפוניה 2 זוג 200 מ'");
      addBySku("2131", "נועץ קרונה לשקעי טלפוניה");
      addBySku("700490115", "לוחץ מחברי טלפון RJ11/RJ12");
      addBySku("143104", "טלפון בדיקה לטכנאי");
      addBySku("101011", "צלצלן לזיהוי כבלים");
    }
  }

  // ============================================================================
  // 6. 19" SERVER / NETWORK CABINETS & RACK ACCESSORIES (ארונות תקשורת 19 אינץ')
  // ============================================================================
  if (
    sub === "ארונות תקשורת ואביזרים" &&
    !isOutdoorCabinetOrAcc &&
    results.length === 0
  ) {
    const isCabinet =
      nested.includes("דלת מחוררת") ||
      nested.includes("דלת זכוכית") ||
      (/ארון תקשורת/i.test(name) && !name.includes("מאוורר") && !name.includes("מדף") && !name.includes("תאורת"));

    if (isCabinet) {
      // Recommend top rack accessories (PDU, Brush panel, Patch panel, Cage nuts, Fan, LED light, UPS)
      addBySku("806121111", "פס 6 שקעים 19 אינץ' לארון");
      addBySku("812131111", "פס 12 שקעים לארון תקשורת");
      addBySku("8214", "פאנל שערות 1U לסידור כבלים");
      addBySku("2513", "פאץ' פאנל 24 פורט CAT6A לארון");
      addBySku("2233", "מאוורר 220V לארון תקשורת");
      addBySku("831010", "תאורת לד מגנטית לארון עם חיישן");
      addBySku("8224", "מארז 50 אום כלוב וברגים לארון");
      addBySku("111014", "כלי לחילוץ אום כלובים");
    } else if (nested.includes("פסי שקעים") || name.includes("פס ") && name.includes("שקעים")) {
      // Viewing a PDU -> Recommend C13/C14 power cords, UPS, and rack accessories
      addBySku("14200001", "כבל מתח קומקום 1.5 מ' נחושת");
      addBySku("14200002", "כבל מאריך קומקום C14-C13");
      addBySku("8224", "אום כלוב וברגים להרכבה בארון");
      addBySku("DS-UPS01K24-R/TJS(O-STD)/EU/IEC", "אל-פסק Online 1KVA לארון");
    } else {
      // Viewing a rack shelf / fan / accessory -> Recommend cage nuts, extraction tool, PDU, brush panel
      addBySku("8224", "אום כלוב וברגים להרכבה בארון");
      addBySku("13454511", "סט 4 אום כלוב עם בורג");
      addBySku("111014", "כלי לחילוץ אום כלובים");
      addBySku("806121111", "פס 6 שקעים 19 אינץ' לארון");
      addBySku("8214", "פאנל שערות 1U לארון");
      addBySku("831010", "תאורת לד לארון תקשורת");
    }
  }

  // ============================================================================
  // 7. ACCESS CONTROL & MAGNETIC LOCKS (בקרות כניסה וקודנים)
  // ============================================================================
  if (sub === "בקרות כניסה וקודנים" && results.length === 0) {
    const isKeypad = name.includes("קודן");
    const isMagLock = name.includes("מנעול מגנטי");
    const is280 = name.includes("280");
    const is350 = name.includes("350");
    const is500 = name.includes("500");

    if (isKeypad) {
      addBySku("942100", "צ'יפ קרבה מקודד תואם לקודן");
      addBySku("942127", "מגן גשם תואם לקודן");
      addBySku("942128W", "מנעול מגנטי 350KG עמיד למים");
      addBySku("942118", "מנעול חשמלי ספרדי לדלת");
      addBySku("942125", "כפתור יציאה טאצ' מואר");
      addBySku("942102", "כפתור יציאה על הטיח");
      addBySku("2053", "ספק כוח 12V/3A להזנת הקודן");
      addBySku("2317", "כבל פיקוד 4 גידים להתקנה");
    } else if (isMagLock) {
      if (is280) {
        addBySku("942117", "סט סוגרים ZL-Bracket תואם ל-280KG");
        addBySku("942116", "סוגר U-Bracket תואם ל-280KG");
        addBySku("942131", "אמבטיה תואמת למנעול 280KG");
      } else if (is500) {
        addBySku("942123", "סט סוגרים ZL-Bracket תואם ל-500KG");
        addBySku("942133", "אמבטיה תואמת למנעול 500KG");
      } else if (is350) {
        addBySku("942105", "סט סוגרים ZL-Bracket תואם ל-350KG");
        addBySku("942104", "סוגר U-Bracket תואם ל-350KG");
        addBySku("942132", "אמבטיה תואמת למנעול 350KG");
      }
      addBySku("942110", "קודן חיצוני מוגן מים IP68");
      addBySku("942125", "כפתור יציאה טאצ'");
      addBySku("942115", "לחצן חירום ירוק לשחרור דלת");
      addBySku("2053", "ספק כוח 12V/3A");
    } else {
      // Viewing an accessory (bracket, exit button, tag) -> Recommend keypads & locks
      addBySku("942110", "קודן חיצוני IP68 תואם");
      addBySku("942119", "קודן צר IP65 תואם");
      addBySku("942128W", "מנעול מגנטי 350KG");
      addBySku("2317", "כבל פיקוד 4 גידים");
    }
  }

  // ============================================================================
  // 8. FIBER OPTICS CATALOG (מחירון אופטיקה 2026)
  // ============================================================================
  if (cat.includes("אופטיקה") && results.length === 0) {
    const isLc = /\blc\b/i.test(fullText);
    const isSc = /\bsc\b/i.test(fullText);
    const isApc = /\bapc\b/i.test(fullText);

    if (sub === "סיבים אופטיים תוף מחבר מהיר") {
      if (name.includes("קונקטור")) {
        addBySku("526379", "תוף סיב אופטי FTTH 500 מ' תואם");
        addBySku("915002", "גליל סיב אופטי דרופ 500 מ' תואם");
      } else {
        addBySku("88233P", "קונקטור מהיר LC/APC תואם לסיב");
        addBySku("88234P", "קונקטור מהיר SC/APC תואם לסיב");
      }
      addBySku("404871", "קליבר K5 לחיתוך סיבים אופטיים");
      addBySku("510626", "כלי לחשיפת סיב Riser Slitting");
      addBySku("510380", "עט לייזר VFL לאיתור תקלות בסיב");
      addBySku("510381", "בקבוק אלכוהול לניקוי סיבים");
      addBySku("510622", "נייר אורז KIMTECH לניקוי סיבים");
      addBySku("131549", "שקע אופטי גוויס LC-APC");
    } else if (sub === "ארונות וארונות הסתעפות") {
      addBySku("942003", "מתאם לפאנל אופטי SC/UPC Duplex");
      addBySku("102053", "אדפטור זוגי LC/APC לפאנל");
      addBySku("941003", "מארז 12 פיגטיילים LC/APC");
      addBySku("941005", "מארז 12 פיגטיילים SC/APC");
      addBySku("92317702", "מגשר אופטי SC-UPC 1 מ'");
      addBySku("510380", "עט לייזר VFL לבדיקת סיבים");
    } else if (sub === "מגשרים אופטיים" || sub === "כבלים אופטיים מוכנים") {
      if (isLc && isApc) {
        addBySku("102053", "אדפטור זוגי LC/APC תואם למגשר");
        addBySku("131549", "שקע אופטי גוויס LC-APC תואם");
      } else if (isSc) {
        addBySku("942001", "מתאם SC/UPC סימפלקס תואם");
        addBySku("942003", "מתאם SC/UPC דופלקס תואם");
        addBySku("221330", "שקע קיסטון אופטי SC תואם");
      } else {
        addBySku("942004", "מתאם LC/UPC לפאנל אופטי");
      }
      addBySku("OP3420D", "מודול ג'יביק SFP 1.25G לחיבור המגשר");
      addBySku("102331", "ממיר אופטי ל-RJ45 (Media Converter)");
      addBySku("932002", "פאנל אופטי 24 פורט נשלף");
      addBySku("510380", "עט לייזר אופטית לבדיקת המגשר");
    } else if (sub === "מיני ג'יביקים" || sub === "ממירים אופטיים") {
      if (sku === "OP5420D-34") {
        addBySku("OP5420D-43", "ג'יביק BiDi נגדי חובה (Rx1490/Tx1550)");
      } else if (sku === "OP5420D-43") {
        addBySku("OP5420D-34", "ג'יביק BiDi נגדי חובה (Tx1310/Rx1550)");
      } else if (sku === "OP5403D-35") {
        addBySku("OP5403D-53", "ג'יביק BiDi נגדי חובה (Tx1550/Rx1310)");
      } else if (sku === "OP5403D-53") {
        addBySku("OP5403D-35", "ג'יביק BiDi נגדי חובה (Tx1310/Rx1550)");
      }
      addBySku("102331", "ממיר אופטי Media Converter תואם SFP");
      addBySku("701122", "מתג גיגה אופטי 8 פורט SFP");
      addBySku("92319902", "מגשר אופטי LC-UPC דופלקס 1 מ'");
      addBySku("91318802", "מגשר אופטי LC-APC סימפלקס 1 מ'");
    }
  }

  // ============================================================================
  // 9. POLMAN SOUND & PA CABLES (מחירון סאונד Polman וכבלי רמקולים)
  // ============================================================================
  if (cat.includes("Polman") && results.length === 0) {
    if (sub.includes("רמקולים")) {
      // Viewing Speakers -> Recommend Amplifiers, Speaker Cables, Connectors, Subwoofer
      addBySku("AV270", "מגבר 2 אזורים מומלץ לרמקולים");
      addBySku("AV470", "מגבר 4 אזורים עד 8 רמקולים");
      addBySku("AMU-120BT", "מגבר בלוטוס תואם");
      if (name.includes("שנאי קו") || name.includes("70-100V")) {
        addBySku("TPA-180B", "מגבר כריזה תואם 70-100V");
      }
      addBySku("HXFL20120WS", "כבל רמקולים 2X1 מ״מ (גליל 50 מ')");
      addBySku("1102", "כבל רמקולים וכריזה (200 מ')");
      addBySku("55022", "סאב וופר מוגבר 12 אינץ' להשלמת הבאס");
    } else if (sub === "מגברים") {
      // Viewing Amplifier -> Recommend Speakers, Audio Interconnects, Mixers, Speaker Cable
      addBySku("Sonova-651", "רמקול שקוע 6.5 אינץ' מומלץ למגבר");
      addBySku("Helion-525B", "רמקול חיצוני מוגן מים תואם");
      addBySku("Smart-625", "רמקול שקוע 6.5 אינץ' 170W");
      addBySku("55004", "כבל אודיו PL 3.5 ל-2xRCA לחיבור למגבר");
      addBySku("HXFL20120WS", "כבל רמקולים 50 מ'");
      addBySku("AB4", "מיקסר 4 ערוצים לחיבור למגבר");
    } else if (sub === "סאב וופר") {
      addBySku("55025", "קרוסאובר אלקטרוני תואם לסאב וופר");
      addBySku("XL600", "מגבר כוח מתאים להנעת סאב פאסיבי");
      addBySku("55004", "כבל אודיו לחיבור סאב");
      addBySku("Sonova-651", "רמקול שקוע 6.5 אינץ'");
    }
  }

  if (sub === "כבלי פיקוד, רמקולים וכריזה" && results.length === 0) {
    if (name.includes("כריזה") || name.includes("רמקול")) {
      addBySku("Sonova-651", "רמקול שקוע תואם לכבל");
      addBySku("Helion-525B", "רמקול חיצוני תואם לכבל");
      addBySku("TPA-180B", "מגבר כריזה POLMAN");
      addBySku("AV270", "מגבר רמקולים POLMAN");
    } else {
      // Command cable (כבל פיקוד)
      addBySku("942110", "קודן חיצוני לחיבור בכבל פיקוד");
      addBySku("942128W", "מנעול מגנטי לדלת");
      addBySku("823510", "ספק כוח מזווד");
      addBySku("101011", "צלצלן לזיהוי גידים בכבל");
    }
  }

  // ============================================================================
  // 10. VIDEO EXTENDERS & HDMI (מחירון הרחקות וידאו)
  // ============================================================================
  if (cat.includes("הרחקות וידאו") && results.length === 0) {
    if (sub.includes("KVM") || name.includes("מרחיק")) {
      if (sku === "101430N") {
        addBySku("101430N-RX", "מקלט (RX) נוסף תואם למשדר זה");
      } else if (sku === "101430N-RX") {
        addBySku("101430N", "יחידת משדר+מקלט תואמת (200 מ')");
      }
      addBySku("2160", "כבל HDMI 4K 1.5 מ' לחיבור המרחיק");
      addBySku("2161", "כבל HDMI 4K 2 מ' לחיבור המרחיק");
      addBySku("201910FY", "כבל רשת CAT6 נחושת מלאה להרחקה יציבה");
      addBySku("101010", "כבל רשת CAT7 SFTP מומלץ להרחקות HDMI");
      addBySku("2184", "קונקטור CAT6 מסוכך FTP");
    } else if (sub.includes("מפצלי")) {
      addBySku("2160", "כבל HDMI 4K 1.5 מ' לחיבור למפצל");
      addBySku("2161", "כבל HDMI 4K 2 מ' לחיבור למפצל");
      addBySku("2162", "כבל HDMI 4K 3 מ'");
      addBySku("2163", "כבל HDMI 4K 5 מ'");
      addBySku("101433", "מרחיק HDMI 4K על גבי כבל רשת");
    } else if (sub === "כבלי HDMI") {
      addBySku("103210", "מופה מתאם HDMI נקבה-נקבה להארכה");
      addBySku("1035", "מתאם זווית 90° HDMI למסכים צמודי קיר");
      addBySku("1046", "מתאם זווית 90° שטוח ל-HDMI");
      addBySku("116113N", "מפצל מגביר HDMI 1:2 4K");
      addBySku("211800", "מפצל מגביר HDMI 1:4 4K");
      addBySku("101433", "מרחיק HDMI 4K על גבי רשת");
    }
  }

  // ============================================================================
  // 11. TOOLS & TESTERS (כלי עבודה וציוד בדיקה - כולל סטלבנד חשמלי)
  // ============================================================================
  if (sub === "כלי עבודה וציוד בדיקה" && results.length === 0) {
    if (sku === "134984" || sku === "134985" || sku === "134986") {
      // Electric Fish Tape & its battery/charger
      addBySku("134985", "סוללה נוספת 6000mAh תואמת לסטלבנד");
      addBySku("134986", "מטען תואם לסוללת סטלבנד חשמלי");
      addBySku("134984", "סטלבנד חשמלי 30 מטר CX8010");
    } else if (name.includes("לוחץ") || name.includes("קרונה")) {
      addBySku("2064", "בודק כבלי רשת וטלפון");
      addBySku("101778", "קונקטור CAT6 מסוכך חוטים יוצאים");
      addBySku("2184", "קונקטור CAT6 מסוכך FTP");
      addBySku("2075", "קונקטור CAT7 מסוכך");
      addBySku("221318", "שקע קיסטון מסוכך CAT6A");
    }
  }

  // ============================================================================
  // 12. SWITCHES, ROUTERS, ACCESS POINTS, UPS & CAMERAS (HIKVISION / EZVIZ / BOOSTLINK)
  // ============================================================================
  if (results.length === 0) {
    if (sku === "314100056" || sub.includes("שואבים")) {
      // EZVIZ Robot Vacuum
      addBySku("307700469", "סט אביזרים מתכלים לשואב רובוטי");
      addBySku("307700550", "סט אביזרים מקורי לשואב MAX");
    } else if (cat.includes("EZVIZ") && (sub.includes("מצלמות") || sub.includes("אינטרקומים"))) {
      if (sub.includes("POE")) {
        addBySku("370700002", "מערכת הקלטה NVR POE תואמת");
        addBySku("DS-3E1505P-EI", "מתג 4 פורט PoE גיגה להפעלת המצלמה");
        addBySku("DS-3E0502P-E", "אינג'קטור PoE גיגה");
      } else {
        addBySku("370700003", "מערכת הקלטה NVR אלחוטית תואמת");
        addBySku("DS-3WRE12C(O-STD)_EU", "מגדיל טווח WiFi לשיפור קליטת המצלמה");
        addBySku("2136", "ספק כוח 12V תואם");
      }
      addBySku("201910FY", "כבל רשת CAT6 להתקנה");
    } else if (sub.includes("מתגי") || sub.includes("מפצלי POE")) {
      addBySku("634103", "מגשר רשת CAT6A 1 מ' לחיבור למתג");
      addBySku("334103", "מגשר רשת CAT6 לחיבור למתג");
      if (fullText.includes("sfp") || fullText.includes("אופטי")) {
        addBySku("OP3420D", "מודול SFP 1.25G לפורט האופטי במתג");
      }
      addBySku("DS-3WAP521-SI", "נקודת גישה WiFi בחיבור PoE למתג");
      addBySku("DS-UPS1000(O-STD)EU", "אל-פסק 1000VA לגיבוי המתג");
      addBySku("2513", "פאץ' פאנל 24 פורט CAT6A");
    } else if (sub.includes("אקסס פוינטים") || sub.includes("לינקים אלחוטיים")) {
      addBySku("DS-3E0502P-E", "אינג'קטור PoE להזנת מתח");
      addBySku("DS-3E1505P-EI", "מתג PoE מנוהל ענן");
      addBySku("634103", "מגשר רשת CAT6A מסוכך");
      addBySku("201920", "כבל רשת חיצוני NYY CAT6");
    } else if (sub.includes("אל פסק")) {
      addBySku("14200002", "כבל מאריך קומקום C14-C13 לחיבור לאל-פסק");
      addBySku("812251112", "פס 12 שקעים קומקום C13 לחיבור ל-UPS");
      addBySku("806121111", "פס 6 שקעים ישראלי לארון");
    } else if (sub === "מגשרי רשת") {
      addBySku("2513", "פאץ' פאנל 24 פורט CAT6A");
      addBySku("8214", "פאנל שערות 1U לסידור המגשרים בארון");
      addBySku("101670", "מופה שקע רשת נקבה-נקבה");
      addBySku("DS-3E1508-EI-V2", "מתג רשת 8 פורט גיגה");
    } else if (sub === "ספקי כוח ומתח") {
      if (nested === "ספקים מזוודים") {
        addBySku("114301", "סוללת גיבוי 12V 7Ah תואמת לספק מזווד");
        addBySku("114302", "סוללת גיבוי 12V 4.5Ah תואמת");
        addBySku("14200001", "כבל מתח קומקום 220V להזנת הספק");
        addBySku("2031", "שקע DC עם חוטים");
      } else if (nested === "סוללות גיבוי") {
        addBySku("823530", "ספק מזווד עם טעינה לסוללת גיבוי");
        addBySku("823510", "ספק מזווד למצלמות 8 יציאות");
      } else {
        addBySku("2031", "שקע DC עם חוטים");
        addBySku("14200001", "כבל מתח קומקום 1.5 מ'");
      }
    }
  }

  // ============================================================================
  // FALLBACK: Fill remaining slots up to maxCount with closely related products
  // (preferring same nestedSubcategory first, then same subcategory)
  // ============================================================================
  if (results.length < maxCount) {
    if (nested) {
      addByFilter(
        (p) => {
          const pNested = String(
            p.nestedSubcategory || p["Nested subcategory"] || ""
          ).trim();
          return p.subcategory === sub && pNested === nested;
        },
        "מוצר מקביל באותה סדרה",
        maxCount - results.length,
        false
      );
    }
  }

  if (results.length < maxCount) {
    addByFilter(
      (p) => p.subcategory === sub,
      "מוצר נוסף בקטגוריה",
      maxCount - results.length,
      false
    );
  }

  return results.slice(0, maxCount);
}
