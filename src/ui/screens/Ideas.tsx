import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { generateIdeas, maxTarget } from '../../core/engine';
import { totalParts } from '../../core/inventory';
import type { Creation } from '../../core/types';
import { useHistory } from '../../state/historyStore';
import { useInventory } from '../../state/inventoryStore';
import { useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { BrickButton } from '../components/BrickButton';
import { CategoryChips } from '../components/CategoryChips';
import { Clouds } from '../components/Clouds';
import { IdeaCard } from '../components/IdeaCard';
import { IconDice, IconHome } from '../components/icons';
import { Noppi } from '../components/Noppi';
import { SizeSlider } from '../components/SizeSlider';

export function Ideas() {
  const [, navigate] = useLocation();
  const counts = useInventory((s) => s.counts);
  const loadSample = useInventory((s) => s.loadSample);
  const settings = useSettings();
  const { ideasSeed, newSeed, category, setCategory, start } = useSession();
  const builds = useHistory((s) => s.builds);
  const picks = useHistory((s) => s.picks);
  const addPick = useHistory((s) => s.addPick);
  const max = maxTarget(counts);
  const target = Math.min(settings.target, max);
  const empty = totalParts(counts) === 0;
  const [spin, setSpin] = useState(0);

  const ideas: Creation[] = useMemo(
    () =>
      empty
        ? []
        : generateIdeas({
            counts,
            target,
            seed: ideasSeed,
            baseplate: !!settings.baseplate,
            allowSwap: settings.allowSwap,
            category,
            history: builds.map((b) => b.creation.recipeId),
            favorites: picks,
            count: 6,
          }),
    // Verlauf/Lieblinge sollen die Liste nicht während des Ansehens umsortieren
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts, target, ideasSeed, settings.baseplate, settings.allowSwap, category, empty],
  );

  const choose = (c: Creation) => {
    addPick(c.category);
    start(c);
    navigate('/bauen');
  };

  return (
    <div className="screen ideas">
      <Clouds />
      <div className="topbar">
        <BrickButton color="white" size="s" studs={2} icon={<IconHome size={30} />} onClick={() => navigate('/')} aria-label="Start" testId="home" />
        <h1 className="title">Was bauen wir?</h1>
        <BrickButton
          color="orange"
          size="s"
          studs={2}
          icon={<IconDice size={32} className={spin ? 'spin' : ''} />}
          label="Neue Ideen"
          onClick={() => {
            newSeed();
            setSpin((s) => s + 1);
          }}
          disabled={empty}
          testId="new-ideas"
          key={spin}
        />
      </div>
      {empty ? (
        <div className="empty-state">
          <Noppi mood="think" size={180} />
          <div className="bubble">Ich kenne eure Steine noch nicht!</div>
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <BrickButton color="blue" size="m" label="Steine eintragen" onClick={() => navigate('/eltern')} testId="to-parents" />
            <BrickButton color="yellow" size="m" label="Beispiel-Kiste ausprobieren" onClick={loadSample} testId="load-sample" />
          </div>
        </div>
      ) : (
        <>
          <div className="ideas-controls">
            <SizeSlider value={target} max={max} onChange={(v) => settings.set({ target: v })} />
            <CategoryChips value={category} onChange={setCategory} />
          </div>
          <div className="ideas-grid scroll" data-testid="ideas-grid">
            {ideas.map((c, i) => (
              <IdeaCard key={c.id} creation={c} index={i} onSelect={() => choose(c)} />
            ))}
            {ideas.length === 0 && (
              <div className="empty-state small">
                <Noppi mood="think" size={140} />
                <div className="bubble">Dafür fehlen uns Steine. Probier eine andere Größe!</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
