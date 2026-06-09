import type { Editor } from '@features/simulation-canvas';
import { searchSecondhand, type SecondhandItem } from '@shared/api';
import { useState } from 'react';

// ── 공간 용도 ─────────────────────────────────────────────────

type RoomPurpose = 'living' | 'bedroom' | 'oneroom' | 'dining' | 'study';

const ROOM_LABELS: Record<RoomPurpose, string> = {
  living: '거실',
  bedroom: '침실',
  oneroom: '원룸',
  dining: '다이닝룸',
  study: '서재',
};

const ROOM_PURPOSES = Object.keys(ROOM_LABELS) as RoomPurpose[];

// ── 추천 가구 목록 ─────────────────────────────────────────────

type SuggestedItem = {
  type: string;
  name: string;
  widthMm: number;
  depthMm: number;
  reason: string;
};

const ROOM_RECOMMENDED: Record<RoomPurpose, SuggestedItem[]> = {
  living: [
    { type: 'sofa',      name: '소파',        widthMm: 2100, depthMm: 900,  reason: '편안한 휴식 공간의 핵심' },
    { type: 'tv-stand',  name: 'TV 스탠드',   widthMm: 1500, depthMm: 450,  reason: '엔터테인먼트 허브' },
    { type: 'table',     name: '커피 테이블', widthMm: 1200, depthMm: 600,  reason: '소파 전면 공간 활용' },
    { type: 'bookshelf', name: '수납장',      widthMm: 800,  depthMm: 350,  reason: '생활용품 수납' },
  ],
  bedroom: [
    { type: 'bed',       name: '침대',          widthMm: 1600, depthMm: 2100, reason: '침실 필수 가구' },
    { type: 'bookshelf', name: '옷장 / 수납장', widthMm: 1200, depthMm: 600,  reason: '의류·물품 보관' },
    { type: 'table',     name: '사이드 테이블', widthMm: 500,  depthMm: 500,  reason: '침대 옆 소품 거치' },
  ],
  oneroom: [
    { type: 'bed',       name: '침대',        widthMm: 1200, depthMm: 2000, reason: '수면 공간' },
    { type: 'sofa',      name: '소파',        widthMm: 1600, depthMm: 800,  reason: '거실 겸용' },
    { type: 'table',     name: '테이블',      widthMm: 1000, depthMm: 600,  reason: '식사·작업 겸용' },
    { type: 'chair',     name: '의자',        widthMm: 450,  depthMm: 450,  reason: '테이블 사용' },
    { type: 'bookshelf', name: '수납장',      widthMm: 800,  depthMm: 350,  reason: '좁은 공간 수납 효율' },
    { type: 'tv-stand',  name: 'TV 스탠드',   widthMm: 1200, depthMm: 450,  reason: '엔터테인먼트' },
  ],
  dining: [
    { type: 'table',     name: '다이닝 테이블', widthMm: 1400, depthMm: 800, reason: '식사 공간 핵심' },
    { type: 'chair',     name: '다이닝 의자',   widthMm: 450,  depthMm: 450, reason: '테이블 세트' },
    { type: 'bookshelf', name: '사이드보드',    widthMm: 1200, depthMm: 450, reason: '식기·소품 수납' },
  ],
  study: [
    { type: 'table',     name: '책상', widthMm: 1400, depthMm: 700, reason: '작업 공간 핵심' },
    { type: 'chair',     name: '의자', widthMm: 600,  depthMm: 600, reason: '책상 사용' },
    { type: 'bookshelf', name: '책장', widthMm: 800,  depthMm: 350, reason: '자료·책 보관' },
  ],
};

// ── 예상 가격 시세 ─────────────────────────────────────────────

type PriceRef = { newMid: number; usedAvg: number };

const PRICE_REF: Record<string, PriceRef> = {
  sofa:       { newMid: 550_000, usedAvg:  80_000 },
  'tv-stand': { newMid: 200_000, usedAvg:  50_000 },
  table:      { newMid: 250_000, usedAvg:  65_000 },
  chair:      { newMid:  90_000, usedAvg:  22_000 },
  bed:        { newMid: 600_000, usedAvg: 130_000 },
  bookshelf:  { newMid: 110_000, usedAvg:  38_000 },
};

const DEFAULT_PRICE: PriceRef = { newMid: 150_000, usedAvg: 40_000 };

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

const fmt = (mm: number) =>
  mm >= 1000 ? `${(mm / 1000).toFixed(1).replace(/\.0$/, '')}m` : `${mm}mm`;

// ── 컴포넌트 ──────────────────────────────────────────────────

type Props = {
  editor: Editor;
  onClose: () => void;
};

const FurnitureSuggestionPanel = ({ editor }: Props) => {
  const [purpose, setPurpose] = useState<RoomPurpose | null>(null);
  const [searchResults, setSearchResults] = useState<Map<string, SecondhandItem[]>>(new Map());
  const [loadingSearch, setLoadingSearch] = useState<Set<string>>(new Set());
  const [openSearch, setOpenSearch] = useState<Set<string>>(new Set());

  const placedTypes = new Set(editor.placedFurniture.map((f) => f.type));
  const recommendations = purpose ? ROOM_RECOMMENDED[purpose] : [];
  const present = recommendations.filter((r) => placedTypes.has(r.type));
  const missing = recommendations.filter((r) => !placedTypes.has(r.type));

  const totalNew  = missing.reduce((s, i) => s + (PRICE_REF[i.type] ?? DEFAULT_PRICE).newMid,  0);
  const totalUsed = missing.reduce((s, i) => s + (PRICE_REF[i.type] ?? DEFAULT_PRICE).usedAvg, 0);
  const savings   = totalNew - totalUsed;
  const savingsPct = totalNew > 0 ? Math.round((savings / totalNew) * 100) : 0;

  const handleSearch = async (item: SuggestedItem) => {
    const key = item.type;
    if (searchResults.has(key)) {
      setOpenSearch((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      return;
    }
    setLoadingSearch((prev) => new Set(prev).add(key));
    setOpenSearch((prev) => new Set(prev).add(key));
    try {
      const result = await searchSecondhand(item.name, item.type, 4);
      setSearchResults((prev) => new Map(prev).set(key, result.items));
    } catch {
      setSearchResults((prev) => new Map(prev).set(key, []));
    } finally {
      setLoadingSearch((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <aside className="col self-stretch w-[284px] shrink-0 overflow-hidden bg-gray-150 border-r border-gray-400 rounded-r-8">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between px-16 py-16">
        <span className="body-s text-black">가구 추천</span>
      </div>
      <div className="h-px w-full shrink-0 bg-gray-400" />

      {/* 공간 용도 선택 */}
      <div className="col shrink-0 gap-4 px-12 py-8">
        <div className="px-4 py-6">
          <span className="label-m text-black">공간 용도</span>
        </div>
        <div className="flex flex-wrap gap-6 px-4">
          {ROOM_PURPOSES.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPurpose(p);
                setSearchResults(new Map());
                setOpenSearch(new Set());
              }}
              className={[
                'py-4 px-6 rounded-8 label-m transition-colors cursor-pointer border border-gray-400',
                purpose === p
                  ? 'bg-functional-indigo text-white border-functional-indigo'
                  : 'bg-gray-200 text-black hover:bg-gray-300',
              ].join(' ')}
            >
              {ROOM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-px w-full shrink-0 bg-gray-400" />

      {/* 결과 영역 */}
      <div className="col flex-1 overflow-y-auto no-scrollbar px-12 py-8 gap-12">
        {purpose === null ? (
          <div className="flex-center flex-1 py-32">
            <span className="label-m text-gray-700 text-center">
              공간 용도를 선택하면{'\n'}부족한 가구를 알려드려요
            </span>
          </div>
        ) : (
          <>
            {/* 보유 중 */}
            {present.length > 0 && (
              <div className="col gap-4">
                <div className="px-4 py-6">
                  <span className="label-m text-black">보유 중 ({present.length})</span>
                </div>
                <div className="col gap-4">
                  {present.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center gap-10 px-12 py-10 rounded-8 bg-gray-200 border border-gray-400"
                    >
                      <div className="flex-center size-18 rounded-max bg-functional-indigo shrink-0">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 3.5L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="label-l text-black flex-1">{item.name}</span>
                      <span className="label-m text-gray-700">{fmt(item.widthMm)}×{fmt(item.depthMm)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 부족한 가구 */}
            {missing.length > 0 ? (
              <>
                <div className="col gap-4">
                  <div className="px-4 py-6">
                    <span className="label-m text-black">부족한 가구 ({missing.length})</span>
                  </div>
                  <div className="col gap-8">
                    {missing.map((item) => {
                      const isLoading = loadingSearch.has(item.type);
                      const isOpen = openSearch.has(item.type);
                      const results = searchResults.get(item.type);

                      return (
                        <div key={item.type} className="col rounded-8 bg-gray-200 border border-gray-400 overflow-hidden">
                          {/* 가구 정보 */}
                          <div className="col gap-4 px-12 py-10">
                            <div className="flex items-center justify-between gap-8">
                              <span className="label-l text-black">{item.name}</span>
                              <span className="label-m text-gray-700 shrink-0">{fmt(item.widthMm)}×{fmt(item.depthMm)}</span>
                            </div>
                            <span className="label-m text-gray-700">{item.reason}</span>
                            <button
                              onClick={() => void handleSearch(item)}
                              disabled={isLoading}
                              className={[
                                'flex items-center gap-4 mt-2 px-8 py-5 rounded-6 label-m self-start transition-colors cursor-pointer border border-gray-400',
                                isOpen ? 'bg-functional-indigo-20 text-functional-indigo border-functional-indigo' : 'bg-gray-300 text-black hover:bg-gray-400',
                                isLoading ? 'cursor-wait' : '',
                              ].join(' ')}
                            >
                              {isLoading ? (
                                <span className="size-10 rounded-max border border-gray-400 border-t-functional-indigo animate-spin inline-block" />
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
                                  <path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                              )}
                              중고 매물 {isOpen && !isLoading ? '닫기' : '검색'}
                            </button>
                          </div>

                          {/* 검색 결과 */}
                          {isOpen && !isLoading && results !== undefined && (
                            <div className="col border-t border-gray-400">
                              {results.length === 0 ? (
                                <div className="px-12 py-10">
                                  <span className="label-m text-gray-700">검색 결과가 없어요</span>
                                </div>
                              ) : (
                                results.map((r, i) => (
                                  <a
                                    key={i}
                                    href={r.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-8 px-12 py-8 hover:bg-gray-300 transition-colors border-b border-gray-400 last:border-0"
                                  >
                                    <div className="col flex-1 min-w-0 gap-1">
                                      <span className="label-m text-black truncate">{r.title}</span>
                                      <div className="flex items-center gap-6">
                                        <span className="label-m text-functional-indigo">{r.price}</span>
                                        <span className="label-m text-gray-700">{r.source}</span>
                                      </div>
                                    </div>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-gray-700">
                                      <path d="M2.5 6H9.5M7 3.5L9.5 6L7 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </a>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 예상 비용 */}
                <div className="col gap-4">
                  <div className="px-4 py-6">
                    <span className="label-m text-black">예상 비용</span>
                  </div>
                  <div className="col rounded-8 bg-gray-200 border border-gray-400 overflow-hidden">
                    {/* 컬럼 헤더 */}
                    <div className="flex items-center px-12 py-8 border-b border-gray-400 bg-gray-300">
                      <span className="label-m text-gray-700 flex-1">가구</span>
                      <span className="label-m text-gray-700 w-[72px] text-right">신품</span>
                      <span className="label-m text-gray-700 w-[72px] text-right">중고 예상</span>
                    </div>
                    {/* 항목 행 */}
                    {missing.map((item) => {
                      const p = PRICE_REF[item.type] ?? DEFAULT_PRICE;
                      return (
                        <div key={item.type} className="flex items-center px-12 py-8 border-b border-gray-400 last:border-0">
                          <span className="label-m text-black flex-1">{item.name}</span>
                          <span className="label-m text-black w-[72px] text-right">{won(p.newMid)}</span>
                          <span className="label-m text-functional-indigo w-[72px] text-right">{won(p.usedAvg)}</span>
                        </div>
                      );
                    })}
                    {/* 합계 */}
                    <div className="flex items-center px-12 py-10 border-t border-gray-400 bg-gray-300">
                      <span className="label-l text-black flex-1">합계</span>
                      <span className="label-l text-black w-[72px] text-right">{won(totalNew)}</span>
                      <span className="label-l text-functional-indigo w-[72px] text-right">{won(totalUsed)}</span>
                    </div>
                  </div>

                  {/* 절약 배너 */}
                  {savings > 0 && (
                    <div className="flex items-center justify-between px-12 py-10 rounded-8 bg-functional-indigo-20 border border-gray-400">
                      <span className="label-m text-functional-indigo">중고 구매 시 절약</span>
                      <span className="label-l text-functional-indigo">{won(savings)} ({savingsPct}%)</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center px-12 py-12 rounded-8 bg-gray-200 border border-gray-400">
                <span className="label-l text-functional-indigo">모든 가구가 갖춰져 있어요 ✓</span>
              </div>
            )}

            {/* 완성도 */}
            {recommendations.length > 0 && (
              <div className="flex items-center justify-between px-12 py-10 rounded-8 bg-gray-300 border border-gray-400">
                <span className="label-m text-black">완성도</span>
                <span className="label-l text-black">{present.length} / {recommendations.length}개</span>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default FurnitureSuggestionPanel;
