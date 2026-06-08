import { calcSpaceScore } from '../model/spaceScore';
import type { Editor } from '../model/useEditor';

type Props = { editor: Pick<Editor, 'shapes' | 'placedFurniture'> };

const SpaceScoreChip = ({ editor }: Props) => {
  const score = calcSpaceScore(editor.shapes, editor.placedFurniture);
  if (!score) return null;

  return (
    <div className="absolute bottom-16 right-16 pointer-events-none z-10">
      <div
        className="col gap-4 rounded-12 px-14 py-10 ds-all-12"
        style={{ backgroundColor: 'hsl(43 64 98 / 0.92)', backdropFilter: 'blur(4px)' }}
      >
        {/* 상단: 점수 + 등급 */}
        <div className="flex items-center gap-8">
          <span
            className="body-s tabular-nums"
            style={{ color: score.gradeColor }}
          >
            {score.totalScore}
          </span>
          <span className="label-m text-gray-700">공간 점수</span>
          <span
            className="rounded-max px-8 py-2 label-s text-white"
            style={{ backgroundColor: score.gradeColor }}
          >
            {score.grade}
          </span>
        </div>

        {/* 하단: 세부 */}
        <div className="flex items-center gap-8">
          <span className="label-s text-gray-500">
            활용률 {score.utilizationPct.toFixed(1)}%
          </span>
          <span className="label-s text-gray-400">•</span>
          <span
            className="label-s"
            style={{ color: score.corridorOk ? '#4f7a52' : '#b45309' }}
          >
            {score.corridorOk ? '통로 양호' : '통로 협소'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpaceScoreChip;
