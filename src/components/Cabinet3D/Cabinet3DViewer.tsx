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
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Box,
  Layers,
  ShieldCheck,
  Info,
  ArrowRight,
  CornerUpLeft,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

interface MeshCacheEntry {
  mesh: THREE.Group;
  uStart: number;
  uSpan: number;
  lastY: number;
  cancelTexture?: () => void;
  item: Product3DInstance;
}

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
  previewSpanU = 1,
  hoveredProduct,
  inspectedProduct,
  selectedInstanceId,
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
  const floorGroupRef = useRef<THREE.Group>(new THREE.Group());
  const frameGroupRef = useRef<THREE.Group>(new THREE.Group());
  const productsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const hitboxesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const nonUGroupRef = useRef<THREE.Group>(new THREE.Group());
  const stagingTrayGroupRef = useRef<THREE.Group | null>(null);
  const stagingAccessoriesGroupRef = useRef<THREE.Group | null>(null);
  const hasStagingContentRef = useRef<boolean>(false);
  const uCentersRef = useRef<number[]>([]);
  const innerDepthUnitsRef = useRef<number>(3.0);
  const animatedInstanceIdsRef = useRef<Set<string>>(new Set());

  // Mesh cache by instanceId for smooth incremental updates and lifecycle management
  const meshMapRef = useRef<Map<string, MeshCacheEntry>>(new Map());
  const activeAnimationsRef = useRef<Map<string, number>>(new Map());

  // Camera framing history for focus & return
  const previousFramingRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const [isFocusedOnProduct, setIsFocusedOnProduct] = useState(false);
  const [backdropTheme, setBackdropTheme] = useState<'studio-light' | 'datacenter' | 'pure-white'>('studio-light');

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
    const parseCount = (val: any) => {
      if (!val) return 0;
      const str = String(val).trim().toUpperCase();
      if (
        str === 'X' ||
        str === '0' ||
        str === '-' ||
        str === '--' ||
        str.includes('לא כלול') ||
        str.includes('ללא') ||
        str.includes('אין') ||
        str.includes('מידע לא זמין') ||
        str.includes('NONE') ||
        str.includes('NO') ||
        str.includes('N/A') ||
        str.includes('NA')
      ) {
        return 0;
      }
      const match = str.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const fans = parseCount(cabinetData?.fans);
    if (fans > 0) list.push(`${fans} מאווררים בגג`);

    const wheels = parseCount(cabinetData?.wheels);
    if (wheels > 0) list.push(`${wheels} גלגלים`);

    const feet = parseCount(cabinetData?.levelingFeet);
    if (feet > 0) list.push(`${feet} רגליות`);

    const shelves = parseCount(cabinetData?.shelvesQty);
    if (shelves > 0) list.push(`${shelves} מדפי מתכת`);

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
        image: slot.accessoryRef?.image || slot.accessoryRef?.imageURL || (Array.isArray(slot.accessoryRef?.images) ? slot.accessoryRef?.images[0] : undefined),
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
    setIsFocusedOnProduct(false);
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
    setIsFocusedOnProduct(false);
    needsRenderRef.current = true;
  }, [dims]);

  // Focus directly on the selected product or slot with smooth animation and restore capability
  const focusOnSelectedProduct = useCallback((targetInstId?: string) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    // Save previous camera framing if not already saved
    if (!isFocusedOnProduct) {
      previousFramingRef.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
    }

    let targetY = 0;
    const targetId = targetInstId || inspectedProduct?.instanceId || selectedInstanceId || activeInstanceId;

    if (targetId) {
      const match = productInstances.find(p => p.instanceId === targetId);
      if (match) {
        const bottomCenterY = uCentersRef.current[match.uStart - 1];
        const topCenterY = uCentersRef.current[match.uStart + match.uSpan - 2] || bottomCenterY;
        if (bottomCenterY !== undefined) {
          targetY = (bottomCenterY + (topCenterY || bottomCenterY)) / 2;
        }
      }
    } else if (selectedSlotU && uCentersRef.current[selectedSlotU - 1] !== undefined) {
      targetY = uCentersRef.current[selectedSlotU - 1];
    } else {
      const firstOccupied = slotsRef.current.find(s => s.type !== 'empty');
      if (firstOccupied && uCentersRef.current[firstOccupied.uIndex - 1] !== undefined) {
        targetY = uCentersRef.current[firstOccupied.uIndex - 1];
      }
    }

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = new THREE.Vector3(0.3, targetY + 0.15, 2.5);
    const endTarget = new THREE.Vector3(0, targetY, 0);

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      controls.target.copy(endTarget);
      camera.position.copy(endPos);
      controls.update();
      setIsFocusedOnProduct(true);
      needsRenderRef.current = true;
      return;
    }

    let progress = 0;
    isAnimatingRef.current = true;

    const animateFocus = () => {
      progress += 0.08;
      if (progress < 1) {
        const ease = Math.sin((progress * Math.PI) / 2);
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, endTarget, ease);
        controls.update();
        needsRenderRef.current = true;
        requestAnimationFrame(animateFocus);
      } else {
        camera.position.copy(endPos);
        controls.target.copy(endTarget);
        controls.update();
        isAnimatingRef.current = false;
        setIsFocusedOnProduct(true);
        needsRenderRef.current = true;
      }
    };
    requestAnimationFrame(animateFocus);
  }, [inspectedProduct, selectedInstanceId, activeInstanceId, selectedSlotU, productInstances, isFocusedOnProduct]);

  // Restore previous camera framing smoothly
  const restorePreviousFraming = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (!previousFramingRef.current) {
      fitCameraToCabinet(false);
      return;
    }

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const { position: endPos, target: endTarget } = previousFramingRef.current;

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
      setIsFocusedOnProduct(false);
      needsRenderRef.current = true;
      return;
    }

    let progress = 0;
    isAnimatingRef.current = true;

    const animateRestore = () => {
      progress += 0.08;
      if (progress < 1) {
        const ease = Math.sin((progress * Math.PI) / 2);
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, endTarget, ease);
        controls.update();
        needsRenderRef.current = true;
        requestAnimationFrame(animateRestore);
      } else {
        camera.position.copy(endPos);
        controls.target.copy(endTarget);
        controls.update();
        isAnimatingRef.current = false;
        setIsFocusedOnProduct(false);
        needsRenderRef.current = true;
      }
    };
    requestAnimationFrame(animateRestore);
  }, [fitCameraToCabinet]);

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
        color: 0x161e2e,
        roughness: 0.28,
        metalness: 0.75,
      }),
      railMat: new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.20,
        metalness: 0.90,
      }),
      panelMat: new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.40,
        metalness: 0.60,
      }),
      metalMat: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.22,
        metalness: 0.85,
      }),
      accentMat: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.5,
        metalness: 0.4,
      }),
      rubberMat: new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.1,
      }),
      shelfMat: new THREE.MeshStandardMaterial({
        color: 0x065f46,
        roughness: 0.28,
        metalness: 0.75,
      }),
      includedShelfMat: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.32,
        metalness: 0.80,
      }),
      activeChassisMat: new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.28,
        metalness: 0.75,
      }),
      pduMat: new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.32,
        metalness: 0.65,
      }),
      earMat: new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.18,
        metalness: 0.92,
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

    // 5. Lighting (Bright, multi-point studio lighting with high edge contrast for black cabinets)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.4);
    scene.add(hemiLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    mainDirLight.position.set(6, 14, 9);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 1024;
    mainDirLight.shadow.mapSize.height = 1024;
    mainDirLight.shadow.camera.near = 0.5;
    mainDirLight.shadow.camera.far = 40;
    mainDirLight.shadow.bias = -0.0005;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.1);
    fillLight.position.set(-7, 6, 7);
    scene.add(fillLight);

    // Dual Rim / Edge Lights: Illuminate black cabinet silhouette & contours against any background
    const leftRimLight = new THREE.DirectionalLight(0x93c5fd, 1.5);
    leftRimLight.position.set(-9, 8, -9);
    scene.add(leftRimLight);

    const rightRimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rightRimLight.position.set(9, 8, -9);
    scene.add(rightRimLight);

    const interiorDownLight = new THREE.PointLight(0xffffff, 1.1, 16);
    interiorDownLight.position.set(0, 4, 0);
    scene.add(interiorDownLight);

    const bottomBounce = new THREE.DirectionalLight(0xcfd8dc, 0.6);
    bottomBounce.position.set(0, -8, 5);
    scene.add(bottomBounce);

    // Attach persistent groups to scene
    scene.add(floorGroupRef.current);
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
      activeAnimationsRef.current.forEach(id => cancelAnimationFrame(id));
      activeAnimationsRef.current.clear();
      resizeObserver.disconnect();

      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('webglcontextlost', handleContextLost);

      controls.removeEventListener('change', onControlsChange);
      controls.dispose();

      disposeHierarchy(floorGroupRef.current);
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
  // EFFECT 2: Frame Geometry & Cabinet Framing & Floor Pedestal
  // Runs ONLY when cabinet physical model or dimensions change
  // ==========================================
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(floorGroupRef.current);
    disposeHierarchy(frameGroupRef.current);
    if (stagingTrayGroupRef.current) {
      disposeHierarchy(stagingTrayGroupRef.current);
    }

    const totalFrameHeight = dims.totalU * U_HEIGHT_UNITS + 0.75;
    const halfH = totalFrameHeight / 2;

    // 1. Build Studio Floor Disc / Ambient Shadow Platform
    const floorRadius = Math.max(dims.widthMm * SCALE_MM_TO_UNITS * 2.2, 14);
    const floorGeom = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.04, 48);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const floorCtx = floorCanvas.getContext('2d');
    if (floorCtx) {
      // Soft radial shadow under cabinet
      const radGrad = floorCtx.createRadialGradient(256, 256, 30, 256, 256, 240);
      radGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
      radGrad.addColorStop(0.35, 'rgba(30, 41, 59, 0.18)');
      radGrad.addColorStop(0.7, 'rgba(71, 85, 105, 0.06)');
      radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      floorCtx.fillStyle = radGrad;
      floorCtx.fillRect(0, 0, 512, 512);

      // Subtle technical concentric rings
      floorCtx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      floorCtx.lineWidth = 1.5;
      [80, 150, 210].forEach(r => {
        floorCtx.beginPath();
        floorCtx.arc(256, 256, r, 0, Math.PI * 2);
        floorCtx.stroke();
      });
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.minFilter = THREE.LinearFilter;
    const floorMat = new THREE.MeshBasicMaterial({
      map: floorTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(0, -halfH - 0.28, 0);
    floorMesh.receiveShadow = true;
    floorGroupRef.current.add(floorMesh);

    // 2. Build Cabinet Frame
    const { group: newFrameGroup, uCenters, innerDepthUnits, stagingTrayGroup, stagingAccessoriesGroup, hasStagingContent } = buildCabinetFrameGroup(
      dims,
      cabinetData,
      materialsRef.current
    );

    uCentersRef.current = uCenters;
    innerDepthUnitsRef.current = innerDepthUnits;
    stagingTrayGroupRef.current = stagingTrayGroup;
    stagingAccessoriesGroupRef.current = stagingAccessoriesGroup;
    hasStagingContentRef.current = Boolean(hasStagingContent);

    frameGroupRef.current.add(newFrameGroup);
    fitCameraToCabinet(true);
    needsRenderRef.current = true;
  }, [dims.totalU, dims.widthMm, dims.depthMm, cabinetData?.sku, fitCameraToCabinet, dims]);

  // ==========================================
  // EFFECT 3: Equipment & Slot Synchronization (Instance-Based Lifecycle)
  // Runs when slots, optionals, or non-U accessories change.
  // CAMERA POSITION, ANGLE AND ZOOM REMAIN COMPLETELY UNTOUCHED!
  // ==========================================
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(hitboxesGroupRef.current);
    disposeHierarchy(nonUGroupRef.current);

    // Clean ONLY staging accessories, keeping the staging tray platform, plaque and wheels/feet intact!
    if (stagingAccessoriesGroupRef.current) {
      disposeHierarchy(stagingAccessoriesGroupRef.current);
    }

    const uCenters = uCentersRef.current;
    const innerDepthUnits = innerDepthUnitsRef.current;
    const materials = materialsRef.current;

    // 1. Rebuild Hitboxes for Empty Slots with Upward Preview Span Highlight
    slots.forEach(slot => {
      if (slot.type === 'empty') {
        const uIdx = slot.uIndex;
        const centerY = uCenters[uIdx - 1];
        if (centerY !== undefined) {
          const isDirectTarget = selectedSlotU === uIdx;
          const isInPreviewSpan = selectedSlotU !== null && selectedSlotU !== undefined &&
            uIdx >= selectedSlotU && uIdx < selectedSlotU + previewSpanU;
          const isSelected = isDirectTarget || isInPreviewSpan;
          const hitbox = buildEmptySlotHitbox(uIdx, centerY, innerDepthUnits, isSelected);
          hitboxesGroupRef.current.add(hitbox);
        }
      }
    });

    // 2. Incremental Instance-Based Equipment Management & Animations
    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frontRailZ = (dims.depthMm * SCALE_MM_TO_UNITS) / 2 - 0.55;

    const currentInstanceIds = new Set(productInstances.map(p => p.instanceId));
    const cachedMeshMap = meshMapRef.current;

    // A. Remove meshes that are no longer in the cabinet
    cachedMeshMap.forEach((entry, id) => {
      if (!currentInstanceIds.has(id)) {
        if (activeAnimationsRef.current.has(id)) {
          cancelAnimationFrame(activeAnimationsRef.current.get(id)!);
          activeAnimationsRef.current.delete(id);
        }
        if (entry.cancelTexture) entry.cancelTexture();
        disposeHierarchy(entry.mesh);
        productsGroupRef.current.remove(entry.mesh);
        cachedMeshMap.delete(id);
      }
    });

    // B. Add or update active product meshes
    productInstances.forEach(item => {
      const bottomCenterY = uCenters[item.uStart - 1];
      const topCenterY = uCenters[item.uStart + item.uSpan - 2] || bottomCenterY;
      const targetCenterY = (bottomCenterY !== undefined && topCenterY !== undefined)
        ? (bottomCenterY + topCenterY) / 2
        : 0;

      const existing = cachedMeshMap.get(item.instanceId);

      if (existing) {
        // Instance already existed: check if position changed (Move Animation)
        if (existing.uStart !== item.uStart || existing.uSpan !== item.uSpan) {
          const fromY = existing.lastY;
          const toY = targetCenterY;
          existing.uStart = item.uStart;
          existing.uSpan = item.uSpan;
          existing.lastY = targetCenterY;

          if (!prefersReducedMotion && Math.abs(fromY - toY) > 0.001) {
            let progress = 0;
            isAnimatingRef.current = true;
            if (activeAnimationsRef.current.has(item.instanceId)) {
              cancelAnimationFrame(activeAnimationsRef.current.get(item.instanceId)!);
            }

            const animateMove = () => {
              progress += 0.10;
              if (progress < 1) {
                const ease = Math.sin((progress * Math.PI) / 2);
                existing.mesh.position.y = THREE.MathUtils.lerp(fromY, toY, ease);
                needsRenderRef.current = true;
                const reqId = requestAnimationFrame(animateMove);
                activeAnimationsRef.current.set(item.instanceId, reqId);
              } else {
                existing.mesh.position.y = toY;
                isAnimatingRef.current = false;
                activeAnimationsRef.current.delete(item.instanceId);
                needsRenderRef.current = true;
              }
            };
            const reqId = requestAnimationFrame(animateMove);
            activeAnimationsRef.current.set(item.instanceId, reqId);
          } else {
            existing.mesh.position.set(0, targetCenterY, frontRailZ);
          }
        }
      } else {
        // New Instance: build product mesh
        const productMesh = buildProduct3DMesh(item, innerDepthUnits, materials, () => {
          needsRenderRef.current = true;
        });

        const cancelFn = (productMesh as any)._cancelTexture;
        cachedMeshMap.set(item.instanceId, {
          mesh: productMesh,
          uStart: item.uStart,
          uSpan: item.uSpan,
          lastY: targetCenterY,
          cancelTexture: cancelFn,
          item,
        });

        // Play entrance animation ONLY for newly added item
        const isNew = item.instanceId === lastAddedInstanceId && !animatedInstanceIdsRef.current.has(item.instanceId);

        if (isNew && !prefersReducedMotion) {
          animatedInstanceIdsRef.current.add(item.instanceId);
          productMesh.position.set(0, targetCenterY, frontRailZ + 0.9);
          let progress = 0;
          const startZ = frontRailZ + 0.9;
          const endZ = frontRailZ;
          isAnimatingRef.current = true;

          const animateIn = () => {
            progress += 0.09;
            if (progress < 1) {
              productMesh.position.z = THREE.MathUtils.lerp(startZ, endZ, Math.sin((progress * Math.PI) / 2));
              needsRenderRef.current = true;
              const reqId = requestAnimationFrame(animateIn);
              activeAnimationsRef.current.set(item.instanceId, reqId);
            } else {
              productMesh.position.z = endZ;
              isAnimatingRef.current = false;
              activeAnimationsRef.current.delete(item.instanceId);
              needsRenderRef.current = true;
            }
          };
          const reqId = requestAnimationFrame(animateIn);
          activeAnimationsRef.current.set(item.instanceId, reqId);
        } else {
          productMesh.position.set(0, targetCenterY, frontRailZ);
        }

        productsGroupRef.current.add(productMesh);
      }
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

        if (stagingAccessoriesGroupRef.current) {
          stagingAccessoriesGroupRef.current.add(hwMesh);
        } else if (stagingTrayGroupRef.current) {
          stagingTrayGroupRef.current.add(hwMesh);
        } else {
          hwMesh.position.set(widthUnits / 2 + 1.25 + offsetX, -halfH - 0.18, offsetZ);
          nonUGroupRef.current.add(hwMesh);
        }
      }
    });

    if (stagingTrayGroupRef.current) {
      const hasStagingHardware = Boolean(
        stagingAccessoriesGroupRef.current && stagingAccessoriesGroupRef.current.children.length > 0
      );
      stagingTrayGroupRef.current.visible = Boolean(hasStagingContentRef.current || hasStagingHardware);
    }

    needsRenderRef.current = true;
  }, [productInstances, slots, nonUAccessories, selectedSlotU, previewSpanU, lastAddedInstanceId, dims.depthMm, dims.totalU, dims.widthMm]);

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

  const getBackdropClass = () => {
    switch (backdropTheme) {
      case 'studio-light':
        return 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 border-slate-300 shadow-xl';
      case 'datacenter':
        return 'bg-gradient-to-b from-[#0b1324] via-[#111c33] to-[#070d18] border-slate-700 shadow-2xl';
      case 'pure-white':
        return 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-300 shadow-md';
      default:
        return 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 border-slate-300';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative border-4 flex flex-col overflow-hidden transition-all duration-300 select-none ${getBackdropClass()} ${
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

        {/* Right Side: Camera Control Buttons, Lighting Environment & Mobile Touch Mode */}
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
          
          {/* Backdrop Environment Switcher */}
          <button
            type="button"
            onClick={() => {
              setBackdropTheme(curr => {
                if (curr === 'studio-light') return 'datacenter';
                if (curr === 'datacenter') return 'pure-white';
                return 'studio-light';
              });
            }}
            className="px-2 py-1 text-[10.5px] font-semibold hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="החלף סביבת תאורה ורקע (סטודיו מואר / חדר שרתים / לבן נקי)"
          >
            {backdropTheme === 'studio-light' ? (
              <>
                <Sun size={13} className="text-amber-400" />
                <span className="hidden md:inline">סטודיו מואר</span>
              </>
            ) : backdropTheme === 'datacenter' ? (
              <>
                <Moon size={13} className="text-blue-400" />
                <span className="hidden md:inline">חדר שרתים</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-emerald-400" />
                <span className="hidden md:inline">לבן סטודיו</span>
              </>
            )}
          </button>

          {isFocusedOnProduct ? (
            <button
              type="button"
              onClick={restorePreviousFraming}
              className="px-2 py-1 text-[10.5px] font-semibold bg-blue-900/80 text-blue-200 hover:text-white border border-blue-400 transition-colors cursor-pointer flex items-center gap-1 border-r border-slate-800"
              title="חזור למבט הקודם"
            >
              <CornerUpLeft size={13} />
              <span>חזור למבט קודם</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fitCameraToCabinet(false)}
              className="px-2 py-1 text-[10.5px] font-semibold hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border-r border-slate-800"
              title="הצג את כל הארון (איפוס מצלמה)"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">ארון מלא</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => focusOnSelectedProduct()}
            className={`px-2 py-1 text-[10.5px] font-semibold transition-colors cursor-pointer flex items-center gap-1 border-r border-slate-800 ${
              isFocusedOnProduct ? 'text-amber-400 font-bold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="התמקדות במוצר הנבחר"
          >
            <ZoomIn size={13} />
            <span className="hidden sm:inline">התמקדות במוצר</span>
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
            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border-r border-slate-800"
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
