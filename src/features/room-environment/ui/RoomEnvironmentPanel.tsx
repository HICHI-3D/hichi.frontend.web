import {
  type Editor,
  REGION_CATEGORY_COLORS,
  REGION_CATEGORY_LABELS,
  type RegionCategory,
} from '@features/simulation-canvas';

type Props = {
  editor: Editor;
  activeTool: string | null;
  onToolClick: (tool: string) => void;
  onClose: () => void;
};

const REGION_TOOL = '영역 그리기';
const DOOR_TOOL = '문 그리기';
const CATEGORIES: RegionCategory[] = [
  'bathroom',
  'kitchen',
  'living',
  'bedroom',
  'other',
];

/**
 * 공간 환경 패널 — 영역 / 마감재 / 문.
 * 사용자 결정 (2026-05-27):
 *  - 영역 그리기는 room 과 동일한 polygon 인터랙션 (별도 shape type 'region').
 *  - 마감재는 별도 finishes 맵 (regionId → { wallpaperColor, floorColor }) 에 저장.
 *  - 문은 Shape union 의 'door' 타입, 두 점 클릭으로 일자 문 (벽 자동 인식 안 함).
 */
const RoomEnvironmentPanel = ({ editor, activeTool, onToolClick }: Props) => {
  const {
    shapes,
    regionFinishes,
    selectedRegionId,
    pendingRegionCategory,
    setPendingRegionCategory,
    selectRegion,
    setRegionFinish,
  } = editor;

  const regions = shapes.flatMap((s) => (s.type === 'region' ? [s] : []));
  const selectedRegion =
    regions.find((r) => r.id === selectedRegionId) ?? null;
  const selectedFinish = selectedRegionId
    ? regionFinishes[selectedRegionId]
    : undefined;

  const handleFloorColor = (color: string) => {
    if (!selectedRegionId) return;
    setRegionFinish(selectedRegionId, { floorColor: color });
  };
  const handleWallpaperColor = (color: string) => {
    if (!selectedRegionId) return;
    setRegionFinish(selectedRegionId, { wallpaperColor: color });
  };

  return (
    <aside
      className="
      col h-full w-[284px] shrink-0 overflow-hidden bg-gray-150 border-r border-gray-400 rounded-r-8
    "
    >
      <div className="flex shrink-0 items-center justify-between px-16 py-16">
        <span className="body-s text-black">공간 환경</span>
      </div>
      <div className="h-px w-full shrink-0 bg-gray-400" />

      <div className="col flex-1 gap-16 overflow-y-auto px-12 py-12">
        {/* 1) 영역 섹션 */}
        <section className="col gap-8">
          <div className="px-4">
            <span className="label-m text-black">영역</span>
          </div>
          <p className="label-s text-gray-700 px-4">
            카테고리를 고르고 캔버스에 점을 찍어 자유 모양으로 그리세요. 첫 점
            근처를 다시 누르면 닫힙니다.
          </p>
          {/* 카테고리 라디오 */}
          <div className="grid grid-cols-2 gap-6">
            {CATEGORIES.map((cat) => {
              const isActive = pendingRegionCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setPendingRegionCategory(cat)}
                  className={[
                    'flex items-center gap-6 px-10 py-8 border rounded-8 transition-colors cursor-pointer',
                    isActive
                      ? 'bg-functional-indigo text-white border-functional-indigo'
                      : 'bg-gray-200 text-black border-gray-400 hover:bg-gray-300',
                  ].join(' ')}
                >
                  <span
                    className="block size-12 rounded-4 border border-gray-400"
                    style={{ background: REGION_CATEGORY_COLORS[cat] }}
                  />
                  <span className="label-m">{REGION_CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>
          {/* 그리기 도구 토글 */}
          <button
            onClick={() => onToolClick(REGION_TOOL)}
            className={[
              'flex items-center px-12 py-12 border border-gray-400 rounded-8 transition-colors w-full text-left cursor-pointer',
              activeTool === REGION_TOOL
                ? 'bg-functional-indigo text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300',
            ].join(' ')}
          >
            <span className="label-l">
              {activeTool === REGION_TOOL ? '영역 그리기 (활성)' : REGION_TOOL}
            </span>
          </button>

          {/* 영역 목록 — 클릭으로 선택 */}
          {regions.length > 0 && (
            <div className="col gap-4 pt-4">
              <span className="label-s text-gray-700 px-4">
                추가된 영역 ({regions.length})
              </span>
              <div className="col gap-4">
                {regions.map((r) => {
                  const isSelected = selectedRegionId === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => selectRegion(isSelected ? null : r.id)}
                      className={[
                        'flex items-center gap-8 px-10 py-8 border rounded-8 transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-functional-indigo-20 border-functional-indigo'
                          : 'bg-gray-200 border-gray-400 hover:bg-gray-300',
                      ].join(' ')}
                    >
                      <span
                        className="block size-12 rounded-4 border border-gray-400"
                        style={{ background: REGION_CATEGORY_COLORS[r.category] }}
                      />
                      <span className="label-m text-black flex-1 text-left">
                        {REGION_CATEGORY_LABELS[r.category]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="h-px w-full shrink-0 bg-gray-400" />

        {/* 2) 마감재 섹션 */}
        <section className="col gap-8">
          <div className="px-4">
            <span className="label-m text-black">마감재</span>
          </div>
          {selectedRegion ? (
            <div className="col gap-10">
              <span className="label-s text-gray-700 px-4">
                선택된 영역: {REGION_CATEGORY_LABELS[selectedRegion.category]}
              </span>
              <label className="flex items-center justify-between gap-8 px-10 py-8 border border-gray-400 rounded-8 bg-gray-200">
                <span className="label-m text-black">바닥 색</span>
                <input
                  type="color"
                  value={selectedFinish?.floorColor ?? '#e9e3d8'}
                  onChange={(e) => handleFloorColor(e.target.value)}
                  className="size-28 cursor-pointer border border-gray-400 rounded-4 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between gap-8 px-10 py-8 border border-gray-400 rounded-8 bg-gray-200">
                <span className="label-m text-black">벽지 색</span>
                <input
                  type="color"
                  value={selectedFinish?.wallpaperColor ?? '#a896df'}
                  onChange={(e) => handleWallpaperColor(e.target.value)}
                  className="size-28 cursor-pointer border border-gray-400 rounded-4 bg-transparent"
                />
              </label>
              <p className="label-s text-gray-700 px-4">
                바닥 색은 영역 fill, 벽지 색은 영역 경계선에 반영됩니다 (2D
                평면뷰 한정).
              </p>
            </div>
          ) : (
            <p className="label-s text-gray-700 px-4">
              영역 목록에서 하나를 선택하거나, 캔버스의 영역을 클릭하세요.
            </p>
          )}
        </section>

        <div className="h-px w-full shrink-0 bg-gray-400" />

        {/* 3) 문 섹션 */}
        <section className="col gap-8">
          <div className="px-4">
            <span className="label-m text-black">문</span>
          </div>
          <p className="label-s text-gray-700 px-4">
            벽 위에서 두 점을 클릭하면 그 자리의 벽이 시각적으로 끊어진 것처럼
            보입니다. (자동 인식 안 함, 위치 수동 지정)
          </p>
          <button
            onClick={() => onToolClick(DOOR_TOOL)}
            className={[
              'flex items-center px-12 py-12 border border-gray-400 rounded-8 transition-colors w-full text-left cursor-pointer',
              activeTool === DOOR_TOOL
                ? 'bg-functional-indigo text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300',
            ].join(' ')}
          >
            <span className="label-l">
              {activeTool === DOOR_TOOL ? '문 그리기 (활성)' : DOOR_TOOL}
            </span>
          </button>
        </section>
      </div>
    </aside>
  );
};

export default RoomEnvironmentPanel;
