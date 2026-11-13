import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { starGeometry } from './geometry';

export interface SparklesHandle {
  burst(at: THREE.Vector3, count?: number): void;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  age: number;
}

const COLORS = ['#ffd23f', '#ff8fb1', '#7fd6ff', '#ffffff', '#b8f27c'];

/** Sternchen, die beim Landen eines Steins aufspritzen. */
export const Sparkles = forwardRef<SparklesHandle>(function Sparkles(_, ref) {
  const { group, pool } = useMemo(() => {
    const group = new THREE.Group();
    const pool: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS[i % COLORS.length],
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(starGeometry(0.22), mat);
      mesh.visible = false;
      group.add(mesh);
      pool.push({ mesh, vel: new THREE.Vector3(), life: 0, age: 0 });
    }
    return { group, pool };
  }, []);

  useImperativeHandle(ref, () => ({
    burst(at, count = 12) {
      let n = 0;
      for (const p of pool) {
        if (n >= count) break;
        if (p.mesh.visible) continue;
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 2.5;
        p.vel.set(Math.cos(a) * s, 3 + Math.random() * 3, Math.sin(a) * s);
        p.mesh.position.copy(at);
        p.life = 0.6 + Math.random() * 0.35;
        p.age = 0;
        p.mesh.visible = true;
        n++;
      }
    },
  }));

  useFrame(({ camera }, dt) => {
    for (const p of pool) {
      if (!p.mesh.visible) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.quaternion.copy(camera.quaternion);
      p.mesh.rotateZ(p.age * 6);
      const k = 1 - p.age / p.life;
      p.mesh.scale.setScalar(0.4 + k);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = k;
    }
  });

  return <primitive object={group} />;
});
