import { useMemo, type ReactNode } from 'react';
import type { Placement } from '../../core/types';
import { useModelsReady } from '../../three/ldrawGeometry';
import { modelFilesFor } from '../../three/partFactory';
import { Noppi } from './Noppi';

/** Zeigt den Inhalt erst, wenn alle echten 3D-Modelle geladen sind. */
export function ModelsGate({ placements, children }: { placements: readonly Placement[]; children: ReactNode }) {
  const files = useMemo(() => modelFilesFor(placements), [placements]);
  const ready = useModelsReady(files);
  if (ready) return <>{children}</>;
  return (
    <div className="models-loading" data-testid="models-loading">
      <Noppi mood="think" size={140} />
      <div className="bubble">Noppi holt die Steine …</div>
    </div>
  );
}
