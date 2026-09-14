import re
with open('src/components/Cabinet3D/Product3DMeshes.ts', 'r') as f:
    text = f.read()

bad = """          // Full-width 19" rack opening faceplate presentation
          const planeW = USABLE_OPENING_WIDTH * 0.995;
          const planeH = spanHeight * 0.98;
          const frontGeom = new THREE.PlaneGeometry(planeW, planeH);"""

good = """          // Preserve image aspect ratio
          const imgAspect = texture.image ? (texture.image.width / texture.image.height) : 1;
          const maxW = USABLE_OPENING_WIDTH * 0.995;
          const maxH = spanHeight * 0.98;
          const slotAspect = maxW / maxH;
          
          let planeW = maxW;
          let planeH = maxH;
          
          // If the image is roughly 19" equipment proportion (very wide), stretch slightly to fit
          if (imgAspect > 3.0) {
             planeW = maxW;
             planeH = maxH;
          } else {
             // It's a square-ish catalog photo, fit it cleanly inside the slot without distortion
             if (imgAspect > slotAspect) {
               planeW = maxW;
               planeH = maxW / imgAspect;
             } else {
               planeH = maxH;
               planeW = maxH * imgAspect;
             }
          }
          const frontGeom = new THREE.PlaneGeometry(planeW, planeH);"""

text = text.replace(bad, good)
with open('src/components/Cabinet3D/Product3DMeshes.ts', 'w') as f:
    f.write(text)
