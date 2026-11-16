import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { play, type Sfx } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import type { ColorId } from '../../core/types';
import { animateObjects, collectAnimated } from '../../three/animate';
import { Baseplate } from '../../three/Ground';
import { preloadModels } from '../../three/ldrawGeometry';
import { createPartModel } from '../../three/partFactory';
import { Lights, PlasticEnvironment } from '../../three/Scene3D';
import {
  DIZZY_PHRASES,
  FLOWER_PHRASES,
  HINTS,
  MAX_STACK,
  STACK_PHRASES,
  SUN_PHRASES,
  TICKLE_PHRASES,
  TOPPLE_PHRASES,
  TRICK_PHRASES,
  TickleCounter,
  WAKE_PHRASES,
  nextTrick,
  pick,
  toppleAt,
  type Trick,
} from '../../three/noppi/brain';
import { NOPPI_TOP, NoppiRig, type NoppiEvent } from '../../three/noppi/NoppiRig';
import { Noppi } from './Noppi';
import { Sun } from './Sun';

const DROP_COLORS: ColorId[] = ['rot', 'gelb', 'blau', 'gruen', 'orange', 'lila', 'hellblau', 'pink', 'hellgruen', 'tuerkis'];
const TRICK_SOUND: Record<Trick, Sfx | null> = {
  hop: 'boing',
  flip: 'whoosh',
  spin: 'whoosh',
  dance: 'melody',
  giggle: 'giggle',
  wave: 'pop',
  peekaboo: null,
};
const PLATE = { w: 6, l: 4 };

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class StageBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn('3D-Noppi nicht verfügbar, zeige die gezeichnete Version', e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Was die Bühne von außen braucht: Noppi steuern und seine Reaktionen hören. */
interface StageApi {
  /** Alles, was in der 3D-Szene steht (Noppi, Blumen, herumfliegende Steine). */
  world: THREE.Group;
  rig: NoppiRig;
  flowers: THREE.Object3D[];
  onTapNoppi: () => void;
  onTapEmpty: () => void;
  onTapFlower: (flower: THREE.Object3D) => void;
  /** Bildschirmpunkt → Blickziel (wird von der Bühne gesetzt). */
  lookAtScreen?: (x: number, y: number) => void;
  /** Platz oben für die Sprechblase (Pixel). */
  headroomPx: number;
  /** Bühnen-Element: bekommt Noppis Bildschirmposition (für Tests) als data-noppi="x,y". */
  stageEl?: HTMLElement | null;
}

/** Kamera folgt der Turmhöhe auf Noppis Kopf und lässt oben Platz für die Sprechblase. */
function CameraFit({ api }: { api: StageApi }) {
  const rig = api.rig;
  const { camera, size } = useThree();
  const cur = useRef<{ y: number; dist: number } | null>(null);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const headroom = Math.min(0.4, api.headroomPx / Math.max(1, size.height));
    const bottom = -0.7;
    const contentTop = NOPPI_TOP + 0.55 + rig.stackCount * 1.2;
    const viewH = (contentTop - bottom) / (1 - headroom);
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(viewH / 2 / tan, (PLATE.w / 2 + 0.35) / (tan * aspect)) * 1.03;
    // Bei schmaler Bühne ist das Bild höher als nötig: Inhalt trotzdem unten halten.
    const visibleH = 2 * dist * tan;
    const centerY = bottom + visibleH / 2 - 0.05;
    const k = cur.current ? 1 - Math.exp(-dt * 3) : 1;
    const c = (cur.current ??= { y: centerY, dist });
    c.y += (centerY - c.y) * k;
    c.dist += (dist - c.dist) * k;
    const pitch = 0.13;
    cam.position.set(0, c.y + Math.sin(pitch) * c.dist, Math.cos(pitch) * c.dist);
    cam.lookAt(0, c.y, 0);
  });
  return null;
}

function StageScene({ api }: { api: React.RefObject<StageApi | null> }) {
  const { gl, camera, raycaster } = useThree();
  const a = api.current!;
  const animated = useMemo(() => a.flowers.flatMap((f) => collectAnimated(f)), [a.flowers]);

  // Antippen, Drehen und Blick – direkt auf der Zeichenfläche
  useEffect(() => {
    const el = gl.domElement;
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.5);
    const hitPoint = new THREE.Vector3();
    const aim = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const flowerAt = (): THREE.Object3D | null => {
      for (const f of a.flowers) if (raycaster.intersectObject(f, true).length) return f;
      return null;
    };
    let lastLook = 0;
    const lookAtScreen = (x: number, y: number) => {
      aim(x, y);
      if (raycaster.ray.intersectPlane(plane, hitPoint)) {
        a.rig.lookAt(hitPoint);
        lastLook = performance.now();
      }
    };
    a.lookAtScreen = lookAtScreen;

    type Down = { id: number; x: number; y: number; lastX: number; lastT: number; target: 'noppi' | 'flower' | 'empty'; flower: THREE.Object3D | null; dragging: boolean };
    let down: Down | null = null;
    const onDown = (e: PointerEvent) => {
      aim(e.clientX, e.clientY);
      const flower = flowerAt();
      const target = a.rig.isHit(raycaster) ? 'noppi' : flower ? 'flower' : 'empty';
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: performance.now(), target, flower, dragging: false };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // egal – dann eben ohne Capture
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const now = performance.now();
      if (down.target === 'noppi') {
        if (!down.dragging && Math.abs(e.clientX - down.x) > 12) {
          down.dragging = true;
          a.rig.beginDrag();
        }
        if (down.dragging) a.rig.dragBy((e.clientX - down.lastX) * 0.016, (now - down.lastT) / 1000);
      }
      down.lastX = e.clientX;
      down.lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const d = down;
      down = null;
      const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (d.target === 'noppi') {
        if (d.dragging) a.rig.endDrag();
        else if (moved < 14) a.onTapNoppi();
      } else if (moved < 14) {
        if (d.target === 'flower' && d.flower) a.onTapFlower(d.flower);
        else a.onTapEmpty();
      }
    };
    const onCancel = (e: PointerEvent) => {
      if (down && e.pointerId === down.id) {
        if (down.dragging) a.rig.endDrag();
        down = null;
      }
    };
    // Der Blick folgt dem Finger überall auf der Seite
    const onLook = (e: PointerEvent) => lookAtScreen(e.clientX, e.clientY);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    window.addEventListener('pointermove', onLook, { passive: true });
    window.addEventListener('pointerdown', onLook, { passive: true });
    const idleLook = window.setInterval(() => {
      if (performance.now() - lastLook > 2500) a.rig.lookAt(null);
    }, 500);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('pointermove', onLook);
      window.removeEventListener('pointerdown', onLook);
      window.clearInterval(idleLook);
      a.lookAtScreen = undefined;
    };
  }, [gl, camera, raycaster, a]);

  const probe = useMemo(() => ({ v: new THREE.Vector3(), next: 0 }), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    a.rig.update(t, dt);
    if (a.stageEl && t > probe.next) {
      probe.next = t + 0.5;
      probe.v.set(0, 1.2, 0).project(camera);
      const r = gl.domElement.getBoundingClientRect();
      a.stageEl.dataset.noppi = `${Math.round(r.left + ((probe.v.x + 1) / 2) * r.width)},${Math.round(r.top + ((1 - probe.v.y) / 2) * r.height)}`;
    }
    animateObjects(animated, t, dt, false);
    for (const f of a.flowers) {
      const w0 = f.userData.wiggleAt as number | undefined;
      const age = w0 === undefined ? 99 : t - w0;
      f.rotation.z = age < 1.5 ? Math.sin(age * 22) * 0.22 * Math.exp(-age * 2.5) : 0;
      if (w0 === -1) f.userData.wiggleAt = t;
    }
  });

  return (
    <>
      <PlasticEnvironment />
      <Lights />
      <CameraFit api={a} />
      <Baseplate w={PLATE.w} l={PLATE.l} />
      <primitive object={a.world} />
    </>
  );
}

interface Props {
  /** Noppi schläft (niemand hat eine Weile getippt). */
  sleeping: boolean;
  /** Begrüßung in der Sprechblase. */
  greeting: string;
  /** Was Noppi beim ersten Antippen sagt. */
  intro: string;
}

/**
 * Startbildschirm-Bühne: Noppi in 3D auf einer grünen Bauplatte.
 * Antippen = Kunststück, schnell antippen = kitzeln, wischen = drehen (schwindelig!),
 * in den Himmel tippen = ein Stein fällt auf Noppis Kopf (bis der Turm umfällt).
 */
export function NoppiStage({ sleeping, greeting, intro }: Props) {
  const reduced = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const webgl = useMemo(hasWebGL, []);
  const [line, setLine] = useState<string | null>(null);
  const [hint, setHint] = useState(0);
  const [bricks, setBricks] = useState(0);
  const [last, setLast] = useState('greet');
  const [sunSpin, setSunSpin] = useState(false);
  const lineTimer = useRef(0);
  const introDone = useRef(false);
  const prevTrick = useRef<Trick | null>(null);
  const tickle = useMemo(() => new TickleCounter(), []);
  const threshold = useRef(toppleAt(Math.random));
  const stageRef = useRef<HTMLDivElement>(null);

  const say = useCallback((text: string) => {
    setLine(text);
    speak(text);
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setLine(null), 3600);
  }, []);

  const api = useRef<StageApi | null>(null);
  if (!api.current) {
    const world = new THREE.Group();
    const rig = new NoppiRig(world, reduced);
    const flowerA = createPartModel('flower', 'gelb', undefined, { seed: 3 });
    flowerA.position.set(-2, 0, 1);
    const flowerB = createPartModel('flower', 'rosa', undefined, { seed: 8 });
    flowerB.position.set(2, 0, -1);
    world.add(rig.object, flowerA, flowerB);
    api.current = {
      world,
      rig,
      flowers: [flowerA, flowerB],
      onTapNoppi: () => undefined,
      onTapEmpty: () => undefined,
      onTapFlower: () => undefined,
      headroomPx: 80,
    };
  }
  const a = api.current;

  // Reaktionen (bei jedem Rendern aktuell, damit `say` & Co. stimmen)
  a.onTapNoppi = () => {
    const rig = a.rig;
    if (tickle.tap(performance.now())) {
      rig.play('giggle');
      play('giggle');
      setLast('tickle');
      say(pick(TICKLE_PHRASES, Math.random));
      return;
    }
    if (rig.actionAge < 0.45) return;
    if (!introDone.current) {
      introDone.current = true;
      rig.play('wave');
      play('pop');
      setLast('wave');
      say(intro);
      return;
    }
    const trick = nextTrick(prevTrick.current, rig.stackCount, Math.random);
    prevTrick.current = trick;
    rig.play(trick);
    const s = TRICK_SOUND[trick];
    if (s) play(s);
    setLast(trick);
    if (trick !== 'peekaboo') say(pick(TRICK_PHRASES[trick], Math.random));
  };
  a.onTapEmpty = () => {
    const color = pick(DROP_COLORS, Math.random);
    if (a.rig.dropBrick(color)) {
      play('tap');
      setLast('drop');
      setBricks(a.rig.stackCount);
    } else if (a.rig.stackCount >= MAX_STACK) say('Mein Turm ist schon riesig!');
  };
  a.onTapFlower = (flower) => {
    flower.userData.wiggleAt = -1;
    a.rig.play('flower');
    play('pop');
    setLast('flower');
    say(pick(FLOWER_PHRASES, Math.random));
  };
  a.rig.onEvent = (e: NoppiEvent) => {
    switch (e.type) {
      case 'landed':
        play('klick');
        setBricks(a.rig.stackCount);
        if (e.stack >= threshold.current) {
          a.rig.scheduleTopple(1.0);
          play('wobble');
          say('Oh oh … es wackelt!');
        } else if (e.stack >= 2 && Math.random() < 0.6) say(pick(STACK_PHRASES, Math.random));
        break;
      case 'toppled':
        play('whoosh');
        window.setTimeout(() => play('giggle'), 650);
        threshold.current = toppleAt(Math.random);
        setBricks(0);
        setLast('topple');
        say(pick(TOPPLE_PHRASES, Math.random));
        break;
      case 'dizzy':
        play('wobble');
        setLast('dizzy');
        say(pick(DIZZY_PHRASES, Math.random));
        break;
      case 'peek':
        play('sparkle');
        say('Kuckuck!');
        break;
    }
  };

  const onSun = () => {
    setSunSpin(true);
    window.setTimeout(() => setSunSpin(false), 1000);
    const r = stageRef.current?.querySelector('.sun')?.getBoundingClientRect();
    if (r) a.lookAtScreen?.(r.left + r.width / 2, r.top + r.height / 2);
    a.rig.play('sun');
    play('sparkle');
    setLast('sun');
    say(pick(SUN_PHRASES, Math.random));
  };

  // Einschlafen und Aufwachen
  const wasSleeping = useRef(sleeping);
  useEffect(() => {
    a.rig.setSleeping(sleeping);
    if (wasSleeping.current && !sleeping) {
      play('yawn');
      say(pick(WAKE_PHRASES, Math.random));
    }
    wasSleeping.current = sleeping;
  }, [sleeping, a, say]);

  // Begrüßung: Noppi plumpst auf die Platte
  useEffect(() => {
    void preloadModels(['3437']);
    a.rig.play('greet');
    return () => window.clearTimeout(lineTimer.current);
  }, [a]);

  // Tipps reihum, wenn gerade nichts gesagt wird
  useEffect(() => {
    if (line || sleeping) return;
    const id = window.setInterval(() => setHint((h) => h + 1), 6000);
    return () => window.clearInterval(id);
  }, [line, sleeping]);

  useEffect(() => {
    a.stageEl = stageRef.current;
    return () => {
      a.stageEl = null;
      a.rig.dispose();
    };
  }, [a]);

  const idleLines = [greeting, ...HINTS];
  const text = sleeping ? 'Zzz … tipp mich an!' : (line ?? idleLines[hint % idleLines.length]);

  // Die Kamera lässt oben so viel Platz, wie die Sprechblase gerade braucht.
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const measure = () => {
      a.headroomPx = el.offsetHeight + el.offsetTop + 10;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, a]);

  return (
    <div className="noppi-stage" ref={stageRef} data-testid="noppi-stage" data-bricks={bricks} data-last={last}>
      <Sun spinning={sunSpin} onClick={onSun} />
      <div className="bubble home-bubble" data-testid="noppi-bubble" key={text} ref={bubbleRef}>
        {text}
      </div>
      {webgl ? (
        <StageBoundary fallback={<FlatNoppi sleeping={sleeping} />}>
          <Canvas
            className="noppi-canvas"
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
            camera={{ fov: 30, position: [0, 3, 16], near: 0.1, far: 200 }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <StageScene api={api} />
          </Canvas>
        </StageBoundary>
      ) : (
        <FlatNoppi sleeping={sleeping} />
      )}
    </div>
  );
}

/** Ersatz ohne 3D: der gezeichnete Noppi. */
function FlatNoppi({ sleeping }: { sleeping: boolean }) {
  return (
    <div className="noppi-flat">
      <Noppi mood={sleeping ? 'sleep' : 'wave'} size={200} />
    </div>
  );
}
