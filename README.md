# Sara i Pau · Ens casem!

Base estàtica d’una invitació de boda, íntegrament en valencià, preparada per a GitHub Pages. Inclou inici, detalls de la boda i la nostra història.

El disseny seguix [la referència de Sienna Studio](https://siennastudio.my.canva.site/whimsical-red-hand-drawn-005-demo). Es conserven les fotos de demostració, les fonts i les il·lustracions originals. Els elements rojos es mostren amb la paleta verda; els blancs, negres, grocs i les fotografies es conserven. No s’inclouen scripts, formularis incrustats ni el peu de plataforma de Canva.

## Obrir en local

Amb Node.js 22 o posterior (recomanat: 24):

```sh
npm run dev
```

Obri `http://127.0.0.1:4173`. No cal instal·lar dependències per a executar el web, preparar-lo ni passar les proves bàsiques. Cal servir-lo per HTTP perquè utilitza mòduls JavaScript; obrir l’HTML amb doble clic no és suficient.

## Personalitzar

Edita [assets/js/content.js](assets/js/content.js): noms, data, lloc, horaris, data límit de resposta, contactes, textos, història, acompanyants, allotjaments i fotografies. Les dades actuals són exemples; els correus `sara@example.com` i `pau@example.com` no són contactes reals.

Les fotos estan en `assets/photos/`. Pots substituir-les o canviar-ne els noms en `photos`, dins del fitxer de continguts. Els textos alternatius de les imatges estan en `assets/js/app.js`; adapta’ls quan substituïsques les fotografies. Els títols i les descripcions per als cercadors estan en els tres fitxers HTML.

La llista de regals mostra un missatge provisional. Per a activar-ne l’enllaç, assigna una adreça HTTPS a `registry.url`. El mapa és una il·lustració local, sense cartografia incrustada; l’enllaç només obri Google Maps quan la persona el prem.

La paleta i l’adaptació a mòbil estan en `assets/css/site.css`. Les il·lustracions utilitzen màscares CSS per a recolorir el traç sense pintar-ne els espais transparents. El blanc continua blanc. Els textos menuts i els botons amb lletres blanques utilitzen variants fosques per a assegurar-ne el contrast. La font manuscrita del fons de la història és decorativa; el relat complet es pot llegir en els tres capítols.

## RSVP: només una prova local

El formulari valida nom i cognoms, assistència i nombre enter positiu d’assistents. Si la resposta és afirmativa, apareixen els camps de nombre i necessitats alimentàries. També permet deixar un missatge, revisar la confirmació i editar-la.

**No envia ni guarda cap resposta.** Les dades només viuen en el formulari mentre la pàgina està oberta; en recarregar es reinicien. No utilitza cookies, `localStorage`, `sessionStorage`, analítica, API ni cap servei de formularis. La política de contingut de les tres pàgines bloqueja connexions de dades (`connect-src 'none'`) i enviaments de formularis (`form-action 'none'`). Les fonts i els recursos visuals són locals.

Quan es connecte un servei real més avant, caldrà implementar el transport en `assets/js/rsvp.js` i revisar eixa política explícitament. La validació actual és per a la demostració; no substituïx la validació que necessitarà el servei futur.

## Comprovacions

```sh
npm test
npm run build
npm run preview
```

El resultat publicable queda en `dist/`: només les tres pàgines, els recursos i `.nojekyll`.

Per a executar també les proves de navegador:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

En macOS amb Google Chrome instal·lat, la prova l’utilitza automàticament i pots ometre la instal·lació de Chromium. En altres sistemes amb Chrome pots usar `BROWSER_CHANNEL=chrome npm run test:browser`.

Les proves de navegador comproven les tres pàgines a 1366, 820, 390 i 320 píxels, els recursos locals, la navegació, les àncores, el teclat i el flux de l’RSVP sense peticions ni persistència. Es proven dins de `/SaraPau/` per a reproduir les rutes de GitHub Pages. Per a comprovar també el resultat publicable i guardar captures:

```sh
SITE_ROOT=dist SCREENSHOTS_DIR=test-results npm run test:browser
```

## Publicar en GitHub Pages

1. Puja el projecte a la branca `main` del repositori `SaraPau`.
2. En GitHub, entra en **Settings → Pages → Build and deployment → Source** i tria **GitHub Actions**.
3. Executa el workflow **Publica la invitació en GitHub Pages**, o fes un nou push a `main`.

El workflow comprova el codi, prepara `dist/` i el publica. L’adreça prevista per al repositori actual és `https://e1d8.github.io/SaraPau/`. Totes les rutes internes són relatives; també funcionen si canvies el nom del repositori o uses un domini propi.

La configuració està preparada al repositori; esta entrega no activa Pages ni fa cap push automàticament.
