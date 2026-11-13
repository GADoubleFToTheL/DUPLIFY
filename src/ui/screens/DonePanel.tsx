import type { ReactNode } from 'react';
import type { Creation } from '../../core/types';
import { useHistory } from '../../state/historyStore';
import { useSession } from '../../state/sessionStore';
import { BrickButton } from '../components/BrickButton';
import { IconBack } from '../components/icons';
import { Noppi } from '../components/Noppi';
import { PhotoButton } from '../components/PhotoButton';

interface Props {
  creation: Creation;
  onAgain: () => void;
  onNew: () => void;
  onBack: () => void;
  replayIcon: ReactNode;
}

/** „Super gemacht!“ – mit Sticker, Foto-Knopf und weiteren Ideen. */
export function DonePanel({ creation, onAgain, onNew, onBack, replayIcon }: Props) {
  const recordKey = useSession((s) => s.recordKey);
  const record = useHistory((s) => s.builds.find((b) => b.key === recordKey));
  return (
    <div className="done-layer" data-testid="done">
      <div className="done-panel card">
        <div className="done-noppi">
          <Noppi mood="cheer" size={130} />
        </div>
        <div className="done-text">
          <div className="done-title">Super gemacht!</div>
          <div className="done-sub">
            {creation.emoji} {creation.name} ist fertig.
          </div>
        </div>
        {record && (
          <div className="sticker-reveal" aria-label="Neuer Sticker">
            <span>{record.sticker}</span>
          </div>
        )}
      </div>
      <div className="done-buttons">
        <BrickButton color="blue" size="m" icon={<IconBack size={36} />} onClick={onBack} aria-label="Zurück" testId="done-back" />
        <PhotoButton recordKey={recordKey} />
        <BrickButton color="yellow" size="m" icon={replayIcon} label="Nochmal" onClick={onAgain} testId="again" />
        <BrickButton color="green" size="l" studs={3} icon={<span className="emoji">💡</span>} label="Neue Idee" onClick={onNew} testId="new-idea" />
      </div>
    </div>
  );
}
