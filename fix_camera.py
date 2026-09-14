import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

# Fix fitCameraToCabinet
bad1 = r"const targetDist = Math.max\(distH, distW\) \* 1\.34;"
good1 = "const targetDist = (Math.max(distH, distW) * 1.34) + ((dims.depthMm * SCALE_MM_TO_UNITS) / 2);"
text = re.sub(bad1, good1, text)

# Fix setFrontView
bad2 = r"const targetDist = Math.max\(distH, distW\) \* 1\.30;"
good2 = "const targetDist = (Math.max(distH, distW) * 1.30) + ((dims.depthMm * SCALE_MM_TO_UNITS) / 2);"
text = re.sub(bad2, good2, text)

# Fix focusOnSelectedProduct
bad3 = r"const endPos = new THREE\.Vector3\(0\.3, targetY \+ 0\.15, 2\.5\);"
good3 = "const endPos = new THREE.Vector3(0.3, targetY + 0.15, ((dims.depthMm * SCALE_MM_TO_UNITS) / 2) + 2.0);"
text = re.sub(bad3, good3, text)

with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
