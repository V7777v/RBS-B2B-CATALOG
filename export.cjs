const fs = require('fs');
const https = require('https');

async function fetchCSV(gid) {
  const url = `https://docs.google.com/spreadsheets/d/1NtYwQeTX3blf0aMcvtnlk9liIaJOiG9BOsP4Qc8lSRs/gviz/tq?tqx=out:csv&gid=${gid}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // VERY simple CSV parse
    const rawMatch = line.match(/(?<=^|,)(?:"([^"]*)"|([^,]*))/g);
    if (!rawMatch) continue;
    
    // cleanup
    const values = rawMatch.map(val => val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] || '');
    data.push(row);
  }
  return data;
}

const transformImageLink = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
        const fileId = url.split('/d/')[1]?.split('/')[0];
        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }
    return url;
};

const getCustomImage = (subName) => {
        if (subName === 'מצלמות חשמל WIFI' || subName === 'מצלמות WIFI חשמל') {
          return transformImageLink('https://drive.google.com/file/d/1EQnAA-b_ez8dHTDbfcb5dETBnHSF5HeO/view?usp=drive_link');
        } else if (subName && (subName.includes('סלולריים') || subName.toLowerCase().includes('cellular'))) {
          return 'https://robustelanz.com.au/wp-content/uploads/2021/06/Robustel_R1520_1.jpg';
        } else if (subName && subName.includes('POE')) {
          return transformImageLink('https://drive.google.com/file/d/17Im3ggLiWxPTfrDberOwwKWyMgf2D6A6/view?usp=drive_link');
        } else if (subName === 'מצלמות חשמל 4G' || subName === 'מצלמות 4G חשמל') {
          return transformImageLink('https://drive.google.com/file/d/1vMM8K41UALo7f9WLeRGHtt8l9XfjctmA/view?usp=drive_link');
        } else if (subName === 'מצלמות סוללה עצמאיות') {
          return transformImageLink('https://drive.google.com/file/d/13d3JVC3H7T-dCGbImrrRm-05pGFqrOkN/view?usp=drive_link');
        } else if (subName === 'אינטרקומים') {
          return transformImageLink('https://drive.google.com/file/d/1_e67NvLTFI8hiisTJHgLerRkLD33jak4/view?usp=drive_link');
        } else if (subName === 'מנעולים חכמים') {
          return transformImageLink('https://drive.google.com/file/d/1uo_Vnq_Vei1oRhLw02h2TQEaylApQiQW/view?usp=drive_link');
        } else if (subName === 'שואבים שוטפים רובוטיים' || subName.includes('שואבים שוטפים')) {
          return transformImageLink('https://drive.google.com/file/d/1kOd6VCtpXz3Im-_hCQFRGRDrT0ucD_xh/view?usp=drive_link');
        } else if (subName === 'מתגי ליבה ורשת מנוהלים') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000113563/DS-3E2736-HI-24F8T4X_F_202309.jpg?eo-img.format=webp';
        } else if (subName === 'מתגי רשת גיגה לא מנוהלים') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000073645/8%E5%8F%A3%E5%B7%A645%E4%BF%AF%E8%A7%86---%E5%89%AF%E6%9C%AC.png?eo-img.format=webp';
        } else if (subName === 'מתגי גיגה תעשייתיים') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000138688/12.png?eo-img.format=webp';
        } else if (subName === 'מפצלי POE') {
          return 'https://assets.hikvision.com/prd/public/all/image/m000131322/DSC09357.png?eo-img.format=webp';
        } else if (subName === 'אקסס פוינטים - AP') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000113057/%E6%AD%A3%E8%A7%86%E5%9B%BE.png?eo-img.format=webp';
        } else if (subName === 'לינקים אלחוטיים') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000152562/11-1.png?eo-img.format=webp';
        } else if (subName === 'נתבים אלחוטיים ביתי-משרדי') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000133680/%E7%BA%BF%E4%B8%8B%E6%AC%BE1.png?eo-img.format=webp';
        } else if (subName === 'מגדילי טווח ויחידות MESH') {
          return 'https://assets.hikvision.com/prd/public/all/image/m000156931/%E4%B8%AD%E7%BB%A7%E5%99%A8.png?eo-img.format=webp';
        } else if (subName === 'VPN Professional Router') {
          return 'https://assets.hikvision.com/prd/public/all/image/m000113061/DS-3WG507G-SI_F_202309.jpg?eo-img.format=webp';
        } else if (subName === 'אל פסק - UPS') {
          return 'https://assets.hikvision.com/prd/public/all/image/m000086221/%E5%9B%BE%E7%89%87.jpg?eo-img.format=webp';
        } else if (subName === 'אל פסק אונליין RM') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000172008/%E5%B7%A6%E5%89%8D%E4%BE%A7-LOGO.png?eo-img.format=webp';
        } else if (subName === 'אל פסק אונליין Tower') {
          return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ7QJg4nHgNAgQ2E8vZ4Kqtt-pCWsi8eyLVxCIARB7_HCTqSzBn-TiKsWBYn4mn-dnHo4yfRy2MxOB02yDbX6QmZIM3eujkj2fh4T5V4EYiD0vSfQSAsdF_tnQZwbrFlocNutsK0bu_dWk&usqp=CAc';
        } else if (subName === 'טלפוניה IP') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000062901/KP9301%E4%B8%BB%E8%A7%86%E5%9B%BE_20220822.png?eo-img.format=webp';
        } else if (subName === 'כבלים ואביזרים') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000001449/%E8%B6%85%E4%BA%94%E7%B1%BB2.png?eo-img.format=webp';
        } else if (subName === 'מצלמות לרכב') {
          return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTOxMM3c1rVlvshWHjGeqk4BFeF5B2KA5HnKvA2uP3Zv546YfeY7A8DlFJhcz9x1ByVXPrFIed1YamY4h9MuBXuhQ8b_m_hX8S1nnbVq-bPHj6DBG00YQw5T2s4O1Zpag&usqp=CAc';
        } else if (subName === 'Msolutions HDBaseT Extenders') {
          return 'https://placehold.co/600x400/e0f2fe/0369a1?text=Msolutions+Extenders';
        } else if (subName === 'Msolutions Tester') {
          return 'https://placehold.co/600x400/e0f2fe/0369a1?text=Msolutions+Tester';
        } else if (subName === 'Tesla Smart') {
          return 'https://placehold.co/600x400/dcfce7/166534?text=Tesla+Smart';
        } else if (subName === 'Boost-Connect') {
          return 'https://placehold.co/600x400/fef3c7/b45309?text=Boost+Connect';
        } else if (subName === 'Inginium Full Channel') {
          return 'https://placehold.co/600x400/e0e7ff/0369a1?text=Inginium+Full+Channel';
        } else if (subName === 'כבלי תקשורת Recber') {
          return 'https://www.recber.com.tr/wp-content/uploads/2018/12/banner4.jpg';
        } else if (subName === 'ארונות תקשורת ואביזרים') {
          return 'https://rbs-telecom.com/wp-content/uploads/קטלוג-פסי-שקעים-scaled.png';
        } else if (subName === 'פסי שקעים PDU') {
          return 'https://rbs-telecom.com/wp-content/uploads/5cd9dbb9-8411-455d-8eed-9f1194971df8.png';
        } else if (subName === 'כבלי פיקוד, רמקולים וכריזה') {
          return 'https://placehold.co/600x400/dcfce7/166534?text=Audio+Cables';
        } else if (subName === 'מגשרי רשת CAT6') {
          return 'https://placehold.co/600x400/e0e7ff/3730a3?text=CAT6+Patch+Cords';
        } else if (subName === 'מגשרי רשת CAT7 / CAT8') {
          return 'https://placehold.co/600x400/e0e7ff/4338ca?text=CAT7/8+Patch+Cords';
        } else if (subName === 'שקעי רשת, תקעים ואביזרים') {
          return 'https://placehold.co/600x400/f3f4f6/374151?text=Keystones+%26+Plugs';
        } else if (subName === 'כבלי רשת LAN גלילים') {
          return 'https://placehold.co/600x400/ffedd5/92400e?text=LAN+Cables';
        } else if (subName === 'טלפוניה ואביזרים') {
          return 'https://placehold.co/600x400/fce7f3/9d174d?text=Telephony';
        } else if (subName === 'כבלי קואקס') {
          return 'https://placehold.co/600x400/e2e8f0/1e293b?text=Coax+Cables';
        } else if (subName === 'כבלי HDMI') {
          return 'https://placehold.co/600x400/fef08a/b45309?text=HDMI+Cables';
        } else if (subName === 'ספקי כוח ומתח') {
          return 'https://placehold.co/600x400/dbeafe/1e40af?text=Power+Supplies';
        } else if (subName === 'כלי עבודה וציוד בדיקה') {
          return 'https://placehold.co/600x400/f3e8ff/4c1d95?text=Tools+%26+Testers';
        } else if (subName === 'רמקולים שקועים') {
          return transformImageLink('https://drive.google.com/file/d/1PhQwKX-PPEDkI86oJYx8_Oxcy8D1JoNo/view?usp=drive_link');
        } else if (subName === 'רמקולים חיצוניים') {
          return transformImageLink('https://drive.google.com/file/d/13DphjTY4N3ZUBusc9fPflH5i2XxejnvO/view?usp=drive_link');
        } else if (subName === 'מגברים') {
          return transformImageLink('https://drive.google.com/file/d/1WVwyorSCDVSFH8tVhbTkrdCMgAbCpRna/view?usp=drive_link');
        } else if (subName === 'אביזרים משלימים') {
          return transformImageLink('https://drive.google.com/file/d/1ANu1sSxiv6prXWdBCSkg6EDMWNktYHeg/view?usp=drive_link');
        } else if (subName && subName.includes('בידוריות')) {
          return transformImageLink('https://drive.google.com/file/d/1uWWpTJTAATxeUecKLrAcsYv-UuYJmQ16/view?usp=drive_link');
        } else if (subName === 'מיקסרים ומקרופונים' || subName === 'מיקסרים ומיקרופונים') {
          return transformImageLink('https://drive.google.com/file/d/1GtUymZdOSaALtyMVJ_znxYjlxwIE-PRb/view?usp=drive_link');
        } else if (subName === 'נתבים סלולריים תעשייתיים') {
          return 'https://placehold.co/600x400/f1f5f9/334155?text=Cellular+Routers';
        } else if (subName === 'מתגי POE - BoostLink') {
          return 'https://placehold.co/600x400/f1f5f9/334155?text=BoostLink+Switches';
        } else if (subName === 'Teltonika - מתגים ואביזרים') {
          return 'https://placehold.co/600x400/f1f5f9/334155?text=Teltonika+Network';
        } else if (subName === 'Teltonika - חיישני IoT') {
          return 'https://placehold.co/600x400/f1f5f9/334155?text=Teltonika+Sensors';
        } else if (subName === 'בקרות כניסה וקודנים') {
          return 'https://placehold.co/600x400/f1f5f9/334155?text=Access+Control';
        } else if (subName === 'כבלים אופטיים מוכנים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Pre-made+Optical+Cables';
        } else if (subName === 'מגשרים אופטיים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Patch+Cords';
        } else if (subName === 'פיגטיילים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Pigtails';
        } else if (subName === "פאץ' פאנלים") {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Patch+Panels';
        } else if (subName === 'שקעים אופטיים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Outlets';
        } else if (subName === 'מתאמים אופטיים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Adapters';
        } else if (subName === 'מחבר מהיר') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Fast+Connectors';
        } else if (subName === 'ארונות וארונות הסתעפות') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Cabinets';
        } else if (subName === 'ציודי בדיקה') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Testing+Equipment';
        } else if (subName === "מיני ג'יביקים") {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=SFP+Modules';
        } else if (subName === 'ממירים אופטיים') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Media+Converters';
        } else if (subName === 'כלי עבודה') {
          return 'https://placehold.co/600x400/f8fafc/0f172a?text=Optical+Tools';
        } else if (subName === 'מתגי ליבה אופטי - Access Switches L3') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000113563/DS-3E2736-HI-24F8T4X_F_202309.jpg?eo-img.format=webp';
        } else if (subName === 'מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)') {
          return 'https://assets.hikvision.com/prd/normal/all/image/m000034943/1524.png?eo-img.format=webp';
        } else if (subName === 'Inginium - גלילים CAT7') {
          return 'https://placehold.co/600x400/e0e7ff/0369a1?text=CAT7+Rolls';
        } else if (subName === 'Inginium - מגשרי CAT6A') {
          return 'https://placehold.co/600x400/e0e7ff/0369a1?text=CAT6A+Patch+Cords';
        }
        return '';
};

async function execute() {
    const productsCsvTxt = await fetchCSV('0');
    const products = parseCSV(productsCsvTxt);
    
    // gather unique catalog + subcategory combinations
    const uniqueSubsMap = new Map();
    products.forEach(item => {
        if(item.category && item.subcategory && item.active !== 'FALSE') {
             const k = `${item.category}____${item.subcategory}`;
             if(!uniqueSubsMap.has(k)) {
                 uniqueSubsMap.set(k, {category: item.category, subcategory: item.subcategory});
             }
        }
    });

    // Add virtual ones
    uniqueSubsMap.set(`מחירון תשתיות רשת מנחושת ואופטיקה____Inginium Full Channel`, {category: 'מחירון תשתיות רשת מנחושת ואופטיקה', subcategory: 'Inginium Full Channel'});
    uniqueSubsMap.set(`מחירון תקשורת HIKVISION____מתגי ליבה ורשת מנוהלים`, {category: 'מחירון תקשורת HIKVISION', subcategory: 'מתגי ליבה ורשת מנוהלים'});
    
    // Load old subcategories mapping
    const subcatsCsvTxt = await fetchCSV('1626175369');
    const oldSubcats = parseCSV(subcatsCsvTxt);
    
    const oldSubMap = new Map();
    oldSubcats.forEach(s => {
       if(s.category && s.subcategory) {
           oldSubMap.set(`${s.category}____${s.subcategory}`, s.image);
       }
    });
    
    let outRows = ['category,subcategory,image'];
    
    uniqueSubsMap.forEach((val, key) => {
        const c = val.category;
        const s = val.subcategory;
        let img = getCustomImage(s);
        if(!img && oldSubMap.has(key)) {
            img = oldSubMap.get(key);
        }
        if(!img) {
            // Find an image from products as fallback
            const fallbackProd = products.find(p => p.category === c && p.subcategory === s);
            if(fallbackProd) {
                let parsed = [];
                if (fallbackProd.imagesJSON) {
                    try { parsed = JSON.parse(fallbackProd.imagesJSON); } catch(e) {}
                    if (Array.isArray(parsed) && parsed.length) img = parsed[0];
                    else if (typeof parsed === 'string') img = parsed;
                }
                if (!img && fallbackProd.imageURL) {
                    img = fallbackProd.imageURL;
                }
            }
        }
        
        // Strip nested quotes if exist then wrap
        let safeC = `"${c.replace(/"/g, '""')}"`;
        let safeS = `"${s.replace(/"/g, '""')}"`;
        let safeI = img ? `"${img.replace(/"/g, '""')}"` : '';
        outRows.push(`${safeC},${safeS},${safeI}`);
    });
    
    fs.writeFileSync('export.csv', outRows.join('\n'));
    console.log('Done!');
}

execute().catch(console.error);
