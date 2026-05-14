import type { Editor } from '@features/simulation-canvas';
import type { Unit, ViewMode } from '@features/simulation-canvas';
import { Icon } from '@shared/ui';

type Props = {
  editor: Editor;
  onFitView: () => void;
  onScreenshot: () => void;
};

/* ── 재사용 버튼 ────────────────────────────────── */

type IconBtnProps = {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
};

const ToolBtn = ({ active, onClick, children, title }: IconBtnProps) => (
  <button
    onClick={onClick}
    title={title}
    className={[
      'flex-center size-56 rounded-8 transition-colors cursor-pointer',
      active
        ? 'bg-functional-indigo-20 text-functional-indigo'
        : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ].join(' ')}
  >
    {children}
  </button>
);

/* ── FooterNav ──────────────────────────────────── */

const FooterNav = ({ editor, onFitView, onScreenshot }: Props) => {
  const {
    viewport,
    viewMode,
    unit,
    backgroundImage,
    showDetectedWalls,
    setViewMode,
    setUnit,
    toggleLock,
    zoomAt,
    setBackgroundImage,
    setShowDetectedWalls,
  } = editor;

  return (
    <footer
      className="absolute w-full  flex shrink-0 items-center justify-between p-12"
      style={{ bottom: 0, left: 0 }}
    >
      {/* ── 2D / 3D 전환 ── */}
      <div className="flex rounded-12 p-6 border border-gray-400 gap-8">
        {(['2D', '3D'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={[
              'flex-center size-56 rounded-8 label-l cursor-pointer',
              viewMode === mode
                ? 'bg-functional-indigo-20 text-functional-indigo'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ].join(' ')}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── 배경 도면 컨트롤 (도면 업로드 후에만 보임) ── */}
      {backgroundImage && (
        <div className="flex items-center gap-8 border border-gray-400 rounded-8 bg-gray-100 p-6 ">
          <button
            onClick={() => setShowDetectedWalls(!showDetectedWalls)}
            className={[
              'px-12 py-8 rounded-8 label-m transition-colors cursor-pointer',
              showDetectedWalls
                ? 'bg-functional-indigo-20 text-functional-indigo'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            ].join(' ')}
            title="AI가 검출한 벽 표시 / 숨기기"
          >
            벽 {showDetectedWalls ? '숨기기' : '표시'}
          </button>
          <div className="flex items-center gap-6 px-8">
            <span className="label-s text-gray-700">투명도</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(backgroundImage.opacity * 100)}
              onChange={(e) =>
                setBackgroundImage({
                  ...backgroundImage,
                  opacity: Number(e.target.value) / 100,
                })
              }
              className="w-[100px] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ── 도구 버튼 그룹 ── */}
      <div
        className="
        flex items-center gap-8 rounded-8 bg-gray-100 p-6 border border-gray-400
      "
      >
        <ToolBtn
          active={viewport.locked}
          onClick={toggleLock}
          title="화면 잠금"
        >
          <Icon name="lock" alt="화면 잠금" className="size-28" />
        </ToolBtn>
        <ToolBtn onClick={onScreenshot} title="스크린샷">
          <Icon name="camera" alt="스크린샷" className="size-28" />
        </ToolBtn>
        <ToolBtn onClick={() => zoomAt(1.2)} title="확대">
          <Icon name="zoomIn" alt="확대" className="size-28" />
        </ToolBtn>
        <ToolBtn onClick={() => zoomAt(1 / 1.2)} title="축소">
          <Icon name="zoomOut" alt="축소" className="size-28" />
        </ToolBtn>
        <ToolBtn onClick={onFitView} title="화면맞춤">
          <Icon name="zoomFit" alt="화면맞춤" className="size-28" />
        </ToolBtn>

        <div className="mx-4 w-px self-stretch bg-gray-400" />

        {(['mm', 'ft/in'] as Unit[]).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={[
              'flex-center size-56 rounded-8 label-m transition-colors cursor-pointer',
              unit === u
                ? 'bg-functional-indigo-20 text-functional-indigo'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300',
            ].join(' ')}
          >
            {u}
          </button>
        ))}
      </div>
    </footer>
  );
};

export default FooterNav;
