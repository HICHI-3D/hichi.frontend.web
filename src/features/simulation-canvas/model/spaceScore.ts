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

export type SpaceScore = {
  utilizationPct: number; // furniture footprint / room area * 100
  corridorOk: boolean;    // heuristic: utilization < 70%
  totalScore: number;     // 0–100
  grade: '여유 있음' | '적절' | '보통' | '복잡' | '과밀';
  gradeColor: string;     // hex for chip accent
};

/** Returns null when no room polygon exists yet. */
export const calcSpaceScore = (
  shapes: Shape[],
  placedFurniture: FurnitureInstance[],
): SpaceScore | null => {
  const roomShapes = shapes.filter((s) => s.type === 'room');
  if (roomShapes.length === 0) return null;

  const roomArea = roomShapes.reduce((sum, s) => {
    if (s.type !== 'room') return sum;
    return sum + polygonArea(s.points);
  }, 0);
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
