/**
 * 백엔드 API 호출 모음.
 * 의존성 없이 fetch만 사용.
 */

import { config } from '@shared/config';

// ─── 백엔드 응답 타입 ──────────────────────────────────────────────

export type ParsedWall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ParsedFloorPlan = {
  walls: ParsedWall[];
  rooms: unknown[];
  openings: unknown[];
  parser?: 'vision' | 'opencv';
  meta: {
    image_width: number;
    image_height: number;
    pixels_per_mm: number;
    coordinate_unit: 'mm';
  };
};

export type FloorPlanUploadResponse = {
  id: number;
  filename: string;
  status: 'uploaded' | 'parsed' | 'failed';
  parsed: ParsedFloorPlan | null;
  error: string | null;
  image_url: string | null;
  created_at: string;
};

// ─── 호출 함수 ────────────────────────────────────────────────────

export const uploadFloorPlan = async (
  file: File,
  pixelsPerMm?: number,
): Promise<FloorPlanUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${config.apiBaseUrl}/api/floor-plans/upload`);
  if (pixelsPerMm) {
    url.searchParams.set('pixels_per_mm', String(pixelsPerMm));
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`업로드 실패 (${response.status}): ${text}`);
  }
  return response.json();
};

// ─── 가구 스캔/조회 ────────────────────────────────────────────────

import type { FurnitureRecord } from '@entities/furniture';

/** 백엔드 상대 model_url을 절대 URL로 변환 */
export const resolveModelUrl = (relativeUrl: string): string =>
  `${config.apiBaseUrl}${relativeUrl}`;

export const scanFurniture = async (
  files: File[],
  options: { name?: string; category?: string } = {},
): Promise<FurnitureRecord> => {
  if (files.length < 5) {
    throw new Error(`최소 5장 이상 필요합니다 (현재 ${files.length}장)`);
  }
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  formData.append('name', options.name ?? '새 가구');
  if (options.category) formData.append('category', options.category);

  const response = await fetch(`${config.apiBaseUrl}/api/furniture/scan`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`스캔 시작 실패 (${response.status}): ${text}`);
  }
  return response.json();
};

export const getFurniture = async (id: number): Promise<FurnitureRecord> => {
  const response = await fetch(`${config.apiBaseUrl}/api/furniture/${id}`);
  if (!response.ok) {
    throw new Error(`가구 조회 실패 (${response.status})`);
  }
  return response.json();
};

export const listFurniture = async (): Promise<FurnitureRecord[]> => {
  const response = await fetch(`${config.apiBaseUrl}/api/furniture/`);
  if (!response.ok) {
    throw new Error(`가구 목록 실패 (${response.status})`);
  }
  return response.json();
};

export type FurnitureCreateBody = {
  name: string;
  category?: string;
  width_mm?: number;
  depth_mm?: number;
  height_mm?: number;
};

export const createFurniture = async (
  body: FurnitureCreateBody,
): Promise<FurnitureRecord> => {
  const response = await fetch(`${config.apiBaseUrl}/api/furniture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`가구 추가 실패 (${response.status}): ${text}`);
  }
  return response.json();
};

export const cancelFurnitureScan = async (
  id: number,
): Promise<FurnitureRecord> => {
  const response = await fetch(`${config.apiBaseUrl}/api/furniture/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`스캔 취소 실패 (${response.status})`);
  }
  return response.json();
};

// ─── AI 배치 추천 ──────────────────────────────────────────────────

export type LayoutFurnitureInput = {
  type: string;
  name: string;
  width_mm: number;
  depth_mm: number;
};

export type LayoutRequest = {
  room_width_mm: number;
  room_depth_mm: number;
  furniture: LayoutFurnitureInput[];
};

export type FurniturePlacement = {
  type: string;
  name: string;
  width_mm: number;
  depth_mm: number;
  position: { x: number; y: number };
  rotation: number;
};

export type LayoutResponse = {
  placements: FurniturePlacement[];
  source: 'ai' | 'rules';
};

export const recommendLayout = async (body: LayoutRequest): Promise<LayoutResponse> => {
  const response = await fetch(`${config.apiBaseUrl}/api/recommendations/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI 배치 추천 실패 (${response.status}): ${text}`);
  }
  return response.json();
};

// ─── 중고 매물 검색 ────────────────────────────────────────────

export type SecondhandItem = {
  title: string;
  price: string;
  source: string;
  link: string;
  thumbnail: string | null;
};

export type SecondhandResponse = {
  items: SecondhandItem[];
  source: 'api' | 'mock';
  query: string;
};

export const searchSecondhand = async (
  query: string,
  furnitureType: string = '',
  count: number = 4,
): Promise<SecondhandResponse> => {
  const params = new URLSearchParams({ query, furniture_type: furnitureType, count: String(count) });
  const response = await fetch(`${config.apiBaseUrl}/api/secondhand/?${params}`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`중고 검색 실패 (${response.status}): ${text}`);
  }
  return response.json();
};
