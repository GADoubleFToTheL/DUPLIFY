import { useRef, useState } from 'react';
import { cleanCounts, totalParts } from '../../../core/inventory';
import type { CustomPartSpec } from '../../../core/parts/catalog';
import { useHistory, type BuildRecord } from '../../../state/historyStore';
import { useInventory } from '../../../state/inventoryStore';
import { useSettings, type Settings } from '../../../state/settingsStore';
import { BrickButton } from '../../components/BrickButton';
import { ParentTop } from './ParentArea';

interface BackupFile {
  app: 'duplify';
  version: 1;
  date: string;
  inventory: { counts: Record<string, number>; custom: CustomPartSpec[] };
  settings: Partial<Settings>;
  history: { builds: BuildRecord[]; stickers: string[] };
}

export function makeBackup(): BackupFile {
  const inv = useInventory.getState();
  const st = useSettings.getState();
  const hist = useHistory.getState();
  return {
    app: 'duplify',
    version: 1,
    date: new Date().toISOString(),
    inventory: { counts: inv.counts, custom: inv.custom },
    settings: {
      sound: st.sound,
      voice: st.voice,
      countAloud: st.countAloud,
      stepMode: st.stepMode,
      baseplate: st.baseplate,
      allowSwap: st.allowSwap,
      target: st.target,
    },
    history: { builds: hist.builds.map((b) => ({ ...b, photoId: undefined })), stickers: hist.stickers },
  };
}

export function restoreBackup(data: unknown): string {
  const b = data as Partial<BackupFile>;
  if (!b || b.app !== 'duplify' || !b.inventory) throw new Error('Das ist keine Duplify-Sicherung.');
  useInventory.getState().replaceAll(cleanCounts(b.inventory.counts ?? {}), b.inventory.custom ?? []);
  if (b.settings) useSettings.getState().set(b.settings);
  if (b.history) useHistory.setState({ builds: b.history.builds ?? [], stickers: b.history.stickers ?? [] });
  return `${totalParts(useInventory.getState().counts)} Teile wiederhergestellt.`;
}

export function Backup() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([JSON.stringify(makeBackup(), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duplify-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg('Sicherung erstellt.');
  };
  return (
    <div className="screen parent">
      <ParentTop title="Datensicherung" />
      <div className="scroll parent-body">
        <div className="card settings">
          <div className="setting">
            <span className="grow">
              <b>Sicherung speichern</b>
              <span className="subtle small block">Steine-Kiste, eigene Teile, Einstellungen und Bauwerke als Datei (ohne Fotos).</span>
            </span>
            <BrickButton color="green" size="s" label="Exportieren" onClick={download} testId="export" />
          </div>
          <div className="setting">
            <span className="grow">
              <b>Sicherung laden</b>
              <span className="subtle small block">Ersetzt die aktuellen Daten auf diesem Gerät.</span>
            </span>
            <BrickButton color="blue" size="s" label="Importieren" onClick={() => file.current?.click()} testId="import" />
          </div>
          {msg && <div className="parent-msg">{msg}</div>}
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              if (!window.confirm('Aktuelle Daten durch die Sicherung ersetzen?')) return;
              setMsg(restoreBackup(JSON.parse(await f.text())));
            } catch (err) {
              setMsg(err instanceof Error ? err.message : 'Die Datei konnte nicht gelesen werden.');
            }
          }}
        />
      </div>
    </div>
  );
}
