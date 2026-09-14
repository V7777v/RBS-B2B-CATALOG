import re
with open('src/components/Cabinet3D/Product3DMeshes.ts', 'r') as f:
    text = f.read()

bad_extract = """export function extractSafeProductImage(rawImage: any): string {
  if (!rawImage) return '';
  const str = String(rawImage).trim();
  if (!str) return '';
  const match = str.match(/https?:\\/\\/[^\\s"',;<>]+/i);
  if (match && match[0]) {
    return match[0].trim();
  }
  return str;
}"""

good_extract = """export function extractSafeProductImage(rawImage: any): string {
  if (!rawImage) return '';
  const str = String(rawImage).trim();
  if (!str) return '';
  try {
    const url = new URL(str);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return str;
    }
  } catch (e) {}
  
  // If multiple items, try to find the first URL. Don't split by comma if it's part of a valid URL parameter.
  const match = str.match(/https?:\\/\\/[^\\s"<>]+/i);
  if (match && match[0]) {
    return match[0].trim();
  }
  return str;
}"""

text = text.replace(bad_extract, good_extract)

bad_image_logic = """  const rawImage = isShelf ? null : (assetDef?.frontTextureUrl || extractSafeProductImage(item.image));"""
good_image_logic = """  const rawImage = assetDef?.frontTextureUrl || extractSafeProductImage(item.image);"""

text = text.replace(bad_image_logic, good_image_logic)

bad_front_pos = """          const frontMesh = new THREE.Mesh(frontGeom, frontMat);
          frontMesh.position.set(0, 0, 0.042);
          frontFaceGroup.add(frontMesh);"""

good_front_pos = """          const frontMesh = new THREE.Mesh(frontGeom, frontMat);
          if (isShelf) {
            frontMesh.rotation.x = -Math.PI / 2;
            frontMesh.position.set(0, -spanHeight / 2 + 0.082, -0.2); // Lay flat on shelf
          } else {
            frontMesh.position.set(0, 0, 0.042);
          }
          frontFaceGroup.add(frontMesh);"""

text = text.replace(bad_front_pos, good_front_pos)

with open('src/components/Cabinet3D/Product3DMeshes.ts', 'w') as f:
    f.write(text)
