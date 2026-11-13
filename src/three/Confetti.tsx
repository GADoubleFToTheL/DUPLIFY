import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from '../core/colors';
import { boxGeometry } from './geometry';

const COUNT = 150;

/** Konfetti aus Mini-Bausteinen. */
export function Confetti({ active, height, radius }: { active: boolean; height: number; radius: number }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      boxGeometry(0.42, 0.26, 0.22, 0.05),
      new THREE.MeshStandardMaterial({ roughness: 0.35 }),
      COUNT,
    );
    const palette = COLORS.filter((c) => !['schwarz', 'grau', 'braun', 'beige'].includes(c.id));
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) m.setColorAt(i, col.set(palette[i % palette.length].hex));
    m.frustumCulled = false;
    m.visible = false;
    return m;
  }, []);
  const state = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3 }[]>([]);
  const started = useRef<number | null>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!active) {
      started.current = null;
      mesh.visible = false;
      return;
    }
    started.current = -1;
    state.current = Array.from({ length: COUNT }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
      spin: new THREE.Vector3(),
    }));
    state.current.forEach((p) => spawn(p, height, radius, true));
    mesh.visible = true;
  }, [active, height, radius, mesh]);

  useFrame(({ clock }, dt) => {
    if (started.current === null) return;
    if (started.current < 0) started.current = clock.elapsedTime;
    const age = clock.elapsedTime - started.current;
    let alive = 0;
    state.current.forEach((p, i) => {
      p.vel.y -= 3.2 * dt;
      p.vel.y = Math.max(p.vel.y, -6);
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt;
      p.rot.y += p.spin.y * dt;
      p.rot.z += p.spin.z * dt;
      if (p.pos.y < 0) {
        if (age < 4.5) spawn(p, height, radius, false);
        else p.pos.y = -50;
      }
      if (p.pos.y > -10) alive++;
      tmp.position.copy(p.pos);
      tmp.rotation.copy(p.rot);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (alive === 0) {
      mesh.visible = false;
      started.current = null;
    }
  });

  return <primitive object={mesh} />;
}

function spawn(
  p: { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3 },
  height: number,
  radius: number,
  first: boolean,
) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * (radius + 3);
  p.pos.set(Math.cos(a) * r, height + 4 + Math.random() * (first ? 14 : 6), Math.sin(a) * r);
  p.vel.set((Math.random() - 0.5) * 2, -1 - Math.random() * 2, (Math.random() - 0.5) * 2);
  p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  p.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
}
