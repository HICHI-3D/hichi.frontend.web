export type Point = { x: number; y: number };

export type DrawingMode =
  | 'wall'
  | 'room'
  | 'rect-column'
  | 'circle-column'
  | 'aux-line'
  | 'measurement'
  | 'delete'
  | 'select'
  | 'region'
  | 'door';

export type FurnitureType = 'sofa' | 'table' | 'chair' | 'bed' | 'bookshelf' | 'tv-stand';

export type FurnitureInstance = {
  id: string;
  type: FurnitureType;
  name: string;
  position: Point; // center position in mm
  rotation: number; // Y-axis rotation in degrees
  width: number; // mm
  depth: number; // mm
  height: number; // mm
  color: string;
};

/**
 * 영역 카테고리 — 원룸 내부의 sub-region 구분용.
 * `room` shape 와 의미가 다르다: `room` 은 자유 polygon 으로 그린 단순 도형(면적),
 * `region` 은 그 안의 욕실/주방/거실/침실 같은 의미적 구역.
 */
export type RegionCategory =
  | 'bathroom'
  | 'kitchen'
  | 'living'
  | 'bedroom'
  | 'other';

/** 한 region 의 벽지/바닥 마감재. 별도 finishes 맵에 regionId → RegionFinish 로 저장. */
export type RegionFinish = {
  wallpaperColor?: string;
  floorColor?: string;
};

export type Shape =
  | { id: string; type: 'wall'; start: Point; end: Point }
  | { id: string; type: 'room'; points: Point[] }
  | {
      id: string;
      type: 'rect-column';
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | { id: string; type: 'circle-column'; cx: number; cy: number; r: number }
  | { id: string; type: 'aux-line'; start: Point; end: Point }
  | { id: string; type: 'measurement'; start: Point; end: Point }
  | {
      id: string;
      type: 'region';
      category: RegionCategory;
      points: Point[];
    }
  | { id: string; type: 'door'; start: Point; end: Point };

export type Viewport = {
  panX: number;
  panY: number;
  zoom: number;
  locked: boolean;
  flipH: boolean;
};

export type Unit = 'mm' | 'ft/in';

export type ViewMode = '2D' | '3D';

export type BackgroundImage = {
  url: string;
  widthMm: number;
  heightMm: number;
  opacity: number;
};

export const toolLabelToMode = (label: string | null): DrawingMode | null => {
  switch (label) {
    case '벽 그리기':
      return 'wall';
    case '방 그리기':
      return 'room';
    case '삭제':
      return 'delete';
    case '사각기둥 그리기':
      return 'rect-column';
    case '원 기둥 그리기':
      return 'circle-column';
    case '보조선 그리기':
      return 'aux-line';
    case '측정':
      return 'measurement';
    case '선택':
      return 'select';
    case '영역 그리기':
      return 'region';
    case '문 그리기':
      return 'door';
    default:
      return null;
  }
};

export const REGION_CATEGORY_LABELS: Record<RegionCategory, string> = {
  bathroom: '욕실',
  kitchen: '주방',
  living: '거실',
  bedroom: '침실',
  other: '기타',
};

/** 영역 카테고리별 시각 색상 (반투명 fill) — region 자체 식별용. 마감재 색과는 별개. */
export const REGION_CATEGORY_COLORS: Record<RegionCategory, string> = {
  bathroom: 'hsla(200, 70%, 60%, 0.18)',
  kitchen: 'hsla(30, 80%, 60%, 0.18)',
  living: 'hsla(140, 50%, 60%, 0.18)',
  bedroom: 'hsla(280, 60%, 65%, 0.18)',
  other: 'hsla(0, 0%, 55%, 0.15)',
};
