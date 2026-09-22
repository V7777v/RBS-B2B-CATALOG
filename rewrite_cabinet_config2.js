import fs from 'fs';

let content = fs.readFileSync('src/components/CabinetConfigurator.tsx', 'utf-8');

// Replace the inner part of fetchAndParse in CabinetConfigurator
const oldEffectStr = `        const CABINETS_CSV_URL = '/api/sheets?gid=250535112';
        let appCheckTok = '';
        try { 
          appCheckTok = (await getAppCheckToken(appCheck)).token; 
        } catch (e) {
          console.warn("Failed to obtain App Check token.", e);
          const isPreview = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');
          if (isPreview) {
            console.warn("Bypassing App Check failure in preview environment.");
            appCheckTok = "DEV_PREVIEW_BYPASS";
          } else {
            setErrorMsg("אבטחת המערכת (App Check) נכשלה. אנא רענן את העמוד.");
            setLoading(false);
            return;
          }
        }

        const acHeaders = { headers: { 'X-Firebase-AppCheck': appCheckTok } };
        const productSkuNorm = normalizeSku(product.sku);

        // 2. Cabinets Table ('טבלת ארונות מעודכנת') — OPTIONAL.
        // If it can't be fetched (e.g. preview without backend, transient error),
        // we degrade gracefully to catalog-only mode instead of a hard error.
        let cabRows: any[][] = [];
        try {
          const cabRes = await fetch(CABINETS_CSV_URL, acHeaders);
          if (cabRes.ok) {
            const cabCsvText = await cabRes.text();
            cabRows = (Papa.parse(cabCsvText, { header: false, skipEmptyLines: false }).data) as any[][];
          } else {
            console.warn('[CabinetConfigurator] cabinet sheet HTTP', cabRes.status, '- catalog-only fallback');
          }
        } catch (e) {
          console.warn('[CabinetConfigurator] cabinet sheet unavailable - catalog-only fallback', e);
        }

        // Optional curated compatibility (SKU -> U-range/depth) from 'מדפים ואביזרים' (gid 1366808268).
        let compatMap: Record<string, any> = {};
        try {
          const compRes = await fetch('/api/sheets?gid=1366808268', acHeaders);
          if (compRes.ok) {
            const compText = await compRes.text();
            const compRows = (Papa.parse(compText, { header: false, skipEmptyLines: false }).data) as any[][];
            for (const row of compRows) {
              const sku = normalizeSku(row[0]);
              if (!sku || !/^[0-9]/.test(sku)) continue;
              const rangeStr = String(row[5] ?? '');
              if (rangeStr.trim()) compatMap[sku] = parseCompatRange(rangeStr);
            }
          }
        } catch (e) { console.warn('[CabinetConfigurator] compat sheet optional - skipped', e); }

        let cabRow: any[] | null = null;
        for (let i = 2; i < cabRows.length; i++) {
           if (cabRows[i] && cabRows[i][0] !== undefined && cabRows[i][0] !== null) {
               if (normalizeSku(cabRows[i][0]) === productSkuNorm) {
                   cabRow = cabRows[i];
                   break;
               }
           }
        }

        if (!cabRow) {
           console.warn("Cabinet not found in external configurator sheet for SKU:", product.sku);
           // Fallback mode if the cabinet is not in the updated list
           const uMatch = product.name?.match(/(\d+)U/i) || product.description?.match(/(\d+)U/i);
           const parsedTotalU = uMatch ? parseInt(uMatch[1]) : 42; // default to 42 if not found
           setTotalU(parsedTotalU);
           
           let initialAvailableU = parsedTotalU;
           if (initialAccessory) {
             const uSz = determineUSize(initialAccessory.sku, initialAccessory.name || '');
             initialAvailableU -= uSz;
             setSelectedOptionals([{
                pn: initialAccessory.sku,
                sku: initialAccessory.sku,
                name: initialAccessory.name,
                description: initialAccessory.description || '',
                price: initialAccessory.price || 0,
                uSize: uSz,
                quantity: 1,
                id: 'initial-' + initialAccessory.sku
             }]);
           } else {
             if (!CABINET_CFG_INIT.has(product.sku)) setSelectedOptionals([]);
           }
           CABINET_CFG_INIT.add(product.sku);
           setBuiltInUsedU(0);
           setIncludedItems([]);
           // FIX: cabinets missing from the built-in sheet still get catalog accessories
           // (depth parsed from the cabinet name "בגודל DEPTH*WIDTH").
           setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, parseCabinetDepthFromName(product.name || ''), parsedTotalU, compatMap));
           setLoading(false);
           return;
        }

        const data: CabinetData = {
           pn: cabRow[0]?.toString() || '',
           u: cabRow[2]?.toString() || '0U',
           fans: cabRow[8]?.toString() || 'X',
           wheels: cabRow[9]?.toString() || 'X',
           levelingFeet: cabRow[10]?.toString() || 'X',
           shelvesQty: cabRow[11]?.toString() || 'X',
           suitableStandard: cabRow[12]?.toString() || '',
           suitableHanging: cabRow[13]?.toString() || '',
           suitableSliding: cabRow[14]?.toString() || ''
        };
        setCabinetData(data);`;


const newEffectStr = `        let appCheckTok = '';
        try { 
          appCheckTok = (await getAppCheckToken(appCheck)).token; 
        } catch (e) {
          console.warn("Failed to obtain App Check token.", e);
          const isPreview = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');
          if (isPreview) {
            console.warn("Bypassing App Check failure in preview environment.");
            appCheckTok = "DEV_PREVIEW_BYPASS";
          } else {
            setErrorMsg("אבטחת המערכת (App Check) נכשלה. אנא רענן את העמוד.");
            setLoading(false);
            return;
          }
        }

        const productSkuNorm = normalizeSku(product.sku);
        const matrix = await fetchCabinetMatrix(appCheckTok);
        const compatMap = await fetchCompatMap(appCheckTok);
        
        const data = matrix[productSkuNorm] || null;
        setCabinetData(data);

        if (!data) {
           console.warn("Cabinet not found in external configurator sheet for SKU:", product.sku);
           const uMatch = product.name?.match(/(\\d+)U/i) || product.description?.match(/(\\d+)U/i);
           const parsedTotalU = uMatch ? parseInt(uMatch[1]) : 42; 
           setTotalU(parsedTotalU);
           
           let initialAvailableU = parsedTotalU;
           if (initialAccessory) {
             const uSz = determineUSize(initialAccessory.sku, initialAccessory.name || '');
             initialAvailableU -= uSz;
             setSelectedOptionals([{
                pn: initialAccessory.sku,
                sku: initialAccessory.sku,
                name: initialAccessory.name,
                description: initialAccessory.description || '',
                price: initialAccessory.price || 0,
                uSize: uSz,
                quantity: 1,
                id: 'initial-' + initialAccessory.sku
             }]);
           } else {
             if (!CABINET_CFG_INIT.has(product.sku)) setSelectedOptionals([]);
           }
           CABINET_CFG_INIT.add(product.sku);
           setBuiltInUsedU(0);
           setIncludedItems([]);
           setCompatibleAccessories(buildCatalogAccessories(catalogData, productSkuNorm, null, compatMap));
           setLoading(false);
           return;
        }`;

content = content.replace(oldEffectStr, newEffectStr);
fs.writeFileSync('src/components/CabinetConfigurator.tsx', content);
