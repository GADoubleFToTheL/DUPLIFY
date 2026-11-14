import { useMemo, useState } from 'react';
import { SAMPLE_PLACEMENTS } from '../../../core/samples';
import { buildOrder, groupSteps } from '../../../core/steps';
import { BuildStage } from '../../../three/BuildStage';
import { Scene3D } from '../../../three/Scene3D';
import type { StagePhase } from '../../../three/stageAnimator';
import { ModelsGate } from '../../components/ModelsGate';

/** Entwickler-Seite: Bau-Animation mit einem Beispiel-Bauwerk. */
export function DevBuild() {
  const placements = SAMPLE_PLACEMENTS;
  const steps = useMemo(() => groupSteps(placements, buildOrder(placements), 'single'), [placements]);
  const [phase, setPhase] = useState<StagePhase>('preview');
  const [step, setStep] = useState(0);
  const [landed, setLanded] = useState(-1);
  const next = () => {
    if (phase === 'preview') {
      setPhase('build');
      setStep(0);
    } else if (phase === 'build') {
      if (step + 1 >= steps.length) setPhase('done');
      else setStep(step + 1);
    }
  };
  const back = () => {
    if (phase === 'build' && step > 0) setStep(step - 1);
    else if (phase === 'done') {
      setPhase('build');
      setStep(steps.length - 1);
    }
  };
  return (
    <div className="screen" style={{ padding: 0 }}>
      <ModelsGate placements={placements}>
        <Scene3D>
          <BuildStage placements={placements} steps={steps} phase={phase} step={step} onLanded={setLanded} />
        </Scene3D>
      </ModelsGate>
      <div className="row" style={{ position: 'absolute', bottom: 16, left: 16, right: 16, justifyContent: 'space-between' }}>
        <button className="brick-btn c-blue" onClick={back} data-testid="back">
          ◀
        </button>
        <div className="card" style={{ padding: '10px 16px' }} data-testid="status">
          {phase} · Schritt {step + 1}/{steps.length} · gelandet {landed + 1}
        </div>
        <button className="brick-btn c-purple" onClick={() => setPhase('preview')}>
          Vorschau
        </button>
        <button className="brick-btn c-green" onClick={next} data-testid="next">
          Weiter ▶
        </button>
      </div>
    </div>
  );
}
