import { useEffect, useRef, useState } from 'react';

import type { Point, Shape } from '../model/types';
import { REGION_CATEGORY_COLORS } from '../model/types';
import type { Editor } from '../model/useEditor';
import FurnitureSvg from './FurnitureSvg';

/** 캔버스 배경색. svg style의 background와 일치시킬 것. door 가 벽을 덮을 때 같은 색으로. */
const CANVAS_BG = '#f7f5f1';

type Props = { editor: Editor };

const CLICK_THRESHOLD = 4; // px — below this, treat as click (not pan)

const formatLength = (mm: number, unit: 'mm' | 'ft/in') => {
  if (unit === 'mm') return `${Math.round(mm)}mm`;
  const totalInches = mm / 25.4;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}'${inches}"`;
};

const SimulationCanvas = ({ editor }: Props) => {
  const {
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
    backgroundImage,
    showDetectedWalls,
    setHoverPoint,
    handleCanvasClick,
    removeShape,
    addFurniture,
    updateFurniture,
    selectFurniture,
    selectRegion,
    pan,
    zoomAt,
    fitView,
  } = editor;

  const hasBackground = backgroundImage !== null;
  const wallStrokeBase = 'hsl(258, 73%, 74%)';
  const wallStrokeWidth = hasBackground ? 6 : 10;

  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);

  /* pointer tracking */
  const downRef = useRef<{
    sx: number;
    sy: number;
    isPanning: boolean;
    moved: boolean;
    draggingFurnitureId: string | null;
    initialPos: Point | null;
    /** 회전 드래그 중인 가구 id (회전 핸들에서 시작된 경우) */
    rotatingFurnitureId: string | null;
    /** 회전 시작 시점의 마우스 각도 (deg, 가구 중심 기준) */
    startAngle: number;
    /** 회전 시작 시점의 가구 rotation (deg) */
    startRotation: number;
  } | null>(null);

  /**
   * 회전 핸들의 world 좌표.
   * FurnitureSvg 의 핸들 위치 `cx={width / 2 + 100}` 와 일치시킨다.
   * 가구의 rotation 만큼 회전한 점.
   */
  const rotateHandleWorldPos = (f: {
    position: Point;
    width: number;
    rotation: number;
  }) => {
    const rad = (f.rotation * Math.PI) / 180;
    const offset = f.width / 2 + 100;
    return {
      x: f.position.x + Math.cos(rad) * offset,
      y: f.position.y + Math.sin(rad) * offset,
    };
  };

  /* resize */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* center when container first gets a size */
  const firstSizeRef = useRef(false);
  useEffect(() => {
    if (firstSizeRef.current) return;
    if (size.w && size.h) {
      firstSizeRef.current = true;
      fitView(size.w, size.h);
    }
  }, [size, fitView]);

  const screenToWorld = (sx: number, sy: number): Point => {
    const x = (sx - viewport.panX) / viewport.zoom;
    const y = (sy - viewport.panY) / viewport.zoom;
    return viewport.flipH ? { x: -x, y } : { x, y };
  };

  const svgCoords = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const { sx, sy } = svgCoords(e);
    const world = screenToWorld(sx, sy);

    /* 1) 선택된 가구의 회전 핸들 영역인지 먼저 검사 — 우선순위 가장 높음 */
    if (selectedFurnitureId) {
      const sel = placedFurniture.find((f) => f.id === selectedFurnitureId);
      if (sel) {
        const handlePos = rotateHandleWorldPos(sel);
        const dx = world.x - handlePos.x;
        const dy = world.y - handlePos.y;
        // 핸들 시각 반경 40mm + 여유 → 80mm
        if (Math.hypot(dx, dy) < 80) {
          const startAngle =
            (Math.atan2(world.y - sel.position.y, world.x - sel.position.x) *
              180) /
            Math.PI;
          downRef.current = {
            sx,
            sy,
            isPanning: false,
            moved: false,
            draggingFurnitureId: null,
            initialPos: null,
            rotatingFurnitureId: sel.id,
            startAngle,
            startRotation: sel.rotation,
          };
          return;
        }
      }
    }

    /* 2) 기존 동작 — 가구 위면 드래그, 아니면 pan */
    const fUnder = [...placedFurniture].reverse().find((f) => {
      const dx = world.x - f.position.x;
      const dy = world.y - f.position.y;
      return Math.hypot(dx, dy) < Math.max(f.width, f.depth) / 2;
    });

    downRef.current = {
      sx,
      sy,
      isPanning: !fUnder && (!mode || e.button === 1 || e.shiftKey),
      moved: false,
      draggingFurnitureId: fUnder?.id || null,
      initialPos: fUnder ? { ...fUnder.position } : null,
      rotatingFurnitureId: null,
      startAngle: 0,
      startRotation: 0,
    };

    if (fUnder) {
      selectFurniture(fUnder.id);
    } else if (!mode) {
      selectFurniture(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = svgCoords(e);
    const down = downRef.current;

    if (down) {
      const dx = sx - down.sx;
      const dy = sy - down.sy;
      if (!down.moved && Math.hypot(dx, dy) > CLICK_THRESHOLD) {
        down.moved = true;
      }

      if (down.moved) {
        if (down.rotatingFurnitureId) {
          const f = placedFurniture.find(
            (i) => i.id === down.rotatingFurnitureId,
          );
          if (f) {
            const world = screenToWorld(sx, sy);
            const angle =
              (Math.atan2(world.y - f.position.y, world.x - f.position.x) *
                180) /
              Math.PI;
            const delta = angle - down.startAngle;
            // 15° 스냅 + 0~359 정규화
            const raw = down.startRotation + delta;
            const snapped = Math.round(raw / 15) * 15;
            const normalized = ((snapped % 360) + 360) % 360;
            updateFurniture(down.rotatingFurnitureId, { rotation: normalized });
          }
        } else if (down.isPanning) {
          pan(sx - down.sx, sy - down.sy);
          down.sx = sx;
          down.sy = sy;
        } else if (down.draggingFurnitureId && down.initialPos) {
          const world = screenToWorld(sx, sy);
          const startWorld = screenToWorld(down.sx, down.sy);
          let nextX = down.initialPos.x + (world.x - startWorld.x);
          let nextY = down.initialPos.y + (world.y - startWorld.y);

          if (backgroundImage) {
            const f = placedFurniture.find(i => i.id === down.draggingFurnitureId);
            if (f) {
              const r = Math.max(f.width, f.depth) / 2;
              nextX = Math.max(r, Math.min(backgroundImage.widthMm - r, nextX));
              nextY = Math.max(r, Math.min(backgroundImage.heightMm - r, nextY));
            }
          }
          updateFurniture(down.draggingFurnitureId, { position: { x: nextX, y: nextY } });
        }
      }
    }

    setHoverPoint(screenToWorld(sx, sy));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const down = downRef.current;
    downRef.current = null;
    if (!down) return;

    const { sx, sy } = svgCoords(e);
    const isClick = Math.hypot(sx - down.sx, sy - down.sy) <= CLICK_THRESHOLD;

    // 회전 드래그 중이었으면 click 처리 스킵
    if (isClick && !down.isPanning && !down.rotatingFurnitureId && mode) {
      handleCanvasClick(screenToWorld(sx, sy));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { sx, sy } = svgCoords(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAt(factor, { x: sx, y: sy });
  };

  /* Drag and Drop */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    try {
      const f = JSON.parse(data);
      const { sx, sy } = svgCoords(e);
      addFurniture({ ...f, position: screenToWorld(sx, sy), rotation: 0 });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', stop, { passive: false });
    return () => el.removeEventListener('wheel', stop);
  }, []);

  const gridMinor = 100 * viewport.zoom;
  const gridMajor = 1000 * viewport.zoom;
  const transform = `matrix(${viewport.flipH ? -viewport.zoom : viewport.zoom} 0 0 ${viewport.zoom} ${viewport.panX} ${viewport.panY})`;

  const renderDraft = () => {
    if (!mode || draftPoints.length === 0 || !hoverPoint) return null;
    if (mode === 'room') {
      const pts = [...draftPoints, hoverPoint];
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
      return (
        <g>
          <path d={d} fill="none" stroke="hsl(258, 73%, 74%)" strokeWidth={8} strokeDasharray="16 8" vectorEffect="non-scaling-stroke" />
          {draftPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={50} fill="hsl(258, 73%, 74%)" />)}
        </g>
      );
    }
    if (mode === 'region') {
      const pts = [...draftPoints, hoverPoint];
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
      const draftFill = REGION_CATEGORY_COLORS[pendingRegionCategory];
      return (
        <g>
          <path d={d} fill={draftFill} stroke="hsl(258, 73%, 50%)" strokeWidth={3} strokeDasharray="12 6" vectorEffect="non-scaling-stroke" />
          {draftPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={40} fill="hsl(258, 73%, 50%)" />)}
        </g>
      );
    }
    const first = draftPoints[0];
    if (mode === 'wall') {
      return <line x1={first.x} y1={first.y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="hsl(258, 73%, 74%)" strokeWidth={8} strokeDasharray="16 8" vectorEffect="non-scaling-stroke" />;
    }
    if (mode === 'door') {
      // 문은 벽을 덮는 배경색 사각형이므로 미리보기도 두꺼운 라인 + 점선 overlay
      return (
        <g>
          <line x1={first.x} y1={first.y} x2={hoverPoint.x} y2={hoverPoint.y} stroke={CANVAS_BG} strokeWidth={wallStrokeWidth + 4} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
          <line x1={first.x} y1={first.y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="hsl(258, 73%, 50%)" strokeWidth={2} strokeDasharray="10 6" vectorEffect="non-scaling-stroke" />
        </g>
      );
    }
    if (mode === 'aux-line' || mode === 'measurement') {
      return <line x1={first.x} y1={first.y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="hsl(258, 73%, 74%)" strokeWidth={2} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />;
    }
    if (mode === 'rect-column') {
      return <rect x={Math.min(first.x, hoverPoint.x)} y={Math.min(first.y, hoverPoint.y)} width={Math.abs(hoverPoint.x - first.x)} height={Math.abs(hoverPoint.y - first.y)} fill="hsla(258, 73%, 74%, 0.2)" stroke="hsl(258, 73%, 74%)" strokeWidth={2} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />;
    }
    if (mode === 'circle-column') {
      const r = Math.hypot(hoverPoint.x - first.x, hoverPoint.y - first.y);
      return <circle cx={first.x} cy={first.y} r={r} fill="hsla(258, 73%, 74%, 0.2)" stroke="hsl(258, 73%, 74%)" strokeWidth={2} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />;
    }
    return null;
  };

  const renderShape = (s: Shape) => {
    const isHover = hoveredShapeId === s.id;
    const stroke = mode === 'delete' && isHover ? '#ef4444' : wallStrokeBase;
    const fill = mode === 'delete' && isHover ? 'rgba(239,68,68,0.15)' : undefined;
    const shapeProps = {
      onPointerEnter: () => setHoveredShapeId(s.id),
      onPointerLeave: () => setHoveredShapeId((id) => (id === s.id ? null : id)),
      onClick: (e: React.MouseEvent) => {
        if (mode === 'delete') {
          e.stopPropagation();
          removeShape(s.id);
        } else if (s.type === 'region' && (mode === null || mode === 'select')) {
          // region 은 별도 mode 없이도 캔버스에서 선택 가능 — 패널이 마감재 색 적용 대상으로 씀
          e.stopPropagation();
          selectRegion(s.id);
        }
      },
      style: {
        cursor:
          mode === 'delete' ||
          (s.type === 'region' && (mode === null || mode === 'select'))
            ? 'pointer'
            : 'default',
      } as const,
    };
    switch (s.type) {
      case 'wall': return <line key={s.id} x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke={stroke} strokeWidth={wallStrokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...shapeProps} />;
      case 'room': {
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={s.id} d={d} fill={fill ?? 'hsla(258, 73%, 74%, 0.1)'} stroke={stroke} strokeWidth={6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" {...shapeProps} />;
      }
      case 'rect-column': return <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} fill={fill ?? 'hsl(258, 73%, 74%)'} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" {...shapeProps} />;
      case 'circle-column': return <circle key={s.id} cx={s.cx} cy={s.cy} r={s.r} fill={fill ?? 'hsl(258, 73%, 74%)'} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" {...shapeProps} />;
      case 'aux-line': return <line key={s.id} x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke={stroke} strokeWidth={1.5} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" {...shapeProps} />;
      case 'measurement': {
        const mid = { x: (s.start.x + s.end.x) / 2, y: (s.start.y + s.end.y) / 2 };
        const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
        return (
          <g key={s.id} {...shapeProps}>
            <line x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <circle cx={s.start.x} cy={s.start.y} r={30} fill={stroke} />
            <circle cx={s.end.x} cy={s.end.y} r={30} fill={stroke} />
            <text x={mid.x} y={mid.y} fontSize={14 / viewport.zoom} fill="#0c0c0c" textAnchor="middle" dominantBaseline="central" style={{ paintOrder: 'stroke', stroke: '#f7f5f1', strokeWidth: 4 / viewport.zoom }}>{formatLength(len, unit)}</text>
          </g>
        );
      }
      case 'region': {
        const isSelected = selectedRegionId === s.id;
        const finish = regionFinishes[s.id];
        const d =
          s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z';
        // 마감재(바닥) 색이 있으면 그걸로 fill, 없으면 카테고리 기본색
        const regionFill =
          fill ?? finish?.floorColor ?? REGION_CATEGORY_COLORS[s.category];
        // 벽지 색은 region 경계선 stroke 로 표현 (2D 평면뷰의 한계 안에서 가장 직관적인 매핑)
        const regionStroke =
          mode === 'delete' && isHover
            ? '#ef4444'
            : (finish?.wallpaperColor ?? 'hsl(258, 50%, 60%)');
        const strokeWidth = isSelected ? 6 : 3;
        return (
          <path
            key={s.id}
            d={d}
            fill={regionFill}
            stroke={regionStroke}
            strokeWidth={strokeWidth}
            strokeDasharray={isSelected ? undefined : '14 8'}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            {...shapeProps}
          />
        );
      }
      case 'door': {
        // 사용자 명시 요구: "그 자리의 벽 선이 시각적으로 뚫린 것처럼 보이게
        // (배경색 사각형으로 벽 위에 덮음)". 일자 문이므로 두꺼운 캔버스
        // 배경색 라인으로 벽을 가리고, 그 위에 점선으로 "여기 문" 표시.
        const doorStroke = mode === 'delete' && isHover ? '#ef4444' : 'hsl(258, 73%, 50%)';
        return (
          <g key={s.id} {...shapeProps}>
            <line
              x1={s.start.x}
              y1={s.start.y}
              x2={s.end.x}
              y2={s.end.y}
              stroke={CANVAS_BG}
              strokeWidth={wallStrokeWidth + 4}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={s.start.x}
              y1={s.start.y}
              x2={s.end.x}
              y2={s.end.y}
              stroke={doorStroke}
              strokeWidth={2}
              strokeDasharray="10 6"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      }
    }
  };

  const renderFurniture = (f: typeof placedFurniture[number]) => {
    const isSelected = selectedFurnitureId === f.id;
    // 회전은 FurnitureSvg 가 그리는 회전 핸들 드래그로 처리 (handlePointerDown 참조).
    // 가구 본체 클릭은 root handlePointerDown 의 fUnder 검출이 select 처리.
    return (
      <g key={f.id}>
        <FurnitureSvg furniture={f} isSelected={isSelected} zoom={viewport.zoom} />
      </g>
    );
  };

  const cursor = mode ? (mode === 'delete' ? 'pointer' : 'crosshair') : (viewport.locked ? 'not-allowed' : 'grab');

  return (
    <svg ref={svgRef} className="block size-full touch-none select-none" style={{ cursor, background: '#f7f5f1' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel} onDragOver={handleDragOver} onDrop={handleDrop}>
      <defs>
        <pattern id="grid-minor" x={viewport.panX % gridMinor} y={viewport.panY % gridMinor} width={gridMinor} height={gridMinor} patternUnits="userSpaceOnUse"><path d={`M ${gridMinor} 0 L 0 0 0 ${gridMinor}`} fill="none" stroke="#e5e3df" strokeWidth={1} /></pattern>
        <pattern id="grid-major" x={viewport.panX % gridMajor} y={viewport.panY % gridMajor} width={gridMajor} height={gridMajor} patternUnits="userSpaceOnUse"><path d={`M ${gridMajor} 0 L 0 0 0 ${gridMajor}`} fill="none" stroke="#c9c6c1" strokeWidth={1} /></pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-minor)" /><rect width="100%" height="100%" fill="url(#grid-major)" />
      <g transform={transform}>
        {backgroundImage && <image href={backgroundImage.url} x={0} y={0} width={backgroundImage.widthMm} height={backgroundImage.heightMm} opacity={backgroundImage.opacity} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />}
        {/*
          렌더 순서: region (배경 fill) → 그 외 shape (wall 등) → door (벽을 덮는 overlay).
          ES2019 이후 Array.prototype.sort 는 stable 이므로 같은 그룹 내 원본 순서는 보존.
        */}
        {(showDetectedWalls ? shapes : shapes.filter((s) => s.type !== 'wall'))
          .slice()
          .sort((a, b) => {
            const order = (s: Shape) => (s.type === 'region' ? 0 : s.type === 'door' ? 2 : 1);
            return order(a) - order(b);
          })
          .map(renderShape)}
        {placedFurniture.map(renderFurniture)}
        {renderDraft()}
      </g>
    </svg>
  );
};

export default SimulationCanvas;
