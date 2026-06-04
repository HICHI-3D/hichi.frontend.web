import { DrawingPanel } from '@features/drawing-panel';
import { FurniturePanel } from '@features/furniture-panel';
import { RoomEnvironmentPanel } from '@features/room-environment';
import {
  FurniturePropertiesPanel,
  parsedToShapes,
  Scene3DCanvas,
  SimulationCanvas,
  toolLabelToMode,
  useEditor,
} from '@features/simulation-canvas';
import { uploadFloorPlan } from '@shared/api';
import { config } from '@shared/config';
import { FooterNav } from '@widgets/footer-nav';
import { Header } from '@widgets/header';
import { SideNav } from '@widgets/side-nav';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NavId } from '../model/types';

/** 캔버스 영역을 캡처해서 PNG로 로컬 다운로드 */
const captureCanvasArea = (container: HTMLElement) => {
  // 3D 모드: WebGL canvas에서 직접 이미지 추출
  const webglCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;
  if (webglCanvas) {
    // WebGL은 preserveDrawingBuffer가 false일 수 있으므로 toDataURL 전에 렌더 요청
    try {
      const dataUrl = webglCanvas.toDataURL('image/png');
      downloadDataUrl(dataUrl);
    } catch {
      // preserveDrawingBuffer 이슈 시 html2canvas 대신 직접 읽기 시도
      alert('3D 캔버스 캡처에 실패했습니다.');
    }
    return;
  }

  // 2D 모드: SVG → Canvas → PNG
  const svgEl = container.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) return;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const rect = svgEl.getBoundingClientRect();
  clone.setAttribute('width', String(rect.width));
  clone.setAttribute('height', String(rect.height));
  // 배경색 추가
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#f7f5f1');
  clone.insertBefore(bgRect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    downloadDataUrl(pngUrl);
  };
  img.src = url;
};

const downloadDataUrl = (dataUrl: string) => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename = `hichi_screenshot_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AppShell = () => {
  const [activeNav, setActiveNav] = useState<NavId | null>('drawing');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const editor = useEditor();
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  /* activeTool from panel → editor drawing mode */
  useEffect(() => {
    editor.changeMode(toolLabelToMode(activeTool));
  }, [activeTool]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavClick = (id: NavId) => {
    if (activeNav === id) {
      setActiveNav(null);
      setActiveTool(null);
    } else {
      setActiveNav(id);
      setActiveTool(null);
    }
  };

  const handleClosePanel = () => {
    setActiveNav(null);
    setActiveTool(null);
  };

  const handleToolClick = (tool: string) => {
    if (tool === '좌우 반전') {
      editor.toggleFlipH();
      return;
    }
    setActiveTool((prev) => (prev === tool ? null : tool));
  };

  const fitToView = () => {
    const el = canvasAreaRef.current;
    if (!el) return;
    editor.fitView(el.clientWidth, el.clientHeight);
  };

  const handleScreenshot = useCallback(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    captureCanvasArea(el);
  }, []);

  const handleUploadFloorPlan = useCallback(
    async (file: File) => {
      const result = await uploadFloorPlan(file);
      if (result.status === 'failed' || !result.parsed) {
        throw new Error(result.error ?? 'AI 파싱 실패');
      }
      const shapes = parsedToShapes(result.parsed);
      editor.addShapes(shapes);

      const parser = result.parsed.parser ?? 'opencv';
      const wallCount = result.parsed.walls.length;

      // 원본 이미지를 캔버스 배경으로 설정 (사진 같은 느낌)
      if (result.image_url) {
        const { image_width, image_height, pixels_per_mm } =
          result.parsed.meta;
        const ppm = pixels_per_mm > 0 ? pixels_per_mm : config.defaultPixelsPerMm;
        editor.setBackgroundImage({
          url: `${config.apiBaseUrl}${result.image_url}`,
          widthMm: image_width / ppm,
          heightMm: image_height / ppm,
          opacity: 0.85,
        });
      }

      // 캔버스에 맞춰 뷰포트 자동 정렬
      const el = canvasAreaRef.current;
      if (el) {
        // shapes가 state 반영된 다음 tick에 fitView
        requestAnimationFrame(() =>
          editor.fitView(el.clientWidth, el.clientHeight),
        );
      }

      // 업로드 성공 시 다음 단계(공간 환경)로 자동 전환 (사용자 결정 2026-05-28).
      // 실패(throw) 시 이 코드 미도달 → 도면 그리기 패널 유지.
      setActiveNav('environment');
      setActiveTool(null);

      return { parser, wallCount };
    },
    [editor],
  );

  const isPanelOpen =
    activeNav === 'drawing' ||
    activeNav === 'environment' ||
    activeNav === 'furniture';

  return (
    <div className="flex size-full">
      <SideNav activeNav={activeNav} onNavClick={handleNavClick} />
      <div className="min-w-0 col flex-1">
        <Header editor={editor} />
        <div className="min-h-0 flex flex-1 bg-gray-100">
          {isPanelOpen && activeNav === 'drawing' && (
            <DrawingPanel
              activeTool={activeTool}
              onToolClick={handleToolClick}
              onClose={handleClosePanel}
              onUploadFloorPlan={handleUploadFloorPlan}
            />
          )}
          {isPanelOpen && activeNav === 'environment' && (
            <RoomEnvironmentPanel
              editor={editor}
              activeTool={activeTool}
              onToolClick={handleToolClick}
              onClose={handleClosePanel}
            />
          )}
          {isPanelOpen && activeNav === 'furniture' && (
            <FurniturePanel onClose={handleClosePanel} />
          )}
          <div className="min-w-0 min-h-0 w-full col flex-1 relative">
            <div ref={canvasAreaRef} className="min-h-0 flex-1 relative">
              {editor.viewMode === '3D' ? (
                <Scene3DCanvas editor={editor} />
              ) : (
                <SimulationCanvas editor={editor} />
              )}
              {/* 2D 모드에서 선택된 가구의 치수/회전 입력 */}
              {editor.viewMode === '2D' && (
                <FurniturePropertiesPanel editor={editor} />
              )}
            </div>
            <FooterNav editor={editor} onFitView={fitToView} onScreenshot={handleScreenshot} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
