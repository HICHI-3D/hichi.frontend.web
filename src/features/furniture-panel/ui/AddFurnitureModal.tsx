/**
 * 가구 직접 추가 모달.
 * 이름 + 카테고리 드롭다운 + 치수(w/d/h) 를 입력받아 POST /api/furniture/ 를 호출한다.
 */

import { createFurniture } from '@shared/api';
import { useState } from 'react';

type Category = {
  value: string;
  label: string;
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
};

const CATEGORIES: Category[] = [
  { value: 'sofa',      label: '소파',       defaultWidth: 2100, defaultDepth: 900,  defaultHeight: 850  },
  { value: 'bed',       label: '침대',       defaultWidth: 1600, defaultDepth: 2000, defaultHeight: 500  },
  { value: 'table',     label: '테이블',     defaultWidth: 1200, defaultDepth: 600,  defaultHeight: 750  },
  { value: 'chair',     label: '의자',       defaultWidth: 500,  defaultDepth: 500,  defaultHeight: 900  },
  { value: 'bookshelf', label: '수납장',     defaultWidth: 800,  defaultDepth: 350,  defaultHeight: 1800 },
  { value: 'tv-stand',  label: 'TV 스탠드', defaultWidth: 1500, defaultDepth: 450,  defaultHeight: 550  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
};

const AddFurnitureModal = ({ open, onClose, onAdded }: Props) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [width, setWidth] = useState(CATEGORIES[0].defaultWidth);
  const [depth, setDepth] = useState(CATEGORIES[0].defaultDepth);
  const [height, setHeight] = useState(CATEGORIES[0].defaultHeight);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCategoryChange = (value: string) => {
    const cat = CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];
    setCategory(cat);
    setWidth(cat.defaultWidth);
    setDepth(cat.defaultDepth);
    setHeight(cat.defaultHeight);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim() || category.label;
    setError(null);
    setSubmitting(true);
    try {
      await createFurniture({
        name: trimmedName,
        category: category.value,
        width_mm: width,
        depth_mm: depth,
        height_mm: height,
      });
      // 초기화 후 닫기
      setName('');
      setCategory(CATEGORIES[0]);
      setWidth(CATEGORIES[0].defaultWidth);
      setDepth(CATEGORIES[0].defaultDepth);
      setHeight(CATEGORIES[0].defaultHeight);
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '추가 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="col w-[320px] gap-16 rounded-16 bg-gray-200 p-20 shadow-lg">
        <span className="body-s text-black">가구 추가</span>

        {/* 카테고리 */}
        <div className="col gap-6">
          <label className="label-s text-gray-600">종류</label>
          <select
            value={category.value}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-8 border border-gray-400 bg-gray-100 px-12 py-8 label-m text-black outline-none focus:border-functional-indigo"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 이름 */}
        <div className="col gap-6">
          <label className="label-s text-gray-600">이름 (선택)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={category.label}
            className="rounded-8 border border-gray-400 bg-gray-100 px-12 py-8 label-m text-black outline-none placeholder:text-gray-500 focus:border-functional-indigo"
          />
        </div>

        {/* 치수 */}
        <div className="col gap-6">
          <label className="label-s text-gray-600">치수 (mm)</label>
          <div className="flex gap-8">
            {[
              { label: '폭', value: width, set: setWidth },
              { label: '깊이', value: depth, set: setDepth },
              { label: '높이', value: height, set: setHeight },
            ].map(({ label, value, set }) => (
              <div key={label} className="col flex-1 gap-4">
                <span className="label-s text-gray-500 text-center">{label}</span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={value}
                  onChange={(e) => set(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-8 border border-gray-400 bg-gray-100 px-8 py-8 label-m text-black text-center outline-none focus:border-functional-indigo"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="label-s text-red-500">{error}</p>}

        {/* 버튼 */}
        <div className="flex gap-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-8 border border-gray-400 py-10 label-m text-gray-600 hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-8 bg-functional-indigo py-10 label-m text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? '추가 중…' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFurnitureModal;
