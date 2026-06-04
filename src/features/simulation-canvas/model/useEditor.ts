import { useCallback, useEffect, useState } from 'react';

import type {
  BackgroundImage,
  DrawingMode,
  FurnitureInstance,
  Point,
  RegionCategory,
  RegionFinish,
  Shape,
  Unit,
  ViewMode,
  Viewport,
} from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

export type Editor = ReturnType<typeof useEditor>;

type EditorState = {
  shapes: Shape[];
  placedFurniture: FurnitureInstance[];
  /**
   * regionId → 벽지/바닥 색.
   * region 도형 자체와 분리된 별도 맵 (사용자 결정 2026-05-27).
   * region 삭제 시 같이 청소되며 history undo/redo 자연 통합.
   */
  regionFinishes: Record<string, RegionFinish>;
};

export function useEditor() {
  const [state, setState] = useState<EditorState>({
    shapes: [],
    placedFurniture: [],
    regionFinishes: {},
  });
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  const { shapes, placedFurniture, regionFinishes } = state;

  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(
    null,
  );
  /** 공간 환경 패널이 마감재 적용 대상으로 쓰는 선택된 region. */
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  /** 'region' 모드에서 새 region 그릴 때 부여할 카테고리. 패널이 set 한다. */
  const [pendingRegionCategory, setPendingRegionCategory] =
    useState<RegionCategory>('other');
  const [mode, setMode] = useState<DrawingMode | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const [viewport, setViewport] = useState<Viewport>({
    panX: 600,
    panY: 400,
    zoom: 0.3,
    locked: false,
    flipH: false,
  });
  const [unit, setUnit] = useState<Unit>('mm');
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
  const [backgroundImage, setBackgroundImage] =
    useState<BackgroundImage | null>(null);
  const [showDetectedWalls, setShowDetectedWalls] = useState(true);

  /* history */
  const pushHistory = useCallback((prev: EditorState) => {
    setHistory((h) => [...h.slice(-49), prev]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [state, ...f]);
      setState(prev);
      return h.slice(0, -1);
    });
  }, [state]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, state]);
      setState(next);
      return f.slice(1);
    });
  }, [state]);

  /* state helpers */
  const commitState = useCallback(
    (next: EditorState) => {
      pushHistory(state);
      setState(next);
    },
    [pushHistory, state],
  );

  /* shape helpers */
  const commitShape = useCallback(
    (shape: Shape) => {
      commitState({ ...state, shapes: [...state.shapes, shape] });
    },
    [commitState, state],
  );

  const removeShape = useCallback(
    (id: string) => {
      // region 을 지우면 마감재 맵도 dangling 안 되게 같이 청소
      const nextFinishes = { ...state.regionFinishes };
      delete nextFinishes[id];
      commitState({
        ...state,
        shapes: state.shapes.filter((s) => s.id !== id),
        regionFinishes: nextFinishes,
      });
      if (selectedRegionId === id) setSelectedRegionId(null);
    },
    [commitState, state, selectedRegionId],
  );

  /** 외부에서 도형들을 한꺼번에 추가 (예: 도면 이미지 파싱 결과) */
  const addShapes = useCallback(
    (incoming: Shape[]) => {
      if (incoming.length === 0) return;
      commitState({ ...state, shapes: [...state.shapes, ...incoming] });
    },
    [commitState, state],
  );

  /** 모든 도형 삭제 */
  const clearShapes = useCallback(() => {
    commitState({ ...state, shapes: [], regionFinishes: {} });
    setSelectedRegionId(null);
  }, [commitState, state]);

  /* region finishes */
  const setRegionFinish = useCallback(
    (regionId: string, patch: Partial<RegionFinish>) => {
      const prev = state.regionFinishes[regionId] ?? {};
      commitState({
        ...state,
        regionFinishes: {
          ...state.regionFinishes,
          [regionId]: { ...prev, ...patch },
        },
      });
    },
    [commitState, state],
  );

  const selectRegion = useCallback((id: string | null) => {
    setSelectedRegionId(id);
  }, []);

  /* furniture helpers */
  const addFurniture = useCallback(
    (f: Omit<FurnitureInstance, 'id'>) => {
      const newF = { ...f, id: uid() };
      commitState({
        ...state,
        placedFurniture: [...state.placedFurniture, newF],
      });
      setSelectedFurnitureId(newF.id);
    },
    [commitState, state],
  );

  const removeFurniture = useCallback(
    (id: string) => {
      commitState({
        ...state,
        placedFurniture: state.placedFurniture.filter((f) => f.id !== id),
      });
      if (selectedFurnitureId === id) setSelectedFurnitureId(null);
    },
    [commitState, state, selectedFurnitureId],
  );

  const updateFurniture = useCallback(
    (id: string, updates: Partial<FurnitureInstance>) => {
      commitState({
        ...state,
        placedFurniture: state.placedFurniture.map((f) =>
          f.id === id ? { ...f, ...updates } : f,
        ),
      });
    },
    [commitState, state],
  );

  const selectFurniture = useCallback((id: string | null) => {
    setSelectedFurnitureId(id);
    if (id) setMode('select');
  }, []);

  /* mode */
  const changeMode = useCallback((next: DrawingMode | null) => {
    setMode(next);
    setDraftPoints([]);
    if (next !== 'select') setSelectedFurnitureId(null);
    // 영역 그리기/문 그리기 모드 진입 시 region 선택은 유지하지 않음
    // (선택된 region 의 마감재 색 적용 흐름과 캔버스 클릭 흐름이 섞이지 않게)
    if (next === 'region' || next === 'door') setSelectedRegionId(null);
  }, []);

  /* interaction — commit point for current mode */
  const handleCanvasClick = useCallback(
    (world: Point) => {
      if (!mode) {
        setSelectedFurnitureId(null);
        return;
      }

      if (mode === 'delete' || mode === 'select') return; // handled via item click

      setDraftPoints((pts) => {
        const points = [...pts, world];

        // polygon 그리기 — room 과 region 은 동일한 인터랙션(3+ 점 후 첫 점 근처 클릭으로 close).
        // 의미가 다르므로 shape type 은 분리. (사용자 결정 2026-05-27)
        if (mode === 'room' || mode === 'region') {
          if (points.length >= 3) {
            const first = points[0];
            const dx = world.x - first.x;
            const dy = world.y - first.y;
            if (Math.hypot(dx, dy) < 300) {
              const closedPoints = points.slice(0, -1);
              if (mode === 'room') {
                commitShape({
                  id: uid(),
                  type: 'room',
                  points: closedPoints,
                });
              } else {
                commitShape({
                  id: uid(),
                  type: 'region',
                  category: pendingRegionCategory,
                  points: closedPoints,
                });
              }
              return [];
            }
          }
          return points;
        }

        if (points.length === 2) {
          const [a, b] = points;
          if (mode === 'wall') {
            commitShape({ id: uid(), type: 'wall', start: a, end: b });
          } else if (mode === 'aux-line') {
            commitShape({ id: uid(), type: 'aux-line', start: a, end: b });
          } else if (mode === 'measurement') {
            commitShape({ id: uid(), type: 'measurement', start: a, end: b });
          } else if (mode === 'door') {
            commitShape({ id: uid(), type: 'door', start: a, end: b });
          } else if (mode === 'rect-column') {
            commitShape({
              id: uid(),
              type: 'rect-column',
              x: Math.min(a.x, b.x),
              y: Math.min(a.y, b.y),
              w: Math.abs(b.x - a.x),
              h: Math.abs(b.y - a.y),
            });
          } else if (mode === 'circle-column') {
            commitShape({
              id: uid(),
              type: 'circle-column',
              cx: a.x,
              cy: a.y,
              r: Math.hypot(b.x - a.x, b.y - a.y),
            });
          }
          return [];
        }

        return points;
      });
    },
    [mode, commitShape, pendingRegionCategory],
  );

  const finishDraft = useCallback(() => {
    if (mode === 'room' && draftPoints.length >= 3) {
      commitShape({ id: uid(), type: 'room', points: draftPoints });
    } else if (mode === 'region' && draftPoints.length >= 3) {
      commitShape({
        id: uid(),
        type: 'region',
        category: pendingRegionCategory,
        points: draftPoints,
      });
    }
    setDraftPoints([]);
  }, [mode, draftPoints, commitShape, pendingRegionCategory]);

  const cancelDraft = useCallback(() => setDraftPoints([]), []);

  /* viewport */
  const pan = useCallback(
    (dx: number, dy: number) => {
      if (viewport.locked) return;
      setViewport((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
    },
    [viewport.locked],
  );

  const zoomAt = useCallback(
    (factor: number, center?: { x: number; y: number }) => {
      setViewport((v) => {
        const nextZoom = Math.min(3, Math.max(0.05, v.zoom * factor));
        if (!center) return { ...v, zoom: nextZoom };
        // zoom toward cursor position in screen coords
        const ratio = nextZoom / v.zoom;
        return {
          ...v,
          zoom: nextZoom,
          panX: center.x - (center.x - v.panX) * ratio,
          panY: center.y - (center.y - v.panY) * ratio,
        };
      });
    },
    [],
  );

  const toggleLock = useCallback(
    () => setViewport((v) => ({ ...v, locked: !v.locked })),
    [],
  );

  const toggleFlipH = useCallback(
    () => setViewport((v) => ({ ...v, flipH: !v.flipH })),
    [],
  );

  const fitView = useCallback(
    (screenW: number, screenH: number) => {
      if (shapes.length === 0 && placedFurniture.length === 0 && !backgroundImage) {
        setViewport((v) => ({
          ...v,
          panX: screenW / 2,
          panY: screenH / 2,
          zoom: 0.3,
        }));
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const visit = (p: Point) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      };
      for (const s of shapes) {
        if (
          s.type === 'wall' ||
          s.type === 'aux-line' ||
          s.type === 'measurement' ||
          s.type === 'door'
        ) {
          visit(s.start);
          visit(s.end);
        } else if (s.type === 'room' || s.type === 'region') {
          s.points.forEach(visit);
        } else if (s.type === 'rect-column') {
          visit({ x: s.x, y: s.y });
          visit({ x: s.x + s.w, y: s.y + s.h });
        } else if (s.type === 'circle-column') {
          visit({ x: s.cx - s.r, y: s.cy - s.r });
          visit({ x: s.cx + s.r, y: s.cy + s.r });
        }
      }
      for (const f of placedFurniture) {
        // approximate bbox for furniture
        const r = Math.max(f.width, f.depth) / 2;
        visit({ x: f.position.x - r, y: f.position.y - r });
        visit({ x: f.position.x + r, y: f.position.y + r });
      }
      // 도형이 없어도 배경 이미지 영역에 맞춰 보이게
      if (backgroundImage) {
        visit({ x: 0, y: 0 });
        visit({ x: backgroundImage.widthMm, y: backgroundImage.heightMm });
      }
      const pad = 100;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      const zoom = Math.min(screenW / w, screenH / h, 2);
      setViewport((v) => ({
        ...v,
        zoom,
        panX: screenW / 2 - ((minX + maxX) / 2) * zoom,
        panY: screenH / 2 - ((minY + maxY) / 2) * zoom,
      }));
    },
    [shapes, placedFurniture, backgroundImage],
  );

  /* escape/enter keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDraft();
        setMode(null);
        setSelectedFurnitureId(null);
        setSelectedRegionId(null);
      } else if (e.key === 'Enter') {
        finishDraft();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFurnitureId) {
          removeFurniture(selectedFurnitureId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelDraft, finishDraft, selectedFurnitureId, removeFurniture]);

  return {
    // state
    shapes,
    placedFurniture,
    regionFinishes,
    selectedFurnitureId,
    selectedRegionId,
    pendingRegionCategory,
    mode,
    draftPoints,
    hoverPoint,
    viewport,
    unit,
    viewMode,
    backgroundImage,
    showDetectedWalls,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    // state setters
    setHoverPoint,
    setUnit,
    setViewMode,
    setBackgroundImage,
    setShowDetectedWalls,
    setPendingRegionCategory,
    // mode
    changeMode,
    // interactions
    handleCanvasClick,
    finishDraft,
    cancelDraft,
    removeShape,
    addShapes,
    clearShapes,
    // region finishes
    setRegionFinish,
    selectRegion,
    // furniture
    addFurniture,
    removeFurniture,
    updateFurniture,
    selectFurniture,
    // history
    undo,
    redo,
    // viewport
    pan,
    zoomAt,
    toggleLock,
    toggleFlipH,
    fitView,
  };
}
