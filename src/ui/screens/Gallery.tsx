import { useLocation } from 'wouter';
import { BrickButton } from '../components/BrickButton';
import { IconHome } from '../components/icons';

/** Meine Bauwerke (vorläufig). */
export function Gallery() {
  const [, navigate] = useLocation();
  return (
    <div className="screen">
      <div className="topbar">
        <BrickButton color="white" size="s" icon={<IconHome size={30} />} onClick={() => navigate('/')} aria-label="Start" />
        <h1 className="title">Meine Bauwerke</h1>
        <span />
      </div>
    </div>
  );
}
