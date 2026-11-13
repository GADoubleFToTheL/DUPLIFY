import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { baseplateGeometry, studGeometry } from './geometry';

interface GroundProps {
  /** Mittelpunkt des Bauwerks (Weltkoordinaten). */
  center?: [number, number];
  baseplate?: { w: number; l: number } | null;
  radius?: number;
}

/** Spielteppich (rund) und optional eine grüne Grundplatte mit Noppen. */
export function Ground({ center = [0, 0], baseplate, radius = 40 }: GroundProps) {
  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh rotation-x={-Math.PI / 2} position-y={baseplate ? -0.245 : -0.005}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#cdeec0" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={baseplate ? -0.24 : -0.002}>
        <ringGeometry args={[radius * 0.55, radius * 0.6, 64]} />
        <meshStandardMaterial color="#b7e3a6" roughness={0.95} />
      </mesh>
      {baseplate && <Baseplate w={baseplate.w} l={baseplate.l} />}
    </group>
  );
}

function Baseplate({ w, l }: { w: number; l: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const plateGeo = useMemo(() => baseplateGeometry(w, l), [w, l]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3fae49', roughness: 0.4 }), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const tmp = new THREE.Object3D();
    let i = 0;
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < l; z++) {
        tmp.position.set(x + 0.5 - w / 2, -0.002, z + 0.5 - l / 2);
        tmp.updateMatrix();
        m.setMatrixAt(i++, tmp.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [w, l]);
  return (
    <group>
      <mesh geometry={plateGeo} material={mat} />
      <instancedMesh ref={ref} args={[studGeometry(), mat, w * l]} />
    </group>
  );
}
