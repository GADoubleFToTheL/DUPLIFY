import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { groupSteps } from '../../core/steps';
import type { Creation } from '../../core/types';
import { play } from '../../audio/sfx';
import { speak, stopSpeaking } from '../../audio/voice';
import { numberWord, partPhraseAcc } from '../../i18n/speech';
import { useHistory } from '../../state/historyStore';
import { useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { BuildStage } from '../../three/BuildStage';
import { Scene3D } from '../../three/Scene3D';
import type { StagePhase } from '../../three/stageAnimator';
import { BrickButton } from '../components/BrickButton';
import { IconBack, IconHome, IconNext, IconReplay, IconSound } from '../components/icons';
import { Noppi } from '../components/Noppi';
import { PartCard } from '../components/PartCard';
import { Progress } from '../components/Progress';
import { useWakeLock } from '../useWakeLock';
import { DonePanel } from './DonePanel';

const PRAISE = ['Super!', 'Toll!', 'Klasse!', 'Prima!', 'Juhu!', 'Spitze!'];

export function Build() {
  const current = useSession((s) => s.current);
  if (!current) return <Redirect to="/ideen" />;
  return <BuildInner creation={current} />;
}

function BuildInner({ creation }: { creation: Creation }) {
  const [, navigate] = useLocation();
  const session = useSession();
  const settings = useSettings();
  const addBuild = useHistory((s) => s.addBuild);
  const steps = useMemo(
    () => groupSteps(creation.placements, creation.order, settings.stepMode),
    [creation, settings.stepMode],
  );
  const [phase, setPhase] = useState<StagePhase>(session.phase);
  const [step, setStep] = useState(Math.min(session.step, steps.length - 1));
  const [ready, setReady] = useState(false);
  const [noppiMood, setNoppiMood] = useState<'idle' | 'cheer' | 'wave'>('wave');
  const cheerTimer = useRef<number>(0);
  useWakeLock(phase !== 'done');

  useEffect(() => {
    session.progress(phase, step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);

  const stepParts = useMemo(
    () => (phase === 'build' ? (steps[step] ?? []).map((i) => creation.placements[i]) : []),
    [phase, step, steps, creation],
  );

  // Ansage zu jedem Schritt
  useEffect(() => {
    if (phase === 'preview') speak(`${creation.name}! Wollen wir das bauen? Drück auf Los!`);
    else if (phase === 'build' && stepParts.length) {
      const first = stepParts[0];
      const what =
        stepParts.length === 1
          ? `Jetzt brauchen wir ${partPhraseAcc(first.part, first.color, first.print)}.`
          : `Jetzt brauchen wir ${numberWord(stepParts.length)} Teile.`;
      speak(settings.countAloud && stepParts.length === 1 ? `${capital(numberWord(step + 1))}! ${what}` : what);
    } else if (phase === 'done') speak('Super gemacht! Du bist ein toller Baumeister!');
    return () => undefined;
  }, [phase, step, stepParts, creation.name, settings.countAloud]);

  useEffect(() => () => stopSpeaking(), []);

  const onLanded = useCallback(
    (s: number) => {
      if (s !== step) return;
      play('klick');
      setReady(true);
      setNoppiMood('cheer');
      window.clearTimeout(cheerTimer.current);
      cheerTimer.current = window.setTimeout(() => setNoppiMood('idle'), 900);
    },
    [step],
  );

  const finish = () => {
    setPhase('done');
    play('fanfare');
    if (!session.recordKey) {
      const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
      session.setRecordKey(addBuild(creation, sticker));
    }
  };

  const next = () => {
    setReady(false);
    if (phase === 'preview') {
      play('whoosh');
      setPhase('build');
      setStep(0);
      return;
    }
    if (phase === 'build') {
      if (step + 1 < steps.length) {
        play('pop');
        setStep(step + 1);
        if ((step + 1) % 5 === 0) setTimeout(() => speak(PRAISE[(step / 5) % PRAISE.length | 0], { interrupt: false }), 50);
      } else finish();
    }
  };

  const back = () => {
    setReady(false);
    play('tap');
    if (phase === 'build' && step > 0) setStep(step - 1);
    else if (phase === 'build') setPhase('preview');
    else if (phase === 'done') {
      setPhase('build');
      setStep(steps.length - 1);
    }
  };

  const restart = () => {
    session.start(creation);
    setPhase('preview');
    setStep(0);
  };

  return (
    <div className={`screen build build--${phase}`} style={{ padding: 0 }}>
      <div className="build-canvas" data-testid="build-canvas">
        <Scene3D camera={{ position: [10, 9, 16], fov: 35 }}>
          <BuildStage
            placements={creation.placements}
            steps={steps}
            phase={phase}
            step={step}
            baseplate={settings.baseplate}
            onLanded={onLanded}
          />
        </Scene3D>
      </div>

      <div className="build-top">
        <BrickButton color="white" size="s" icon={<IconHome size={30} />} onClick={() => navigate('/')} aria-label="Start" testId="home" />
        {phase === 'build' ? (
          <Progress step={step + 1} total={steps.length} />
        ) : (
          <div className="build-title card">
            <span className="emoji">{creation.emoji}</span> {creation.name}
          </div>
        )}
        <BrickButton
          color={settings.sound ? 'white' : 'pink'}
          size="s"
          icon={<IconSound size={30} on={settings.sound} />}
          onClick={() => settings.set({ sound: !settings.sound, voice: !settings.sound })}
          aria-label="Ton an/aus"
          testId="sound"
        />
      </div>

      {phase === 'preview' && (
        <div className="build-bottom preview">
          <div className="build-noppi">
            <Noppi mood="wave" size={120} />
          </div>
          <div className="preview-info card">
            <div className="preview-count">
              <span className="mini-brick" /> {creation.partCount} Teile
            </div>
            {creation.tips.map((t) => (
              <div key={t} className="tip">
                {t}
              </div>
            ))}
          </div>
          <BrickButton color="green" size="xl" studs={4} icon={<IconNext size={54} />} label="Los!" onClick={next} testId="start" className="pulse" />
        </div>
      )}

      {phase === 'build' && (
        <div className="build-bottom">
          <BrickButton color="blue" size="l" icon={<IconBack size={48} />} onClick={back} aria-label="Zurück" testId="back" />
          <PartCard parts={stepParts} />
          <div className="build-noppi small">
            <Noppi mood={noppiMood} size={92} />
          </div>
          <BrickButton
            color="green"
            size="xl"
            studs={4}
            icon={step + 1 >= steps.length ? <span className="emoji">🏁</span> : <IconNext size={56} />}
            onClick={next}
            aria-label="Weiter"
            testId="next"
            className={ready ? 'pulse' : ''}
          />
        </div>
      )}

      {phase === 'done' && (
        <DonePanel
          creation={creation}
          onAgain={restart}
          onNew={() => navigate('/ideen')}
          onBack={back}
          replayIcon={<IconReplay size={40} />}
        />
      )}
    </div>
  );
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const STICKERS = ['⭐', '🦄', '🚀', '🦖', '🌈', '🏆', '🐳', '🎈', '🦁', '🍭', '🐞', '🌻', '🚒', '🐘', '🎉', '👑'];
