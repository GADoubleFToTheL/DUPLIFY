# Duplify – Bauen mit Noppi

Eine fröhliche Web-App für kleine Baumeister: Ihr tragt eure großen Bausteine (Duplo-kompatibel) ein, die App erfindet daraus passende Bauwerke und zeigt sie Schritt für Schritt mit 3D-Animationen vor. Noppi, ein kleiner roter Baustein mit Kulleraugen, begleitet das Kind.

| Start | Ideen | Bauen |
|---|---|---|
| ![Start](docs/screenshots/start.png) | ![Ideen](docs/screenshots/ideen.png) | ![Bauen](docs/screenshots/bauen.png) |

| Fertig! | Steine-Kiste (Eltern) | Handy |
|---|---|---|
| ![Fertig](docs/screenshots/fertig.png) | ![Steine-Kiste](docs/screenshots/steine-kiste.png) | ![Handy](docs/screenshots/handy-ideen.png) |

## Was die App kann

- **Originalgetreue Teile:** Alle Steine sehen aus wie die echten. Die 3D-Modelle und Maße stammen aus der [LDraw.org Parts Library](https://library.ldraw.org) (CC BY 4.0), siehe [Originalteile](#originalteile-ldraw).
- **Steine-Kiste mit dem kompletten Katalog:** Im Eltern-Bereich Farbe wählen und Teile antippen (+1).
  - Es gibt über 550 Teile: alle Duplo-Teile aus LDraw, inklusive bedruckter Steine.
  - Ihr findet sie über „Häufige Teile“, über Kategorien (Steine, Platten, Dach & Schrägen, Bögen, Fenster & Türen, Fahrzeuge, Zug, Gebäude, Pflanzen & Zubehör) oder über die **Suche**: deutsch, englisch oder die Teilenummer, z. B. „2x4“, „Bogen“ oder „3011“.
  - Figuren, Tiere, Wippe und Blume sind gezeichnet, weil es dafür keine Originalmodelle gibt.

  Alles andere legt ihr als **eigenes Teil** mit Foto an.
- **Größen-Regler:** Ihr wählt, wie viele Steine ungefähr verbaut werden: von 3 bis „Alle Steine!“ (Mega-Turm). Das Kind kann auf die Türmchen tippen.
- **21 Baupläne**, die sich an euren Bestand anpassen. Die Zufalls-Skulptur verbaut auch weitere stapelbare Originalteile aus eurer Kiste:

  | Gruppe | Baupläne |
  |---|---|
  | Türme | Turm, Mega-Turm |
  | Häuser | Hochhaus (Fenster, Tür, Dach), Haus, Burg |
  | Tiere | Ente bzw. Entenfamilie, Hund mit Welpen, Giraffe, Schlange, Dino |
  | Fahrzeuge | Auto, Laster, Zug |
  | Fantasie | Rakete, Roboter, Brücke, Treppe, Pyramide, Zufalls-Skulptur |
  | Garten | Mauer, Blumengarten, Spielplatz |

  Jedes Bauwerk wird vor dem Anzeigen geprüft:
  - Alles hält auf mindestens 2 Noppen.
  - Nichts schwebt, nichts kippt.
  - Es werden nie mehr Teile gebraucht, als in der Kiste sind.
- **Bauanleitung in 3D:** Jeder Stein fliegt ein, ein blinkender Geisterstein zeigt den Platz, der Stein landet federnd mit Klick und Sternchen.
  - Eine Stimme sagt an: „Jetzt brauchen wir den großen roten Stein!“ Sie zählt auf Wunsch mit.
  - Die Kamera folgt bei hohen Türmen nach oben.
  - Wischen dreht das Modell.
- **Fertig-Feier:** Konfetti aus Mini-Steinen, das Bauwerk hüpft und dreht sich, Figuren winken. Dazu gibt es einen Sticker und den Knopf „Foto vom echten Bauwerk“.
- **Meine Bauwerke:** Galerie mit Fotos und Sticker-Album, jedes Bauwerk lässt sich nochmal bauen.
- **Kindersicher:**
  - Der Eltern-Bereich öffnet erst, wenn man das Schloss 3 Sekunden hält.
  - Keine Links, keine Werbung, kein Konto.
  - Alle Daten bleiben auf dem Gerät. Export und Import sind im Eltern-Bereich möglich.
- **Offline:** Nach dem ersten Öffnen läuft die App ohne Internet (PWA).

## Auf dem iPad oder Handy benutzen

Die App ist eine **Web-App (PWA)**: kein App Store nötig. Sie wird automatisch auf **GitHub Pages** veröffentlicht:

**https://gadoubleftothel.github.io/DUPLIFY/**

1. **Öffnen und installieren:**
   - iPad/iPhone: die Adresse in Safari öffnen → Teilen → **„Zum Home-Bildschirm“**.
   - Android: in Chrome → Menü → „App installieren“.
2. **Loslegen:**
   1. Das Schloss oben rechts 3 Sekunden halten.
   2. In der **Steine-Kiste** eure Steine eintragen (oder erst die **Beispiel-Kiste** ausprobieren).
   3. Zurück zum Start und auf „Bauen“ tippen.

Jeder Push auf den Branch `claude/exciting-newton-9ub33j` (oder `main`) baut die App neu und veröffentlicht sie; das erledigt der Workflow `.github/workflows/pages.yml`. Die App holt sich die neue Version beim nächsten Öffnen.

Einmalig nötig auf GitHub:
- Das Repo muss **öffentlich** sein (Settings → General → Change visibility).
- Unter Settings → **Pages** muss die Quelle auf **GitHub Actions** stehen.

Soll das Repo privat bleiben, geht es alternativ kostenlos über Netlify: Repo verbinden, die Einstellungen kommen aus `netlify.toml`.

Tipps:
- Ton und Stimme lassen sich in den Einstellungen abschalten.
- Mit einer **Grundplatte** (Einstellungen) kann nichts umkippen.
- Auf dem iPhone schaltet der Stumm-Schalter die Töne ab.

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm install
```

```bash
npm run dev
```

Danach <http://localhost:5173> öffnen. Zum Testen auf dem Tablet im selben WLAN:

```bash
npm run build && npm run preview -- --host
```

Danach `http://<IP-des-Rechners>:4173` öffnen. Installieren als App geht dort nicht, weil die Adresse kein HTTPS hat.

| Befehl | Zweck |
|---|---|
| `npm test` | Unit- und Eigenschafts-Tests der Kernlogik (Vitest) |
| `npm run e2e` | Ende-zu-Ende-Tests im Browser (Playwright, Tablet und Handy, inkl. Offline) |
| `npm run lint` / `npm run typecheck` | Code-Prüfung |
| `npm run icons` | App-Icons neu erzeugen |
| `npm run ldraw -- <complete.zip>` | Originalteile neu umwandeln (siehe unten) |
| `npm run ldraw -- --names` | nur die deutschen Teilenamen neu übersetzen |

Prüfseiten für Entwickler:
- `#/dev/teile` – alle Teile in 3D
- `#/dev/bauen` – Bau-Animation
- `#/dev/rezepte` – alle Baupläne mit der Beispiel-Kiste

### Aufbau

```
src/
  core/        Kernlogik ohne UI (komplett getestet)
    parts/       Teile-Katalog (echte Maße aus LDraw), Suche
    grid.ts      Raster: Noppen und Halb-Ebenen, Drehung
    validate.ts  Überlappung, Halt auf Noppen, Kippen
    steps.ts     Bau-Reihenfolge
    colorSolver  echte Farben aus dem Bestand verteilen
    engine.ts    Ideen erzeugen, Zielgröße treffen, sortieren
    recipes/     21 Baupläne + Baukasten (builder.ts)
  three/       3D: Originalmodelle laden, gezeichnete Figuren, Bau-Animation, Kamera, Konfetti, Vorschaubilder
  ui/          Seiten (Start, Ideen, Bauen, Galerie, Eltern) und Bausteine der Oberfläche
  audio/       synthetische Töne (Web Audio) und Sprachausgabe (de-DE)
  state/       gespeicherte Daten (zustand + localStorage, Fotos in IndexedDB)
```

Technik:
- Vite, React, TypeScript, three.js über `@react-three/fiber`
- zustand, wouter (Hash-Routing)
- vite-plugin-pwa
- Fredoka (OFL-Schrift)

Töne und Licht werden im Code erzeugt. Die App lädt nichts von fremden Servern; die 3D-Modelle kommen von der eigenen Seite und werden nach dem ersten Laden offline gespeichert.

### Originalteile (LDraw)

Die 3D-Modelle, Maße und Noppen-Positionen aller Teile stammen aus der **LDraw.org Parts Library**:
- Lizenz: Creative Commons Attribution 4.0 (CC BY 4.0)
- Namensnennung: In der App unter Eltern-Bereich → „Über & Lizenzen“ und in [`public/ldraw/CREDITS.txt`](public/ldraw/CREDITS.txt). Dort stehen alle Autorinnen und Autoren der verwendeten Teile.

Umwandeln (einmalig; das Ergebnis liegt im Repo):

1. `complete.zip` von <https://library.ldraw.org/library/updates/complete.zip> laden.
2. Den Konverter starten:

   ```bash
   node --max-old-space-size=6144 scripts/ldraw/convert.mjs /pfad/zu/complete.zip
   ```

Der Konverter (`scripts/ldraw/convert.mjs`, Namen in `names.mjs`):
- **Auswahl:** alle Teile, deren Beschreibung mit „Duplo“ beginnt, dazu Türrahmen mit Tür und Fensterrahmen mit Fenster als zusammengesetzte Teile.
- **Geometrie:** wird mit dem `LDrawLoader` von three.js gelesen, also mit richtiger Flächen-Ausrichtung und glatten Kanten.
- **Ausrichtung:** Die Teile werden gedreht (LDraw zählt y nach unten) und auf die Mitte der Grundfläche gesetzt.
- **Speichern:** je Farbgruppe als kompakte Binärdatei, gzip-gepackt: `public/ldraw/parts/<nummer>.dpl`, zusammen ca. 7,5 MB.
- **Maße:** Die Noppen (`stud7`) und Röhren (`stud8`) ergeben Grundfläche, Höhe und Noppenfelder für die Bau-Logik.
- **Katalog:** Alles landet in `src/core/parts/ldraw-catalog.json`, mit deutschen Namen und Kategorien.

In der App:
- Die Modelle werden erst bei Bedarf geladen.
- Die Standardteile speichert der Service Worker vorab, alle anderen nach dem ersten Laden (offline nutzbar).
- Die bekannten Bauplan-Teile (`brick-2x4` usw.) sind in `catalog.ts` mit ihren LDraw-Nummern verknüpft. Alle übrigen Teile heißen `ld-<nummer>`.

## Hinweis

LEGO® und DUPLO® sind Marken der LEGO Gruppe. Duplify ist ein privates Projekt, nicht mit LEGO verbunden und verwendet keine LEGO-Logos (die LDraw-Modelle haben glatte Noppen). Für eine öffentliche Veröffentlichung sollte der Name nochmal geprüft werden.
