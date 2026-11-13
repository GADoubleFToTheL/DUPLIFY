import { ContactShadows } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Placement } from '../core/types';
import { animateObjects, collectAnimated } from './animate';
import { CameraRig } from './CameraRig';
import { Confetti } from './Confetti';
import { Ground } from './Ground';
import { Sparkles, type SparklesHandle } from './Sparkles';
import { StageAnimator, type StagePhase } from './stageAnimator';

export interface BuildStageProps {
  placements: readonly Placement[];
  steps: readonly (readonly number[])[];
  phase: StagePhase;
  step: number;
  baseplate?: { w: number; l: number } | null;
  /** Wird aufgerufen, wenn das letzte Teil eines Schritts gelandet ist. */
  onLanded?: (step: number) => void;
}

/** Die komplette Bau-Bühne: Teile, Animationen, Boden, Kamera, Sternchen, Konfetti. */
export function BuildStage({ placements, steps, phase, step, baseplate, onLanded }: BuildStageProps) {
  const animator = useMemo(() => new StageAnimator(placements, steps), [placements, steps]);
  const animated = useMemo(() => collectAnimated(animator.pivot), [animator]);
  const sparkles = useRef<SparklesHandle>(null);
  const clock = useThree((s) => s.clock);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const landedRef = useRef(onLanded);
  landedRef.current = onLanded;

  useEffect(() => {
    animator.callbacks.onLanded = (s, index, top) => {
      sparkles.current?.burst(top.clone().add(new THREE.Vector3(0, 0.2, 0)));
      const last = steps[s]?.[steps[s].length - 1];
      if (index === last) landedRef.current?.(s);
    };
  }, [animator, steps]);

  useEffect(() => {
    animator.goTo(phase, step, clock.elapsedTime);
  }, [animator, phase, step, clock]);

  useFrame((state, dt) => {
    animator.update(state.clock.elapsedTime, dt);
    animateObjects(animated, state.clock.elapsedTime, dt, phase === 'done');
  });

  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const goal = useMemo(
    () => animator.cameraGoal(camera.fov, aspect),
    // Ziel hängt nur von Phase, Schritt und Bildformat ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animator, phase, step, camera.fov, aspect],
  );
  const size = animator.bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.z) / 2;

  return (
    <>
      <primitive object={animator.pivot} />
      <Ground center={[animator.center.x, animator.center.z]} baseplate={baseplate} />
      <ContactShadows
        position={[animator.center.x, baseplate ? 0.001 : 0.004, animator.center.z]}
        scale={Math.max(14, radius * 3.2)}
        far={Math.max(6, size.y + 2)}
        blur={2.4}
        opacity={0.45}
        resolution={512}
        color="#24456b"
      />
      <Sparkles ref={sparkles} />
      <Confetti active={phase === 'done'} height={size.y} radius={radius} />
      <CameraRig goal={goal} />
    </>
  );
}
