import type { ReactNode } from 'react';
import { speak, voiceAvailable } from '../../../audio/voice';
import { play } from '../../../audio/sfx';
import { useHistory } from '../../../state/historyStore';
import { useSettings } from '../../../state/settingsStore';
import { BrickButton } from '../../components/BrickButton';
import { ParentTop } from './ParentArea';

function Toggle({ label, hint, value, onChange, testId }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="setting">
      <span className="grow">
        <b>{label}</b>
        {hint && <span className="subtle small block">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`switch ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        data-testid={testId}
      >
        <span className="knob" />
      </button>
    </label>
  );
}

function Segments<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segments">
      {options.map((o) => (
        <button key={o.id} className={`seg ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PLATES = ['keine', '8x12', '12x16', '16x16', '16x24', '24x24'] as const;

export function SettingsScreen() {
  const s = useSettings();
  const clearHistory = () => {
    if (!window.confirm('Alle gespeicherten Bauwerke und Sticker löschen?')) return;
    useHistory.setState({ builds: [], stickers: [], picks: {} });
  };
  const plate = s.baseplate ? `${s.baseplate.w}x${s.baseplate.l}` : 'keine';
  return (
    <div className="screen parent">
      <ParentTop title="Einstellungen" />
      <div className="scroll parent-body">
        <div className="card settings">
          <Toggle label="Töne" hint="Klick beim Landen, Fanfare am Ende" value={s.sound} onChange={(sound) => s.set({ sound })} testId="set-sound" />
          <Toggle
            label="Stimme"
            hint={voiceAvailable() ? 'Sagt an, welcher Stein als Nächstes kommt' : 'Dieses Gerät hat keine Sprachausgabe'}
            value={s.voice}
            onChange={(voice) => s.set({ voice })}
            testId="set-voice"
          />
          <div className="setting">
            <span className="grow" />
            <BrickButton color="blue" size="s" label="Stimme testen" onClick={() => speak('Hallo! Jetzt brauchen wir den großen roten Stein.')} />
          </div>
          <Toggle label="Mitzählen" hint="Die Stimme zählt die Steine: „Eins! Zwei! Drei!“" value={s.countAloud} onChange={(countAloud) => s.set({ countAloud })} />
          <div className="setting">
            <span className="grow">
              <b>Schritte</b>
              <span className="subtle small block">Ein Teil pro Schritt ist ideal für Kleine.</span>
            </span>
            <Segments
              value={s.stepMode}
              options={[
                { id: 'single', label: '1 Teil' },
                { id: 'layer', label: 'Ganze Schicht' },
              ]}
              onChange={(stepMode) => s.set({ stepMode })}
            />
          </div>
          <div className="setting">
            <span className="grow">
              <b>Grundplatte</b>
              <span className="subtle small block">Mit Grundplatte kann nichts umkippen.</span>
            </span>
            <select
              className="select"
              value={plate}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'keine') s.set({ baseplate: null });
                else {
                  const [w, l] = v.split('x').map(Number);
                  s.set({ baseplate: { w, l } });
                }
                play('tap');
              }}
            >
              {PLATES.map((p) => (
                <option key={p} value={p}>
                  {p === 'keine' ? 'Keine (Boden)' : `${p} Noppen`}
                </option>
              ))}
            </select>
          </div>
          <Toggle
            label="Farben tauschen"
            hint="Ente in Blau statt Gelb? Erlaubt mehr Ideen mit euren Steinen."
            value={s.allowSwap}
            onChange={(allowSwap) => s.set({ allowSwap })}
          />
        </div>
        <div className="card settings">
          <div className="setting">
            <span className="grow">
              <b>Bauwerke &amp; Sticker</b>
              <span className="subtle small block">Löscht die Galerie „Meine Bauwerke“.</span>
            </span>
            <BrickButton color="red" size="s" label="Zurücksetzen" onClick={clearHistory} />
          </div>
        </div>
      </div>
    </div>
  );
}
