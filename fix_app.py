import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

bad_logic = '''        if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
          return (
            item.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            item.subcategory === "מתגי ליבה אופטי - Access Switches L3"
          );
        }'''

good_logic = '''        if (selectedSubcategory === "מתגי ליבה ורשת מנוהלים") {
          return (
            item.subcategory === "מתגי ליבה ורשת מנוהלים" ||
            item.subcategory ===
              "מתגי רשת מנוהלים - Smart Cloud Managed (ללא POE)" ||
            item.subcategory === "מתגי ליבה אופטי - Access Switches L3"
          );
        }'''

text = text.replace(bad_logic, good_logic)
with open('src/App.tsx', 'w') as f:
    f.write(text)
