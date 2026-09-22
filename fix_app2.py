import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

bad1 = '''          if (
            selectedSubcategory === "Inginium Full Channel" ||
            selectedSubcategory === "מתגי ליבה ורשת מנוהלים"
          ) {
            return item.subcategory === selectedNestedSubcategory;
          }'''

good1 = '''          if (
            selectedSubcategory === "Inginium Full Channel"
          ) {
            return item.subcategory === selectedNestedSubcategory;
          }'''
text = text.replace(bad1, good1)

bad2 = '''        if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
          return (
            item.subcategory === "מתגי ליבה ורשת מנוהלים" ||
            item.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            item.subcategory === "מתגי ליבה אופטי - Access Switches L3"
          );
        }'''

good2 = ''''''
text = text.replace(bad2, good2)

bad3 = '''    } else if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
      const explicitSubs = productsInCat
        .filter(
          (p) =>
            p.subcategory === "מתגי ליבה ורשת מנוהלים" ||
            p.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            p.subcategory === "מתגי ליבה אופטי - Access Switches L3",
        )
        .map((p) => p.subcategory);
      nestedSubs = [...new Set(explicitSubs)];'''

good3 = ''''''
text = text.replace(bad3, good3)

bad4 = '''        if (subName === "מתגי ליבה ורשת מנוהלים") {
          count += productsInCat.filter(
            (p) =>
              p.subcategory ===
                "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
              p.subcategory === "מתגי ליבה אופטי - Access Switches L3",
          ).length;
        }'''

good4 = ''''''
text = text.replace(bad4, good4)

with open('src/App.tsx', 'w') as f:
    f.write(text)
