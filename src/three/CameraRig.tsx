import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import { lerpAngle } from './easing';
import type { CameraGoal } from './stageAnimator';

/**
 * Kamera-Automatik: folgt dem Ziel weich. Sobald das Kind selbst dreht/zoomt,
 * pausiert die Automatik bis zum nächsten Schritt.
 */
export function CameraRig({ goal }: { goal: CameraGoal }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const user = useRef(false);
  const lastKey = useRef('');
  const { camera } = useThree();
  const sph = useRef(new THREE.Spherical());
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (lastKey.current !== goal.key) {
      lastKey.current = goal.key;
      user.current = false;
    }
    if (user.current) return;
    const k = 1 - Math.exp(-dt * 2.6);
    c.target.lerp(goal.target, k);
    tmp.current.copy(camera.position).sub(c.target);
    sph.current.setFromVector3(tmp.current);
    sph.current.radius += (goal.distance - sph.current.radius) * k;
    sph.current.theta = lerpAngle(sph.current.theta, goal.azimuth, k);
    sph.current.phi += (goal.polar - sph.current.phi) * k;
    tmp.current.setFromSpherical(sph.current);
    camera.position.copy(c.target).add(tmp.current);
    camera.lookAt(c.target);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={4}
      maxDistance={220}
      minPolarAngle={0.15}
      maxPolarAngle={1.48}
      onStart={() => {
        user.current = true;
      }}
    />
  );
}
