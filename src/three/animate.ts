import type { Object3D } from 'three';
import type { AnimKind } from './partFactory';

/** Sammelt alle animierten Unterobjekte (Augen, Blumen, Räder …) einmalig ein. */
export function collectAnimated(root: Object3D): Object3D[] {
  const out: Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.anim) out.push(o);
  });
  return out;
}

/**
 * Lässt Teile leben: Augen blinzeln, Blumen wiegen sich, Schwänze wedeln.
 * Mit `party` (Fertig-Feier) drehen sich Räder und Figuren winken.
 */
export function animateObjects(objs: readonly Object3D[], t: number, dt: number, party: boolean): void {
  for (const o of objs) {
    const kind = o.userData.anim as AnimKind;
    const phase = (o.userData.phase as number) ?? 0;
    switch (kind) {
      case 'blink': {
        const period = 3.1 + (phase % 1.9);
        const local = (t + phase * 3.7) % period;
        o.scale.y = local < 0.13 ? 0.12 : 1;
        break;
      }
      case 'sway':
        o.rotation.z = Math.sin(t * 1.6 + phase) * (party ? 0.22 : 0.08);
        o.rotation.x = Math.sin(t * 1.1 + phase * 1.3) * 0.05;
        break;
      case 'wave':
        o.rotation.z = party ? 2.5 + Math.sin(t * 9 + phase) * 0.45 : 0.12 + Math.sin(t * 1.3 + phase) * 0.05;
        break;
      case 'wag':
        o.rotation.y = Math.sin(t * (party ? 13 : 3) + phase) * (party ? 0.65 : 0.25);
        break;
      case 'wheel':
        if (party) o.rotation.z -= dt * 7;
        break;
      case 'bob':
        o.position.y = Math.sin(t * 2 + phase) * 0.05;
        break;
    }
  }
}
