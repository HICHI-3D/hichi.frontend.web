import type { FurnitureInstance, Shape } from './types';

/** Shoelace formula — polygon area in mm² */
const polygonArea = (points: { x: number; y: number }[]): number => {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

/** Collect all key points from shapes for bounding-box estimation. */
const collectPoints = (shapes: Shape[]): { x: number; y: number }[] => {
  const pts: { x: number; y: number }[] = [];
  for (const s of shapes) {
    if (s.type === 'wall') {
      pts.push(s.start, s.end);
    } else if (s.type === 'room' || s.type === 'region') {
      pts.push(...s.points);
    }
  }
  return pts;
};

export type SpaceScore = {
  utilizationPct: number; // furniture footprint / room area * 100
  corridorOk: boolean;    // heuristic: utilization < 70%
  totalScore: number;     // 0–100
  grade: '여유 있음' | '적절' | '보통' | '복잡' | '과밀';
  gradeColor: string;     // hex for chip accent
};

/** Returns null when no wall/room shapes exist yet. */
export const calcSpaceScore = (
  shapes: Shape[],
  placedFurniture: FurnitureInstance[],
): SpaceScore | null => {
  // Prefer explicit room polygons; fall back to bounding box of wall segments
  const roomShapes = shapes.filter((s) => s.type === 'room');
  let roomArea = 0;

  if (roomShapes.length > 0) {
    roomArea = roomShapes.reduce((sum, s) => {
      if (s.type !== 'room') return sum;
      return sum + polygonArea(s.points);
    }, 0);
  } else {
    // Bounding box of all wall endpoints
    const pts = collectPoints(shapes);
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    roomArea = w * h;
  }

  if (roomArea === 0) return null;

  const furnitureArea = placedFurniture.reduce(
    (sum, f) => sum + f.width * f.depth,
    0,
  );

  const utilizationPct = (furnitureArea / roomArea) * 100;
  const corridorOk = utilizationPct < 70;

  let totalScore: number;
  let grade: SpaceScore['grade'];
  let gradeColor: string;

  if (utilizationPct < 20) {
    totalScore = 55; grade = '여유 있음'; gradeColor = '#64748b';
  } else if (utilizationPct < 40) {
    totalScore = 90; grade = '적절';     gradeColor = '#4f7a52';
  } else if (utilizationPct < 60) {
    totalScore = 75; grade = '보통';     gradeColor = '#92400e';
  } else if (utilizationPct < 75) {
    totalScore = 45; grade = '복잡';     gradeColor = '#b45309';
  } else {
    totalScore = 20; grade = '과밀';     gradeColor = '#dc2626';
  }

  // corridor penalty
  if (!corridorOk) totalScore = Math.max(10, totalScore - 15);

  return { utilizationPct, corridorOk, totalScore, grade, gradeColor };
};
