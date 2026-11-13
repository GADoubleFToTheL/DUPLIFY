import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, type ReactNode } from 'react';
import * as THREE from 'three';
import { roomEnvironment } from './environment';

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    scene.environment = roomEnvironment(gl);
  }, [gl, scene]);
  return null;
}

export function Lights() {
  return (
    <>
      <hemisphereLight args={[0xffffff, 0xbfdfff, 0.75]} />
      <directionalLight position={[6, 12, 8]} intensity={1.3} />
      <directionalLight position={[-6, 5, -4]} intensity={0.35} />
    </>
  );
}

interface Props {
  children: ReactNode;
  camera?: { position: [number, number, number]; fov?: number };
  className?: string;
  onCreated?: (state: { gl: THREE.WebGLRenderer }) => void;
}

/** Standard-3D-Fläche der App: weiche Farben, Plastik-Licht, Pixel-Dichte max. 2. */
export function Scene3D({ children, camera, className, onCreated }: Props) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, preserveDrawingBuffer: true }}
      camera={{ position: camera?.position ?? [8, 8, 12], fov: camera?.fov ?? 35, near: 0.1, far: 2000 }}
      onCreated={onCreated}
    >
      <Environment />
      <Lights />
      {children}
    </Canvas>
  );
}
