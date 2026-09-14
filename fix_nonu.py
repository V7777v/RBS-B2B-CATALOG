import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = """      if (zone === 'roof') {
        const isFan = /מאוורר|fan|מפוח|איוורור/i.test(acc.name || '');
        if (!isFan) {
          // Roof brush entry / auxiliary plate
          const roofMesh = buildRoofAccessoryMesh(itemData, widthUnits, depthUnits, materials);
          roofMesh.position.set(0, halfH + 0.04, 0);
          nonUGroupRef.current.add(roofMesh);
        }
      } else if (zone === 'vertical') {
        const vertMesh = buildVerticalAccessoryMesh(itemData, dims.totalU * U_HEIGHT_UNITS, materials);
        vertMesh.position.set(widthUnits / 2 - 0.35, 0, -depthUnits / 4);
        nonUGroupRef.current.add(vertMesh);
      }
    });"""

good = """      if (zone === 'roof') {
        const isFan = /מאוורר|fan|מפוח|איוורור/i.test(acc.name || '');
        if (!isFan) {
          // Roof brush entry / auxiliary plate
          const roofMesh = buildRoofAccessoryMesh(itemData, widthUnits, depthUnits, materials);
          roofMesh.position.set(0, halfH + 0.04, 0);
          nonUGroupRef.current.add(roofMesh);
        }
      } else if (zone === 'vertical') {
        const vertMesh = buildVerticalAccessoryMesh(itemData, dims.totalU * U_HEIGHT_UNITS, materials);
        vertMesh.position.set(widthUnits / 2 - 0.35, 0, -depthUnits / 4);
        nonUGroupRef.current.add(vertMesh);
      } else if (zone === 'plinth' || zone === 'hardware') {
        // Hardware and plinth elements (like feet, wheels, screws) are drawn implicitly by the cabinet frame if included,
        // but if they are added as accessories we don't draw extra 3D instances for them to avoid clutter.
        // We ensure they are NOT dropped from the details array by maintaining them in nonUAccessories,
        // but we simply skip rendering independent 3D meshes for them here.
      }
    });"""

text = text.replace(bad, good)
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
