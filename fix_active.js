import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `  const isComingSoon =`;
const replacement1 = `  const activeColKey = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === "active" || k.trim() === "פעיל",
  );
  const activeVal = activeColKey ? String(row[activeColKey] || "").trim().toLowerCase() : "";
  const isActive = activeColKey
    ? !(activeVal === "false" || activeVal === "no" || activeVal === "0" || activeVal === "לא" || activeVal === "n" || activeVal === "f" || activeVal === "לא פעיל")
    : true;

  const isComingSoon =`;

const target2 = `    isNew: isNew,`;
const replacement2 = `    active: isActive,
    isNew: isNew,`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);

// Find where direct link opens product
const target3 = `    if (productKey) {
      const needle = productKey.toLowerCase();
      const found = catalogData.find(
        (p: any) =>
          String(p.sku || "").toLowerCase() === needle ||
          String(p.id || "").toLowerCase() === needle,
      );
      if (found) {`;
const replacement3 = `    if (productKey) {
      const needle = productKey.toLowerCase();
      const found = catalogData.find(
        (p: any) =>
          String(p.sku || "").toLowerCase() === needle ||
          String(p.id || "").toLowerCase() === needle,
      );
      if (found && found.active) {`;

content = content.replace(target3, replacement3);

fs.writeFileSync('src/App.tsx', content);
