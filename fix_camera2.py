import re
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'r') as f:
    text = f.read()

bad = """    stagingAccessoriesGroupRef.current = stagingAccessoriesGroup;
    hasStagingContentRef.current = Boolean(hasStagingContent);
    frameGroupRef.current.add(newFrameGroup);
    fitCameraToCabinet(true);
    needsRenderRef.current = true;
  }, [dims.totalU, dims.widthMm, dims.depthMm, cabinetData?.sku, fitCameraToCabinet, dims, optionalFansCount, isWheelsSelected, isFeetSelected]);"""

good = """    stagingAccessoriesGroupRef.current = stagingAccessoriesGroup;
    hasStagingContentRef.current = Boolean(hasStagingContent);
    frameGroupRef.current.add(newFrameGroup);
    
    if (previousCabinetSkuRef.current !== cabinetData?.sku) {
      fitCameraToCabinet(true);
      previousCabinetSkuRef.current = cabinetData?.sku;
    }
    
    needsRenderRef.current = true;
  }, [dims.totalU, dims.widthMm, dims.depthMm, cabinetData?.sku, fitCameraToCabinet, dims, optionalFansCount, isWheelsSelected, isFeetSelected]);"""

text = text.replace(bad, good)
with open('src/components/Cabinet3D/Cabinet3DViewer.tsx', 'w') as f:
    f.write(text)
