import { VisualSlot } from '../CabinetConfigurator';
import { CabinetMatrixData } from '../../utils/cabinetData';

export interface CabinetDimensions3D {
  totalU: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  isSchematicDimensions: boolean;
  isSchematicCapacity: boolean;
}

export interface Product3DInstance {
  instanceId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  uStart: number; // 1-based, U1 is bottom
  uSpan: number;
  isIncluded: boolean;
  type: 'shelf' | 'panel' | 'pdu' | 'active' | 'fan';
  image?: string;
  optionalIdx?: number;
  accessoryRef?: any;
}

export interface NonU3DItem {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  zone: 'roof' | 'plinth' | 'vertical' | 'hardware';
  isIncluded: boolean;
  accessoryRef?: any;
  optionalIdx?: number;
}

export interface Cabinet3DViewerProps {
  product: any;
  cabinetData: CabinetMatrixData | null;
  totalU: number;
  slots: VisualSlot[];
  selectedOptionals: any[];
  nonUAccessories: any[];
  includedItems: string[];
  availableU: number;
  usedU: number;
  highlightedOptIdx: number | null;
  lastAddedInstanceId: string | null;
  selectedSlotU?: number | null;
  hoveredProduct: any;
  onProductHover: (slot: VisualSlot | null) => void;
  onProductInspect: (slot: VisualSlot) => void;
  onSlotClickToAdd: (uIndex: number) => void;
  onOpenAuxiliaryModal?: () => void;
  onIncrementQuantity: (index: number) => void;
  onRemoveOptional: (index: number) => void;
  onFallbackTo2D?: () => void;
  className?: string;
}
