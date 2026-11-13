import { Route, Switch, useLocation } from 'wouter';
import { totalParts } from '../../../core/inventory';
import { useHistory } from '../../../state/historyStore';
import { useInventory } from '../../../state/inventoryStore';
import { BrickButton } from '../../components/BrickButton';
import { IconHome } from '../../components/icons';
import { Backup } from './Backup';
import { CustomParts } from './CustomParts';
import { InventoryEditor } from './InventoryEditor';
import { SettingsScreen } from './Settings';

export function ParentArea() {
  return (
    <Switch>
      <Route path="/kiste" component={InventoryEditor} />
      <Route path="/eigene" component={CustomParts} />
      <Route path="/einstellungen" component={SettingsScreen} />
      <Route path="/sicherung" component={Backup} />
      <Route component={ParentMenu} />
    </Switch>
  );
}

export function ParentTop({ title, back = '/' }: { title: string; back?: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="topbar">
      <BrickButton
        color="white"
        size="s"
        icon={back === '~/' ? <IconHome size={28} /> : <span className="emoji">←</span>}
        onClick={() => navigate(back)}
        aria-label="Zurück"
        testId="parent-back"
      />
      <h1 className="title">{title}</h1>
      <span style={{ width: 64 }} />
    </div>
  );
}

function ParentMenu() {
  const [, navigate] = useLocation();
  const counts = useInventory((s) => s.counts);
  const custom = useInventory((s) => s.custom);
  const loadSample = useInventory((s) => s.loadSample);
  const builds = useHistory((s) => s.builds);
  const total = totalParts(counts);
  return (
    <div className="screen parent">
      <ParentTop title="Eltern-Bereich" back="~/" />
      <div className="scroll parent-body">
        <div className="parent-grid">
          <button className="parent-tile card" onClick={() => navigate('/kiste')} data-testid="to-inventory">
            <span className="tile-emoji">🧺</span>
            <span className="tile-title">Steine-Kiste</span>
            <span className="tile-sub">{total === 0 ? 'Noch leer – jetzt Steine eintragen' : `${total} Teile eingetragen`}</span>
          </button>
          <button className="parent-tile card" onClick={() => navigate('/eigene')} data-testid="to-custom">
            <span className="tile-emoji">📷</span>
            <span className="tile-title">Eigene Teile</span>
            <span className="tile-sub">{custom.length ? `${custom.length} eigene Teile` : 'Wippen, Tiere & Co. mit Foto anlegen'}</span>
          </button>
          <button className="parent-tile card" onClick={() => navigate('/einstellungen')} data-testid="to-settings">
            <span className="tile-emoji">⚙️</span>
            <span className="tile-title">Einstellungen</span>
            <span className="tile-sub">Ton, Stimme, Schritte, Grundplatte</span>
          </button>
          <button className="parent-tile card" onClick={() => navigate('/sicherung')} data-testid="to-backup">
            <span className="tile-emoji">💾</span>
            <span className="tile-title">Datensicherung</span>
            <span className="tile-sub">{builds.length} Bauwerke · Export &amp; Import</span>
          </button>
        </div>
        {total === 0 && (
          <div className="card parent-hint">
            <b>Tipp:</b> Zum Ausprobieren gibt es eine Beispiel-Kiste mit ca. 170 typischen Teilen.
            <BrickButton color="yellow" size="s" label="Beispiel-Kiste laden" onClick={loadSample} testId="load-sample" />
          </div>
        )}
        <div className="parent-note">
          Alle Daten bleiben auf diesem Gerät – kein Konto, keine Werbung, kein Tracking.
          <br />
          LEGO® und DUPLO® sind Marken der LEGO Gruppe. Duplify ist ein privates Projekt und nicht mit LEGO verbunden.
        </div>
      </div>
    </div>
  );
}
