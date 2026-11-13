import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { play } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { totalParts } from '../../core/inventory';
import { surprise } from '../../core/engine';
import { useHistory } from '../../state/historyStore';
import { useInventory } from '../../state/inventoryStore';
import { useSession } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import { BrickButton } from '../components/BrickButton';
import { Clouds, Hill } from '../components/Clouds';
import { IconBrick, IconDice, IconLock, IconStar } from '../components/icons';
import { Logo } from '../components/Logo';
import { Noppi } from '../components/Noppi';
import { HoldToOpen } from '../components/HoldToOpen';
import { useIdle } from '../useIdle';

const GIGGLES = ['Hihi, das kitzelt!', 'Hallo du!', 'Lass uns was bauen!', 'Ich bin Noppi!', 'Juhu!', 'Bauen macht Spaß!'];

export function Home() {
  const [, navigate] = useLocation();
  const counts = useInventory((s) => s.counts);
  const empty = totalParts(counts) === 0;
  const settings = useSettings();
  const builds = useHistory((s) => s.builds);
  const start = useSession((s) => s.start);
  const idle = useIdle(40000);
  const [cheer, setCheer] = useState(false);
  const giggle = useRef(0);
  const greeted = useRef(false);
  const onNoppi = () => {
    play('boing');
    speak(greeted.current ? GIGGLES[giggle.current++ % GIGGLES.length] : empty ? 'Hallo! Ich bin Noppi. Zeigt mir zuerst eure Steine!' : 'Hallo! Ich bin Noppi. Was bauen wir heute?');
    greeted.current = true;
    setCheer(true);
    window.setTimeout(() => setCheer(false), 1200);
  };

  const onSurprise = () => {
    const c = surprise({
      counts,
      target: settings.target,
      seed: Math.floor(Math.random() * 1e9),
      baseplate: !!settings.baseplate,
      allowSwap: settings.allowSwap,
      history: builds.map((b) => b.creation.recipeId),
    });
    if (!c) {
      navigate('/ideen');
      return;
    }
    start(c);
    navigate('/bauen');
  };

  return (
    <div className="screen home">
      <Clouds />
      <Hill />
      <div className="home-top">
        <Logo />
        <HoldToOpen onOpen={() => navigate('/eltern')} label="Eltern: 3 Sekunden halten">
          <IconLock size={26} />
        </HoldToOpen>
      </div>
      <div className="home-main">
        <div className="home-noppi">
          <div className="bubble">{idle ? 'Zzz … tipp mich an!' : empty ? 'Hallo! Zeigt mir zuerst eure Steine!' : 'Hallo! Was bauen wir heute?'}</div>
          <Noppi mood={idle ? 'sleep' : cheer ? 'cheer' : 'wave'} size={230} onClick={onNoppi} />
        </div>
        <div className="home-buttons">
          <BrickButton color="green" size="xl" studs={4} label="Bauen" icon={<IconBrick size={64} />} onClick={() => navigate('/ideen')} testId="go-ideas" />
          <BrickButton
            color="orange"
            size="l"
            studs={3}
            label="Überraschung"
            icon={<IconDice size={44} />}
            onClick={onSurprise}
            disabled={empty}
            testId="go-surprise"
          />
          <BrickButton color="purple" size="l" studs={3} label="Meine Bauwerke" icon={<IconStar size={42} />} onClick={() => navigate('/bauwerke')} testId="go-gallery" />
        </div>
      </div>
    </div>
  );
}
