import { useRef, useState } from 'react';
import { variantKey } from '../../../core/inventory';
import type { CustomPartSpec } from '../../../core/parts/catalog';
import { useInventory } from '../../../state/inventoryStore';
import { toSmallDataUrl } from '../../../state/photoDb';
import { BrickButton } from '../../components/BrickButton';
import { IconCamera, IconMinus, IconPlus } from '../../components/icons';
import { ParentTop } from './ParentArea';

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="stepper">
      <span>{label}</span>
      <span className="row">
        <button type="button" className="inv-minus" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label} kleiner`}>
          <IconMinus size={16} />
        </button>
        <b className="inv-count">{value}</b>
        <button type="button" className="inv-minus" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label} größer`}>
          <IconPlus size={16} />
        </button>
      </span>
    </label>
  );
}

const EMPTY = { name: '', w: 2, l: 2, heightBricks: 1, count: 1, photo: undefined as string | undefined };

/** Eigene Teile: alles, was der Katalog nicht kennt – mit Foto, Größe und Anzahl. */
export function CustomParts() {
  const { custom, counts, saveCustom, removeCustom, setCount } = useInventory();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const save = () => {
    if (!form.name.trim()) return;
    const id = editing ?? `custom-${Date.now().toString(36)}`;
    const spec: CustomPartSpec = { id, name: form.name.trim(), w: form.w, l: form.l, heightBricks: form.heightBricks, photo: form.photo };
    saveCustom(spec);
    setCount(variantKey(id, null), form.count);
    setForm(EMPTY);
    setEditing(null);
  };

  return (
    <div className="screen parent">
      <ParentTop title="Eigene Teile" />
      <div className="scroll parent-body">
        <div className="card custom-form">
          <div className="custom-photo" onClick={() => file.current?.click()} role="button" aria-label="Foto aufnehmen">
            {form.photo ? <img src={form.photo} alt="" /> : <IconCamera size={48} />}
          </div>
          <div className="custom-fields">
            <input
              className="text-input"
              placeholder="Name, z. B. Wippe, Kuh, Rutsche"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={30}
              data-testid="custom-name"
            />
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Stepper label="Breite (Noppen)" value={form.w} min={1} max={12} onChange={(w) => setForm({ ...form, w })} />
              <Stepper label="Tiefe (Noppen)" value={form.l} min={1} max={12} onChange={(l) => setForm({ ...form, l })} />
              <Stepper label="Höhe (Steine)" value={form.heightBricks} min={1} max={6} onChange={(heightBricks) => setForm({ ...form, heightBricks })} />
              <Stepper label="Anzahl" value={form.count} min={0} max={50} onChange={(count) => setForm({ ...form, count })} />
            </div>
            <div className="row">
              <BrickButton color="green" size="s" label={editing ? 'Speichern' : 'Hinzufügen'} onClick={save} disabled={!form.name.trim()} testId="custom-save" />
              {editing && <BrickButton color="white" size="s" label="Abbrechen" onClick={() => (setForm(EMPTY), setEditing(null))} />}
            </div>
            <div className="subtle small">
              Eigene Teile setzt die App als Deko obendrauf ein (z. B. eine Figur auf dem Turm).
            </div>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) setForm({ ...form, photo: await toSmallDataUrl(f) });
            }}
          />
        </div>
        <div className="custom-list">
          {custom.map((c) => (
            <div key={c.id} className="card custom-item">
              {c.photo ? <img src={c.photo} alt="" /> : <div className="custom-ph">🎁</div>}
              <div className="grow">
                <b>{c.name}</b>
                <div className="subtle small">
                  {c.w}×{c.l} Noppen · {c.heightBricks} hoch · {counts[variantKey(c.id, null)] ?? 0}×
                </div>
              </div>
              <BrickButton
                color="white"
                size="s"
                label="Ändern"
                onClick={() => {
                  setEditing(c.id);
                  setForm({ name: c.name, w: c.w, l: c.l, heightBricks: c.heightBricks, count: counts[variantKey(c.id, null)] ?? 0, photo: c.photo });
                }}
              />
              <BrickButton
                color="red"
                size="s"
                label="Löschen"
                onClick={() => {
                  if (window.confirm(`„${c.name}“ löschen?`)) removeCustom(c.id);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
