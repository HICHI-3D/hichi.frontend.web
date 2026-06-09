import { calcSpaceScore } from '../model/spaceScore';
import type { Editor } from '../model/useEditor';

type Props = { editor: Pick<Editor, 'shapes' | 'placedFurniture'> };

/**
 * FooterNav 높이(약 80px) + 여백 위에 떠 있는 공간 점수 칩.
 * FooterNav 가 absolute bottom-0 이므로 bottom-[96px] 로 겹침 방지.
 */
const SpaceScoreChip = ({ editor }: Props) => {
  const score = calcSpaceScore(editor.shapes, editor.placedFurniture);
  if (!score) return null;

  return (
    <div className="absolute bottom-[96px] right-16 pointer-events-none z-10">
      <div className="flex items-center gap-8 rounded-12 bg-gray-100 border border-gray-400 px-12 py-8">
        <span className="body-s text-functional-indigo tabular-nums leading-none">
          {score.totalScore}
        </span>
        <span className="label-s text-gray-500">공간 점수</span>

        <div className="w-px self-stretch bg-gray-400" />

        <span className="label-m text-gray-700">{score.grade}</span>

        <div className="w-px self-stretch bg-gray-400" />

        <span className="label-s text-gray-500">
          {score.utilizationPct.toFixed(0)}% 활용
        </span>
      </div>
    </div>
  );
};

export default SpaceScoreChip;
