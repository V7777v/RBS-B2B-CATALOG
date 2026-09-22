import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

text = text.replace('className="w-full h-full block touch-none focus:outline-none"', 'className="w-full h-full block touch-pan-y focus:outline-none"')

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
