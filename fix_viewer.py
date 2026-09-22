import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = re.compile(r"    // Fallback: If slots didn't contain preset-shelf instances.*?    \}\n", re.DOTALL)
text = bad.sub("", text)

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
