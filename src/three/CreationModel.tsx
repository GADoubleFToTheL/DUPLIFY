import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { Placement } from '../core/types';
import { animateObjects, collectAnimated } from './animate';
import { createCreationGroup } from './partFactory';

interface Props {
  placements: readonly Placement[];
  party?: boolean;
}

/** Ein ganzes Bauwerk, das „lebt“ (Augen blinzeln, Blumen wiegen sich …). */
export function CreationModel({ placements, party = false }: Props) {
  const group = useMemo(() => createCreationGroup(placements), [placements]);
  const animated = useMemo(() => collectAnimated(group), [group]);
  const ref = useRef<Group>(null);
  useFrame((state, dt) => animateObjects(animated, state.clock.elapsedTime, dt, party));
  return <primitive ref={ref} object={group} />;
}
