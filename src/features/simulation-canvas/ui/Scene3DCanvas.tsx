/* eslint-disable react/no-unknown-property */
import { OrbitControls, useTexture } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BackgroundImage, Shape } from '../model/types';
import type { Editor } from '../model/useEditor';
import FurnitureMesh3D from './FurnitureMesh3D';

const WALL_HEIGHT = 2.4;
const WALL_THICKNESS = 0.12;
const COLOR_WALL = '#ffffff';
const COLOR_COLUMN = '#ffffff';
const COLOR_ROOM = '#ffffff';

const WallMesh = ({ shape }: { shape: Extract<Shape, { type: 'wall' }> }) => {
  const sx = shape.start.x / 1000, sz = shape.start.y / 1000, ex = shape.end.x / 1000, ez = shape.end.y / 1000;
  const dx = ex - sx, dz = ez - sz, len = Math.hypot(dx, dz);
  if (len < 0.001) return null;
  return (
    <mesh position={[(sx + ex) / 2, WALL_HEIGHT / 2, (sz + ez) / 2]} rotation={[0, Math.atan2(dx, dz), 0]} castShadow receiveShadow>
      <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, len]} />
      <meshStandardMaterial color={COLOR_WALL} />
    </mesh>
  );
};

const RectColumnMesh = ({ shape }: { shape: Extract<Shape, { type: 'rect-column' }> }) => {
  const w = shape.w / 1000, d = shape.h / 1000;
  return (
    <mesh position={[shape.x / 1000 + w / 2, WALL_HEIGHT / 2, shape.y / 1000 + d / 2]} castShadow receiveShadow>
      <boxGeometry args={[w, WALL_HEIGHT, d]} />
      <meshStandardMaterial color={COLOR_COLUMN} />
    </mesh>
  );
};

const CircleColumnMesh = ({ shape }: { shape: Extract<Shape, { type: 'circle-column' }> }) => {
  const r = shape.r / 1000;
  return (
    <mesh position={[shape.cx / 1000, WALL_HEIGHT / 2, shape.cy / 1000]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, WALL_HEIGHT, 32]} />
      <meshStandardMaterial color={COLOR_COLUMN} />
    </mesh>
  );
};

const RoomMesh = ({ shape }: { shape: Extract<Shape, { type: 'room' }> }) => {
  if (shape.points.length < 3) return null;
  const ts = new THREE.Shape(shape.points.map(p => new THREE.Vector2(p.x / 1000, p.y / 1000)));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <extrudeGeometry args={[ts, { depth: 0.02, bevelEnabled: false }]} />
      <meshStandardMaterial color={COLOR_ROOM} side={THREE.DoubleSide} />
    </mesh>
  );
};



const BackgroundFloor = ({ bg }: { bg: BackgroundImage }) => {
  const tex = useTexture(bg.url);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bg.widthMm / 2000, -0.005, bg.heightMm / 2000]} receiveShadow>
      <planeGeometry args={[bg.widthMm / 1000, bg.heightMm / 1000]} />
      <meshStandardMaterial map={tex} transparent opacity={bg.opacity} />
    </mesh>
  );
};

const FitCamera = ({ editor, controlsRef }: { editor: Editor, controlsRef: any }) => {
  const { camera } = useThree();
  const fitted = useRef(false);
  useLayoutEffect(() => {
    if (fitted.current || (editor.shapes.length === 0 && editor.placedFurniture.length === 0)) return;
    fitted.current = true;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    const expand = (x: number, z: number) => { minX = Math.min(minX, x); minZ = Math.min(minZ, z); maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z); };
    editor.shapes.forEach(s => {
      if (s.type === 'wall') { expand(s.start.x / 1000, s.start.y / 1000); expand(s.end.x / 1000, s.end.y / 1000); }
      else if (s.type === 'room') s.points.forEach(p => expand(p.x / 1000, p.y / 1000));
      else if (s.type === 'rect-column') { expand(s.x / 1000, s.y / 1000); expand((s.x + s.w) / 1000, (s.y + s.h) / 1000); }
      else if (s.type === 'circle-column') { expand((s.cx - s.r) / 1000, (s.cy - s.r) / 1000); expand((s.cx + s.r) / 1000, (s.cy + s.r) / 1000); }
    });
    editor.placedFurniture.forEach(f => { const r = Math.max(f.width, f.depth) / 2000; expand(f.position.x / 1000 - r, f.position.y / 1000 - r); expand(f.position.x / 1000 + r, f.position.y / 1000 + r); });
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, dist = Math.max(maxX - minX, maxZ - minZ, 1) * 1.5 + 2.4;
    camera.position.set(cx + dist * 0.7, dist * 0.8, cz + dist * 0.7);
    camera.lookAt(cx, 0, cz);
    if (controlsRef.current) { controlsRef.current.target.set(cx, 0, cz); controlsRef.current.update(); }
  }, [editor.shapes, editor.placedFurniture, camera, controlsRef]);
  return null;
};

const Scene3DCanvas = ({ editor }: { editor: Editor }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  return (
    <div className="block size-full" style={{ background: '#f7f5f1' }}>
      <Canvas camera={{ position: [8, 8, 8], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[10, 12, 8]} intensity={0.9} castShadow />
        <directionalLight position={[-6, 4, -4]} intensity={0.25} />
        <gridHelper args={[40, 40, '#c9c6c1', '#e5e3df']} />
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} />
        {editor.backgroundImage && <Suspense fallback={null}><BackgroundFloor bg={editor.backgroundImage} /></Suspense>}
        <FitCamera editor={editor} controlsRef={controlsRef} />
        {editor.shapes.map(s => {
          if (s.type === 'wall') return <WallMesh key={s.id} shape={s} />;
          if (s.type === 'rect-column') return <RectColumnMesh key={s.id} shape={s} />;
          if (s.type === 'circle-column') return <CircleColumnMesh key={s.id} shape={s} />;
          if (s.type === 'room') return <RoomMesh key={s.id} shape={s} />;
          return null;
        })}
        {editor.placedFurniture.map(f => <FurnitureMesh3D key={f.id} furniture={f} />)}
      </Canvas>
    </div>
  );
};
export default Scene3DCanvas;
