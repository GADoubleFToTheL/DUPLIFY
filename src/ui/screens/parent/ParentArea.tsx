import { useLocation } from 'wouter';
import { useInventory } from '../../../state/inventoryStore';
import { totalParts } from '../../../core/inventory';
import { BrickButton } from '../../components/BrickButton';
import { IconHome } from '../../components/icons';

/** Eltern-Bereich (vorläufig: Beispiel-Kiste laden). */
export function ParentArea() {
  const [, navigate] = useLocation();
  const { counts, loadSample, clear } = useInventory();
  return (
    <div className="screen parent">
      <div className="topbar">
        <BrickButton color="white" size="s" icon={<IconHome size={30} />} onClick={() => navigate('~/')} aria-label="Start" />
        <h1 className="title">Eltern-Bereich</h1>
        <span />
      </div>
      <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
        <div>Steine in der Kiste: {totalParts(counts)}</div>
        <div className="row">
          <BrickButton color="yellow" label="Beispiel-Kiste laden" onClick={loadSample} testId="load-sample" />
          <BrickButton color="red" label="Kiste leeren" onClick={clear} />
        </div>
      </div>
    </div>
  );
}
