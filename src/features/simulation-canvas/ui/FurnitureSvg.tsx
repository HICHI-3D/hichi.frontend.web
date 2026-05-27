/**
 * 2D SVG 캔버스에서 가구를 실물처럼 렌더하는 컴포넌트.
 * 단순 rect 대신 소파 쿠션, 테이블 다리 등을 표현.
 * 나중에 스캔 3D 모델 텍스처로 교체될 예정.
 */

import type { FurnitureInstance } from '../model/types';

type Props = {
  furniture: FurnitureInstance;
  isSelected: boolean;
  zoom: number;
};

/** 소파: 등받이 + 쿠션 3개 + 팔걸이 */
const SofaSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => {
  const armW = w * 0.07;
  const backD = d * 0.22;
  const cushionCount = 3;
  const innerW = w - armW * 2;
  const cushionW = innerW / cushionCount;
  const cushionD = d - backD;
  const pad = w * 0.02;

  return (
    <g>
      {/* 등받이 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={backD} rx={backD * 0.3} fill="#4f46e5" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#3730a3'} strokeWidth={isSelected ? 40 : 8} />
      {/* 쿠션들 */}
      {Array.from({ length: cushionCount }).map((_, i) => (
        <rect
          key={i}
          x={-w / 2 + armW + i * cushionW + pad}
          y={-d / 2 + backD + pad}
          width={cushionW - pad * 2}
          height={cushionD - pad * 2 - armW * 0.5}
          rx={cushionW * 0.12}
          fill="#818cf8"
          stroke="#6366f1"
          strokeWidth={6}
        />
      ))}
      {/* 팔걸이 */}
      <rect x={-w / 2} y={-d / 2 + backD * 0.3} width={armW} height={d - backD * 0.3} rx={armW * 0.4} fill="#4338ca" />
      <rect x={w / 2 - armW} y={-d / 2 + backD * 0.3} width={armW} height={d - backD * 0.3} rx={armW * 0.4} fill="#4338ca" />
    </g>
  );
};

/** 테이블: 상판 + 다리 4개 */
const TableSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => {
  const legInset = w * 0.08;
  const legSize = w * 0.06;
  return (
    <g>
      {/* 상판 그림자 */}
      <rect x={-w / 2 + 10} y={-d / 2 + 10} width={w} height={d} rx={w * 0.03} fill="#78350f" opacity={0.25} />
      {/* 상판 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={w * 0.03} fill="#92400e" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#78350f'} strokeWidth={isSelected ? 40 : 8} />
      {/* 나무결 */}
      <line x1={-w / 2 + legInset} y1={-d / 2 + d * 0.25} x2={w / 2 - legInset} y2={-d / 2 + d * 0.25} stroke="#a16207" strokeWidth={4} opacity={0.3} />
      <line x1={-w / 2 + legInset} y1={-d / 2 + d * 0.55} x2={w / 2 - legInset} y2={-d / 2 + d * 0.55} stroke="#a16207" strokeWidth={4} opacity={0.25} />
      <line x1={-w / 2 + legInset} y1={-d / 2 + d * 0.8} x2={w / 2 - legInset} y2={-d / 2 + d * 0.8} stroke="#a16207" strokeWidth={4} opacity={0.3} />
      {/* 다리 */}
      <rect x={-w / 2 + legInset} y={-d / 2 + legInset} width={legSize} height={legSize} rx={legSize * 0.2} fill="#78350f" />
      <rect x={w / 2 - legInset - legSize} y={-d / 2 + legInset} width={legSize} height={legSize} rx={legSize * 0.2} fill="#78350f" />
      <rect x={-w / 2 + legInset} y={d / 2 - legInset - legSize} width={legSize} height={legSize} rx={legSize * 0.2} fill="#78350f" />
      <rect x={w / 2 - legInset - legSize} y={d / 2 - legInset - legSize} width={legSize} height={legSize} rx={legSize * 0.2} fill="#78350f" />
    </g>
  );
};

/** 의자: 좌석 + 등받이 */
const ChairSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => {
  const backD = d * 0.2;
  const legSize = w * 0.08;
  const legInset = w * 0.1;
  return (
    <g>
      {/* 등받이 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={backD} rx={w * 0.08} fill="#475569" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#334155'} strokeWidth={isSelected ? 40 : 6} />
      {/* 좌석 */}
      <rect x={-w / 2 + w * 0.05} y={-d / 2 + backD} width={w * 0.9} height={d - backD} rx={w * 0.06} fill="#64748b" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#475569'} strokeWidth={isSelected ? 40 : 6} />
      {/* 다리 */}
      <circle cx={-w / 2 + legInset} cy={-d / 2 + d * 0.3} r={legSize} fill="#334155" />
      <circle cx={w / 2 - legInset} cy={-d / 2 + d * 0.3} r={legSize} fill="#334155" />
      <circle cx={-w / 2 + legInset} cy={d / 2 - legInset} r={legSize} fill="#334155" />
      <circle cx={w / 2 - legInset} cy={d / 2 - legInset} r={legSize} fill="#334155" />
    </g>
  );
};

/** 침대: 프레임 + 매트리스 + 베개 */
const BedSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => {
  const headH = d * 0.08;
  const pad = w * 0.03;
  return (
    <g>
      {/* 프레임 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={w * 0.02} fill="#b45309" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#92400e'} strokeWidth={isSelected ? 40 : 8} />
      {/* 헤드보드 */}
      <rect x={-w / 2} y={-d / 2} width={w} height={headH} rx={w * 0.02} fill="#92400e" />
      {/* 매트리스 */}
      <rect x={-w / 2 + pad} y={-d / 2 + headH + pad} width={w - pad * 2} height={d - headH - pad * 2} rx={w * 0.015} fill="#fef3c7" />
      {/* 이불 */}
      <rect x={-w / 2 + pad} y={-d / 2 + d * 0.4} width={w - pad * 2} height={d * 0.55} rx={w * 0.015} fill="#fde68a" opacity={0.7} />
      {/* 베개 */}
      <ellipse cx={-w * 0.15} cy={-d / 2 + headH + d * 0.1} rx={w * 0.18} ry={d * 0.05} fill="#fff" opacity={0.9} />
      <ellipse cx={w * 0.15} cy={-d / 2 + headH + d * 0.1} rx={w * 0.18} ry={d * 0.05} fill="#fff" opacity={0.9} />
    </g>
  );
};

/** 책장: 프레임 + 칸 + 책 */
const BookshelfSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => {
  const pad = w * 0.05;
  return (
    <g>
      <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={w * 0.02} fill="#78716c" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#57534e'} strokeWidth={isSelected ? 40 : 6} />
      {/* 선반칸 */}
      {[0.1, 0.35, 0.6, 0.82].map((ratio, i) => (
        <rect key={i} x={-w / 2 + pad} y={-d / 2 + d * ratio} width={w - pad * 2} height={d * 0.2} rx={w * 0.01} fill="#a8a29e" opacity={0.6} />
      ))}
      {/* 책 (색상 바) */}
      {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'].map((c, i) => (
        <rect key={`b${i}`} x={-w / 2 + pad + w * 0.05 + i * w * 0.12} y={-d / 2 + d * 0.12} width={w * 0.08} height={d * 0.15} rx={w * 0.005} fill={c} />
      ))}
    </g>
  );
};

/** TV 스탠드 */
const TvStandSvg = ({ w, d, isSelected }: { w: number; d: number; isSelected: boolean }) => (
  <g>
    <rect x={-w / 2} y={-d / 2} width={w} height={d} rx={w * 0.03} fill="#44403c" stroke={isSelected ? 'hsl(258, 73%, 74%)' : '#292524'} strokeWidth={isSelected ? 40 : 6} />
    {/* 문 분리선 */}
    <line x1={0} y1={-d / 2 + d * 0.1} x2={0} y2={d / 2 - d * 0.1} stroke="#57534e" strokeWidth={4} />
    {/* 손잡이 */}
    <circle cx={-w * 0.06} cy={0} r={w * 0.02} fill="#a8a29e" />
    <circle cx={w * 0.06} cy={0} r={w * 0.02} fill="#a8a29e" />
  </g>
);

/** 기본 폴백 */
const DefaultSvg = ({ w, d, isSelected, color }: { w: number; d: number; isSelected: boolean; color: string }) => (
  <rect x={-w / 2} y={-d / 2} width={w} height={d} fill={color} fillOpacity={0.6} stroke={isSelected ? 'hsl(258, 73%, 74%)' : color} strokeWidth={isSelected ? 40 : 10} vectorEffect="non-scaling-stroke" />
);

const renderers: Record<string, React.FC<{ w: number; d: number; isSelected: boolean }>> = {
  sofa: SofaSvg,
  table: TableSvg,
  chair: ChairSvg,
  bed: BedSvg,
  bookshelf: BookshelfSvg,
  'tv-stand': TvStandSvg,
};

const FurnitureSvg = ({ furniture, isSelected, zoom }: Props) => {
  const { type, width, depth, color, position, rotation, name } = furniture;
  const Renderer = renderers[type];

  return (
    <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`} style={{ cursor: 'move' }}>
      {Renderer ? (
        <Renderer w={width} d={depth} isSelected={isSelected} />
      ) : (
        <DefaultSvg w={width} d={depth} isSelected={isSelected} color={color} />
      )}
      {isSelected && (
        <>
          {/* 선택 표시 테두리 */}
          <rect x={-width / 2 - 20} y={-depth / 2 - 20} width={width + 40} height={depth + 40} fill="none" stroke="hsl(258, 73%, 74%)" strokeWidth={3} strokeDasharray="20 10" vectorEffect="non-scaling-stroke" rx={20} />
          {/* 회전 핸들 */}
          <circle r={40} cx={width / 2 + 100} cy={0} fill="hsl(258, 73%, 74%)" style={{ cursor: 'pointer' }} />
        </>
      )}
      <text y={depth / 2 + 150} fontSize={12 / zoom} textAnchor="middle" fill="hsl(258, 73%, 74%)" style={{ pointerEvents: 'none' }}>{name}</text>
    </g>
  );
};

export default FurnitureSvg;
