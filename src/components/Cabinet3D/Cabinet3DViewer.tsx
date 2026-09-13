import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cabinet3DViewerProps, Product3DInstance } from './Cabinet3DTypes';
import { resolveCabinetDimensions, buildCabinetFrameGroup, SCALE_MM_TO_UNITS, U_HEIGHT_UNITS } from './CabinetModelBuilder';
import {
  buildProduct3DMesh,
  buildEmptySlotHitbox,
  buildVerticalAccessoryMesh,
  buildHardwareBoxMesh,
  buildRoofAccessoryMesh,
} from './Product3DMeshes';
import { RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut, Box, Layers, ShieldCheck, Info, HelpCircle } from 'lucide-react';

export const Cabinet3DViewer: React.FC<Cabinet3DViewerProps> = ({
  product,
  cabinetData,
  totalU,
  slots,
  selectedOptionals,
  nonUAccessories,
  includedItems,
  availableU,
  usedU,
  highlightedOptIdx,
  lastAddedInstanceId,
  selectedSlotU,
  hoveredProduct,
  onProductHover,
  onProductInspect,
  onSlotClickToAdd,
  onOpenAuxiliaryModal,
  onIncrementQuantity,
  onRemoveOptional,
  onFallbackTo2D,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const needsRenderRef = useRef<boolean>(true);
  const isAnimatingRef = useRef<boolean>(false);

  // Group hierarchy persisted in scene
  const frameGroupRef = useRef<THREE.Group>(new THREE.Group());
  const productsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hitboxesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const nonUGroupRef = useRef<THREE.Group>(new THREE.Group());
  const stagingTrayGroupRef = useRef<THREE.Group | null>(null);
  const uCentersRef = useRef<number[]>([]);
  const innerDepthUnitsRef = useRef<number>(3.0);
  const animatedInstanceIdsRef = useRef<Set<string>>(new Set());

  // Stable callback & dynamic state refs so event listeners never need rebinding
  const onProductHoverRef = useRef(onProductHover);
  const onProductInspectRef = useRef(onProductInspect);
  const onSlotClickToAddRef = useRef(onSlotClickToAdd);
  const onFallbackTo2DRef = useRef(onFallbackTo2D);
  const slotsRef = useRef(slots);

  useEffect(() => {
    onProductHoverRef.current = onProductHover;
    onProductInspectRef.current = onProductInspect;
    onSlotClickToAddRef.current = onSlotClickToAdd;
    onFallbackTo2DRef.current = onFallbackTo2D;
    slotsRef.current = slots;
  });

  const [isWidescreen, setIsWidescreen] = useState(false);
  const [hoveredSlotU, setHoveredSlotU] = useState<number | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [mobileTouchMode, setMobileTouchMode] = useState<'orbit' | 'scroll'>('orbit');

  // Derive verified dimensions
  const dims = useMemo(() => {
    return resolveCabinetDimensions(product, cabinetData, totalU);
  }, [product, cabinetData, totalU]);

  // Extract included items count for 3D overlay summary
  const includedSummary = useMemo(() => {
    const list: string[] = [];
    const fansMatch = (cabinetData?.fans || '').trim();
    if (fansMatch && fansMatch !== 'X' && fansMatch !== '0') list.push(`${fansMatch} מאווררים בגג`);

    const wheelsMatch = (cabinetData?.wheels || '').trim();
    if (wheelsMatch && wheelsMatch !== 'X' && wheelsMatch !== '0') list.push(`${wheelsMatch} גלגלים`);

    const feetMatch = (cabinetData?.levelingFeet || '').trim();
    if (feetMatch && feetMatch !== 'X' && feetMatch !== '0') list.push(`${feetMatch} רגליות`);

    const shelvesMatch = (cabinetData?.shelvesQty || '').trim();
    if (shelvesMatch && shelvesMatch !== 'X' && shelvesMatch !== '0') list.push(`${shelvesMatch} מדפי מתכת`);

    return list;
  }, [cabinetData]);

  // Build product 3D instance list from slots
  const productInstances = useMemo(() => {
    const instances: Product3DInstance[] = [];
    // We iterate through slots to find anchors
    slots.forEach(slot => {
      if (slot.type === 'empty') return;
      if (slot.type === 'optional-accessory' && slot.isAnchor === false) return; // continuation row

      const spanU = slot.spanU || 1;
      const uStart = slot.uIndex - spanU + 1; // 1-based bottom of the span
      const isIncluded = slot.type === 'preset-shelf' || slot.type === 'preset-fan';
      const instId = slot.instanceId || `item-${slot.uIndex}-${slot.name}`;

      instances.push({
        instanceId: instId,
        sku: slot.accessoryRef?.sku || slot.accessoryRef?.pn || (isIncluded ? 'BUILTIN' : ''),
        name: slot.name,
        description: slot.description || '',
        price: slot.accessoryRef?.price || 0,
        uStart,
        uSpan: spanU,
        isIncluded,
        type: (slot.type === 'preset-shelf' || slot.name.includes('מדף')) ? 'shelf' : (slot.name.includes('שקע') || slot.name.includes('PDU')) ? 'pdu' : (slot.name.includes('פנל') || slot.name.includes('עיוור') || slot.name.includes('מברשת')) ? 'panel' : 'active',
        image: slot.accessoryRef?.image,
        optionalIdx: slot.optionalIdx,
        accessoryRef: slot.accessoryRef,
      });
    });
    return instances;
  }, [slots]);

  // Empty slots for keyboard/HTML accessible selector
  const emptySlots = useMemo(() => {
    return slots.filter(s => s.type === 'empty');
  }, [slots]);

  // Camera fit helper with responsive bounds for all aspect ratios & cabinet sizes
  const fitCameraToCabinet = useCallback((instant: boolean = false) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls) return;

    const widthUnits = dims.widthMm * SCALE_MM_TO_UNITS + 2.8; // include staging tray
    const depthUnits = dims.depthMm * SCALE_MM_TO_UNITS;
    const heightUnits = dims.totalU * U_HEIGHT_UNITS + 1.2; // include roof and base margins

    const aspect = container ? (container.clientWidth / (container.clientHeight || 1)) : (camera.aspect || 1);
    const fovRad = (camera.fov * Math.PI) / 180;
    
    // Vertical distance needed to fit full cabinet height without clipping
    const distH = (heightUnits / 2) / Math.tan(fovRad / 2);
    // Horizontal distance needed to fit cabinet width + accessories tray on any aspect ratio
    const distW = (widthUnits / 2) / (Math.tan(fovRad / 2) * Math.max(aspect, 0.45));
    const targetDist = Math.max(distH, distW) * 1.34;

    controls.target.set(0, 0, 0);

    // Default angle: slight isometric frontal view (25 deg azimuth, 15 deg elevation)
    const targetPos = new THREE.Vector3(
      Math.sin(0.35) * targetDist,
      targetDist * 0.22,
      Math.cos(0.35) * targetDist
    );

    camera.position.copy(targetPos);
    controls.update();
    needsRenderRef.current = true;
  }, [dims]);

  // Set camera to flat front view
  const setFrontView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls) return;

    const widthUnits = dims.widthMm * SCALE_MM_TO_UNITS + 2.8;
    const heightUnits = dims.totalU * U_HEIGHT_UNITS + 1.2;
    const aspect = container ? (container.clientWidth / (container.clientHeight || 1)) : (camera.aspect || 1);
    const fovRad = (camera.fov * Math.PI) / 180;
    const distH = (heightUnits / 2) / Math.tan(fovRad / 2);
    const distW = (widthUnits / 2) / (Math.tan(fovRad / 2) * Math.max(aspect, 0.45));
    const targetDist = Math.max(distH, distW) * 1.30;

    controls.target.set(0, 0, 0);
    camera.position.set(0, 0, targetDist);
    controls.update();
    needsRenderRef.current = true;
  }, [dims]);

  // Helper to cleanly dispose all meshes, geometries, and textures inside a group
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
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  };

  // Shared Materials
  const materialsRef = useRef<any>(null);
  if (!materialsRef.current) {
    materialsRef.current = {
      frameMat: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.65,
      }),
      railMat: new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.25,
        metalness: 0.85,
      }),
      panelMat: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.5,
      }),
      metalMat: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.25,
        metalness: 0.8,
      }),
      accentMat: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.3,
      }),
      rubberMat: new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.1,
      }),
      shelfMat: new THREE.MeshStandardMaterial({
        color: 0x065f46,
        roughness: 0.3,
        metalness: 0.7,
      }),
      includedShelfMat: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.75,
      }),
      activeChassisMat: new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.3,
        metalness: 0.7,
      }),
      pduMat: new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.35,
        metalness: 0.6,
      }),
      earMat: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.2,
        metalness: 0.9,
      }),
      ledMat: new THREE.MeshBasicMaterial({
        color: 0x10b981,
      }),
    };
  }

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Camera
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    cameraRef.current = camera;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 45.0;
    controls.maxPolarAngle = Math.PI * 0.54; // Keep above ground
    controls.minPolarAngle = Math.PI * 0.12; // Avoid overhead singularity
    // Restrict azimuth to front-facing arc so interior is always visible
    controls.minAzimuthAngle = -Math.PI * 0.44;
    controls.maxAzimuthAngle = Math.PI * 0.44;
    controlsRef.current = controls;

    // 5. Lighting (Bright, clear, industrial)
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.1);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainDirLight.position.set(5, 12, 8);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 1024;
    mainDirLight.shadow.mapSize.height = 1024;
    mainDirLight.shadow.camera.near = 0.5;
    mainDirLight.shadow.camera.far = 40;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.7);
    fillLight.position.set(-6, 4, 6);
    scene.add(fillLight);

    const interiorDownLight = new THREE.PointLight(0xffffff, 0.8, 12);
    interiorDownLight.position.set(0, 4, 0);
    scene.add(interiorDownLight);

    // Attach persistent groups to scene
    scene.add(frameGroupRef.current);
    scene.add(productsGroupRef.current);
    scene.add(hitboxesGroupRef.current);
    scene.add(nonUGroupRef.current);

    // 9. Resize Handling via ResizeObserver
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      needsRenderRef.current = true;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // Configure touch actions based on mobile mode
    if (mobileTouchMode === 'scroll') {
      controls.enabled = false;
      canvas.style.touchAction = 'pan-y';
    } else {
      controls.enabled = true;
      canvas.style.touchAction = 'none';
    }

    // 10. Raycasting Interaction & Drag-vs-Click Threshold Detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoverClearTimer: any = null;

    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handlePointerDown = (e: MouseEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      pointerDownTime = Date.now();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const getRaycastTargets = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(scene.children, true);
    };

    const handlePointerMove = (e: MouseEvent) => {
      needsRenderRef.current = true;
      const intersects = getRaycastTargets(e.clientX, e.clientY);
      let foundEmpty: number | null = null;
      let foundProduct: any = null;

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== scene) {
          if ((obj as any).userData?.isEmptySlot) {
            foundEmpty = (obj as any).userData.uIndex;
            break;
          }
          if ((obj as any).userData?.isProductMesh) {
            foundProduct = (obj as any).userData.item;
            break;
          }
          obj = obj.parent;
        }
        if (foundEmpty || foundProduct) break;
      }

      setHoveredSlotU(foundEmpty);

      if (foundProduct) {
        if (hoverClearTimer) {
          clearTimeout(hoverClearTimer);
          hoverClearTimer = null;
        }
        setActiveInstanceId(foundProduct.instanceId);
        const currentSlots = slotsRef.current || [];
        const matchedSlot = currentSlots.find((s: any) => s.instanceId === foundProduct.instanceId || s.uIndex === foundProduct.uStart);
        if (matchedSlot) {
          onProductHoverRef.current(matchedSlot);
        } else {
          onProductHoverRef.current({
            uIndex: foundProduct.uStart || 0,
            type: foundProduct.isIncluded ? 'preset-shelf' : 'optional',
            name: foundProduct.name,
            description: foundProduct.description,
            spanU: foundProduct.uSpan || 0,
            instanceId: foundProduct.instanceId,
            accessoryRef: {
              ...foundProduct,
              isPreset: foundProduct.isIncluded,
              sku: foundProduct.sku,
              price: foundProduct.price || 0,
            }
          } as any);
        }
        canvas.style.cursor = 'pointer';
      } else {
        setActiveInstanceId(null);
        if (foundEmpty) {
          canvas.style.cursor = 'crosshair';
        } else {
          canvas.style.cursor = 'grab';
        }
        // Grace period before clearing hover to prevent HUD flickering
        if (!hoverClearTimer) {
          hoverClearTimer = setTimeout(() => {
            onProductHoverRef.current(null);
            hoverClearTimer = null;
          }, 280);
        }
      }
    };

    // Rotation is NOT mistakenly counted as a click:
    const handleClick = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      const elapsed = Date.now() - pointerDownTime;
      // If moved > 7px or held > 450ms, it was an orbit rotation or drag gesture, not a click!
      if (dist > 7 || elapsed > 450) {
        return;
      }

      const intersects = getRaycastTargets(e.clientX, e.clientY);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== scene) {
          if ((obj as any).userData?.isEmptySlot) {
            const uIdx = (obj as any).userData.uIndex;
            onSlotClickToAddRef.current(uIdx);
            return;
          }
          if ((obj as any).userData?.isProductMesh) {
            const item = (obj as any).userData.item;
            const currentSlots = slotsRef.current || [];
            const matchedSlot = currentSlots.find((s: any) => s.instanceId === item.instanceId || s.uIndex === item.uStart);
            if (matchedSlot) {
              onProductInspectRef.current(matchedSlot);
            } else {
              onProductInspectRef.current({
                uIndex: item.uStart || 0,
                type: item.isIncluded ? 'preset-shelf' : 'optional',
                name: item.name,
                description: item.description,
                spanU: item.uSpan || 0,
                instanceId: item.instanceId,
                accessoryRef: {
                  ...item,
                  isPreset: item.isIncluded,
                  sku: item.sku,
                  price: item.price || 0,
                }
              } as any);
            }
            return;
          }
          obj = obj.parent;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
      const elapsed = Date.now() - touchStartTime;
      // If moved > 9px or held > 450ms, it was a touch gesture/drag, not a tap
      if (dist > 9 || elapsed > 450) {
        return;
      }

      const intersects = getRaycastTargets(touch.clientX, touch.clientY);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== scene) {
          if ((obj as any).userData?.isEmptySlot) {
            const uIdx = (obj as any).userData.uIndex;
            onSlotClickToAddRef.current(uIdx);
            return;
          }
          if ((obj as any).userData?.isProductMesh) {
            const item = (obj as any).userData.item;
            const currentSlots = slotsRef.current || [];
            const matchedSlot = currentSlots.find((s: any) => s.instanceId === item.instanceId || s.uIndex === item.uStart);
            if (matchedSlot) {
              onProductInspectRef.current(matchedSlot);
            } else {
              onProductInspectRef.current({
                uIndex: item.uStart || 0,
                type: item.isIncluded ? 'preset-shelf' : 'optional',
                name: item.name,
                description: item.description,
                spanU: item.uSpan || 0,
                instanceId: item.instanceId,
                accessoryRef: {
                  ...item,
                  isPreset: item.isIncluded,
                  sku: item.sku,
                  price: item.price || 0,
                }
              } as any);
            }
            return;
          }
          obj = obj.parent;
        }
      }
    };

    // WebGL Context Loss Handler: Revert cleanly to 2D view without losing data
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[Cabinet3DViewer] WebGL context lost. Gracefully falling back to 2D view.');
      if (onFallbackTo2DRef.current) {
        onFallbackTo2DRef.current();
      }
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // 11. Render Loop: Demand-based rendering stops continuous cycles when idle
    const onControlsChange = () => {
      needsRenderRef.current = true;
    };
    controls.addEventListener('change', onControlsChange);

    const render = () => {
      const controlsDampingActive = controls.update();
      if (controlsDampingActive || needsRenderRef.current || isAnimatingRef.current) {
        renderer.render(scene, camera);
        needsRenderRef.current = false;
      }
      animFrameIdRef.current = requestAnimationFrame(render);
    };
    render();

    // 12. Cleanup: Full GPU and memory resource disposal on unmount
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (hoverClearTimer) clearTimeout(hoverClearTimer);
      resizeObserver.disconnect();

      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('webglcontextlost', handleContextLost);

      controls.removeEventListener('change', onControlsChange);
      controls.dispose();

      disposeHierarchy(frameGroupRef.current);
      disposeHierarchy(productsGroupRef.current);
      disposeHierarchy(hitboxesGroupRef.current);
      disposeHierarchy(nonUGroupRef.current);
      if (stagingTrayGroupRef.current) {
        disposeHierarchy(stagingTrayGroupRef.current);
      }

      if (materialsRef.current) {
        Object.values(materialsRef.current).forEach((m: any) => {
          if (m && typeof m.dispose === 'function') m.dispose();
        });
      }

      renderer.dispose();
      scene.clear();
    };
  }, []); // Engine mounts ONCE

  // ==========================================
  // EFFECT 2: Frame Geometry & Cabinet Framing
  // Runs ONLY when cabinet physical model or dimensions change
  // ==========================================
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(frameGroupRef.current);
    if (stagingTrayGroupRef.current) {
      disposeHierarchy(stagingTrayGroupRef.current);
    }

    const { group: newFrameGroup, uCenters, innerDepthUnits, stagingTrayGroup } = buildCabinetFrameGroup(
      dims,
      cabinetData,
      materialsRef.current
    );

    uCentersRef.current = uCenters;
    innerDepthUnitsRef.current = innerDepthUnits;
    stagingTrayGroupRef.current = stagingTrayGroup;

    frameGroupRef.current.add(newFrameGroup);
    fitCameraToCabinet(true);
    needsRenderRef.current = true;
  }, [dims.totalU, dims.widthMm, dims.depthMm, cabinetData?.sku, fitCameraToCabinet, dims]);

  // ==========================================
  // EFFECT 3: Equipment & Slot Synchronization
  // Runs when slots, optionals, or non-U accessories change.
  // CAMERA POSITION, ANGLE AND ZOOM REMAIN COMPLETELY UNTOUCHED!
  // ==========================================
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(hitboxesGroupRef.current);
    disposeHierarchy(productsGroupRef.current);
    disposeHierarchy(nonUGroupRef.current);

    const uCenters = uCentersRef.current;
    const innerDepthUnits = innerDepthUnitsRef.current;
    const materials = materialsRef.current;

    // 1. Rebuild Hitboxes for Empty Slots
    slots.forEach(slot => {
      if (slot.type === 'empty') {
        const uIdx = slot.uIndex;
        const centerY = uCenters[uIdx - 1];
        if (centerY !== undefined) {
          const isSelected = selectedSlotU === uIdx;
          const hitbox = buildEmptySlotHitbox(uIdx, centerY, innerDepthUnits, isSelected);
          hitboxesGroupRef.current.add(hitbox);
        }
      }
    });

    // 2. Rebuild Installed Equipment Meshes
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frontRailZ = (dims.depthMm * SCALE_MM_TO_UNITS) / 2 - 0.55;

    productInstances.forEach(item => {
      const bottomCenterY = uCenters[item.uStart - 1];
      const topCenterY = uCenters[item.uStart + item.uSpan - 2] || bottomCenterY;
      const centerY = (bottomCenterY !== undefined && topCenterY !== undefined) ? (bottomCenterY + topCenterY) / 2 : 0;

      const productMesh = buildProduct3DMesh(item, innerDepthUnits, materials, () => {
        needsRenderRef.current = true;
      });

      // Animate ONLY newly added instances that have not yet played their entrance animation
      const isNew = item.instanceId === lastAddedInstanceId && !animatedInstanceIdsRef.current.has(item.instanceId);

      if (isNew && !prefersReducedMotion) {
        animatedInstanceIdsRef.current.add(item.instanceId);
        productMesh.position.set(0, centerY, frontRailZ + 0.9);
        let progress = 0;
        const startZ = frontRailZ + 0.9;
        const endZ = frontRailZ;
        isAnimatingRef.current = true;

        const animateIn = () => {
          progress += 0.09;
          if (progress < 1) {
            productMesh.position.z = THREE.MathUtils.lerp(startZ, endZ, Math.sin((progress * Math.PI) / 2));
            needsRenderRef.current = true;
            requestAnimationFrame(animateIn);
          } else {
            productMesh.position.z = endZ;
            isAnimatingRef.current = false;
            needsRenderRef.current = true;
          }
        };
        requestAnimationFrame(animateIn);
      } else {
        productMesh.position.set(0, centerY, frontRailZ);
      }

      productsGroupRef.current.add(productMesh);
    });

    // 3. Rebuild 0U / Non-U Accessories
    const halfH = (dims.totalU * U_HEIGHT_UNITS) / 2;
    const widthUnits = dims.widthMm * SCALE_MM_TO_UNITS;
    const depthUnits = dims.depthMm * SCALE_MM_TO_UNITS;

    (nonUAccessories || []).forEach((acc, idx) => {
      const zone = acc.zone || 'hardware';
      const itemData = {
        sku: acc.sku || acc.pn || `0U-${idx}`,
        name: acc.name,
        description: acc.description || '',
        quantity: acc.quantity || 1,
        zone,
        isIncluded: Boolean(acc.isIncluded || acc.isPreset),
        optionalIdx: acc.optionalIdx,
        accessoryRef: acc,
      };

      if (zone === 'roof') {
        const roofMesh = buildRoofAccessoryMesh(itemData, widthUnits, depthUnits, materials);
        roofMesh.position.set(0, halfH + 0.12, 0);
        nonUGroupRef.current.add(roofMesh);
      } else if (zone === 'vertical') {
        const vertMesh = buildVerticalAccessoryMesh(itemData, dims.totalU * U_HEIGHT_UNITS, materials);
        vertMesh.position.set(widthUnits / 2 - 0.35, 0, -depthUnits / 4);
        nonUGroupRef.current.add(vertMesh);
      } else {
        const hwMesh = buildHardwareBoxMesh(itemData, materials);
        const offsetX = (idx % 2 === 0 ? -0.32 : 0.32);
        const offsetZ = -0.30 + Math.floor(idx / 2) * 0.48;
        hwMesh.position.set(offsetX, 0.05, offsetZ);
        if (stagingTrayGroupRef.current) {
          stagingTrayGroupRef.current.add(hwMesh);
        } else {
          hwMesh.position.set(widthUnits / 2 + 1.25 + offsetX, -halfH - 0.18, offsetZ);
          nonUGroupRef.current.add(hwMesh);
        }
      }
    });

    needsRenderRef.current = true;
  }, [productInstances, slots, nonUAccessories, selectedSlotU, lastAddedInstanceId, dims.depthMm, dims.totalU, dims.widthMm]);

  // ==========================================
  // EFFECT 4: Mobile Touch Mode
  // ==========================================
  useEffect(() => {
    const controls = controlsRef.current;
    const canvas = canvasRef.current;
    if (!controls || !canvas) return;

    if (mobileTouchMode === 'scroll') {
      controls.enabled = false;
      canvas.style.touchAction = 'pan-y';
    } else {
      controls.enabled = true;
      canvas.style.touchAction = 'none';
    }
    needsRenderRef.current = true;
  }, [mobileTouchMode]);

  return (
    <div
      ref={containerRef}
      className={`relative border-4 border-slate-700 bg-slate-950 flex flex-col overflow-hidden transition-all duration-300 select-none shadow-2xl ${
        isWidescreen ? 'h-[650px] sm:h-[720px]' : 'h-[500px] sm:h-[580px]'
      } ${className}`}
      dir="rtl"
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none focus:outline-none"
        tabIndex={0}
        aria-label="הדמיית ארון תקשורת תלת-ממדית אינטראקטיבית"
      />

      {/* Top HUD Toolbar: Dimensions, Schematic Indicator, Quick Controls */}
      <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
        {/* Left Side: Status Badge */}
        <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[11px] px-2.5 py-1 flex items-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold">{dims.totalU}U</span>
            <span className="text-slate-400 text-[10px] font-mono">
              {dims.widthMm}x{dims.depthMm}mm
            </span>
          </div>

          {dims.isSchematicDimensions && (
            <div className="bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] px-2 py-1 flex items-center gap-1 font-semibold">
              <Info size={12} />
              <span>המחשה סכמטית</span>
            </div>
          )}

          {hoveredSlotU !== null && (
            <div className="bg-[#004387] border border-blue-400 text-white text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 shadow-lg animate-in fade-in">
              <span>➕ לחץ להוספה ב-U{hoveredSlotU}</span>
            </div>
          )}
        </div>

        {/* Right Side: Camera Control Buttons & Mobile Touch Mode */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1 pointer-events-auto shadow-md">
          <button
            type="button"
            onClick={() => setMobileTouchMode(m => m === 'orbit' ? 'scroll' : 'orbit')}
            className={`sm:hidden px-2 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${
              mobileTouchMode === 'orbit'
                ? 'bg-blue-600/90 text-white border-blue-400'
                : 'bg-slate-800 text-slate-300 border-slate-600'
            }`}
            title="החלף בין סיבוב המודל לגלילת העמוד במובייל"
          >
            {mobileTouchMode === 'orbit' ? 'סיבוב 3D' : 'גלילת עמוד'}
          </button>
          <button
            type="button"
            onClick={() => fitCameraToCabinet(false)}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="הצג את כל הארון (איפוס מצלמה)"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={setFrontView}
            className="px-2 py-1 text-[10.5px] font-semibold hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border-r border-slate-800"
            title="מבט חזיתי ישר"
          >
            חזית
          </button>
          <button
            type="button"
            onClick={() => setIsWidescreen(w => !w)}
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isWidescreen ? 'תצוגה רגילה' : 'תצוגה מוגדלת / רחבה'}
          >
            {isWidescreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Bottom HUD: Included Items Chips & Auxiliary 0U Quick Add */}
      <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
        {/* Included Items Details */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 text-[10.5px] px-2.5 py-1.5 flex items-center gap-2 pointer-events-auto shadow-md max-w-md overflow-x-auto">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-300 shrink-0">כלול בארון:</span>
          {includedSummary.length > 0 ? (
            <span className="truncate text-slate-300">{includedSummary.join(' · ')}</span>
          ) : (
            <span className="text-slate-400">ללא אביזרים מובנים</span>
          )}
        </div>

        {/* 0U Auxiliary Equipment Button */}
        {onOpenAuxiliaryModal && (
          <button
            type="button"
            onClick={onOpenAuxiliaryModal}
            className="bg-indigo-900/90 hover:bg-indigo-800 backdrop-blur-md border border-indigo-400 text-indigo-100 text-[11px] font-bold px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto transition-colors shadow-lg cursor-pointer shrink-0"
            title="הוסף אביזרי גג, בסיס, דפנות או ציוד חומרה ללא תפיסת יחידות U"
          >
            <Layers size={13} className="text-indigo-300" />
            <span>הוסף ציוד נלווה (0U)</span>
          </button>
        )}
      </div>

      {/* Floating Instructions Hint */}
      <div className="absolute bottom-11 right-3 text-[10px] text-slate-400 pointer-events-none z-10 hidden sm:flex items-center gap-1 opacity-70">
        <span>🖱️ גרור לסיבוב | גלגלת לזום | לחץ על מקום פנוי להתקנה</span>
      </div>

      {/* HTML & Keyboard Accessible Slot Selector Bar */}
      {emptySlots.length > 0 && (
        <div
          className="bg-slate-900 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap text-xs z-30"
          role="region"
          aria-label="בחירת יחידות U פנויות במקלדת"
        >
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <Box size={13} className="text-blue-400 shrink-0" />
            <span>התקנה ב-U פנוי (נגישות מקלדת):</span>
          </div>
          <select
            id="accessible-slot-picker"
            className="bg-slate-800 border border-slate-700 text-white text-[11px] px-2.5 py-1 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            defaultValue=""
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val) {
                onSlotClickToAdd(val);
                e.target.value = '';
              }
            }}
            aria-label="בחר תא U פנוי להתקנת מדף או אביזר"
          >
            <option value="" disabled>
              בחר תא U פנוי ({emptySlots.length} פנויים)...
            </option>
            {emptySlots.map((s) => (
              <option key={s.uIndex} value={s.uIndex}>
                U{s.uIndex} פנוי
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
