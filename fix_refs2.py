import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = r"  const meshMapRef = useRef<Map<string, MeshCacheEntry>>\(new Map\(\)\);"
good = "  const meshMapRef = useRef<Map<string, MeshCacheEntry>>(new Map());\n  const previousCabinetSkuRef = useRef<string | undefined>();"
text = re.sub(bad, good, text)

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
