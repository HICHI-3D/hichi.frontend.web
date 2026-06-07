import type { FurnitureRecord } from '@entities/furniture';
import { Furniture3DModal } from '@features/furniture-3d';
import { FurnitureScanModal } from '@features/furniture-scan';
import { listFurniture } from '@shared/api';
import { config } from '@shared/config';
import { useCallback, useEffect, useState } from 'react';

import AddFurnitureModal from './AddFurnitureModal';
import FurnitureThumbnail from './FurnitureThumbnail';

type Tab = '전체' | '즐겨찾기' | '배치된 가구';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12.5" y1="12.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MOCK_ITEMS: any[] = [
  { id: 'mock-sofa',      name: '3인 소파',       type: 'sofa',      width: 2100, depth: 900,  height: 850,  color: '#4f46e5', isMock: true },
  { id: 'mock-table',     name: '다이닝 테이블',   type: 'table',     width: 1400, depth: 800,  height: 750,  color: '#92400e', isMock: true },
  { id: 'mock-chair',     name: '다이닝 의자',     type: 'chair',     width: 450,  depth: 450,  height: 900,  color: '#64748b', isMock: true },
  { id: 'mock-bed',       name: '퀸 침대',         type: 'bed',       width: 1600, depth: 2100, height: 500,  color: '#b45309', isMock: true },
  { id: 'mock-bookshelf', name: '책장',            type: 'bookshelf', width: 800,  depth: 350,  height: 1800, color: '#78716c', isMock: true },
  { id: 'mock-tvstand',   name: 'TV 스탠드',       type: 'tv-stand',  width: 1500, depth: 450,  height: 550,  color: '#44403c', isMock: true },
];

/** FurnitureSvg 의 기본 색상과 맞춤 (카테고리 → SVG fill 대표색). */
const CATEGORY_COLORS: Record<string, string> = {
  sofa:      '#4f46e5',
  table:     '#92400e',
  chair:     '#64748b',
  bed:       '#b45309',
  bookshelf: '#78716c',
  'tv-stand': '#44403c',
};

/** FurnitureRecord → SimulationCanvas 드래그 페이로드 변환. */
const toCanvasDragData = (item: FurnitureRecord) => ({
  id:    String(item.id),
  type:  item.category ?? 'chair',
  name:  item.name,
  width: item.width_mm  ?? 600,
  depth: item.depth_mm  ?? 600,
  color: CATEGORY_COLORS[item.category ?? ''] ?? '#64748b',
});

const FurniturePanel = ({ }: { onClose: () => void }) => {
  const [activeTab, setActiveTab]   = useState<Tab>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems]           = useState<FurnitureRecord[]>([]);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [scanOpen, setScanOpen]     = useState(false);
  const [addOpen, setAddOpen]       = useState(false);
  const [viewing, setViewing]       = useState<FurnitureRecord | null>(null);

  const tabs: Tab[] = ['전체', '즐겨찾기', '배치된 가구'];

  const refresh = useCallback(async () => {
    try {
      const list = await listFurniture();
      setItems(list);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '목록 로드 실패');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const sseUrl = `${config.apiBaseUrl}/api/furniture/events/stream`;
    const eventSource = new EventSource(sseUrl);
    eventSource.addEventListener('furniture_updated', () => { void refresh(); });
    return () => { eventSource.close(); };
  }, [refresh]);

  const filteredItems = items.filter((item) => item.name.includes(searchQuery));
  const displayItems  = activeTab === '전체' ? [...MOCK_ITEMS, ...filteredItems] : filteredItems;

  const handleDragStart = (e: React.DragEvent, dragData: object) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      <aside className="col h-full w-[284px] shrink-0 overflow-hidden bg-gray-150 border-r border-gray-400 rounded-r-8">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between px-16 py-16">
          <span className="body-s text-black">가구 리스트</span>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-4 rounded-8 bg-functional-indigo px-10 py-6 label-s text-white hover:opacity-90 transition-opacity"
          >
            <PlusIcon />
            추가
          </button>
        </div>
        <div className="h-px w-full shrink-0 bg-gray-400" />

        <div className="col flex-1 gap-12 overflow-hidden px-12 py-8 ">
          <div className="col shrink-0 gap-12 overflow-y-auto no-scrollbar">
            <div className="flex items-center">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'px-6 py-6 label-m transition-colors cursor-pointer',
                    activeTab === tab
                      ? 'text-functional-indigo border-b-2 border-functional-indigo'
                      : 'text-black',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-8 rounded-8 bg-gray-200 p-12 border border-gray-400">
              <span className="shrink-0 text-gray-500"><SearchIcon /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="가구명을 입력하세요"
                className="flex-1 bg-transparent label-m text-gray-500 outline-none placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="h-px w-full shrink-0 bg-gray-400" />

          {loadError && <p className="label-s text-red-500">목록 로드 실패: {loadError}</p>}

          <div className="grid grid-cols-2 gap-12 overflow-y-auto no-scrollbar">
            {displayItems.map((item: any) => {
              const isMock  = item.isMock;
              const isReady = isMock || item.scan_status === 'completed';
              const dragData = isMock ? item : toCanvasDragData(item as FurnitureRecord);

              return (
                <button
                  key={item.id}
                  draggable={isReady}
                  onDragStart={isReady ? (e) => handleDragStart(e, dragData) : undefined}
                  onClick={() => !isMock && isReady && setViewing(item)}
                  disabled={!isReady}
                  className={[
                    'col gap-6 p-8 border border-gray-400 rounded-12 text-left transition-all bg-gray-200',
                    isReady ? 'cursor-grab hover:bg-gray-300 hover:shadow-sm' : 'cursor-default opacity-60',
                  ].join(' ')}
                >
                  <span className="label-l text-gray-800">{item.name}</span>
                  <div className="size-[108px] flex-center rounded-8 bg-gray-100 overflow-hidden">
                    {isMock ? (
                      <FurnitureThumbnail type={item.type} size={108} />
                    ) : isReady ? (
                      <FurnitureThumbnail type={item.category ?? 'chair'} size={108} />
                    ) : (
                      <span className="label-s text-functional-indigo">
                        {(item.scan_progress * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <span className="label-s text-gray-500">
                    {isMock
                      ? `${item.width}×${item.depth}mm`
                      : item.width_mm
                        ? `${item.width_mm}×${item.depth_mm}mm`
                        : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <AddFurnitureModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { void refresh(); }}
      />
      <FurnitureScanModal
        open={scanOpen}
        onClose={() => { setScanOpen(false); void refresh(); }}
        onCompleted={() => void refresh()}
      />
      <Furniture3DModal furniture={viewing} onClose={() => setViewing(null)} />
    </>
  );
};

export default FurniturePanel;
