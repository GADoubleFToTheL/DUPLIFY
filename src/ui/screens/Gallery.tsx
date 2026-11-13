import { useState } from 'react';
import { useLocation } from 'wouter';
import { play } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { useHistory, type BuildRecord } from '../../state/historyStore';
import { deletePhoto } from '../../state/photoDb';
import { useSession } from '../../state/sessionStore';
import { useThumbnail } from '../../three/useThumbnail';
import { BrickButton } from '../components/BrickButton';
import { Clouds } from '../components/Clouds';
import { IconClose, IconHome, IconReplay } from '../components/icons';
import { Noppi } from '../components/Noppi';
import { PhotoButton } from '../components/PhotoButton';
import { usePhoto } from '../usePhoto';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

function BuildCard({ rec, onOpen, index }: { rec: BuildRecord; onOpen: () => void; index: number }) {
  const thumb = useThumbnail(rec.creation.id, () => rec.creation.placements, { size: 320 });
  const photo = usePhoto(rec.photoId);
  return (
    <button className="idea-card card gallery-card" onClick={onOpen} style={{ animationDelay: `${index * 50}ms` }} data-testid="gallery-card">
      <div className="idea-thumb">
        {photo ? <img className="gallery-photo" src={photo} alt="" /> : thumb ? <img src={thumb} alt="" /> : null}
        {photo && thumb && <img className="gallery-inset" src={thumb} alt="" />}
        <span className="gallery-sticker">{rec.sticker}</span>
      </div>
      <div className="idea-name">{rec.creation.name}</div>
      <div className="idea-meta">{formatDate(rec.date)}</div>
    </button>
  );
}

function Detail({ rec, onClose }: { rec: BuildRecord; onClose: () => void }) {
  const [, navigate] = useLocation();
  const start = useSession((s) => s.start);
  const removeBuild = useHistory((s) => s.removeBuild);
  const thumb = useThumbnail(rec.creation.id, () => rec.creation.placements, { size: 320 });
  const photo = usePhoto(rec.photoId);
  return (
    <div className="modal" role="dialog" aria-label={rec.creation.name} onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          <IconClose size={28} />
        </button>
        <div className="detail-images">
          {photo && <img className="detail-photo" src={photo} alt="Foto vom Bauwerk" />}
          {thumb && <img className="detail-thumb" src={thumb} alt="" />}
        </div>
        <div className="detail-title">
          {rec.sticker} {rec.creation.name}
        </div>
        <div className="subtle">
          {formatDate(rec.date)} · {rec.creation.partCount} Teile
        </div>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <BrickButton
            color="green"
            size="m"
            icon={<IconReplay size={34} />}
            label="Nochmal bauen"
            onClick={() => {
              start(rec.creation);
              navigate('/bauen');
            }}
            testId="rebuild"
          />
          <PhotoButton recordKey={rec.key} />
          <BrickButton
            color="white"
            size="s"
            label="Löschen"
            onClick={() => {
              if (!window.confirm('Dieses Bauwerk löschen?')) return;
              if (rec.photoId) void deletePhoto(rec.photoId);
              removeBuild(rec.key);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Meine Bauwerke: alles, was schon gebaut wurde – mit Fotos und Stickern. */
export function Gallery() {
  const [, navigate] = useLocation();
  const builds = useHistory((s) => s.builds);
  const stickers = useHistory((s) => s.stickers);
  const [open, setOpen] = useState<string | null>(null);
  const current = builds.find((b) => b.key === open);
  return (
    <div className="screen gallery">
      <Clouds />
      <div className="topbar">
        <BrickButton color="white" size="s" icon={<IconHome size={30} />} onClick={() => navigate('/')} aria-label="Start" testId="home" />
        <h1 className="title">Meine Bauwerke</h1>
        <span style={{ width: 64 }} />
      </div>
      {stickers.length > 0 && (
        <div className="sticker-album card" aria-label={`${stickers.length} Sticker`}>
          {stickers.slice(-40).map((s, i) => (
            <button
              key={i}
              className="album-sticker"
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => {
                play('boing');
              }}
            >
              {s}
            </button>
          ))}
          <span className="album-count">{stickers.length} ⭐</span>
        </div>
      )}
      {builds.length === 0 ? (
        <div className="empty-state">
          <Noppi mood="think" size={170} onClick={() => speak('Noch nichts gebaut. Los gehts!')} />
          <div className="bubble">Hier landen alle Bauwerke, die du fertig gebaut hast!</div>
          <BrickButton color="green" size="l" label="Jetzt bauen" onClick={() => navigate('/ideen')} />
        </div>
      ) : (
        <div className="ideas-grid scroll">
          {builds.map((rec, i) => (
            <BuildCard key={rec.key} rec={rec} index={i} onOpen={() => setOpen(rec.key)} />
          ))}
        </div>
      )}
      {current && <Detail rec={current} onClose={() => setOpen(null)} />}
    </div>
  );
}
