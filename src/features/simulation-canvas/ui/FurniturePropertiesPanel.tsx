import type { Editor } from '../model/useEditor';

type Props = { editor: Editor };

/**
 * 선택된 가구의 치수 / 회전 입력 패널.
 * 캔버스 우상단 floating 으로 띄운다. 선택된 가구가 없으면 렌더하지 않음.
 *
 * - 단위는 mm 고정 (MVP). 사용자 unit 토글 따라가는 건 follow-up.
 * - inline style 로 가시성 확보 (Tailwind v4 스캔 캐시 이슈 회피, 이전 경험).
 */

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: 72,
  padding: '4px 6px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 12,
  background: '#fff',
  textAlign: 'right',
};

const FurniturePropertiesPanel = ({ editor }: Props) => {
  const { placedFurniture, selectedFurnitureId, updateFurniture, removeFurniture } =
    editor;
  const sel = placedFurniture.find((f) => f.id === selectedFurnitureId);
  if (!sel) return null;

  // 음수/0 입력 방지
  const update = (key: 'width' | 'depth' | 'height' | 'rotation', value: number) => {
    if (key === 'rotation') {
      // 0~359 정규화
      const v = ((Math.round(value) % 360) + 360) % 360;
      updateFurniture(sel.id, { rotation: v });
      return;
    }
    const v = Math.max(1, Math.round(value));
    updateFurniture(sel.id, { [key]: v });
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(255,255,255,0.97)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        minWidth: 200,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 600,
          color: '#1f2937',
        }}
      >
        <span>{sel.name}</span>
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>
          {sel.type}
        </span>
      </div>

      <label style={labelStyle}>
        <span style={{ width: 48 }}>가로</span>
        <input
          type="number"
          min={1}
          step={10}
          value={sel.width}
          onChange={(e) => update('width', Number(e.target.value))}
          style={inputStyle}
        />
        <span style={{ color: '#9ca3af' }}>mm</span>
      </label>

      <label style={labelStyle}>
        <span style={{ width: 48 }}>세로</span>
        <input
          type="number"
          min={1}
          step={10}
          value={sel.depth}
          onChange={(e) => update('depth', Number(e.target.value))}
          style={inputStyle}
        />
        <span style={{ color: '#9ca3af' }}>mm</span>
      </label>

      <label style={labelStyle}>
        <span style={{ width: 48 }}>높이</span>
        <input
          type="number"
          min={1}
          step={10}
          value={sel.height}
          onChange={(e) => update('height', Number(e.target.value))}
          style={inputStyle}
        />
        <span style={{ color: '#9ca3af' }}>mm</span>
      </label>

      <label style={labelStyle}>
        <span style={{ width: 48 }}>회전</span>
        <input
          type="number"
          step={15}
          value={Math.round(sel.rotation)}
          onChange={(e) => update('rotation', Number(e.target.value))}
          style={inputStyle}
        />
        <span style={{ color: '#9ca3af' }}>°</span>
      </label>

      <button
        type="button"
        onClick={() => removeFurniture(sel.id)}
        style={{
          marginTop: 4,
          background: '#fff',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: 4,
          padding: '6px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        삭제 (Delete)
      </button>
    </div>
  );
};

export default FurniturePropertiesPanel;
