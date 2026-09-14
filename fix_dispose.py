import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = """  // Helper to cleanly dispose all meshes, geometries, and textures inside a group
  const disposeHierarchy = (group: THREE.Group) => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => {
              if ((m as any).map) (m as any).map.dispose();
              m.dispose();
            });
          } else {
            if ((mesh.material as any).map) (mesh.material as any).map.dispose();
            mesh.material.dispose();
          }
        }
      }
    });"""

good = """  // Helper to cleanly dispose all meshes, geometries, and textures inside a group
  const disposeHierarchy = (group: THREE.Group) => {
    const sharedMats = Object.values(materialsRef.current);
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => {
              if ((m as any).map) (m as any).map.dispose();
              if (!sharedMats.includes(m as any)) m.dispose();
            });
          } else {
            if ((mesh.material as any).map) (mesh.material as any).map.dispose();
            if (!sharedMats.includes(mesh.material as any)) mesh.material.dispose();
          }
        }
      }
    });"""

text = text.replace(bad, good)
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
