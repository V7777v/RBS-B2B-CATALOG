export interface RecommendationResult {
  product: any;
  reason: string;
  score: number;
  group?: string;
}

const cleanStr = (val: any): string => String(val ?? "").trim();

const normalizeSku = (sku: any): string =>
  cleanStr(sku)
    .replace(/[\r\n\t]+/g, "")
    .toUpperCase();

interface MatrixCabSpec {
  u: number;
  width: number | null;
  depth: number | null;
  fans: string;
  wheels: string;
  feet: string;
  shelves: string;
  std: string[];
  hang: string[];
  slide: string[];
}

/**
 * Authoritative Cabinet Compatibility Matrix (synced with Google Sheet gid=250535112)
 */
const CABINET_MATRIX_SPECS: Record<string, MatrixCabSpec> = {
  "221221": { u: 4, width: 550, depth: 200, fans: "X", wheels: "X", feet: "X", shelves: "X", std: [], hang: [], slide: [] },
  "221213": { u: 4, width: 550, depth: 300, fans: "X", wheels: "X", feet: "X", shelves: "X", std: [], hang: ["150461"], slide: [] },
  "221243": { u: 4, width: 550, depth: 450, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150461"], slide: [] },
  "2212": { u: 6, width: 550, depth: 300, fans: "X", wheels: "X", feet: "X", shelves: "X", std: [], hang: ["150461"], slide: [] },
  "1121": { u: 6, width: 550, depth: 400, fans: "X", wheels: "X", feet: "X", shelves: "X", std: [], hang: ["150461", "150463"], slide: [] },
  "2181": { u: 6, width: 550, depth: 450, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150461", "150463"], slide: [] },
  "1122": { u: 6, width: 550, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "1062": { u: 10, width: 550, depth: 400, fans: "X", wheels: "X", feet: "X", shelves: "X", std: [], hang: ["150461", "150463"], slide: [] },
  "1113": { u: 10, width: 550, depth: 450, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150461", "150463"], slide: [] },
  "1153": { u: 10, width: 550, depth: 500, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150463", "150467"], slide: [] },
  "1133": { u: 10, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150463", "150467"], slide: [] },
  "114809": { u: 10, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "2180": { u: 12, width: 600, depth: 450, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150461", "150463"], slide: [] },
  "1178": { u: 12, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "2227": { u: 15, width: 600, depth: 500, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150463", "150467"], slide: [] },
  "1193": { u: 15, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "114807": { u: 15, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "2226": { u: 20, width: 600, depth: 500, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["1024"], hang: ["150463", "150467"], slide: [] },
  "2179": { u: 20, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "114804": { u: 20, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "217980": { u: 20, width: 600, depth: 800, fans: "2", wheels: "4", feet: "4", shelves: "0", std: ["2234"], hang: [], slide: ["117909"] },
  "1194": { u: 25, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "1195": { u: 25, width: 600, depth: 600, fans: "X", wheels: "X", feet: "X", shelves: "X", std: ["150460"], hang: ["150470", "150467"], slide: [] },
  "114803": { u: 25, width: 600, depth: 800, fans: "2", wheels: "4", feet: "4", shelves: "1", std: ["2234"], hang: [], slide: ["117909"] },
  "1174": { u: 32, width: 600, depth: 600, fans: "2", wheels: "4", feet: "4", shelves: "2", std: ["1152"], hang: ["150470"], slide: ["117911"] },
  "1274": { u: 32, width: 600, depth: 600, fans: "2", wheels: "4", feet: "4", shelves: "2", std: ["1152"], hang: ["150470"], slide: ["117911"] },
  "117480": { u: 32, width: 600, depth: 800, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["2234"], hang: [], slide: ["117909"] },
  "114802": { u: 32, width: 600, depth: 800, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["2234"], hang: [], slide: ["117909"] },
  "2178": { u: 42, width: 600, depth: 600, fans: "2", wheels: "4", feet: "4", shelves: "2", std: ["1152"], hang: ["150470"], slide: ["117911"] },
  "2177": { u: 42, width: 600, depth: 600, fans: "2", wheels: "4", feet: "4", shelves: "2", std: ["1152"], hang: ["150470"], slide: ["117911"] },
  "2068": { u: 42, width: 600, depth: 800, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["2234"], hang: [], slide: ["117909"] },
  "2066": { u: 42, width: 600, depth: 800, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["2234"], hang: [], slide: ["117909"] },
  "206810": { u: 42, width: 600, depth: 1000, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["117916"], hang: [], slide: ["117909"] },
  "TBH": { u: 44, width: 750, depth: 800, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["2234"], hang: [], slide: ["117909"] },
  "447510T": { u: 44, width: 750, depth: 1000, fans: "4", wheels: "4", feet: "4", shelves: "2", std: ["117916"], hang: [], slide: ["117909"] },
};

/**
 * Checks if a product is an actual cabinet enclosure (and not an accessory FOR a cabinet like "מאוורר לארון" or "מדף לארון")
 */
export function isActualCabinetProduct(product: any): boolean {
  const name = cleanStr(product?.name);
  if (
    /מאוורר|מאורר|בקר|מדף|פנל|גלגל|רגליות|אום|תאורת|מגירה|תעלה|תומכי|מסתיר|כלי|דלת|פס\s*\d+\s*שקעים/.test(
      name
    ) &&
    !/^ארון|^מסד/.test(name)
  ) {
    return false;
  }
  return /^ארון|\bארון\s+תקשורת|\bארון\s+פוליאסטר|\bארון\s+הסתעפות|\bמסד\b/.test(name);
}

/**
 * Detects the network category (CAT5E, CAT6, CAT6A, CAT7, CAT8) from a product's name, SKU, or subcategory.
 */
export function detectCatLevel(
  product: any
): "CAT5E" | "CAT6" | "CAT6A" | "CAT7" | "CAT8" | null {
  const text = `${product?.name || ""} ${product?.sku || ""} ${product?.subcategory || ""} ${product?.["Nested subcategory"] || ""} ${product?.nestedSubcategory || ""} ${product?.description || ""}`.toUpperCase();
  if (/CAT\s*8\b/.test(text)) return "CAT8";
  if (/CAT\s*7\b/.test(text)) return "CAT7";
  if (/CAT\s*6\s*A\b|CAT6A/.test(text)) return "CAT6A";
  if (/CAT\s*6\b/.test(text)) return "CAT6";
  if (/CAT\s*5\s*E?\b|CAT5/.test(text)) return "CAT5E";
  return null;
}

/**
 * Detects whether a cable/accessory is shielded (FTP/SFTP/STP) or unshielded (UTP).
 */
export function detectShielding(product: any): "FTP" | "UTP" | null {
  const text = `${product?.name || ""} ${product?.sku || ""} ${product?.description || ""}`.toUpperCase();
  if (/\bS?FTP\b|\bSTP\b|מסוכך/.test(text) && !/לא\s*מסוכך/.test(text)) return "FTP";
  if (/\bUTP\b|לא\s*מסוכך/.test(text)) return "UTP";
  return null;
}

/**
 * Detects coax type (RG59, RG6, RG174)
 */
export function detectCoaxType(product: any): "RG59" | "RG6" | "RG174" | null {
  const text = `${product?.name || ""} ${product?.sku || ""} ${product?.description || ""}`.toUpperCase();
  if (/RG[\s-]*59/.test(text)) return "RG59";
  if (/RG[\s-]*6\b/.test(text)) return "RG6";
  if (/RG[\s-]*174/.test(text)) return "RG174";
  return null;
}

/**
 * Extracts cabinet depth in mm (e.g. "600*600" -> 600, "450*550" -> 450)
 */
export function detectCabinetDepthMm(product: any): number | null {
  const sku = normalizeSku(product?.sku);
  if (CABINET_MATRIX_SPECS[sku]?.depth) {
    return CABINET_MATRIX_SPECS[sku].depth;
  }
  const text = `${product?.name || ""} ${product?.description || ""}`;
  const explicitDepth = text.match(/עומק[:\s]*(\d{2,4})/);
  if (explicitDepth) {
    const val = parseInt(explicitDepth[1], 10);
    return val < 120 ? val * 10 : val;
  }
  const dimMatch = text.match(/(\d{3,4})\s*[*xX×]\s*(\d{3,4})/);
  if (dimMatch) {
    const d1 = parseInt(dimMatch[1], 10);
    const d2 = parseInt(dimMatch[2], 10);
    if (d2 === 550 || d2 === 600) return d1;
    if (d1 === 550 || d1 === 600) return d2;
    return Math.min(d1, d2);
  }
  return null;
}

export function detectCabinetU(product: any): number | null {
  const sku = normalizeSku(product?.sku);
  if (CABINET_MATRIX_SPECS[sku]?.u) {
    return CABINET_MATRIX_SPECS[sku].u;
  }
  const text = `${product?.name || ""} ${product?.description || ""}`;
  const m = text.match(/\b(\d{1,2})\s*[uU]\b/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Smart recommendation engine that returns genuinely complementary & compatible accessories
 * (מוצרים נלווים ומשלימים) for any given product in the catalog.
 */
export function getSmartRecommendations(
  selectedProduct: any,
  catalogData: any[],
  maxResults = 8
): RecommendationResult[] {
  if (!selectedProduct || !Array.isArray(catalogData) || catalogData.length === 0) {
    return [];
  }

  const activeCatalog = catalogData.filter(
    (p) =>
      p &&
      p.id !== selectedProduct.id &&
      normalizeSku(p.sku) !== normalizeSku(selectedProduct.sku) &&
      p.active !== false &&
      p.active !== "FALSE" &&
      cleanStr(p.name).length > 0
  );

  const selectedSku = normalizeSku(selectedProduct.sku);
  const selectedName = cleanStr(selectedProduct.name);
  const selectedCat = cleanStr(selectedProduct.category);
  const selectedSub = cleanStr(selectedProduct.subcategory);
  const selectedNested = cleanStr(
    selectedProduct["Nested subcategory"] || selectedProduct.nestedSubcategory
  );

  const candidates = new Map<string, RecommendationResult>();

  const addCandidate = (p: any, score: number, reason: string, group?: string) => {
    if (!p || !p.id) return;
    const existing = candidates.get(p.id);
    if (!existing || existing.score < score) {
      candidates.set(p.id, { product: p, score, reason, group: group || reason });
    }
  };

  const findBySku = (
    skus: string[],
    baseScore: number,
    reason: string,
    group?: string,
    maxPerGroup = 99
  ) => {
    let count = 0;
    for (let i = 0; i < skus.length; i++) {
      if (count >= maxPerGroup) break;
      const target = normalizeSku(skus[i]);
      const found = activeCatalog.find((p) => normalizeSku(p.sku) === target);
      if (found) {
        addCandidate(found, baseScore - i * 0.2, reason, group || reason);
        count++;
      }
    }
  };

  // ============================================================================
  // CASE 1: ארונות תקשורת מתכת חיצוני & פוליאסטר חיצוני (Outdoor Metal & Polyester Cabinets)
  // Recommend ONLY equipment/accessories that physically go into and fit these outdoor cabinets
  // (No routers, no switches, no 19" shelves!)
  // ============================================================================
  const isOutdoorMetalSub =
    selectedNested.includes("מתכת חיצוני") ||
    selectedSub.includes("מתכת חיצוני") ||
    ["55403020", "55504020", "22331", "22332"].includes(selectedSku);

  const isOutdoorPolyesterSub =
    selectedNested.includes("פוליאסטר חיצוני") ||
    selectedSub.includes("פוליאסטר חיצוני") ||
    ["66403020", "66604023", "66806030"].includes(selectedSku);

  if (isOutdoorMetalSub || isOutdoorPolyesterSub) {
    const isCabinetItem = isActualCabinetProduct(selectedProduct);
    if (isCabinetItem) {
      // ONLY recommend the accessories that physically fit inside the outdoor cabinet:
      // 1. בקר טמפרטורה 220V (22332)
      // 2. מאוורר לארון תקשורת 8*8 סמ 220V + כבל חשמל (22331)
      findBySku(["22332"], 100, "בקר טמפרטורה 220V תואם לארון", "ctrl", 1);
      findBySku(["22331"], 99, "מאוורר 8×8 ס\"מ תואם לארון", "fan", 1);

      // Plus any other non-cabinet accessory explicitly placed in the same outdoor nested subcategory
      for (const p of activeCatalog) {
        const pNested = cleanStr(p["Nested subcategory"] || p.nestedSubcategory);
        if (pNested === selectedNested && !isActualCabinetProduct(p)) {
          addCandidate(p, 97, "אביזר תואם לארון", "outdoor_acc");
        }
      }

      // Return directly without generic fallback so 19" shelves or routers are never added!
      return Array.from(candidates.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    } else {
      // User is viewing the temperature controller (22332) or 8x8 fan (22331) ->
      // Recommend the complementary accessory + the outdoor metal & polyester cabinets it fits!
      findBySku(["22332", "22331"], 100, "אביזר משלים לבקרת אוורור בארון", "acc_pair", 2);
      findBySku(["55403020", "55504020"], 96, "ארון מתכת חיצוני תואם", "metal_cab", 2);
      findBySku(["66403020", "66604023", "66806030"], 92, "ארון פוליאסטר חיצוני תואם", "poly_cab", 3);

      return Array.from(candidates.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    }
  }

  // ============================================================================
  // CASE 2: ארונות תקשורת 19" וארונות אופטיים (Indoor 19" Cabinets & Optical Distribution Boxes)
  // Recommend ONLY accessories & rack equipment that physically fit THIS specific cabinet!
  // Never recommend routers!
  // ============================================================================
  const isIndoorCabinet =
    !isOutdoorMetalSub &&
    !isOutdoorPolyesterSub &&
    (selectedSub.includes("ארונות תקשורת") || selectedSub.includes("ארונות וארונות הסתעפות")) &&
    !selectedNested.includes("אביזרים") &&
    !selectedNested.includes("פסי שקעים") &&
    !selectedNested.includes("פנלים") &&
    isActualCabinetProduct(selectedProduct);

  if (isIndoorCabinet) {
    // Special case: Optical wall/distribution box (ארון הסתעפות אופטי 24 פורט - 931001)
    if (selectedSku === "931001" || /ארון הסתעפות/.test(selectedName)) {
      findBySku(["942001", "942003", "942004"], 100, "מתאם אופטי (קופלר) תואם לארון הסתעפות", "adapter", 3);
      findBySku(["941001", "941003", "941004"], 97, "מארז פיגטיילים להתקנה בארון הסתעפות", "pigtail", 3);
      findBySku(["88233P", "88234P"], 94, "מחבר אופטי מהיר (Fast Connector)", "fast_conn", 2);
      return Array.from(candidates.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
    }

    const matrixSpec = CABINET_MATRIX_SPECS[selectedSku] || null;
    const cabU = matrixSpec?.u ?? detectCabinetU(selectedProduct) ?? 15;
    const cabDepth = matrixSpec?.depth ?? detectCabinetDepthMm(selectedProduct) ?? 600;
    const hasBuiltInFans = matrixSpec ? matrixSpec.fans !== "X" && matrixSpec.fans !== "0" : cabU >= 25;
    const hasBuiltInWheels = matrixSpec ? matrixSpec.wheels !== "X" && matrixSpec.wheels !== "0" : cabU >= 25;
    const hasBuiltInFeet = matrixSpec ? matrixSpec.feet !== "X" && matrixSpec.feet !== "0" : cabU >= 25;

    // 1. Authoritative Compatible Shelves from Cabinet Matrix (ONLY shelves proven to fit this cabinet!)
    if (matrixSpec) {
      if (matrixSpec.std.length > 0) {
        findBySku(matrixSpec.std, 100, "מדף קבוע תואם למידות הארון", "std_shelf", 2);
      }
      if (matrixSpec.slide.length > 0) {
        findBySku(matrixSpec.slide, 99, "מדף נשלף על מסילה תואם לארון", "slide_shelf", 1);
      }
      if (matrixSpec.hang.length > 0) {
        findBySku(matrixSpec.hang, 98, "מדף נתלה תואם לארון", "hang_shelf", 2);
      }
    } else {
      // Fallback for optical 35U cabinet (933001 / 933002) not in standard matrix
      if (cabDepth >= 600) {
        findBySku(["1152", "150470"], 98, "מדף תואם לארון", "shelf", 2);
      }
    }

    // 2. If this is an Optical 35U Cabinet (933001 / 933002), prioritize optical patch panels
    if (selectedSub.includes("ארונות וארונות הסתעפות")) {
      findBySku(["932002", "932003", "932005"], 99.5, "פנל אופטי 19\" תואם לארון", "opt_panel", 2);
    }

    // 3. Compatible PDUs (פסי שקעים לארון)
    // Horizontal 19" PDUs fit all 19" cabinets; Vertical 12-outlet PDUs ONLY fit cabinets >= 15U
    if (cabU >= 15) {
      findBySku(["806121111", "812131111", "809221111"], 96, "פס שקעים (PDU) מתאים לארון", "pdu", 2);
    } else {
      findBySku(["806121111", "809221111"], 96, "פס שקעים 19\" (PDU) תואם לארון", "pdu", 1);
    }

    // 4. Brush Panel & Blank Panels (פנל שערות / פנל עיוור)
    findBySku(["8214", "821410"], 95, "פנל שערות 1U לסידור כבלים בארון", "brush", 1);
    findBySku(["8215"], 91, "פנל עיוור 1U לסגירת מרווחים בארון", "blank", 1);

    // 5. Patch Panels 19" (פאץ' פנל תקשורת לארון)
    findBySku(["2513", "2512", "101008", "2236"], 94, "פאץ' פנל תקשורת 19\" להתקנה בארון", "patch_panel", 1);

    // 6. Cage Nuts & Screws (אום כלוב וברגים להרכבת ציוד בארון)
    findBySku(["13454511", "8224"], 93, "אום כלוב וברגים להרכבת ציוד בארון", "cagenut", 1);

    // 7. Size/Depth-Specific Cabinet Hardware (strictly checked against cabinet dimensions!)
    // Roof Fan (2233): only if the cabinet doesn't already include fans and isn't 200mm open-back (221221)
    if (!hasBuiltInFans && selectedSku !== "221221" && cabDepth >= 300) {
      findBySku(["2233"], 92.5, "מאוורר תקרה 220V תואם לארון", "fan", 1);
    }
    // 12U Perforated Door (1149): strictly for 12U cabinets
    if (cabU === 12) {
      findBySku(["1149"], 97, "דלת מתכת מחוררת תואמת לארון 12U", "door12u", 1);
    }
    // Vertical Cable Duct (105456): strictly for 20U-32U cabinets
    if (cabU >= 20 && cabU <= 32) {
      findBySku(["105456"], 92, "תעלה ורטיקלית לסידור כבלים (מותאם ל-20-32U)", "duct", 1);
    }
    // Side Rail Supports (150480 for depth 800, 150481 for depth 1000)
    if (cabDepth === 800) {
      findBySku(["150480"], 92, "זוג תומכי רלסים תואם לארון עומק 800", "rails", 1);
    } else if (cabDepth === 1000) {
      findBySku(["150481"], 92, "זוג תומכי רלסים תואם לארון עומק 1000", "rails", 1);
    }
    // 2U Drawer (1179): fits cabinets with >= 6U and depth >= 450mm
    if (cabU >= 6 && cabDepth >= 450) {
      findBySku(["1179"], 90, "מגירה ננעלת 2U תואמת לארון", "drawer", 1);
    }
    // Leveling Feet (111818 for 4U-20U, 1118 for 25U-42U) if not already included
    if (!hasBuiltInFeet) {
      if (cabU <= 20) {
        findBySku(["111818"], 89, "סט רגליות תואם לארונות 4U-20U", "feet", 1);
      } else if (cabU >= 25) {
        findBySku(["1118"], 89, "סט רגליות תואם לארונות 25U-42U", "feet", 1);
      }
    }
    // Wheels (2232): if not already included and cabinet >= 12U
    if (!hasBuiltInWheels && cabU >= 12 && cabDepth >= 450) {
      findBySku(["2232"], 88.5, "סט גלגלים תואם לארון תקשורת", "wheels", 1);
    }
    // Magnetic LED Light (831010) & Cable Entry Cover (105458)
    findBySku(["831010"], 88, "תאורת לד מגנטית עם חיישן לארון", "light", 1);
    findBySku(["105458"], 87, "מסתיר לכניסת/יציאת כבלים בארון", "cover", 1);

    // Return directly so no generic fallback adds incompatible shelves or routers!
    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  // ============================================================================
  // CASE 3: כבלי רשת (Network Cable Rolls, Drums & Patch Cords)
  // Recommend Keystones, RJ45 Connectors, Boots, Patch Panels & Crimping Tools matching the exact CAT!
  // ============================================================================
  const isLanCableRoll =
    selectedSub.includes("כבלי רשת LAN גלילים") ||
    (selectedSub.includes("כבלים ואביזרים") && /כבל רשת/i.test(selectedName)) ||
    (/כבל רשת/i.test(selectedName) && !/מגשר|בודק|קופסת/.test(selectedName));

  const isPatchCord =
    selectedSub.includes("מגשרי רשת") ||
    /כבל רשת מגשר|מגשר.*CAT/i.test(selectedName);

  if (isLanCableRoll) {
    const catLevel = detectCatLevel(selectedProduct) || "CAT6";
    const shielding = detectShielding(selectedProduct); // "FTP" | "UTP" | null

    if (catLevel === "CAT5E") {
      findBySku(["2025", "108937"], 100, "שקע קיסטון תואם לכבל CAT5e", "keystone", 2);
      if (shielding === "FTP") {
        findBySku(["101886", "2132"], 99, "קונקטור RJ45 מסוכך תואם ל-CAT5e FTP", "rj45", 2);
      } else {
        findBySku(["101776", "373650"], 99, "קונקטור RJ45 תואם ל-CAT5e UTP", "rj45", 2);
      }
      findBySku(["1028"], 96, "כיסוי הגנה לקונקטור CAT5e/CAT6", "boot", 1);
      findBySku(["103001", "1138"], 94, "מארז / מתאם גויס לשקע קיסטון", "wallbox", 1);
      findBySku(["101332", "204345"], 93, "לוחץ קונקטורים לכבל רשת", "tool", 1);
      findBySku(["2131"], 92, "נועץ קרונה לחיבור שקעי רשת", "krone", 1);
      findBySku(["2064"], 90, "בודק כבל רשת", "tester", 1);
    } else if (catLevel === "CAT6") {
      findBySku(["221319", "2213NG", "221318"], 100, "שקע קיסטון תואם לכבל CAT6", "keystone", 2);
      if (shielding === "FTP") {
        findBySku(["101778", "2184"], 99, "קונקטור RJ45 מסוכך תואם ל-CAT6 FTP", "rj45", 2);
      } else {
        findBySku(["101777", "2183"], 99, "קונקטור RJ45 תואם ל-CAT6 UTP", "rj45", 2);
      }
      findBySku(["1028"], 96, "כיסוי הגנה לקונקטור CAT6", "boot", 1);
      findBySku(["101008", "2236", "2512"], 95, "פאץ' פנל תקשורת תואם CAT6", "panel", 1);
      findBySku(["101670"], 94, "מופה נקבה-לנקבה תואמת CAT6", "coupler", 1);
      findBySku(["101332", "407201"], 93, "לוחץ קונקטורים לכבל CAT6", "tool", 1);
      findBySku(["2131"], 92, "נועץ קרונה לשקעים ופנלים", "krone", 1);
      findBySku(["103001", "1138"], 91, "מארז / מתאם גויס לשקע קיסטון", "wallbox", 1);
    } else {
      findBySku(["221318", "2213NG", "221315", "221321"], 100, `שקע קיסטון מסוכך מותאם ל-${catLevel}`, "keystone", 2);
      findBySku(["2075", "221319"], 99, `קונקטור RJ45 מסוכך תואם ל-${catLevel}`, "rj45", 2);
      findBySku(["1176"], 96, "כיסוי הגנה רחב לקונקטור CAT7", "boot", 1);
      findBySku(["101080", "101672"], 95, "מופה מסוככת לחיבור כבלי CAT6A/CAT7", "coupler", 1);
      findBySku(["2512", "2513"], 94, "פאץ' פנל תקשורת 24 פורט CAT6A", "panel", 1);
      findBySku(["407129", "407201"], 93, "לוחץ ייעודי למחברי CAT7", "tool", 1);
      findBySku(["2131"], 92, "נועץ קרונה מקצועי", "krone", 1);
      findBySku(["104001", "1138"], 91, "מארז / מתאם גויס לשקע קיסטון", "wallbox", 1);
    }
  } else if (isPatchCord) {
    const catLevel = detectCatLevel(selectedProduct) || "CAT6";
    if (catLevel === "CAT7" || catLevel === "CAT8" || catLevel === "CAT6A") {
      findBySku(["101672", "101080"], 100, `מופה מסוככת להארכת מגשר ${catLevel}`, "coupler", 2);
      findBySku(["221318", "2213NG"], 97, `שקע קיסטון מסוכך ${catLevel}`, "keystone", 2);
      findBySku(["2513", "2512"], 95, "פאץ' פנל תקשורת CAT6A לארון", "panel", 1);
    } else {
      findBySku(["101670", "101770"], 100, "מופה נקבה-לנקבה להארכת מגשר רשת", "coupler", 2);
      findBySku(["2213NG", "108937"], 97, "שקע קיסטון תואם למגשר", "keystone", 2);
      findBySku(["101008", "2236", "2513"], 95, "פאץ' פנל תקשורת לארון", "panel", 1);
    }
    findBySku(["8214"], 93, "פנל שערות לסידור מגשרים בארון", "brush", 1);
    findBySku(["2064"], 91, "בודק כבלי ומגשרי רשת", "tester", 1);
  }

  // ============================================================================
  // CASE 4: שקעי רשת, תקעים, קיסטונים ופנלי תקשורת (Keystones, RJ45 Plugs, Wall Plates, Patch Panels)
  // ============================================================================
  if (
    selectedSub.includes("שקעי רשת, תקעים ואביזרים") ||
    selectedNested.includes("פנלי תקשורת")
  ) {
    const catLevel = detectCatLevel(selectedProduct);
    const isPlug = /תקע/.test(selectedName) && !/שקע/.test(selectedName);
    const isKeystone = /קיסטון|שקע רשת|שקע תקשורת/.test(selectedName);
    const isBoot = /כיסוי הגנה/.test(selectedName);
    const isWallPlateOrBox = /מתאם גויס|מארז|בסיס לשקע/.test(selectedName);
    const isPatchPanel = /פנל תקשורת|פאטצ' פנל/.test(selectedName);

    if (isPlug) {
      if (catLevel === "CAT7") {
        findBySku(["1176"], 100, "כיסוי הגנה תואם לתקע CAT7", "boot", 1);
        findBySku(["407129", "407201"], 98, "לוחץ מותאם לתקעי CAT7", "tool", 2);
        findBySku(["101010", "113910"], 95, "גליל כבל רשת CAT7 תואם", "cable", 2);
        findBySku(["221318", "2213NG"], 92, "שקע קיסטון מסוכך משלים", "keystone", 1);
      } else if (catLevel === "CAT6") {
        findBySku(["1028"], 100, "כיסוי הגנה לתקע CAT6", "boot", 1);
        findBySku(
          /חוטים יוצאים/.test(selectedName) ? ["101332", "407201"] : ["204345", "101332"],
          98,
          "לוחץ מחברי רשת תואם",
          "tool",
          2
        );
        findBySku(["2033FY", "1131"], 95, "גליל כבל רשת CAT6 תואם", "cable", 2);
        findBySku(["2213NG", "221319"], 92, "שקע קיסטון תואם CAT6", "keystone", 1);
      } else {
        findBySku(["1028"], 100, "כיסוי הגנה לתקע CAT5e", "boot", 1);
        findBySku(["101332", "204345"], 98, "לוחץ מחברי רשת תואם", "tool", 2);
        findBySku(["1017", "2191"], 95, "גליל כבל רשת CAT5e תואם", "cable", 2);
        findBySku(["2025"], 92, "שקע קיסטון מסוכך CAT5e", "keystone", 1);
      }
      findBySku(["2064"], 90, "בודק כבל רשת לאחר לחיצה", "tester", 1);
    } else if (isKeystone) {
      findBySku(["1138", "113838"], 100, "מתאם גויס להתקנת הקיסטון בקיר", "gewiss", 2);
      findBySku(["103001", "103002", "104001"], 98, "מארז מעל הטיח לשקע קיסטון", "wallbox", 2);
      findBySku(["2512"], 95, "פאץ' פנל 24 פורט לקיסטונים", "panel", 1);
      findBySku(["2131"], 94, "נועץ קרונה לחיבור גידי הכבל", "krone", 1);
      if (catLevel === "CAT6A" || catLevel === "CAT7" || catLevel === "CAT8") {
        findBySku(["101010", "113910"], 92, "כבל רשת CAT7 מותאם לקיסטון", "cable", 1);
      } else if (catLevel === "CAT5E") {
        findBySku(["1017", "2191"], 92, "כבל רשת CAT5e מותאם לקיסטון", "cable", 1);
      } else {
        findBySku(["2033FY", "1131"], 92, "כבל רשת CAT6 מותאם לקיסטון", "cable", 1);
      }
    } else if (isWallPlateOrBox) {
      findBySku(["2213NG", "221318", "2025"], 100, "שקע קיסטון תואם למתאם/מארז", "keystone", 3);
      findBySku(["113800"], 95, "מתאם דמי גויס לסגירת מקום פנוי", "dummy", 1);
      findBySku(["2028"], 93, "קופסה גויס 3 מקום", "box", 1);
      findBySku(["2099"], 91, "בסיס הגבהה לשקע מעל הטיח", "base", 1);
      findBySku(["2131"], 89, "נועץ קרונה", "krone", 1);
    } else if (isBoot) {
      if (catLevel === "CAT7") {
        findBySku(["2075"], 100, "תקע CAT7 תואם לכיסוי ההגנה", "plug", 1);
        findBySku(["407129"], 96, "לוחץ פטנט למחבר CAT7", "tool", 1);
        findBySku(["101010"], 93, "כבל רשת CAT7 תואם", "cable", 1);
      } else {
        findBySku(["101777", "101778", "2183", "2184"], 100, "תקע RJ45 תואם לכיסוי ההגנה", "plug", 2);
        findBySku(["101332", "204345"], 96, "לוחץ מחברי רשת", "tool", 1);
        findBySku(["2033FY", "1131"], 93, "כבל רשת CAT6 תואם", "cable", 1);
      }
    } else if (isPatchPanel) {
      if (/ללא קונקטור/.test(selectedName)) {
        findBySku(["2213NG", "221318", "2025"], 100, "שקע קיסטון להרכבה בפנל", "keystone", 3);
      }
      findBySku(["8214"], 97, "פנל שערות 1U לסידור המגשרים", "brush", 1);
      findBySku(["2131"], 95, "נועץ קרונה לחיבור הפנל", "krone", 1);
      findBySku(["13454511", "8224"], 93, "אום כלוב וברגים להתקנה בארון", "cagenut", 1);
      findBySku(["334101", "634101", "334102"], 91, "מגשר רשת קצר לחיבור בין הפנל למתג", "patch", 2);
    } else {
      findBySku(["2131"], 96, "נועץ קרונה", "krone", 1);
      findBySku(["334103", "634103"], 94, "מגשר רשת תואם", "patch", 2);
      findBySku(["2064"], 90, "בודק כבל רשת", "tester", 1);
    }
  }

  // ============================================================================
  // CASE 5: כבלי קואקס ומחברי קואקס (Coax Cables & BNC / F-Type Connectors)
  // ============================================================================
  if (selectedSub.includes("כבלי קואקס")) {
    const coaxType = detectCoaxType(selectedProduct);
    const isCable =
      selectedNested.includes("גלילים") ||
      (selectedNested.includes("לווין") && /כבל|גליל/.test(selectedName)) ||
      /כבל|גליל/.test(selectedName);

    if (isCable) {
      if (coaxType === "RG6") {
        findBySku(["373638", "1041"], 100, "מחבר קואקס/BNC מותאם לכבל RG6", "conn", 2);
        findBySku(["1018", "2171", "375764"], 96, "מתאם F-TYPE / BNC לכבל RG6", "adapter", 2);
      } else {
        findBySku(["104777", "1175", "2185", "373637"], 100, "מחבר BNC מותאם לכבל מצלמות RG59", "conn", 2);
        findBySku(["2031"], 96, "שקע DC עם חוטים לחיבור מתח למצלמה", "dc", 1);
        findBySku(["8235", "823510"], 94, "ספק כוח מזווד למצלמות אבטחה", "psu", 1);
      }
      findBySku(["111013"], 97, "מגלף כבל קואקס RG59/RG6", "stripper", 1);
      findBySku(["205800", "2074", "1052"], 95, "לוחץ מקצועי למחברי קואקס", "crimper", 1);
    } else {
      findBySku(["111013"], 100, "מגלף כבל קואקס RG59/RG6", "stripper", 1);
      findBySku(["205800", "2074", "1052"], 98, "לוחץ למחברי קואקס", "crimper", 2);
      if (coaxType === "RG6") {
        findBySku(["102650", "373630"], 95, "גליל כבל קואקס RG6 תואם", "cable", 2);
      } else {
        findBySku(["1026", "114040", "2207"], 95, "גליל כבל מצלמות RG59 תואם", "cable", 2);
        findBySku(["2031"], 92, "שקע DC עם חוטים למצלמות", "dc", 1);
      }
    }
  }

  // ============================================================================
  // CASE 6: טלפוניה ואביזרים (Telephony Cables, Outlets, Plugs, Splitters)
  // ============================================================================
  if (selectedSub.includes("טלפוניה")) {
    const isTelCable = selectedNested.includes("גלילים") || /כבל טלפוניה/.test(selectedName);
    if (isTelCable) {
      findBySku(["108936", "333103", "333104", "201212"], 100, "שקע טלפוניה תואם לכבל", "outlet", 2);
      findBySku(["103900003000", "103900003100"], 98, "תקע/מחבר טלפוניה תואם", "plug", 2);
      findBySku(["2131"], 96, "נועץ קרונה לחיבור שקעי טלפוניה", "krone", 1);
      findBySku(["700490115", "204345"], 94, "לוחץ מחברי טלפוניה", "crimper", 1);
      findBySku(["222821"], 92, "פאטצ' פנל טלפוניה 25 פורטים", "panel", 1);
      findBySku(["143104", "101011"], 90, "מכשיר בדיקה/צלצלן לקווי טלפוניה", "tester", 1);
    } else {
      findBySku(["14141102", "14141101"], 98, "כבל טלפוניה תואם", "cable", 2);
      findBySku(["111705892", "361936"], 96, "מגשר טלפוניה תואם", "patch", 2);
      findBySku(["2131"], 94, "נועץ קרונה לחיבור גידים", "krone", 1);
      findBySku(["700490115"], 92, "לוחץ מחברי טלפון", "crimper", 1);
      findBySku(["1003", "2128"], 90, "מפצל/פילטר טלפוניה", "splitter", 1);
    }
  }

  // ============================================================================
  // CASE 7: אופטיקה (Fiber Optics - Drums, Patch Cords, Panels, Adapters, SFP)
  // ============================================================================
  if (selectedCat.includes("אופטיקה")) {
    const isFiberDrumOrCable =
      selectedSub.includes("כבלים אופטיים") ||
      (selectedSub.includes("סיבים אופטיים תוף") && /תוף|גליל|סיב/.test(selectedName));
    const isFastConnector = /מחבר מהיר|Fast Connector/i.test(selectedName);
    const isFiberPatchCord = selectedSub.includes("מגשרים אופטיים");
    const isFiberPanelOrBox = selectedSub.includes("ארונות וארונות הסתעפות");
    const isFiberAdapter = selectedSub.includes("מתאמים אופטיים");
    const isPigtail = selectedSub.includes("פיגטיילים");
    const isSfpOrConverter =
      selectedSub.includes("מיני ג'יביקים") || selectedSub.includes("ממירים אופטיים");

    if (isFiberDrumOrCable) {
      findBySku(["88233P", "88234P"], 100, "מחבר מהיר (Fast Connector) לקצה הסיב", "fast_conn", 2);
      findBySku(["131549", "131815"], 97, "שקע אופטי לקיר תואם", "outlet", 2);
      findBySku(["931001", "932002"], 95, "קופסת הסתעפות / פנל אופטי", "panel", 1);
      findBySku(["404871", "510380", "510381"], 93, "כלי עבודה ובדיקה לסיבים אופטיים", "tool", 2);
    } else if (isFastConnector) {
      findBySku(["526379", "915002"], 100, "תוף סיב אופטי תואם למחבר מהיר", "drum", 2);
      findBySku(["404871"], 98, "קליבר חיתוך מדויק לסיב אופטי", "cleaver", 1);
      findBySku(["510380"], 96, "עט לייזר (VFL) לבדיקת החיבור", "vfl", 1);
      findBySku(["510381", "510622"], 94, "ציוד ניקוי לסיב אופטי", "clean", 1);
      findBySku(["942001", "942003"], 92, "מתאם אופטי תואם", "adapter", 1);
    } else if (isFiberPanelOrBox || isPigtail || isFiberAdapter) {
      if (isFiberPanelOrBox) {
        findBySku(["942001", "942003", "942004"], 100, "מתאם אופטי (קופלר) להרכבה בפנל", "adapter", 2);
        findBySku(["941001", "941003"], 98, "מארז פיגטיילים לריתוך בפנל", "pigtail", 2);
      } else if (isFiberAdapter) {
        findBySku(["932002", "931001"], 100, "פנל אופטי / קופסת הסתעפות תואמת", "panel", 2);
        findBySku(["941001", "941003"], 97, "מארז פיגטיילים תואם", "pigtail", 2);
      } else {
        findBySku(["932002", "931001"], 100, "פנל אופטי להתקנת הפיגטיילים", "panel", 2);
        findBySku(["942001", "942003"], 98, "מתאם אופטי תואם", "adapter", 2);
      }
      findBySku(["92319902", "92317702"], 94, "מגשר אופטי לחיבור הציוד", "patch", 1);
      findBySku(["404871", "510380"], 91, "כלי עבודה ובדיקה אופטיים", "tool", 1);
    } else if (isFiberPatchCord) {
      findBySku(["942001", "942003", "942004"], 100, "מתאם אופטי (קופלר) תואם למגשר", "adapter", 2);
      findBySku(["OP3420D", "OP5420D-34"], 97, "מודול SFP אופטי לחיבור המגשר", "sfp", 2);
      findBySku(["102331", "701122"], 95, "ממיר מדיה / מתג אופטי תואם", "converter", 1);
      findBySku(["932002", "131549"], 93, "פנל / שקע אופטי תואם", "panel", 1);
      findBySku(["510380", "510622"], 90, "ציוד בדיקה וניקוי לסיבים", "tool", 1);
    } else if (isSfpOrConverter) {
      if (selectedSub.includes("ממירים אופטיים")) {
        findBySku(["OP3420D", "OP5420D-34", "OP5420D-43"], 100, "מודול SFP תואם לממיר האופטי", "sfp", 3);
      } else {
        findBySku(["102331", "701122"], 100, "ממיר מדיה / מתג אופטי תואם ל-SFP", "converter", 2);
      }
      findBySku(["92319902", "92319703", "92435502"], 96, "מגשר אופטי LC תואם למודול SFP", "patch", 2);
      findBySku(["932002"], 90, "פנל אופטי לארון תקשורת", "panel", 1);
    } else {
      findBySku(["88233P", "88234P"], 98, "מחבר אופטי מהיר (Fast Connector)", "fast_conn", 2);
      findBySku(["510381", "510622", "404871", "510380"], 95, "ציוד עבודה וניקוי משלים לסיבים", "tool", 2);
      findBySku(["526379", "915002"], 92, "תוף סיב אופטי", "drum", 2);
    }
  }

  // ============================================================================
  // CASE 8: בקרות כניסה וקודנים (Access Control Keypads, Maglocks, Brackets, Exit Buttons)
  // ============================================================================
  if (selectedSub.includes("בקרות כניסה וקודנים")) {
    const isKeypad =
      selectedNested.includes("בקרות כניסה וקודנים") || /קודן/.test(selectedName);
    const isMaglock = /מנעול מגנטי/.test(selectedName);
    const isBracket = /סוגר|אמבטיה|Bracket/i.test(selectedName);

    if (isKeypad) {
      findBySku(["942100"], 100, "צ'יפים מקודדים תואמים לקודן", "rfid", 1);
      findBySku(["942127"], 99, "מגן גשם ייעודי לקודן", "rain", 1);
      findBySku(["942128W", "942120W", "942118"], 97, "מנעול מגנטי / חשמלי לדלת", "lock", 2);
      findBySku(["942125", "942101"], 95, "כפתור יציאה לדלת", "exit", 1);
      findBySku(["2053", "8235"], 93, "ספק כוח 12V להפעלת הקודן והמנעול", "psu", 1);
      findBySku(["2317"], 91, "כבל פיקוד לחיבור בקרת כניסה", "cable", 1);
    } else if (isMaglock) {
      if (/280/.test(selectedName)) {
        findBySku(["942117", "942116", "942131"], 100, "סוגר / אמבטיה מותאמת למנעול 280 ק\"ג", "bracket", 2);
      } else if (/500/.test(selectedName)) {
        findBySku(["942123", "942133"], 100, "סוגר / אמבטיה מותאמת למנעול 500 ק\"ג", "bracket", 2);
      } else {
        findBySku(["942105", "942104", "942132"], 100, "סוגר / אמבטיה מותאמת למנעול 350 ק\"ג", "bracket", 2);
      }
      findBySku(["942119", "942110"], 96, "קודן בקרת כניסה לשליטה במנעול", "keypad", 2);
      findBySku(["942125", "942115"], 94, "כפתור יציאה / לחצן חירום לדלת", "exit", 1);
      findBySku(["2053", "1010"], 92, "ספק כוח 12V למנעול", "psu", 1);
    } else if (isBracket) {
      if (/280/.test(selectedName)) {
        findBySku(["942120W"], 100, "מנעול מגנטי 280 ק\"ג תואם לסוגר", "lock", 1);
      } else if (/500/.test(selectedName)) {
        findBySku(["942121W"], 100, "מנעול מגנטי 500 ק\"ג תואם לסוגר", "lock", 1);
      } else {
        findBySku(["942128W"], 100, "מנעול מגנטי 350 ק\"ג תואם לסוגר", "lock", 1);
      }
      findBySku(["942119", "942110"], 96, "קודן בקרת כניסה", "keypad", 2);
      findBySku(["942125", "942101"], 94, "כפתור יציאה לדלת", "exit", 1);
      findBySku(["2053"], 92, "ספק כוח 12V למערכת", "psu", 1);
    } else {
      findBySku(["942119", "942110"], 99, "קודן בקרת כניסה תואם", "keypad", 2);
      findBySku(["942128W", "942120W", "942118"], 96, "מנעול מגנטי / חשמלי לדלת", "lock", 2);
      findBySku(["2053", "2317"], 92, "ספק כוח וכבל פיקוד", "psu", 2);
    }
  }

  // ============================================================================
  // CASE 9: סאונד והגברה (Polman Speakers, Amplifiers, Mixers, Subwoofers, Speaker Cables)
  // ============================================================================
  if (
    selectedCat.includes("Polman") ||
    selectedSub.includes("כבלי פיקוד, רמקולים וכריזה")
  ) {
    const isSpeaker =
      selectedSub.includes("רמקולים") && !/כבל/.test(selectedName);
    const isAmp = selectedSub.includes("מגברים");
    const isSubwoofer = selectedSub.includes("סאב וופר") && !/קרוסאובר/.test(selectedName);
    const isSpeakerOrPAWire =
      selectedSub.includes("כבלי פיקוד, רמקולים וכריזה") &&
      /רמקולים|כריזה/.test(selectedName);
    const isControlOrFireWire =
      selectedSub.includes("כבלי פיקוד, רמקולים וכריזה") &&
      !/רמקולים|כריזה/.test(selectedName);

    if (isSpeaker) {
      const isLineTransformer = /שנאי קו|כריזה/.test(selectedName);
      if (isLineTransformer) {
        findBySku(["TPA-180B", "TPA-250B"], 100, "מגבר כריזה מותאם לרמקול שנאי קו", "amp", 2);
        findBySku(["1102", "102500"], 97, "כבל כריזה ירוק להתקנת הרמקולים", "cable", 2);
      } else {
        findBySku(["AMU-120BT", "AV270", "AV470"], 100, "מגבר סטריאו/אזורי תואם לרמקולים", "amp", 2);
        findBySku(["102600", "102601", "HXFL20120WS"], 97, "כבל רמקולים להתקנה", "cable", 2);
      }
      findBySku(["55004", "HX-FKB18-N"], 94, "כבל / מחבר אודיו משלים", "acc", 1);
      findBySku(["55021", "55022"], 91, "סאב וופר להשלמת הסאונד", "sub", 1);
    } else if (isAmp) {
      if (selectedNested.includes("כריזה") || /כריזה/.test(selectedName)) {
        findBySku(["Helion-525B", "Helion-525W"], 100, "רמקול עם שנאי קו תואם למגבר כריזה", "speaker", 2);
        findBySku(["1102", "102500"], 97, "כבל כריזה לחיבור הרמקולים", "cable", 2);
      } else {
        findBySku(["Sonova-525", "Sonova-651", "Helion-525B"], 100, "רמקול Polman תואם למגבר", "speaker", 2);
        findBySku(["102600", "102601", "HXFL20120WS"], 97, "כבל רמקולים לחיבור המגבר", "cable", 2);
      }
      findBySku(["AB4", "KG-FM08", "55019"], 94, "מיקסר / מטריצת שליטה למגבר", "mixer", 1);
      findBySku(["55004"], 92, "כבל אודיו לחיבור מקור שמע", "acc", 1);
    } else if (isSubwoofer) {
      findBySku(["55025"], 100, "קרוסאובר אלקטרוני ייעודי לסאב וופר", "crossover", 1);
      findBySku(["XL600", "MH3200", "MH4300"], 97, "מגבר כוח להנעת הסאב", "amp", 2);
      findBySku(["102601", "55004"], 94, "כבל רמקולים / אודיו עבה", "cable", 2);
    } else if (isSpeakerOrPAWire) {
      findBySku(["Sonova-525", "Sonova-651", "Helion-525B"], 100, "רמקולים תואמים לכבל", "speaker", 2);
      findBySku(["AMU-120BT", "AV270", "TPA-180B"], 97, "מגבר תואם למערכת השמע", "amp", 2);
      findBySku(["1184", "10071"], 92, "כלי חיתוך והשחלה לכבל", "tool", 2);
    } else if (isControlOrFireWire) {
      findBySku(["942119", "942110", "942128W"], 98, "בקרת כניסה ומנעול תואמים לכבל פיקוד", "access", 2);
      findBySku(["2053", "8235"], 95, "ספק כוח 12V למערכת", "psu", 2);
      findBySku(["10071", "101011", "1184"], 91, "סטלבנד וכלי עבודה להשחלה", "tool", 2);
    } else {
      findBySku(["55004", "102600", "HXFL20120WS"], 98, "כבלי אודיו ורמקולים משלימים", "cable", 2);
      findBySku(["AMU-120BT", "AV270", "XL600"], 95, "מגבר תואם", "amp", 2);
      findBySku(["Sonova-525", "Sonova-651"], 92, "רמקולים משלימים", "speaker", 2);
    }
  }

  // ============================================================================
  // CASE 10: מצלמות ומוצרי בית חכם EZVIZ (`מחירון EZVIZ 2026`)
  // ============================================================================
  if (selectedCat.includes("EZVIZ")) {
    const isBatteryCam = selectedSub.includes("סוללה");
    const isSolarPanel = /פאנל סולארי/.test(selectedName);
    const isPoeCam = selectedSub.includes("POE");
    const isWifiOr4GCam =
      selectedSub.includes("WIFI") || selectedSub.includes("4G");
    const isIntercom = selectedSub.includes("אינטרקומים");
    const isRobotVacuum = selectedSub.includes("שואבים");
    const isNvr = selectedSub.includes("NVR");

    if (isSolarPanel) {
      findBySku(["303103305", "303103498", "303104073", "303103990", "303103229"], 100, "מצלמת סוללה תואמת לפאנל הסולארי", "cam", 4);
    } else if (isBatteryCam) {
      findBySku(["307700491", "318700014"], 100, "פאנל סולארי לטעינה רציפה של המצלמה", "solar", 2);
      findBySku(["370700003", "303000427"], 96, "ערכת NVR / מסך חכם לניהול המצלמות", "nvr", 2);
    } else if (isPoeCam) {
      findBySku(["DS-3E1105P-EI_M", "701105", "DS-3E0502P-E"], 100, "מתג / אינג'קטור PoE להזנת המצלמה", "poe", 2);
      findBySku(["370700002", "370700003"], 97, "מערכת הקלטה NVR תואמת", "nvr", 1);
      findBySku(["2033FY", "1131"], 94, "כבל רשת CAT6 לחיבור המצלמה", "cable", 1);
      findBySku(["101778", "2213NG"], 91, "קונקטורים וקיסטון לחיבור המצלמה", "conn", 2);
    } else if (isWifiOr4GCam) {
      findBySku(["370700003", "370700002"], 100, "מערכת הקלטה NVR לחיבור המצלמות", "nvr", 1);
      findBySku(["2053", "2136"], 95, "ספק כוח 12V חלופי/משלים", "psu", 1);
      findBySku(["303000427"], 92, "מסך חכם לצפייה במצלמות", "screen", 1);
    } else if (isIntercom) {
      if (selectedSku === "310500519") {
        findBySku(["318500253", "318500175", "318500154"], 100, "אינטרקום EZVIZ תואם לתגי ה-RFID", "intercom", 3);
      } else {
        findBySku(["310500519"], 100, "תגי קרבה RFID מותאמים לאינטרקום EZVIZ", "rfid", 1);
        findBySku(["303000427"], 98, "מסך אינטרקום חכם משלים", "screen", 1);
        findBySku(["942118", "942128W", "942125"], 95, "מנעול חשמלי/מגנטי וכפתור יציאה לשער", "lock", 2);
        findBySku(["2317"], 92, "כבל פיקוד לחיבור האינטרקום", "cable", 1);
      }
    } else if (isRobotVacuum) {
      if (/סט אביזרים/.test(selectedName)) {
        findBySku(["314100056"], 100, "שואב שוטף רובוטי תואם לסט האביזרים", "vacuum", 1);
      } else {
        findBySku(["307700550", "307700469"], 100, "סט אביזרים מתכלים מקורי לשואב הרובוטי", "acc", 2);
      }
    } else if (isNvr) {
      findBySku(["303103104", "303103402", "303102822"], 100, "מצלמת EZVIZ נוספת להרחבת המערכת", "cam", 2);
      findBySku(["DS-UPS1000(O-STD)EU", "DS-UPS600(O-STD)EU"], 96, "אל-פסק להגנה וגיבוי מערכת ההקלטה", "ups", 1);
      findBySku(["1129", "334103"], 93, "כבל HDMI ומגשר רשת לחיבור ה-NVR", "cable", 2);
    }
  }

  // ============================================================================
  // CASE 11: תקשורת אקטיבית, מתגים, אל-פסק ונתבים (HIKVISION, BoostLink, Teltonika)
  // ============================================================================
  if (
    selectedCat.includes("HIKVISION") ||
    selectedSub.includes("BoostLink") ||
    selectedSub.includes("Teltonika") ||
    selectedSub.includes("נתבים סלולריים")
  ) {
    const isSwitch = /מתג|רכזת|Switch/i.test(selectedName) || selectedSub.includes("מתגי");
    const isPoeSplitter = selectedSub.includes("מפצלי POE");
    const isApOrLinkOrRouter =
      selectedSub.includes("אקסס פוינטים") ||
      selectedSub.includes("לינקים אלחוטיים") ||
      selectedSub.includes("נתבים") ||
      selectedSub.includes("מגדילי טווח") ||
      selectedSub.includes("VPN");
    const isUps = selectedSub.includes("אל פסק");
    const isIpPhone = selectedSub.includes("טלפוניה IP");

    if (isSwitch) {
      if (/SFP|אופטי/i.test(selectedName)) {
        findBySku(["OP3420D", "OP5420D-34"], 100, "מודול SFP אופטי תואם לפורט האפלינק במתג", "sfp", 2);
      }
      findBySku(["334102", "634102"], 97, "מגשר רשת לחיבור פורטים במתג", "patch", 2);
      findBySku(["DS-3E0103DP-E_R", "DS-3E0503DP-E_R"], 95, "מפצל/מרחיק PoE להרחבת נקודות בקצה", "splitter", 1);
      findBySku(["2513", "8214"], 93, "פאץ' פנל ופנל שערות לארון תקשורת", "panel", 1);
      findBySku(["DS-UPS1000(O-STD)EU", "806121111"], 91, "אל-פסק / פס שקעים לגיבוי המתג", "ups", 1);
    } else if (isPoeSplitter) {
      findBySku(["DS-3E1105P-EI_M", "701105"], 100, "מתג PoE להזנת המפצל", "switch", 2);
      findBySku(["334103", "2033FY"], 96, "מגשר / כבל רשת לחיבור נקודות הקצה", "cable", 2);
      findBySku(["303103104", "DS-3WAP521-SI"], 92, "מצלמת PoE / אקסס פוינט לחיבור", "device", 2);
    } else if (isApOrLinkOrRouter) {
      findBySku(["DS-3E0502P-E", "DS-3E1105P-EI_M"], 100, "אינג'קטור / מתג PoE להזנת היחידה", "poe", 2);
      findBySku(["334103", "2033FY"], 97, "מגשר / כבל רשת CAT6 לחיבור", "cable", 2);
      findBySku(["DS-3WRE12C(O-STD)_EU"], 94, "מגדיל טווח WiFi להרחבת הכיסוי", "extender", 1);
      findBySku(["DS-UPS600(O-STD)EU"], 91, "אל-פסק לגיבוי הראוטר והרשת", "ups", 1);
    } else if (isUps) {
      findBySku(["14200001", "14200002"], 100, "כבל מתח קומקום / מאריך C14-C13 לאל-פסק", "power_cord", 2);
      findBySku(["114301", "114302"], 97, "מצבר גיבוי 12V", "battery", 2);
      if (selectedSub.includes("RM")) {
        findBySku(["806121111", "13454511"], 94, "פס שקעים PDU ואום כלוב לארון תקשורת", "pdu", 2);
      } else {
        findBySku(["806121111"], 94, "פס שקעים לחיבור צרכנים", "pdu", 1);
      }
    } else if (isIpPhone) {
      findBySku(["DS-3E1105P-EI_M", "701105"], 100, "מתג PoE להפעלת טלפוני ה-IP", "switch", 2);
      findBySku(["334104", "334105"], 97, "מגשר רשת CAT6 לחיבור הטלפון", "patch", 2);
      findBySku(["108937", "2213NG"], 94, "שקע רשת נקודתי לעמדת העבודה", "outlet", 2);
    }
  }

  // ============================================================================
  // CASE 12: הרחקות וידאו ו-HDMI (HDMI Cables, Adapters, Splitters, KVM Extenders)
  // ============================================================================
  if (selectedCat.includes("הרחקות וידאו") || selectedSub.includes("HDMI")) {
    const isHdmiCable =
      selectedNested.includes("אורכים שונים") ||
      selectedNested.includes("ראש פריק") ||
      selectedNested.includes("DisplayPort");
    const isHdmiAdapter = selectedNested.includes("מתאמים");
    const isSplitterOrKvm =
      selectedSub.includes("KVM") || selectedSub.includes("מפצלי");

    if (isHdmiCable) {
      findBySku(["103210", "1035", "1046", "1034"], 100, "מתאם HDMI משלים (זווית 90° / הארכה)", "adapter", 2);
      findBySku(["116113N", "211800"], 97, "מפצל HDMI לחיבור מספר מסכים", "splitter", 2);
      findBySku(["101430N", "101433"], 94, "מרחיק HDMI/KVM על גבי כבל רשת", "kvm", 1);
      if (selectedNested.includes("ראש פריק")) {
        findBySku(["10071", "10072"], 96, "סטלבנד מקצועי להשחלת כבל ה-HDMI", "tool", 1);
      }
    } else if (isHdmiAdapter) {
      findBySku(["1129", "112950", "1130"], 100, "כבל HDMI תואם למתאם", "cable", 2);
      findBySku(["116113N", "211800"], 96, "מפצל HDMI 4K", "splitter", 2);
    } else if (isSplitterOrKvm) {
      if (selectedSku === "101430N") {
        findBySku(["101430N-RX"], 100, "יחידת מקלט (RX) נוספת למרחיק 101430N", "rx", 1);
      } else if (selectedSku === "101430N-RX") {
        findBySku(["101430N"], 100, "ערכת מרחיק ראשית (TX+RX) תואמת", "tx", 1);
      }
      findBySku(["1129", "112950"], 98, "כבל HDMI 4K לחיבור המסך והמקור", "hdmi", 2);
      if (selectedSub.includes("KVM")) {
        findBySku(["2033FY", "101010", "634108"], 95, "כבל רשת מסוכך להעברת האות בין היחידות", "lan", 2);
      }
    }
  }

  // ============================================================================
  // CASE 13: ספקי כוח ומתח & כלי עבודה וציוד בדיקה (Power Supplies & Tools)
  // ============================================================================
  if (selectedSub.includes("ספקי כוח ומתח")) {
    const isBoxedPsu = selectedNested.includes("ספקים מזוודים");
    const isBattery = selectedNested.includes("סוללות גיבוי");
    const isPowerCableOrAcc = selectedNested.includes("כבלים ואביזרי חשמל");

    if (isBoxedPsu) {
      findBySku(["114301", "114302"], 100, "סוללת גיבוי 12V תואמת לספק המזווד", "battery", 2);
      findBySku(["14200001"], 98, "כבל מתח קומקום להזנת הספק", "cord", 1);
      findBySku(["2031"], 96, "שקע/קונקטור DC לחיבור מצלמות", "dc", 1);
      findBySku(["1026", "104777"], 93, "כבל מצלמות RG59+DC ומחברי BNC", "coax", 2);
    } else if (isBattery) {
      findBySku(["8235", "823510", "823530"], 100, "ספק כוח מזווד תואם לסוללת הגיבוי", "psu", 3);
      findBySku(["DS-UPS600(O-STD)EU", "DS-UPS1000(O-STD)EU"], 95, "מערכת אל-פסק תואמת", "ups", 2);
    } else if (isPowerCableOrAcc) {
      findBySku(["1010", "208910", "2053"], 99, "ספק כוח 12V תואם", "psu", 2);
      findBySku(["806121111", "DS-UPS1000(O-STD)EU"], 94, "פס שקעים / אל-פסק", "pdu", 2);
    } else {
      findBySku(["2031"], 100, "שקע DC עם גידים לחיבור מהיר לספק", "dc", 1);
      if (/קומקום|שולחני/.test(selectedName)) {
        findBySku(["14200001"], 98, "כבל מתח קומקום נחושת", "cord", 1);
      }
      findBySku(["942119", "942128W"], 93, "קודן ומנעול מגנטי 12V", "access", 2);
    }
  }

  if (selectedSub.includes("כלי עבודה וציוד בדיקה")) {
    if (["134984", "134985", "134986"].includes(selectedSku)) {
      findBySku(["134984", "134985", "134986"], 100, "אביזר תואם לסטלבנד חשמלי CX8010", "cx8010", 2);
    }
    if (selectedNested.includes("סטלבנדים")) {
      findBySku(["2033FY", "101010", "210161"], 95, "כבל רשת / HDMI להשחלה", "cable", 2);
      findBySku(["1184", "2050"], 91, "כלי חיתוך משלים לטכנאי", "cutter", 2);
    } else if (selectedNested.includes("מכשירי בדיקה")) {
      findBySku(["101332", "407201", "2131"], 98, "לוחץ מחברי רשת ונועץ קרונה", "tool", 2);
      findBySku(["101778", "2213NG"], 94, "קונקטורים וקיסטונים לבדיקה והתקנה", "conn", 2);
    } else {
      if (/RG59|RG6|קואקס/i.test(selectedName)) {
        findBySku(["104777", "1041", "373637", "373638", "111013"], 99, "מחברי קואקס ומגלף תואמים לכלי", "coax", 4);
      } else if (/קרונה/.test(selectedName)) {
        findBySku(["2213NG", "2025", "108937", "2512", "101008"], 99, "שקעי קיסטון ופנלי תקשורת ללחיצה בקרונה", "krone_items", 4);
      } else if (/CAT7/i.test(selectedName)) {
        findBySku(["2075", "1176", "101010"], 99, "קונקטור CAT7, כיסוי הגנה וכבל תואמים ללוחץ", "cat7_items", 4);
      } else {
        findBySku(["101777", "101778", "1028", "2064"], 99, "קונקטורים RJ45, כיסוי הגנה ובודק רשת", "lan_items", 4);
      }
    }
  }

  // ============================================================================
  // CASE 14: אביזרים לארונות תקשורת (Shelves, Cage Nuts, Brush/Blank Panels, Fans, Wheels)
  // ============================================================================
  if (
    selectedNested.includes("אביזרים לארונות") ||
    selectedNested.includes("פסי שקעים")
  ) {
    if (/אום כלוב/.test(selectedName)) {
      findBySku(["111014"], 100, "כלי ייעודי לחילוץ והרכבת אום כלובים", "tool", 1);
    } else if (/חילוץ אום/.test(selectedName)) {
      findBySku(["8224", "13454511"], 100, "אום כלוב וברגים לארון תקשורת", "cagenut", 2);
    }
    findBySku(["806121111", "812131111"], 95, "פס שקעים (PDU) לארון תקשורת", "pdu", 1);
    findBySku(["8214", "8215"], 94, "פנל שערות / פנל עיוור לארון", "panel", 1);
    findBySku(["13454511", "8224"], 93, "סט אום כלוב וברגים להרכבה בארון", "cagenut", 1);
    findBySku(["2233", "831010"], 91, "מאוורר / תאורת לד לארון תקשורת", "acc", 2);
  }

  // ============================================================================
  // FALLBACK: For non-cabinet items only, if fewer than maxResults complementary items were found
  // ============================================================================
  if (candidates.size < maxResults) {
    for (const p of activeCatalog) {
      if (candidates.has(p.id)) continue;
      const pSub = cleanStr(p.subcategory);
      const pNested = cleanStr(p["Nested subcategory"] || p.nestedSubcategory);
      const pCat = cleanStr(p.category);
      const pName = cleanStr(p.name);

      // Never fallback to routers or shelves unless explicitly relevant
      if (/נתב|router|מדף/i.test(pName)) continue;

      if (pSub === selectedSub && pNested !== selectedNested) {
        const isAccessory = /אביזר|ספק|כבל|מחבר|מתאם|שקע|תקע|פנל|סוגר|בקר|מאוורר|סוללה/.test(
          `${pNested} ${pName}`
        );
        addCandidate(p, isAccessory ? 65 : 50, "מוצר משלים מאותה קטגוריה", `fallback_${pNested}`);
      } else if (pCat === selectedCat && pSub !== selectedSub) {
        const isAccessory = /אביזר|כבל|מחבר|מתאם|ספק/.test(`${pSub} ${pNested} ${pName}`);
        if (isAccessory) {
          addCandidate(p, 45, "אביזר משלים בקטלוג", `fallback_${pSub}`);
        }
      }
    }
  }

  if (candidates.size < 4) {
    for (const p of activeCatalog) {
      if (candidates.has(p.id)) continue;
      if (cleanStr(p.subcategory) === selectedSub && !/נתב|router/i.test(cleanStr(p.name))) {
        addCandidate(p, 30, "מוצר נוסף בקטגוריה", "same_sub");
      }
    }
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
