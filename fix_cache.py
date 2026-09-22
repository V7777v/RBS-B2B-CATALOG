import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = """      const existing = cachedMeshMap.get(item.instanceId);
      if (existing) {
        // Instance already existed: check if position changed (Move Animation)"""

good = """      const existing = cachedMeshMap.get(item.instanceId);
      const hasDataChanged = existing && (existing.item.sku !== item.sku || existing.item.image !== item.image || existing.item.type !== item.type);
      
      if (existing && hasDataChanged) {
        // Data changed significantly, rebuild mesh
        if (existing.cancelTexture) existing.cancelTexture();
        disposeHierarchy(existing.mesh);
        
        const productMesh = buildProduct3DMesh(item, innerDepthUnits, materials, () => {
          needsRenderRef.current = true;
        });
        const cancelFn = (productMesh as any)._cancelTexture;
        productMesh.position.set(0, targetCenterY, frontRailZ);
        
        cachedMeshMap.set(item.instanceId, {
          mesh: productMesh,
          uStart: item.uStart,
          uSpan: item.uSpan,
          lastY: targetCenterY,
          cancelTexture: cancelFn,
          item,
        });
        productsGroupRef.current.add(productMesh);
      } else if (existing) {
        // Instance already existed: check if position changed (Move Animation)"""

text = text.replace(bad, good)
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
