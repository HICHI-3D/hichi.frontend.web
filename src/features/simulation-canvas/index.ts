export { parsedToShapes } from './lib/parsedToShapes';
export type {
  BackgroundImage,
  DrawingMode,
  RegionCategory,
  RegionFinish,
  Shape,
  Unit,
  ViewMode,
  Viewport,
} from './model/types';
export {
  REGION_CATEGORY_COLORS,
  REGION_CATEGORY_LABELS,
  toolLabelToMode,
} from './model/types';
export type { Editor } from './model/useEditor';
export { useEditor } from './model/useEditor';
export { default as FurniturePropertiesPanel } from './ui/FurniturePropertiesPanel';
export { default as Scene3DCanvas } from './ui/Scene3DCanvas';
export { default as SimulationCanvas } from './ui/SimulationCanvas';
export { default as SpaceScoreChip } from './ui/SpaceScoreChip';
