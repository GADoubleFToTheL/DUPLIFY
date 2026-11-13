import { useRef } from 'react';
import { play } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { useHistory } from '../../state/historyStore';
import { savePhoto } from '../../state/photoDb';
import { BrickButton } from './BrickButton';
import { IconCamera } from './icons';

/** Öffnet die Kamera, um das echte Bauwerk zu fotografieren. */
export function PhotoButton({ recordKey }: { recordKey: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const setPhoto = useHistory((s) => s.setPhoto);
  const hasPhoto = useHistory((s) => !!s.builds.find((b) => b.key === recordKey)?.photoId);
  return (
    <>
      <BrickButton
        color="pink"
        size="m"
        icon={<IconCamera size={38} />}
        label={hasPhoto ? 'Neues Foto' : 'Foto'}
        onClick={() => input.current?.click()}
        disabled={!recordKey}
        testId="photo"
      />
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !recordKey) return;
          const id = await savePhoto(file);
          setPhoto(recordKey, id);
          play('sparkle');
          speak('Tolles Foto!');
        }}
      />
    </>
  );
}
