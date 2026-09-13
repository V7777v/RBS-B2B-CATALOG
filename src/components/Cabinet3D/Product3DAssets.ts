/**
 * 3D Asset and Visual Mesh Definitions for Cabinet Equipment
 * 
 * Maps specific SKUs to 3D model assets (GLB / GLTF), high-fidelity front-plate textures,
 * or dedicated parametric geometry so that identified products render with accurate physical features
 * instead of uniform generic boxes.
 * 
 * Adding future GLB/GLTF models or asset textures requires only registering them in `SKU_3D_ASSET_REGISTRY`.
 */

export interface Product3DAssetDef {
  sku: string;
  /** Optional external 3D model file URL (.glb, .gltf) */
  modelUrl?: string;
  /** High-resolution front faceplate texture / decal (orthographic / non-skewed) */
  frontTextureUrl?: string;
  /** Visual category profile */
  categoryProfile?: 'switch-16' | 'switch-24' | 'switch-48' | 'ups-online' | 'router-vpn' | 'audio-amplifier' | 'pdu' | 'shelf' | 'panel-blank' | 'panel-brush';
  /** Primary chassis metal finish */
  chassisColor?: number;
  roughness?: number;
  metalness?: number;
  /** Front panel styling details */
  details?: {
    portBlocks?: number;
    portsPerBlock?: number;
    ledCount?: number;
    hasLcdDisplay?: boolean;
    lcdColor?: number;
    hasDials?: boolean;
    dialCount?: number;
    brandText?: string;
    ventGrille?: boolean;
  };
}

/**
 * SKU-to-3D Visual Mapping Registry
 * Any SKU registered here receives targeted 3D visualization.
 */
export const SKU_3D_ASSET_REGISTRY: Record<string, Product3DAssetDef> = {
  // Hikvision 16-Port Managed Switches (1U)
  'DS-3E1518P-EI_M': {
    sku: 'DS-3E1518P-EI_M',
    categoryProfile: 'switch-16',
    chassisColor: 0x1e293b, // slate-800 dark industrial
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 2,
      portsPerBlock: 8,
      ledCount: 16,
      brandText: 'HIKVISION',
    },
  },
  'DS-3E1518P-EI_V2': {
    sku: 'DS-3E1518P-EI_V2',
    categoryProfile: 'switch-16',
    chassisColor: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 2,
      portsPerBlock: 8,
      ledCount: 16,
      brandText: 'HIKVISION',
    },
  },
  'DS-3E1520HP-SI-16P2T2F': {
    sku: 'DS-3E1520HP-SI-16P2T2F',
    categoryProfile: 'switch-16',
    chassisColor: 0x0f172a,
    roughness: 0.3,
    metalness: 0.7,
    details: {
      portBlocks: 2,
      portsPerBlock: 8,
      ledCount: 16,
      brandText: 'HIKVISION Hi-PoE',
    },
  },
  'DS-3E1516-EI-V3': {
    sku: 'DS-3E1516-EI-V3',
    categoryProfile: 'switch-16',
    chassisColor: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 2,
      portsPerBlock: 8,
      ledCount: 16,
      brandText: 'HIKVISION',
    },
  },

  // Hikvision 24-Port Managed / Smart Switches (1U)
  'DS-3E1526P-EI_M': {
    sku: 'DS-3E1526P-EI_M',
    categoryProfile: 'switch-24',
    chassisColor: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION',
    },
  },
  'DS-3E1526P-EI_V2': {
    sku: 'DS-3E1526P-EI_V2',
    categoryProfile: 'switch-24',
    chassisColor: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION',
    },
  },
  'DS-3E1528HP-SI-24P2T2F': {
    sku: 'DS-3E1528HP-SI-24P2T2F',
    categoryProfile: 'switch-24',
    chassisColor: 0x0f172a,
    roughness: 0.3,
    metalness: 0.75,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION Hi-PoE',
    },
  },
  'DS-3E1524-EI-V3': {
    sku: 'DS-3E1524-EI-V3',
    categoryProfile: 'switch-24',
    chassisColor: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION',
    },
  },
  'DS-3E2736-HI-24F8T4X': {
    sku: 'DS-3E2736-HI-24F8T4X',
    categoryProfile: 'switch-24',
    chassisColor: 0x090d16,
    roughness: 0.25,
    metalness: 0.8,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION 10G CORE',
    },
  },
  'DS-3E0524R-O': {
    sku: 'DS-3E0524R-O',
    categoryProfile: 'switch-24',
    chassisColor: 0x27272a,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION GIGA',
    },
  },
  'DS-3T1528HP-SI-24P4F': {
    sku: 'DS-3T1528HP-SI-24P4F',
    categoryProfile: 'switch-24',
    chassisColor: 0x18181b,
    roughness: 0.25,
    metalness: 0.85,
    details: {
      portBlocks: 3,
      portsPerBlock: 8,
      ledCount: 24,
      brandText: 'HIKVISION INDUSTRIAL',
    },
  },

  // Hikvision 48-Port Switch (1U)
  'DS-3E1552P-SI': {
    sku: 'DS-3E1552P-SI',
    categoryProfile: 'switch-48',
    chassisColor: 0x0f172a,
    roughness: 0.3,
    metalness: 0.7,
    details: {
      portBlocks: 4,
      portsPerBlock: 12,
      ledCount: 48,
      brandText: 'HIKVISION 48P',
    },
  },

  // Hikvision Enterprise VPN Router (1U)
  'DS-3WG507G-SI': {
    sku: 'DS-3WG507G-SI',
    categoryProfile: 'router-vpn',
    chassisColor: 0x1e293b,
    roughness: 0.3,
    metalness: 0.7,
    details: {
      portBlocks: 1,
      portsPerBlock: 6,
      ledCount: 8,
      brandText: 'HIKVISION VPN GATEWAY',
    },
  },

  // Hikvision Rackmount UPS Units (2U Online)
  'DS-UPS01K24-R/TJS(O-STD)/EU/IEC': {
    sku: 'DS-UPS01K24-R/TJS(O-STD)/EU/IEC',
    categoryProfile: 'ups-online',
    chassisColor: 0x111827,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      hasLcdDisplay: true,
      lcdColor: 0x10b981, // Green active LCD
      ventGrille: true,
      brandText: 'HIKVISION UPS 1kVA',
    },
  },
  'DS-UPS02K48-R/TJS(O-STD)/EU/IEC': {
    sku: 'DS-UPS02K48-R/TJS(O-STD)/EU/IEC',
    categoryProfile: 'ups-online',
    chassisColor: 0x111827,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      hasLcdDisplay: true,
      lcdColor: 0x10b981,
      ventGrille: true,
      brandText: 'HIKVISION UPS 2kVA',
    },
  },
  'DS-UPS03K72-R/TJS(O-STD)/EU/IEC': {
    sku: 'DS-UPS03K72-R/TJS(O-STD)/EU/IEC',
    categoryProfile: 'ups-online',
    chassisColor: 0x111827,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      hasLcdDisplay: true,
      lcdColor: 0x10b981,
      ventGrille: true,
      brandText: 'HIKVISION UPS 3kVA',
    },
  },
  'DS-UPS06K-R/TJL': {
    sku: 'DS-UPS06K-R/TJL',
    categoryProfile: 'ups-online',
    chassisColor: 0x111827,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      hasLcdDisplay: true,
      lcdColor: 0x38bdf8,
      ventGrille: true,
      brandText: 'HIKVISION UPS 6kVA',
    },
  },
  'DS-UPS10K-R/TJL': {
    sku: 'DS-UPS10K-R/TJL',
    categoryProfile: 'ups-online',
    chassisColor: 0x111827,
    roughness: 0.4,
    metalness: 0.6,
    details: {
      hasLcdDisplay: true,
      lcdColor: 0x38bdf8,
      ventGrille: true,
      brandText: 'HIKVISION UPS 10kVA',
    },
  },

  // Polman Professional Audio Rackmount Equipment (2U)
  'XL600': {
    sku: 'XL600',
    categoryProfile: 'audio-amplifier',
    chassisColor: 0x09090b, // Zinc-950 deep matte black
    roughness: 0.25,
    metalness: 0.85,
    details: {
      hasDials: true,
      dialCount: 2,
      brandText: 'POLMAN XL600',
      ventGrille: true,
    },
  },
};

/**
 * Normalizes SKU string for lookup
 */
export function lookup3DAsset(sku: string | undefined): Product3DAssetDef | null {
  if (!sku) return null;
  const clean = sku.trim();
  if (SKU_3D_ASSET_REGISTRY[clean]) return SKU_3D_ASSET_REGISTRY[clean];
  const upper = clean.toUpperCase();
  if (SKU_3D_ASSET_REGISTRY[upper]) return SKU_3D_ASSET_REGISTRY[upper];
  return null;
}
