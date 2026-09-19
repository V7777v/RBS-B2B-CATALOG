import { VisualSlot } from '../components/CabinetConfigurator';

export interface FreeSegment {
  startU: number; // 1-based start (bottom) of segment
  endU: number;   // 1-based end (top) of segment
  span: number;   // number of U units
}

export interface OccupiedInstance {
  instanceId: string;
  name: string;
  sku: string;
  uStart: number; // bottom U
  spanU: number;
  isLocked?: boolean;
}

export interface CabinetSpaceAnalysis {
  totalU: number;
  totalUsedU: number;
  totalFreeU: number;
  freeSegments: FreeSegment[];
  contiguousFreeAtTarget: number;
  occupiedInstances: OccupiedInstance[];
  occupancyByU: Map<number, OccupiedInstance>;
}

export interface RearrangementMove {
  instanceId: string;
  name: string;
  sku: string;
  fromU: number;
  toU: number;
  spanU: number;
}

export interface RearrangementPlan {
  moves: RearrangementMove[];
  targetU: number;
  uSpan: number;
  description: string;
  previewSlots: VisualSlot[];
}

export type PlacementCategory = 'direct' | 'alternative' | 'rearrange' | 'infeasible';

export interface ItemPlacementResult {
  category: PlacementCategory;
  uSize: number;
  alternateTargetU?: number;
  alternateEndU?: number;
  rearrangementPlan?: RearrangementPlan;
}

/**
 * Analyzes cabinet slots from 1 to totalU.
 * Slots array usually ordered top to bottom (totalU down to 1).
 */
export function analyzeCabinetSpace(
  totalU: number,
  slots: VisualSlot[],
  targetU: number | null = null
): CabinetSpaceAnalysis {
  const tot = Math.max(0, totalU);
  const slotMap = new Map<number, VisualSlot>();
  slots.forEach(s => slotMap.set(s.uIndex, s));

  const occupiedInstancesMap = new Map<string, OccupiedInstance>();
  const occupancyByU = new Map<number, OccupiedInstance>();

  let totalFreeU = 0;
  const isFree: boolean[] = new Array(tot + 1).fill(false);

  for (let u = 1; u <= tot; u++) {
    const s = slotMap.get(u);
    if (!s || s.type === 'empty') {
      isFree[u] = true;
      totalFreeU++;
    } else {
      isFree[u] = false;
      const instId = s.instanceId || `item-u${u}-${s.name}`;
      const span = s.spanU || 1;
      const isPreset = s.type === 'preset-shelf' || s.type === 'preset-fan';
      
      let inst = occupiedInstancesMap.get(instId);
      if (!inst) {
        inst = {
          instanceId: instId,
          name: s.name,
          sku: s.accessoryRef?.sku || s.accessoryRef?.pn || (isPreset ? 'PRESET' : ''),
          uStart: u,
          spanU: span,
          // Only lock if it has explicit lock flag or if it's hardware that absolutely cannot be moved.
          // Included items (preset) are NOT strictly locked unless specified.
          isLocked: s.accessoryRef?.isLocked === true || s.type === 'preset-fan',
        };
        occupiedInstancesMap.set(instId, inst);
      } else {
        if (u < inst.uStart) inst.uStart = u;
      }
      occupancyByU.set(u, inst);
    }
  }

  // Find contiguous free segments
  const freeSegments: FreeSegment[] = [];
  let currentStart: number | null = null;

  for (let u = 1; u <= tot; u++) {
    if (isFree[u]) {
      if (currentStart === null) currentStart = u;
    } else {
      if (currentStart !== null) {
        freeSegments.push({
          startU: currentStart,
          endU: u - 1,
          span: u - currentStart,
        });
        currentStart = null;
      }
    }
  }
  if (currentStart !== null) {
    freeSegments.push({
      startU: currentStart,
      endU: tot,
      span: tot - currentStart + 1,
    });
  }

  // Contiguous free count starting at targetU proceeding upwards
  let contiguousFreeAtTarget = 0;
  if (targetU !== null && targetU >= 1 && targetU <= tot) {
    for (let u = targetU; u <= tot; u++) {
      if (isFree[u]) {
        contiguousFreeAtTarget++;
      } else {
        break;
      }
    }
  }

  const occupiedInstances = Array.from(occupiedInstancesMap.values());
  const totalUsedU = tot - totalFreeU;

  return {
    totalU: tot,
    totalUsedU,
    totalFreeU,
    freeSegments,
    contiguousFreeAtTarget,
    occupiedInstances,
    occupancyByU,
  };
}

/**
 * Validates whether moving movable equipment can safely clear space for uSpan at targetU.
 * Guarantees a fully verified placement plan, never a speculative guess.
 */
export function findRearrangementPlan(
  targetItem: any,
  requestedTargetU: number,
  analysis: CabinetSpaceAnalysis,
  slots: VisualSlot[]
): RearrangementPlan | null {
  const uSpan = Math.max(1, targetItem.uSize ?? 1);
  const totalU = analysis.totalU;

  // 1. Overall capacity check
  if (analysis.totalFreeU < uSpan) {
    return null; // Not enough total free U in cabinet
  }

  // 2. Bound target range
  const targetStart = requestedTargetU;
  const targetEnd = targetStart + uSpan - 1;
  if (targetEnd > totalU) {
    return null; // Exceeds cabinet top rail
  }

  // Identify which instances currently occupy [targetStart..targetEnd]
  const conflictingInstances = new Set<OccupiedInstance>();
  for (let u = targetStart; u <= targetEnd; u++) {
    const occ = analysis.occupancyByU.get(u);
    if (occ) {
      if (occ.isLocked) {
        return null; // Locked/preset item cannot be moved
      }
      conflictingInstances.add(occ);
    }
  }

  if (conflictingInstances.size === 0) {
    // Already free!
    return {
      moves: [],
      targetU: targetStart,
      uSpan,
      description: `המקום ב-U${targetStart}${uSpan > 1 ? `-U${targetEnd}` : ''} פנוי להתקנה ישירה.`,
      previewSlots: slots,
    };
  }

  // Check if all conflicting items can be relocated to other free spaces
  // Simulate grid
  const simulatedGrid: (string | null)[] = new Array(totalU + 1).fill(null);
  for (let u = 1; u <= totalU; u++) {
    const occ = analysis.occupancyByU.get(u);
    if (occ) {
      simulatedGrid[u] = occ.instanceId;
    }
  }

  // Temporarily clear target area and the conflicting instances
  const conflictList = Array.from(conflictingInstances);
  conflictList.forEach(inst => {
    for (let u = inst.uStart; u < inst.uStart + inst.spanU; u++) {
      if (u <= totalU && simulatedGrid[u] === inst.instanceId) {
        simulatedGrid[u] = null;
      }
    }
  });

  // Lock the requested target range for targetItem
  for (let u = targetStart; u <= targetEnd; u++) {
    simulatedGrid[u] = '__TARGET_ITEM__';
  }

  // Try to find valid positions for each conflict item
  const moves: RearrangementMove[] = [];

  // Sort conflicts (larger items first to place cleanly)
  conflictList.sort((a, b) => b.spanU - a.spanU);

  for (const inst of conflictList) {
    let relocatedStart: number | null = null;

    // Search nearest available location to original position
    let bestDist = Infinity;
    for (let candidateU = 1; candidateU <= totalU - inst.spanU + 1; candidateU++) {
      let canPlace = true;
      for (let j = 0; j < inst.spanU; j++) {
        if (simulatedGrid[candidateU + j] !== null) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) {
        const dist = Math.abs(candidateU - inst.uStart);
        if (dist < bestDist) {
          bestDist = dist;
          relocatedStart = candidateU;
        }
      }
    }

    if (relocatedStart === null) {
      // Failed to find a valid non-overlapping location for this item
      return null;
    }

    // Place into simulated grid
    for (let j = 0; j < inst.spanU; j++) {
      simulatedGrid[relocatedStart + j] = inst.instanceId;
    }

    moves.push({
      instanceId: inst.instanceId,
      name: inst.name,
      sku: inst.sku,
      fromU: inst.uStart,
      toU: relocatedStart,
      spanU: inst.spanU,
    });
  }

  // Build human-readable Hebrew description
  const movesDesc = moves
    .map(m => `הזזת "${m.name}" מ-U${m.fromU}${m.spanU > 1 ? `-U${m.fromU + m.spanU - 1}` : ''} ל-U${m.toU}${m.spanU > 1 ? `-U${m.toU + m.spanU - 1}` : ''}`)
    .join(' וכן ');

  const description = `${movesDesc} כדי לפנות מקום עבור "${targetItem.name || targetItem.pn}" ב-U${targetStart}${uSpan > 1 ? `-U${targetEnd}` : ''}.`;

  // Build preview slots
  const previewSlots: VisualSlot[] = [];
  const slotMap = new Map<number, VisualSlot>();
  slots.forEach(s => slotMap.set(s.uIndex, s));

  // Build simulated slot map
  for (let u = totalU; u >= 1; u--) {
    const occupantId = simulatedGrid[u];
    if (occupantId === '__TARGET_ITEM__') {
      previewSlots.push({
        uIndex: u,
        type: 'optional-accessory',
        name: `[חדש] ${targetItem.name || targetItem.pn}`,
        description: targetItem.description || '',
        spanU: uSpan,
        isAnchor: u === targetEnd,
        instanceId: `preview-new-${Date.now()}`,
        accessoryRef: targetItem,
      });
    } else if (occupantId) {
      const moved = moves.find(m => m.instanceId === occupantId);
      const originalSlot = slots.find(s => s.instanceId === occupantId && s.isAnchor);
      const span = moved ? moved.spanU : (originalSlot?.spanU || 1);
      const uStart = moved ? moved.toU : (originalSlot?.uIndex ? originalSlot.uIndex - span + 1 : u);
      const isAnchor = u === uStart + span - 1;

      previewSlots.push({
        uIndex: u,
        type: originalSlot?.type || 'optional-accessory',
        name: moved ? `${moved.name} (הועבר ל-U${moved.toU})` : (originalSlot?.name || 'ציוד בארון'),
        description: originalSlot?.description || '',
        spanU: span,
        isAnchor,
        instanceId: occupantId,
        accessoryRef: originalSlot?.accessoryRef,
      });
    } else {
      previewSlots.push({
        uIndex: u,
        type: 'empty',
        name: `U${u} פנוי`,
        description: 'מקום פנוי',
      });
    }
  }

  return {
    moves,
    targetU: targetStart,
    uSpan,
    description,
    previewSlots,
  };
}

/**
 * Classifies an item's placement options against current cabinet state.
 */
export function classifyItemPlacement(
  item: any,
  analysis: CabinetSpaceAnalysis,
  targetU: number | null,
  slots: VisualSlot[]
): ItemPlacementResult {
  const uSize = item.uSize ?? 1;

  // 0U items always fit anywhere
  if (uSize === 0) {
    return { category: 'direct', uSize: 0 };
  }

  // Total space constraint: if remaining total free U is less than uSize, never feasible!
  // "אם נותר 1U בסך הכול, אל תציג מוצר של 2U ומעלה לבחירה... אל תסתפק בכפתור מנוטרל"
  if (uSize > analysis.totalFreeU) {
    return { category: 'infeasible', uSize };
  }

  // Case 1: Specific targetU requested
  if (targetU !== null && targetU >= 1 && targetU <= analysis.totalU) {
    // Does it fit directly at targetU?
    if (analysis.contiguousFreeAtTarget >= uSize) {
      return { category: 'direct', uSize };
    }

    // Does it fit elsewhere in another free contiguous segment without moving anything?
    const altSegment = analysis.freeSegments.find(s => s.span >= uSize && s.startU !== targetU);
    if (altSegment) {
      return {
        category: 'alternative',
        uSize,
        alternateTargetU: altSegment.startU,
        alternateEndU: altSegment.startU + uSize - 1,
      };
    }

    // Can we rearrange to fit at targetU?
    const plan = findRearrangementPlan(item, targetU, analysis, slots);
    if (plan && plan.moves.length > 0) {
      return {
        category: 'rearrange',
        uSize,
        rearrangementPlan: plan,
      };
    }

    // If targetU cannot be cleared, check if ANY other location can be rearranged
    for (const seg of analysis.freeSegments) {
      const planAlt = findRearrangementPlan(item, seg.startU, analysis, slots);
      if (planAlt && planAlt.moves.length > 0) {
        return {
          category: 'rearrange',
          uSize,
          alternateTargetU: seg.startU,
          alternateEndU: seg.startU + uSize - 1,
          rearrangementPlan: planAlt,
        };
      }
    }

    return { category: 'infeasible', uSize };
  }

  // Case 2: No specific targetU (general list view)
  const directSegment = [...analysis.freeSegments].reverse().find(s => s.span >= uSize);
  if (directSegment) {
    const highestU = directSegment.endU - uSize + 1;
    return {
      category: 'direct',
      uSize,
      alternateTargetU: highestU,
      alternateEndU: directSegment.endU,
    };
  }

  // Check if rearrangement can create space anywhere
  for (let candU = analysis.totalU - uSize + 1; candU >= 1; candU--) {
    const plan = findRearrangementPlan(item, candU, analysis, slots);
    if (plan && plan.moves.length > 0) {
      return {
        category: 'rearrange',
        uSize,
        alternateTargetU: candU,
        alternateEndU: candU + uSize - 1,
        rearrangementPlan: plan,
      };
    }
  }

  return { category: 'infeasible', uSize };
}
