import re
with open('src/App.tsx', 'r') as f:
    text = f.read()

bad1 = '''        if (
          selectedSubcategory === "Inginium Full Channel" ||
          selectedSubcategory === "מתגי ליבה ורשת מנוהלים"
        ) {'''

good1 = '''        if (
          selectedSubcategory === "Inginium Full Channel"
        ) {'''

text = text.replace(bad1, good1)

with open('src/App.tsx', 'w') as f:
    f.write(text)
