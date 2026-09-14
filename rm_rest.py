import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = re.compile(r"      if \(shelvesCount === 0 && product\?\.description\) \{.*?    \}\n    return instances;", re.DOTALL)
text = bad.sub("    return instances;", text)

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
