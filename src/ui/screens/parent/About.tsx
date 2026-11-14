import { LDRAW_PARTS, PARTS } from '../../../core/parts/catalog';
import { ParentTop } from './ParentArea';

const BASE = import.meta.env.BASE_URL;

/** Über Duplify: Herkunft der 3D-Modelle (Namensnennung nach CC BY 4.0), Marken, Datenschutz. */
export function About() {
  const realParts = PARTS.filter((p) => p.ldraw).length + LDRAW_PARTS.length;
  const drawn = PARTS.filter((p) => p.drawn).map((p) => p.name);
  return (
    <div className="screen parent">
      <ParentTop title="Über & Lizenzen" />
      <div className="scroll parent-body about" data-testid="about">
        <section className="card about-card">
          <h2>Duplify</h2>
          <p>
            Bau-Ideen aus euren eigenen Steinen – mit animierten Schritt-für-Schritt-Anleitungen. Ein privates Projekt ohne Konto, Werbung
            oder Tracking: Alle Daten bleiben auf diesem Gerät.
          </p>
        </section>
        <section className="card about-card">
          <h2>3D-Modelle der Teile</h2>
          <p>
            Die {realParts} originalgetreuen Teile stammen aus der{' '}
            <a href="https://library.ldraw.org" target="_blank" rel="noopener noreferrer">
              LDraw.org Parts Library
            </a>{' '}
            und stehen unter der Lizenz{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener noreferrer">
              Creative Commons Namensnennung 4.0 (CC BY 4.0)
            </a>
            .
          </p>
          <p>
            Änderungen durch Duplify: in ein kompaktes Format umgewandelt, gedreht und verschoben, Tür- und Fensterrahmen mit ihrem Einsatz
            zusammengesetzt, Namen automatisch ins Deutsche übersetzt.
          </p>
          <p>
            <a href={`${BASE}ldraw/CREDITS.txt`} target="_blank" rel="noopener noreferrer" data-testid="credits-link">
              Alle Autorinnen und Autoren der Teile ansehen
            </a>
          </p>
          <p className="small">Von Duplify gezeichnet (kein Originalmodell vorhanden): {drawn.join(', ')}.</p>
        </section>
        <section className="card about-card">
          <h2>Marken</h2>
          <p>
            LEGO® und DUPLO® sind Marken der LEGO Gruppe. Duplify ist nicht mit der LEGO Gruppe verbunden und wird von ihr weder unterstützt
            noch gesponsert.
          </p>
        </section>
        <section className="card about-card">
          <h2>Schrift & Bibliotheken</h2>
          <p className="small">
            Schrift „Fredoka“ (SIL Open Font License 1.1). Gebaut mit Open-Source-Bibliotheken, u. a. React, three.js, React Three Fiber,
            Motion, zustand und fflate (MIT), idb-keyval (Apache 2.0) und wouter (Unlicense).
          </p>
        </section>
      </div>
    </div>
  );
}
