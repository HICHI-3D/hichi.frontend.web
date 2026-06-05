import { Icon, type IconName } from '@shared/ui';
import type { Editor } from '@features/simulation-canvas';

type NavItem = {
  id: number;
  icon: IconName;
  text: string;
};

type Props = { editor: Editor };

const Header = ({ editor }: Props) => {
  const { undo, redo, canUndo, canRedo, selectedFurnitureId, removeFurniture } = editor;

  return (
    <header className="flex w-full shrink-0 items-center justify-between bg-gray-200 p-12 border-b border-gray-400">
      <div className="flex items-center gap-8">
        <button
          disabled={!canUndo}
          onClick={undo}
          className="col flex-center gap-4 rounded-8 px-8 py-6 transition-colors hover:bg-gray-300 disabled:opacity-30"
        >
          <Icon name="arrow-back" alt="Undo" className="size-28" />
          <span className="label-m text-gray-500">실행취소</span>
        </button>
        <button
          disabled={!canRedo}
          onClick={redo}
          className="col flex-center gap-4 rounded-8 px-8 py-6 transition-colors hover:bg-gray-300 disabled:opacity-30"
        >
          <Icon name="arrow-undo" alt="Redo" className="size-28" />
          <span className="label-m text-gray-500">다시실행</span>
        </button>
      </div>

      <div className="flex items-center gap-8">
        {selectedFurnitureId && (
          <button
            onClick={() => removeFurniture(selectedFurnitureId)}
            className="px-12 py-8 label-m text-red-500 hover:bg-red-50 rounded-8 transition-colors mr-12"
          >
            선택 삭제
          </button>
        )}

        <div className="flex w-[183px] items-center gap-12 rounded-8 bg-gray-100 px-16 py-12 border border-gray-400 mr-12">
          <div className="size-28 shrink-0 rounded-max bg-functional-indigo" />
          <div className="min-w-0 col flex-1">
            <span className="truncate label-m text-gray-800">s0meri</span>
            <span className="truncate label-s text-gray-600">저장 이력 없음</span>
          </div>
          <div className="w-px shrink-0 self-stretch bg-gray-400" />
          <div className="flex-center size-28 shrink-0 text-gray-500">
            <Icon name="setting" alt="설정" className="size-28" />
          </div>
        </div>

        <button className="col flex-center gap-4 rounded-8 bg-functional-indigo px-12 py-6 transition-colors hover:bg-functional-indigo-40">
          <Icon name="save" alt="저장" className="size-28" />
          <span className="label-m text-gray-200">저장</span>
        </button>

        <button className="col flex-center w-[60px] gap-4 rounded-8 px-4 py-6 transition-colors hover:bg-gray-300">
          <Icon name="enter" alt="나가기" className="size-28" />
          <span className="label-m text-gray-800">나가기</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
