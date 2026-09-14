import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

bad_nested = '''    } else if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
      const explicitSubs = productsInCat
        .filter(
          (p) =>
            p.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            p.subcategory === "מתגי ליבה אופטי - Access Switches L3",
        )
        .map((p) => p.subcategory);
      nestedSubs = [...new Set(explicitSubs)];
    }'''

good_nested = '''    } else if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
      const explicitSubs = productsInCat
        .filter(
          (p) =>
            p.subcategory === "מתגי ליבה ורשת מנוהלים" ||
            p.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            p.subcategory === "מתגי ליבה אופטי - Access Switches L3",
        )
        .map((p) => p.subcategory);
      nestedSubs = [...new Set(explicitSubs)];
    }'''

text = text.replace(bad_nested, good_nested)
with open('src/App.tsx', 'w') as f:
    f.write(text)
