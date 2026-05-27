import { useEffect, useRef, useState } from 'react';

import type { Point, Shape } from '../model/types';
import type { Editor } from '../model/useEditor';
import FurnitureSvg from './FurnitureSvg';

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
    selectedFurnitureId,
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
  } | null>(null);

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
        if (down.isPanning) {
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

    if (isClick && !down.isPanning && mode) {
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
    const first = draftPoints[0];
    if (mode === 'wall') {
      return <line x1={first.x} y1={first.y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="hsl(258, 73%, 74%)" strokeWidth={8} strokeDasharray="16 8" vectorEffect="non-scaling-stroke" />;
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
      onClick: (e: React.MouseEvent) => { if (mode === 'delete') { e.stopPropagation(); removeShape(s.id); } },
      style: { cursor: mode === 'delete' ? 'pointer' : 'default' } as const,
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
    }
  };

  const renderFurniture = (f: typeof placedFurniture[number]) => {
    const isSelected = selectedFurnitureId === f.id;
    return (
      <g key={f.id} onPointerDown={(e) => { if (isSelected) { e.stopPropagation(); updateFurniture(f.id, { rotation: (f.rotation + 15) % 360 }); } }}>
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
        {(showDetectedWalls ? shapes : shapes.filter((s) => s.type !== 'wall')).map(renderShape)}
        {placedFurniture.map(renderFurniture)}
        {renderDraft()}
      </g>
    </svg>
  );
};

export default SimulationCanvas;
