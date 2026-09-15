import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cabinet3DViewerProps, Product3DInstance, DoorLeafState, DoorState } from './Cabinet3DTypes';
import { resolveCabinetDimensions, buildCabinetFrameGroup, resolveCabinetDoorsInfo, SCALE_MM_TO_UNITS, U_HEIGHT_UNITS, RACK_19_WIDTH_UNITS } from './CabinetModelBuilder';
import { parseAccessoryCount, isProductShelf } from '../../utils/cabinetData';
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
  DoorClosed,
  DoorOpen,
  Award,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
} from 'lucide-react';

interface MeshCacheEntry {
  mesh: THREE.Group;
  uStart: number;
  uSpan: number;
  lastY: number;
  depthUnits?: number;
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
  unallocatedItems = [],
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
  catalogData = [],
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
  const highlightGroupRef = useRef<THREE.Group>(new THREE.Group());
  const stagingTrayGroupRef = useRef<THREE.Group | null>(null);
  const stagingAccessoriesGroupRef = useRef<THREE.Group | null>(null);
  const hasStagingContentRef = useRef<boolean>(false);
  const uCentersRef = useRef<number[]>([]);
  const innerDepthUnitsRef = useRef<number>(3.0);
  const animatedInstanceIdsRef = useRef<Set<string>>(new Set());

  // Mesh cache by instanceId for smooth incremental updates and lifecycle management
  const meshMapRef = useRef<Map<string, MeshCacheEntry>>(new Map());
  const lastFramingKeyRef = useRef<string>('');
  const activeAnimationsRef = useRef<Map<string, number>>(new Map());
  const isUserInteractedRef = useRef<boolean>(false);

  // Camera framing history for focus & return
  const previousFramingRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const [isFocusedOnProduct, setIsFocusedOnProduct] = useState(false);
  const [backdropTheme, setBackdropTheme] = useState<'studio-light' | 'datacenter' | 'pure-white'>('studio-light');
  const [doorState, setDoorState] = useState<DoorState>({ front: 'transparent', rear: 'transparent' });
  const doorStateRef = useRef<DoorState>({ front: 'transparent', rear: 'transparent' });
  doorStateRef.current = doorState;

  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [dismissedAddedBannerId, setDismissedAddedBannerId] = useState<string | null>(null);

  const setDoorModeRef = useRef<((side: 'front' | 'rear', state: DoorLeafState) => void) | null>(null);
  const setRearCutawayRef = useRef<((active: boolean) => void) | null>(null);

  const handleSetDoorState = useCallback((side: 'front' | 'rear', state: DoorLeafState) => {
    setDoorState(prev => ({ ...prev, [side]: state }));
    if (setDoorModeRef.current) {
      setDoorModeRef.current(side, state);
    }
    needsRenderRef.current = true;
  }, []);

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

  // Derive verified doors specifications
  const doorsInfo = useMemo(() => {
    return resolveCabinetDoorsInfo(dims, cabinetData, product);
  }, [dims, cabinetData, product]);

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

    const findCatalogImage = (sku?: string) => {
      if (!sku || !catalogData || !Array.isArray(catalogData)) return undefined;
      const clean = sku.trim().toUpperCase();
      const p = catalogData.find((x: any) => x && (x.sku?.trim().toUpperCase() === clean || x.pn?.trim().toUpperCase() === clean));
      if (!p) return undefined;
      return (Array.isArray(p.images) && p.images[0]) || p.imageURL || p.image;
    };

    slots.forEach(slot => {
      if (slot.type === 'empty') return;
      if (slot.type === 'optional-accessory' && slot.isAnchor === false) return; // continuation row

      const spanU = slot.spanU || 1;
      const uStart = slot.uIndex - spanU + 1; // 1-based bottom of the span
      const isIncluded = slot.type === 'preset-shelf' || slot.type === 'preset-fan' || Boolean((slot as any).isIncluded);
      const instId = slot.instanceId || `item-${slot.uIndex}-${slot.name}`;
      const itemSku = slot.accessoryRef?.sku || slot.accessoryRef?.pn || (isIncluded ? 'BUILTIN-SHELF' : '');

      const resolvedImage = slot.accessoryRef?.image 
        || slot.accessoryRef?.imageURL 
        || (Array.isArray(slot.accessoryRef?.images) ? slot.accessoryRef?.images[0] : undefined)
        || findCatalogImage(itemSku);

      instances.push({
        instanceId: instId,
        sku: itemSku,
        name: slot.name,
        description: slot.description || '',
        price: slot.accessoryRef?.price || 0,
        uStart,
        uSpan: spanU,
        isIncluded,
        type: (slot.type === 'preset-shelf' || slot.name.includes('מדף') || /מדף|shelf/i.test(slot.name))
          ? 'shelf'
          : (slot.name.includes('שקע') || slot.name.includes('PDU'))
          ? 'pdu'
          : (slot.name.includes('פנל') || slot.name.includes('עיוור') || slot.name.includes('מברשת'))
          ? 'panel'
          : 'active',
        image: resolvedImage,
        optionalIdx: slot.optionalIdx,
        accessoryRef: slot.accessoryRef,
      });
    });

    return instances;
  }, [slots, cabinetData, includedItems, product, dims.totalU, catalogData]);

  // Find newly added item instance details
  const newlyAddedInstance = useMemo(() => {
    if (!lastAddedInstanceId) return null;
    return productInstances.find(p => p.instanceId === lastAddedInstanceId) || null;
  }, [lastAddedInstanceId, productInstances]);

  // Empty slots for keyboard/HTML accessible selector
  const emptySlots = useMemo(() => {
    return slots.filter(s => s.type === 'empty');
  }, [slots]);

  // Helper to get real physical bounds of the cabinet (excluding decorative floor disc and hitboxes)
  const getCabinetBounds = useCallback(() => {
    const box = new THREE.Box3();
    if (frameGroupRef.current && frameGroupRef.current.children.length > 0) {
      box.expandByObject(frameGroupRef.current);
    }
    if (productsGroupRef.current && productsGroupRef.current.children.length > 0) {
      box.expandByObject(productsGroupRef.current);
    }
    if (nonUGroupRef.current && nonUGroupRef.current.children.length > 0) {
      box.expandByObject(nonUGroupRef.current);
    }

    if (box.isEmpty() || !isFinite(box.min.x)) {
      const w = dims.widthMm * SCALE_MM_TO_UNITS;
      const h = dims.totalU * U_HEIGHT_UNITS + 0.9;
      const d = dims.depthMm * SCALE_MM_TO_UNITS;
      box.min.set(-w / 2, -h / 2 - 0.5, -d / 2);
      box.max.set(w / 2, h / 2 + 0.4, d / 2);
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { box, size, center };
  }, [dims]);

  // Compute camera framing parameters ensuring full cabinet visibility (from roof to feet)
  const computeFramingParams = useCallback((aspect: number) => {
    const camera = cameraRef.current;
    const fov = camera ? camera.fov : 38;
    const fovVRad = (fov * Math.PI) / 180;
    const fovHRad = 2 * Math.atan(Math.tan(fovVRad / 2) * Math.max(aspect, 0.35));

    const { size, center } = getCabinetBounds();

    // 14% breathing room padding so the cabinet is comfortably framed without being cut off
    const margin = 1.14;
    const distForHeight = ((size.y * margin) / 2) / Math.tan(fovVRad / 2);
    const distForWidth = ((size.x * margin) / 2) / Math.tan(fovHRad / 2);
    const fitDist = Math.max(distForHeight, distForWidth);

    const halfDepth = Math.max(size.z / 2, (dims.depthMm * SCALE_MM_TO_UNITS) / 2);
    const centerY = center.y;

    return {
      size,
      center,
      centerY,
      halfDepth,
      fitDist,
      fov,
    };
  }, [getCabinetBounds, dims]);

  // Smooth camera animation helper for camera presets
  const animateCameraTo = useCallback((endPos: THREE.Vector3, endTarget?: THREE.Vector3) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const finalTarget = endTarget ? endTarget.clone() : startTarget.clone();

    const prefersReducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      camera.position.copy(endPos);
      controls.target.copy(finalTarget);
      controls.update();
      needsRenderRef.current = true;
      return;
    }

    let progress = 0;
    isAnimatingRef.current = true;

    const animate = () => {
      progress += 0.055;
      if (progress < 1) {
        const ease = Math.sin((progress * Math.PI) / 2);
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, finalTarget, ease);
        controls.update();
        needsRenderRef.current = true;
        requestAnimationFrame(animate);
      } else {
        camera.position.copy(endPos);
        controls.target.copy(finalTarget);
        controls.update();
        isAnimatingRef.current = false;
        needsRenderRef.current = true;
      }
    };
    requestAnimationFrame(animate);
  }, []);

  // Default & Initial View: Crystal clear, straight frontal view showing the entire cabinet from roof to wheels/feet
  const fitFrontalView = useCallback((instant: boolean = true) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls) return;

    const aspect = container && container.clientWidth > 0 && container.clientHeight > 0
      ? (container.clientWidth / container.clientHeight)
      : (camera.aspect || 1);

    const { centerY, halfDepth, fitDist } = computeFramingParams(aspect);
    const targetZ = 0;
    const cameraZ = targetZ + halfDepth + fitDist;

    const targetPos = new THREE.Vector3(0, centerY, cameraZ);
    const targetLookAt = new THREE.Vector3(0, centerY, targetZ);

    camera.near = 0.1;
    camera.far = Math.max(100, cameraZ * 4);
    camera.up.set(0, 1, 0);

    if (instant) {
      camera.position.copy(targetPos);
      controls.target.copy(targetLookAt);
      controls.update();
      camera.updateProjectionMatrix();
    } else {
      animateCameraTo(targetPos, targetLookAt);
    }

    setIsFocusedOnProduct(false);
    needsRenderRef.current = true;
  }, [computeFramingParams, animateCameraTo]);

  // "כל הארון" (Fit All Cabinet): Fits entire cabinet into view in the CURRENT camera direction, or straight front if initial
  const fitCameraToCabinet = useCallback((instant: boolean = false) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls) return;

    const aspect = container && container.clientWidth > 0 && container.clientHeight > 0
      ? (container.clientWidth / container.clientHeight)
      : (camera.aspect || 1);

    const { size, centerY, halfDepth, fitDist } = computeFramingParams(aspect);
    const targetCenter = new THREE.Vector3(0, centerY, 0);

    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 0.001 || !isUserInteractedRef.current) {
      fitFrontalView(instant);
      return;
    }

    dir.normalize();
    const totalDist = fitDist + halfDepth;
    const targetPos = targetCenter.clone().add(dir.multiplyScalar(totalDist));

    if (instant) {
      camera.position.copy(targetPos);
      controls.target.copy(targetCenter);
      controls.update();
      camera.updateProjectionMatrix();
    } else {
      animateCameraTo(targetPos, targetCenter);
    }

    setIsFocusedOnProduct(false);
    needsRenderRef.current = true;
  }, [computeFramingParams, fitFrontalView, animateCameraTo]);

  // Camera preset selector: front, rear, right, left, iso
  const setCameraPreset = useCallback((preset: 'front' | 'rear' | 'right' | 'left' | 'iso') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls) return;

    const aspect = container && container.clientWidth > 0 && container.clientHeight > 0
      ? (container.clientWidth / container.clientHeight)
      : (camera.aspect || 1);

    const { size, centerY, halfDepth, fitDist } = computeFramingParams(aspect);
    const target = new THREE.Vector3(0, centerY, 0);
    const halfWidth = size.x / 2;

    let endPos: THREE.Vector3;

    switch (preset) {
      case 'front':
        endPos = new THREE.Vector3(0, centerY, halfDepth + fitDist);
        break;
      case 'rear':
        endPos = new THREE.Vector3(0, centerY, -(halfDepth + fitDist));
        break;
      case 'right':
        endPos = new THREE.Vector3(halfWidth + fitDist, centerY, 0);
        break;
      case 'left':
        endPos = new THREE.Vector3(-(halfWidth + fitDist), centerY, 0);
        break;
      case 'iso':
        const isoDist = halfDepth + fitDist;
        endPos = new THREE.Vector3(
          Math.sin(0.40) * isoDist,
          centerY + (fitDist * 0.22),
          Math.cos(0.40) * isoDist
        );
        break;
    }

    setIsFocusedOnProduct(false);
    animateCameraTo(endPos, target);
  }, [animateCameraTo, computeFramingParams]);

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
    const targetId = targetInstId || inspectedProduct?.instanceId || selectedInstanceId || activeInstanceId || lastAddedInstanceId;

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
    const endPos = new THREE.Vector3(0.2, targetY + 0.12, ((dims.depthMm * SCALE_MM_TO_UNITS) / 2) + 1.9);
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
  }, [inspectedProduct, selectedInstanceId, activeInstanceId, lastAddedInstanceId, selectedSlotU, productInstances, isFocusedOnProduct, dims.depthMm]);

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
        color: 0x0f766e,
        roughness: 0.24,
        metalness: 0.82,
      }),
      includedShelfMat: new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.22,
        metalness: 0.88,
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
    controls.minDistance = 2.0;
    controls.maxDistance = 35.0;
    controls.maxPolarAngle = Math.PI * 0.90;
    controlsRef.current = controls;

    const onControlsChange = () => {
      needsRenderRef.current = true;
    };
    const onControlsStart = () => {
      isUserInteractedRef.current = true;
    };
    controls.addEventListener('change', onControlsChange);
    controls.addEventListener('start', onControlsStart);

    // 5. Render Loop (On-Demand + Smooth Animation Active Handling)
    let isRunning = true;
    const renderLoop = () => {
      if (!isRunning) return;
      if (needsRenderRef.current || isAnimatingRef.current) {
        controls.update();
        renderer.render(scene, camera);
        if (!isAnimatingRef.current) {
          needsRenderRef.current = false;
        }
      }
      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };
    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    // 6. Lighting Configuration
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainKeyLight.position.set(6, 12, 10);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 2048;
    mainKeyLight.shadow.mapSize.height = 2048;
    mainKeyLight.shadow.camera.near = 0.5;
    mainKeyLight.shadow.camera.far = 40;
    mainKeyLight.shadow.camera.left = -10;
    mainKeyLight.shadow.camera.right = 10;
    mainKeyLight.shadow.camera.top = 15;
    mainKeyLight.shadow.camera.bottom = -15;
    mainKeyLight.shadow.bias = -0.0004;
    scene.add(mainKeyLight);

    const fillLight = new THREE.DirectionalLight(0xecf0f8, 1.3);
    fillLight.position.set(-8, 6, 8);
    scene.add(fillLight);

    const rearFaceLight = new THREE.DirectionalLight(0xffffff, 1.3);
    rearFaceLight.position.set(0, 2, -10);
    scene.add(rearFaceLight);

    const leftRimLight = new THREE.DirectionalLight(0x93c5fd, 1.5);
    leftRimLight.position.set(-9, 8, -9);
    scene.add(leftRimLight);

    const rightRimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rightRimLight.position.set(9, 8, -9);
    scene.add(rightRimLight);

    const interiorTopLight = new THREE.PointLight(0xffffff, 1.8, 25);
    interiorTopLight.position.set(0, 8, 1);
    scene.add(interiorTopLight);

    const interiorMidLight = new THREE.PointLight(0xf8fafc, 1.4, 20);
    interiorMidLight.position.set(0, 0, 2);
    scene.add(interiorMidLight);

    const frontFaceLight = new THREE.DirectionalLight(0xffffff, 1.3);
    frontFaceLight.position.set(0, 2, 10);
    scene.add(frontFaceLight);

    const bottomBounce = new THREE.DirectionalLight(0xcfd8dc, 0.7);
    bottomBounce.position.set(0, -8, 5);
    scene.add(bottomBounce);

    // Attach persistent groups to scene
    scene.add(floorGroupRef.current);
    scene.add(frameGroupRef.current);
    scene.add(productsGroupRef.current);
    scene.add(hitboxesGroupRef.current);
    scene.add(nonUGroupRef.current);
    scene.add(highlightGroupRef.current);

    // 7. Resize Handling via ResizeObserver
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (!isUserInteractedRef.current) {
        fitFrontalView(true);
      }
      needsRenderRef.current = true;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // 8. Raycasting Interaction & Drag-vs-Click Threshold Detection
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
        let hitIsDoor = false;
        let tmp: THREE.Object3D | null = obj;
        while (tmp && tmp !== scene) {
          if ((tmp as any).userData?.isDoor) {
            hitIsDoor = true;
            break;
          }
          tmp = tmp.parent;
        }
        if (hitIsDoor) continue;

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
        if (foundEmpty !== null || foundProduct) break;
      }

      setHoveredSlotU(foundEmpty);
      if (foundProduct) {
        if (hoverClearTimer) clearTimeout(hoverClearTimer);
        setActiveInstanceId(foundProduct.instanceId);
        if (onProductHoverRef.current) {
          onProductHoverRef.current(foundProduct);
        }
      } else {
        if (hoverClearTimer) clearTimeout(hoverClearTimer);
        hoverClearTimer = setTimeout(() => {
          setActiveInstanceId(null);
          if (onProductHoverRef.current) {
            onProductHoverRef.current(null);
          }
        }, 120);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      const timeDiff = Date.now() - pointerDownTime;
      if (dist > 6 || timeDiff > 350) return;

      const intersects = getRaycastTargets(e.clientX, e.clientY);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        let hitIsDoor = false;
        let tmp: THREE.Object3D | null = obj;
        while (tmp && tmp !== scene) {
          if ((tmp as any).userData?.isDoor) {
            hitIsDoor = true;
            break;
          }
          tmp = tmp.parent;
        }
        if (hitIsDoor) continue;

        while (obj && obj !== scene) {
          if ((obj as any).userData?.isEmptySlot) {
            const uIdx = (obj as any).userData.uIndex;
            if (onSlotClickToAddRef.current) {
              onSlotClickToAddRef.current(uIdx);
            }
            return;
          }
          if ((obj as any).userData?.isProductMesh) {
            const item = (obj as any).userData.item;
            if (onProductInspectRef.current) {
              onProductInspectRef.current(item);
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
      const timeDiff = Date.now() - touchStartTime;
      if (dist > 10 || timeDiff > 450) return;

      const intersects = getRaycastTargets(touch.clientX, touch.clientY);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        let hitIsDoor = false;
        let tmp: THREE.Object3D | null = obj;
        while (tmp && tmp !== scene) {
          if ((tmp as any).userData?.isDoor) {
            hitIsDoor = true;
            break;
          }
          tmp = tmp.parent;
        }
        if (hitIsDoor) continue;

        while (obj && obj !== scene) {
          if ((obj as any).userData?.isEmptySlot) {
            const uIdx = (obj as any).userData.uIndex;
            if (onSlotClickToAddRef.current) {
              onSlotClickToAddRef.current(uIdx);
            }
            return;
          }
          if ((obj as any).userData?.isProductMesh) {
            const item = (obj as any).userData.item;
            if (onProductInspectRef.current) {
              onProductInspectRef.current(item);
            }
            return;
          }
          obj = obj.parent;
        }
      }
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', handleTouchEnd);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (onFallbackTo2DRef.current) {
        onFallbackTo2DRef.current();
      }
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    return () => {
      isRunning = false;
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
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();

      meshMapRef.current.forEach(entry => {
        if (entry.cancelTexture) entry.cancelTexture();
        disposeHierarchy(entry.mesh);
      });
      meshMapRef.current.clear();

      disposeHierarchy(floorGroupRef.current);
      disposeHierarchy(frameGroupRef.current);
      disposeHierarchy(productsGroupRef.current);
      disposeHierarchy(hitboxesGroupRef.current);
      disposeHierarchy(nonUGroupRef.current);
      disposeHierarchy(highlightGroupRef.current);
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
  }, []);

  // Compute optional counts for frame integrated accessories
  const optionalFansCount = useMemo(() => {
    let count = 0;
    (selectedOptionals || []).forEach((opt: any) => {
      const hay = `${opt.name || ''} ${opt.description || ''} ${opt.sku || ''} ${opt.pn || ''}`.toLowerCase();
      if (/מאוורר|fan|מפוח/i.test(hay)) {
        const qty = opt.quantity || 1;
        const multiplier = opt.name?.includes('4') ? 4 : opt.name?.includes('2') ? 2 : 1;
        count += qty * multiplier;
      }
    });
    return count;
  }, [selectedOptionals]);

  const isWheelsSelected = useMemo(() => {
    return (selectedOptionals || []).some((opt: any) => {
      const hay = `${opt.name || ''} ${opt.description || ''} ${opt.sku || ''} ${opt.pn || ''}`.toLowerCase();
      return /גלגל|wheel|caster/i.test(hay);
    });
  }, [selectedOptionals]);

  const isFeetSelected = useMemo(() => {
    return (selectedOptionals || []).some((opt: any) => {
      const hay = `${opt.name || ''} ${opt.description || ''} ${opt.sku || ''} ${opt.pn || ''}`.toLowerCase();
      return /רגלי|פילוס|leveling|feet/i.test(hay);
    });
  }, [selectedOptionals]);

  // Frame Geometry & Cabinet Framing: Runs when cabinet dimensions change
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(floorGroupRef.current);
    disposeHierarchy(frameGroupRef.current);
    if (stagingTrayGroupRef.current) {
      disposeHierarchy(stagingTrayGroupRef.current);
    }

    const totalFrameHeight = dims.totalU * U_HEIGHT_UNITS + 0.75;
    const halfH = totalFrameHeight / 2;

    // Floor Platform
    const floorRadius = Math.max(dims.widthMm * SCALE_MM_TO_UNITS * 2.2, 14);
    const floorGeom = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.04, 48);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const floorCtx = floorCanvas.getContext('2d');
    if (floorCtx) {
      const radGrad = floorCtx.createRadialGradient(256, 256, 30, 256, 256, 240);
      radGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
      radGrad.addColorStop(0.35, 'rgba(30, 41, 59, 0.18)');
      radGrad.addColorStop(0.7, 'rgba(71, 85, 105, 0.06)');
      radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      floorCtx.fillStyle = radGrad;
      floorCtx.fillRect(0, 0, 512, 512);

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

    // Frame Group
    const {
      group: newFrameGroup,
      uCenters,
      innerDepthUnits,
      stagingTrayGroup,
      stagingAccessoriesGroup,
      hasStagingContent,
      setDoorMode: frameSetDoorMode,
      setRearCutaway: frameSetRearCutaway,
    } = buildCabinetFrameGroup(
      dims,
      cabinetData,
      materialsRef.current,
      {
        additionalFansCount: optionalFansCount,
        hasSelectedWheels: isWheelsSelected,
        hasSelectedFeet: isFeetSelected,
        doorState: doorStateRef.current,
      }
    );

    setDoorModeRef.current = frameSetDoorMode || null;
    setRearCutawayRef.current = frameSetRearCutaway || null;
    if (frameSetDoorMode) {
      frameSetDoorMode('front', doorStateRef.current.front);
      frameSetDoorMode('rear', doorStateRef.current.rear);
    }

    uCentersRef.current = uCenters;
    innerDepthUnitsRef.current = innerDepthUnits;
    stagingTrayGroupRef.current = stagingTrayGroup;
    stagingAccessoriesGroupRef.current = stagingAccessoriesGroup;
    hasStagingContentRef.current = Boolean(hasStagingContent);

    frameGroupRef.current.add(newFrameGroup);

    // Only set camera on initial mount or when cabinet physical dimensions change
    const framingKey = `${cabinetData?.sku || product?.sku}|${dims.totalU}|${dims.widthMm}|${dims.depthMm}`;
    if (lastFramingKeyRef.current !== framingKey) {
      lastFramingKeyRef.current = framingKey;
      isUserInteractedRef.current = false;
      fitFrontalView(true);
    }
    needsRenderRef.current = true;
  }, [dims.totalU, dims.widthMm, dims.depthMm, cabinetData?.sku, fitFrontalView, optionalFansCount, isWheelsSelected, isFeetSelected]);

  // Equipment & Slot Synchronization (Does NOT reset camera angle or zoom)
  useEffect(() => {
    if (!sceneRef.current) return;

    disposeHierarchy(hitboxesGroupRef.current);
    disposeHierarchy(nonUGroupRef.current);
    disposeHierarchy(highlightGroupRef.current);

    if (stagingAccessoriesGroupRef.current) {
      disposeHierarchy(stagingAccessoriesGroupRef.current);
    }

    // Always ensure valid uCenters array even before initial frame calculation
    const frameHeightUnits = dims.totalU * U_HEIGHT_UNITS + 0.35 + 0.40;
    const halfHCalc = frameHeightUnits / 2;
    const u1BottomY = -halfHCalc + 0.40;
    const uCenters: number[] = (uCentersRef.current && uCentersRef.current.length === dims.totalU)
      ? uCentersRef.current
      : Array.from({ length: dims.totalU }, (_, i) => u1BottomY + (i + 0.5) * U_HEIGHT_UNITS);

    const halfD = (dims.depthMm * SCALE_MM_TO_UNITS) / 2;
    const frontRailZ = halfD - 0.55;
    const rearRailZ = -halfD + 0.65;
    const innerDepthUnits = innerDepthUnitsRef.current || Math.abs(frontRailZ - rearRailZ);
    const materials = materialsRef.current;

    // 1. Rebuild Hitboxes for Empty Slots
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

    const currentInstanceIds = new Set(productInstances.map(p => p.instanceId));
    const cachedMeshMap = meshMapRef.current;

    // Remove meshes no longer present
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

    // Add or update active product meshes
    productInstances.forEach(item => {
      const safeStart = Math.max(1, Math.min(item.uStart, dims.totalU));
      const safeEnd = Math.max(1, Math.min(item.uStart + item.uSpan - 1, dims.totalU));
      const bottomCenterY = uCenters[safeStart - 1];
      const topCenterY = uCenters[safeEnd - 1] ?? bottomCenterY;
      const targetCenterY = (bottomCenterY + topCenterY) / 2;

      // PDU placement rule: rear rail if cabinet > 4U, otherwise front rail
      const isPdu = item.type === 'pdu' || /שקע|pdu/i.test(item.name);
      const isRearRail = isPdu && dims.totalU > 4;
      const targetZ = isRearRail ? rearRailZ : frontRailZ;
      const targetRotY = isRearRail ? Math.PI : 0;

      const existing = cachedMeshMap.get(item.instanceId);

      if (existing && existing.depthUnits === innerDepthUnits) {
        existing.mesh.rotation.y = targetRotY;
        if (existing.uStart !== item.uStart || existing.uSpan !== item.uSpan || Math.abs(existing.lastY - targetCenterY) > 0.001) {
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
                existing.mesh.position.z = targetZ;
                needsRenderRef.current = true;
                const reqId = requestAnimationFrame(animateMove);
                activeAnimationsRef.current.set(item.instanceId, reqId);
              } else {
                existing.mesh.position.y = toY;
                existing.mesh.position.z = targetZ;
                isAnimatingRef.current = false;
                activeAnimationsRef.current.delete(item.instanceId);
                needsRenderRef.current = true;
              }
            };
            const reqId = requestAnimationFrame(animateMove);
            activeAnimationsRef.current.set(item.instanceId, reqId);
          } else {
            existing.mesh.position.set(0, targetCenterY, targetZ);
          }
        } else {
          existing.mesh.position.set(0, targetCenterY, targetZ);
        }
      } else {
        if (existing) {
          if (activeAnimationsRef.current.has(item.instanceId)) {
            cancelAnimationFrame(activeAnimationsRef.current.get(item.instanceId)!);
            activeAnimationsRef.current.delete(item.instanceId);
          }
          if (existing.cancelTexture) existing.cancelTexture();
          disposeHierarchy(existing.mesh);
          productsGroupRef.current.remove(existing.mesh);
        }

        const productMesh = buildProduct3DMesh(item, innerDepthUnits, materials, () => {
          needsRenderRef.current = true;
        });
        productMesh.rotation.y = targetRotY;

        const cancelFn = (productMesh as any)._cancelTexture;
        cachedMeshMap.set(item.instanceId, {
          mesh: productMesh,
          uStart: item.uStart,
          uSpan: item.uSpan,
          lastY: targetCenterY,
          depthUnits: innerDepthUnits,
          cancelTexture: cancelFn,
          item,
        });

        const isNew = item.instanceId === lastAddedInstanceId && !animatedInstanceIdsRef.current.has(item.instanceId);

        if (isNew && !prefersReducedMotion) {
          animatedInstanceIdsRef.current.add(item.instanceId);
          // Enter smoothly inside cabinet without clipping through front glass door
          const startZ = isRearRail ? targetZ - 0.30 : targetZ + 0.30;
          const endZ = targetZ;
          productMesh.position.set(0, targetCenterY, startZ);
          let progress = 0;
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
          productMesh.position.set(0, targetCenterY, targetZ);
        }

        productsGroupRef.current.add(productMesh);
      }

      // Add gentle highlight outline if this is the newly added item
      if (item.instanceId === lastAddedInstanceId) {
        const spanH = item.uSpan * U_HEIGHT_UNITS;
        const outlineGeom = new THREE.BoxGeometry(
          RACK_19_WIDTH_UNITS + 0.08,
          spanH + 0.04,
          innerDepthUnits * 0.90
        );
        const edgesGeom = new THREE.EdgesGeometry(outlineGeom);
        const outlineMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          linewidth: 2,
          transparent: true,
          opacity: 0.85,
        });
        const outlineMesh = new THREE.LineSegments(edgesGeom, outlineMat);
        outlineMesh.position.set(0, targetCenterY, targetZ - (innerDepthUnits * 0.45));
        outlineMesh.raycast = () => {}; // Never block raycasting or clicks
        highlightGroupRef.current.add(outlineMesh);
      }
    });

    // 3. 0U / Non-U Accessories
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
        const isFan = /מאוורר|fan|מפוח|איוורור/i.test(acc.name || '');
        if (!isFan) {
          const roofMesh = buildRoofAccessoryMesh(itemData, widthUnits, depthUnits, materials);
          roofMesh.position.set(0, halfH + 0.04, 0);
          nonUGroupRef.current.add(roofMesh);
        }
      } else if (zone === 'vertical') {
        const isPdu = /שקע|pdu/i.test(acc.name || '');
        if (isPdu) {
          // Mount 19" horizontal PDU on rear rail (or front if 4U)
          const pduInst: Product3DInstance = {
            instanceId: `pdu-nonu-${idx}`,
            sku: acc.sku || acc.pn || 'PDU-19',
            name: acc.name,
            description: acc.description || '',
            price: acc.price || 0,
            uStart: dims.totalU > 4 ? dims.totalU : 1,
            uSpan: 1,
            isIncluded: Boolean(acc.isIncluded || acc.isPreset),
            type: 'pdu',
            image: acc.image || (acc.accessoryRef ? acc.accessoryRef.image : undefined),
            optionalIdx: acc.optionalIdx,
            accessoryRef: acc,
          };
          const pduMesh = buildProduct3DMesh(pduInst, innerDepthUnits, materials, () => {
            needsRenderRef.current = true;
          });
          const pduY = uCenters[dims.totalU - 1] ?? 0;
          const pduZ = dims.totalU <= 4 ? frontRailZ : rearRailZ;
          if (dims.totalU > 4) {
            pduMesh.rotation.y = Math.PI; // Face sockets forward into cabinet
          }
          pduMesh.position.set(0, pduY, pduZ);
          nonUGroupRef.current.add(pduMesh);
        } else {
          const vertMesh = buildVerticalAccessoryMesh(itemData, dims.totalU * U_HEIGHT_UNITS, materials);
          const zPos = dims.totalU <= 4 ? -depthUnits / 4 : -depthUnits * 0.9;
          vertMesh.position.set(widthUnits / 2 - 0.35, 0, zPos);
          nonUGroupRef.current.add(vertMesh);
        }
      }
    });

    // 4. Staging Tray for Unallocated Items
    const stagingItems = unallocatedItems || [];
    if (stagingItems.length > 0) {
      const stagingX = widthUnits / 2 + 1.6;
      let currentStackY = -halfH + 0.10;

      const trayWidth = RACK_19_WIDTH_UNITS + 0.6;
      const trayDepth = Math.max(2.8, Math.min(depthUnits * 0.85, 4.8));
      const trayGeom = new THREE.BoxGeometry(trayWidth, 0.10, trayDepth);
      const trayMat = materials.shelfMat || new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.6,
        metalness: 0.4,
      });
      const trayMesh = new THREE.Mesh(trayGeom, trayMat);
      trayMesh.position.set(stagingX, -halfH + 0.05, -trayDepth / 2 + 0.2);
      trayMesh.receiveShadow = true;
      nonUGroupRef.current.add(trayMesh);

      const trayPlacardGeom = new THREE.BoxGeometry(trayWidth * 0.65, 0.06, 0.02);
      const placardMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
      const placard = new THREE.Mesh(trayPlacardGeom, placardMat);
      placard.position.set(stagingX, -halfH + 0.05, 0.21);
      nonUGroupRef.current.add(placard);

      stagingItems.forEach((item, sIdx) => {
        const uSize = Math.max(1, Number(item.uSize || item.spanU || 1));
        const itemHeight = uSize * U_HEIGHT_UNITS;
        const targetCenterY = currentStackY + itemHeight / 2;

        const itemInstance: Product3DInstance = {
          instanceId: `unallocated-${sIdx}-${item.sku || item.pn}`,
          sku: item.sku || item.pn || '',
          name: item.name || item.description || 'פריט ללא מקום פנוי',
          description: item.description || '',
          price: item.price || 0,
          uStart: 0,
          uSpan: uSize,
          isIncluded: false,
          type: item.isShelf ? 'shelf' : 'active',
          image: item.image,
          optionalIdx: item.optionalIdx,
          accessoryRef: item,
        };

        const mesh = buildProduct3DMesh(itemInstance, innerDepthUnits, materials, () => {
          needsRenderRef.current = true;
        });
        mesh.position.set(stagingX, targetCenterY, -innerDepthUnits * 0.4);
        nonUGroupRef.current.add(mesh);

        const overlayDepth = Math.max(1.8, Math.min(innerDepthUnits * 0.85, 4.6));
        const overlayGeom = new THREE.BoxGeometry(
          RACK_19_WIDTH_UNITS + 0.12,
          itemHeight + 0.04,
          overlayDepth + 0.08
        );
        const overlayMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.32,
          roughness: 0.25,
          metalness: 0.1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const overlayBox = new THREE.Mesh(overlayGeom, overlayMat);
        overlayBox.position.set(stagingX, targetCenterY, -overlayDepth / 2);
        (overlayBox as any).userData = { isProductMesh: true, item: itemInstance, isUnallocated: true };

        const edgesGeom = new THREE.EdgesGeometry(overlayGeom);
        const edgesMat = new THREE.LineBasicMaterial({
          color: 0xf87171,
          transparent: true,
          opacity: 0.85,
        });
        const overlayEdges = new THREE.LineSegments(edgesGeom, edgesMat);
        overlayBox.add(overlayEdges);
        nonUGroupRef.current.add(overlayBox);

        currentStackY += itemHeight + 0.1;
      });
    }

    needsRenderRef.current = true;
  }, [productInstances, slots, nonUAccessories, unallocatedItems, selectedSlotU, previewSpanU, lastAddedInstanceId, dims.depthMm, dims.totalU, dims.widthMm]);

  // Mobile Touch Mode Effect
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

  const unallocatedCount = unallocatedItems?.length || 0;
  const showAddedBanner = newlyAddedInstance && dismissedAddedBannerId !== lastAddedInstanceId;

  return (
    <div
      ref={containerRef}
      className={`relative border-2 border-slate-300 flex flex-col overflow-hidden transition-all duration-300 select-none rounded-xl ${getBackdropClass()} ${
        isWidescreen
          ? 'h-[72vh] sm:h-[78vh] lg:h-[min(900px,calc(100dvh-5rem))]'
          : 'h-[60vh] sm:h-[65vh] lg:h-[min(760px,calc(100dvh-8rem))]'
      } ${className}`}
      dir="rtl"
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-pan-y focus:outline-none"
        tabIndex={0}
        aria-label="הדמיית ארון תקשורת תלת-ממדית אינטראקטיבית"
      />

      {/* Top Floating Notification Banner for Newly Added Product */}
      {showAddedBanner && newlyAddedInstance && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-300 max-w-[92%] sm:max-w-md">
          <div className="bg-slate-900/95 text-white border border-emerald-400/80 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 backdrop-blur-md text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">
              נוסף: <strong>{newlyAddedInstance.name}</strong>{' '}
              <span className="text-emerald-300 font-mono">
                (U{newlyAddedInstance.uStart}
                {newlyAddedInstance.uSpan > 1 ? `-U${newlyAddedInstance.uStart + newlyAddedInstance.uSpan - 1}` : ''})
              </span>
            </span>
            <button
              type="button"
              onClick={() => focusOnSelectedProduct(newlyAddedInstance.instanceId)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-[11px] shrink-0 cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
            >
              <Eye size={12} />
              <span>הצג את הפריט</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedAddedBannerId(lastAddedInstanceId || null)}
              className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="סגור התראה"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Top HUD Toolbar */}
      <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
        {/* Left Side: Status Badges */}
        <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[11px] px-2.5 py-1 flex items-center gap-2 shadow-md rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{dims.totalU}U</span>
            <span className="text-slate-400 text-[10px] font-mono">
              {dims.widthMm}x{dims.depthMm}mm
            </span>
          </div>

          {dims.isSpecific447510T && (
            <div className="bg-amber-500/20 border border-amber-400 text-amber-300 text-[10.5px] px-2.5 py-1 flex items-center gap-1.5 font-bold shadow-md rounded-md">
              <Award size={13} className="text-amber-400" />
              <span className="hidden sm:inline">מפרט Boost 447510T</span>
            </div>
          )}

          {dims.isSpecificBoost42U && (
            <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10.5px] px-2.5 py-1 flex items-center gap-1.5 font-bold shadow-md rounded-md">
              <Award size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">מפרט Boost Rack 42U</span>
            </div>
          )}

          {unallocatedCount > 0 && (
            <div
              id="hud-unallocated-badge"
              className="bg-rose-600/95 border border-rose-400 text-white text-[11px] px-2.5 py-1 flex items-center gap-1.5 font-bold shadow-md animate-pulse rounded-md"
              title={`${unallocatedCount} פריטים ללא מקום פנוי`}
            >
              <span>⚠ {unallocatedCount} ללא מקום</span>
            </div>
          )}

          {hoveredSlotU !== null && (
            <div className="bg-[#004387] border border-blue-400 text-white text-[11px] font-bold px-2.5 py-1 flex items-center gap-1 shadow-lg animate-in fade-in rounded-md">
              <span>➕ הוספה ב-U{hoveredSlotU}</span>
            </div>
          )}
        </div>

        {/* Right Side: Primary Essential Actions + Collapsible "תצוגה" Group */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1 pointer-events-auto shadow-md rounded-md relative">
          {/* Reset / All Cabinet View */}
          <button
            type="button"
            onClick={() => fitCameraToCabinet(false)}
            className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-800 text-slate-200 hover:text-white rounded transition-colors cursor-pointer flex items-center gap-1"
            title="הצג את כל הארון"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">כל הארון</span>
          </button>

          {/* Focus on Product / Restore Framing Toggle */}
          {isFocusedOnProduct ? (
            <button
              type="button"
              onClick={restorePreviousFraming}
              className="px-2 py-1 text-[11px] font-semibold bg-blue-800 text-white hover:bg-blue-700 rounded transition-colors cursor-pointer flex items-center gap-1"
              title="חזור למבט הקודם"
            >
              <CornerUpLeft size={13} />
              <span>חזור למבט</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => focusOnSelectedProduct()}
              className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-800 text-slate-200 hover:text-white rounded transition-colors cursor-pointer flex items-center gap-1"
              title="התמקדות בציוד הנבחר"
            >
              <ZoomIn size={13} />
              <span className="hidden sm:inline">התמקדות</span>
            </button>
          )}

          {/* Core View Presets: Front, Rear, Iso */}
          <div className="flex items-center gap-0.5 bg-slate-950/80 px-1 py-0.5 border border-slate-800 rounded">
            <button
              type="button"
              onClick={() => setCameraPreset('front')}
              className="px-1.5 py-0.5 text-[10.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer whitespace-nowrap"
              title="מבט חזיתי ישר"
            >
              חזית
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('rear')}
              className="px-1.5 py-0.5 text-[10.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer whitespace-nowrap"
              title="מבט אחורי ישר"
            >
              אחור
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('iso')}
              className="px-1.5 py-0.5 text-[10.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer whitespace-nowrap"
              title="מבט איזומטרי"
            >
              איזומטרי
            </button>
          </div>

          {/* Collapsible "תצוגה" Settings Menu Button */}
          <button
            type="button"
            onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
            className={`px-2 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${
              isDisplayMenuOpen
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-800 text-slate-200 hover:text-white'
            }`}
            title="אפשרויות תצוגה, דלתות ותאורה"
          >
            <SlidersHorizontal size={13} />
            <span>תצוגה</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Widescreen Toggle */}
          <button
            type="button"
            onClick={() => setIsWidescreen(w => !w)}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
            title={isWidescreen ? 'תצוגה רגילה' : 'תצוגה מוגדלת'}
          >
            {isWidescreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Collapsible "תצוגה" Popover Panel (Cleanly docked to top-right) */}
          {isDisplayMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900/95 border border-slate-700 text-white rounded-xl shadow-2xl p-3 space-y-3 z-40 backdrop-blur-md animate-in fade-in-50 slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal size={13} className="text-blue-400" />
                  <span>הגדרות תצוגה</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsDisplayMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Front Door */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>דלת קדמית:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {doorsInfo.hasFrontDoor
                      ? `${doorsInfo.frontDoorType === 'perforated' ? 'רשת' : doorsInfo.frontDoorType === 'glass' ? 'זכוכית' : 'פח'}${doorsInfo.isDoubleFront ? ' כפולה' : ''}${doorsInfo.isFrontDoorIllustrative ? ' (המחשה)' : ''}`
                      : 'ללא דלת'}
                  </span>
                </div>
                {doorsInfo.hasFrontDoor ? (
                  <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                    {(['transparent', 'open', 'closed', 'removed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSetDoorState('front', st)}
                        className={`py-1 text-[10px] rounded font-medium transition-colors cursor-pointer text-center ${
                          doorState.front === st
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {st === 'transparent' ? 'שקופה' : st === 'open' ? 'פתוחה' : st === 'closed' ? 'סגורה' : 'הסר'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 text-center">
                    ארון ללא דלת קדמית
                  </div>
                )}
              </div>

              {/* Rear Door */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>דלת אחורית:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {doorsInfo.hasRearDoor
                      ? `${doorsInfo.rearDoorType === 'perforated' ? 'רשת' : doorsInfo.rearDoorType === 'glass' ? 'זכוכית' : 'פח'}${doorsInfo.isDoubleRear ? ' כפולה' : ''}${doorsInfo.isRearDoorIllustrative ? ' (המחשה)' : ''}`
                      : 'ללא דלת אחורית'}
                  </span>
                </div>
                {doorsInfo.hasRearDoor ? (
                  <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                    {(['transparent', 'open', 'closed', 'removed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSetDoorState('rear', st)}
                        className={`py-1 text-[10px] rounded font-medium transition-colors cursor-pointer text-center ${
                          doorState.rear === st
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {st === 'transparent' ? 'שקופה' : st === 'open' ? 'פתוחה' : st === 'closed' ? 'סגורה' : 'הסר'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 text-center">
                    ללא דלת אחורית (מבנה אחורי פתוח)
                  </div>
                )}
              </div>

              {/* Lighting / Backdrop Environment */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">סביבת תאורה:</div>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBackdropTheme('studio-light')}
                    className={`py-1 px-1.5 text-[10px] rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      backdropTheme === 'studio-light'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Sun size={11} />
                    <span>סטודיו</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdropTheme('datacenter')}
                    className={`py-1 px-1.5 text-[10px] rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      backdropTheme === 'datacenter'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Moon size={11} />
                    <span>שרתים</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdropTheme('pure-white')}
                    className={`py-1 px-1.5 text-[10px] rounded font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      backdropTheme === 'pure-white'
                        ? 'bg-slate-200 text-slate-900 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles size={11} />
                    <span>לבן נקי</span>
                  </button>
                </div>
              </div>

              {/* Side Angle Views */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">מבטי צד:</div>
                <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCameraPreset('right')}
                    className="py-1 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    צד ימין
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraPreset('left')}
                    className="py-1 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    צד שמאל
                  </button>
                </div>
              </div>

              {/* Mobile Touch Mode Toggle */}
              <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400">שליטת מגע במובייל:</span>
                <button
                  type="button"
                  onClick={() => setMobileTouchMode(m => (m === 'orbit' ? 'scroll' : 'orbit'))}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer ${
                    mobileTouchMode === 'orbit'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {mobileTouchMode === 'orbit' ? 'סיבוב תלת־ממד' : 'גלילת עמוד'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
        {/* Included Items Details */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 text-[10.5px] px-2.5 py-1.5 flex items-center gap-2 pointer-events-auto shadow-md max-w-md overflow-x-auto rounded-md">
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
            className="bg-indigo-900/90 hover:bg-indigo-800 backdrop-blur-md border border-indigo-400 text-indigo-100 text-[11px] font-bold px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto transition-colors shadow-lg cursor-pointer shrink-0 rounded-md"
            title="הוסף אביזרי גג, בסיס, דפנות או ציוד חומרה ללא תפיסת יחידות U"
          >
            <Layers size={13} className="text-indigo-300" />
            <span>הוסף ציוד נלווה (0U)</span>
          </button>
        )}
      </div>

      {/* Accessibility Keyboard Slot Picker Bar */}
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
