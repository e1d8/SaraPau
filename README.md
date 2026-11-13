# Sara i Pau · Ens casem!

Landing estàtica d’una invitació de boda, íntegrament en valencià, preparada per a GitHub Pages. Tota la invitació està en una única pàgina, sense navbar ni botó de tornar a l’inici.

El disseny partix de [la referència de Sienna Studio](https://siennastudio.my.canva.site/whimsical-red-hand-drawn-005-demo). Utilitza el principal `#636B2F` i els secundaris `#BAC095`, `#D4DE95` i `#3D4127`, conservant els fons blancs. Totes les fotografies, fonts i il·lustracions del projecte es conserven en `assets/`, incloses les que ja no es mostren. No s’inclouen scripts, formularis incrustats ni el peu de plataforma de Canva.

L’ordre de la landing és: obertura i il·lustració de la taula, programa amb els horaris i les localitzacions, confirmació, faroles amb la frase de comiat i l’IBAN, i peu «Algun dubte? Sara · Pau». Les adreces antigues `detalls.html` i `historia.html` redirigixen a la landing.

## Obrir en local

Amb Node.js 22 o posterior (recomanat: 24):

```sh
npm run dev
```

Obri `http://127.0.0.1:4173`. No cal instal·lar dependències per a executar el web, preparar-lo ni passar les proves bàsiques. Cal servir-lo per HTTP perquè utilitza mòduls JavaScript; obrir l’HTML amb doble clic no és suficient.

## Personalitzar

Edita [assets/js/content.js](assets/js/content.js): noms, data, lloc, horaris i programa. El text inicial està en `home.opening`, la frase de comiat en `home.farewell` i el compte bancari en `bankAccount`. Els noms i telèfons de WhatsApp del peu provenen de `contacts`; els telèfons s’escriuen amb el prefix internacional, sense espais ni el signe `+`. La data actual continua sent de demostració.

Les fotografies estan en `assets/photos/` i les il·lustracions en `assets/illustrations/`. Els camps de contingut de les seccions anteriors s’han conservat per si es recuperen més avant; no es mostren en la landing actual. El títol i la descripció per als cercadors estan en `index.html`.

Les localitzacions estan en `places` i el programa en `timeline`. Cada fragment del programa pot ser un text o una referència `{ place: 'lluisos' }`, que es mostra com un enllaç a Google Maps amb l’adreça corresponent. No hi ha mapa incrustat ni secció «Com arribar-hi».

L’IBAN té un botó de còpia que es transforma en un tick. En tornar a passar-hi el cursor, reapareix la icona de copiar; en prémer o clicar, es mostra el tick. Utilitza el porta-retalls del navegador, amb una alternativa per selecció si no està disponible. Si el navegador impedix les dos opcions, mostra un missatge per a copiar-lo manualment.

La paleta i l’adaptació a mòbil estan en `assets/css/site.css`. Les il·lustracions utilitzen màscares CSS per a recolorir el traç sense pintar-ne els espais transparents. El blanc continua blanc.

## RSVP: només una prova local

La confirmació permet afegir diversos invitats en una graella de cinc columnes. El botó `+` obri el formulari en una finestra modal. Cada resposta guardada genera un botó amb les tres primeres lletres del nom i un llapis per a editar-la. «Guardar resposta» mostra el resum i «Continuar» tanca la finestra. Tancar una resposta sense guardar descarta només els canvis d’eixa finestra.

El formulari exigix nom i cognoms i una resposta a «Mos acompanyaràs?». Si la resposta és afirmativa, cal triar una de les quatre opcions de bus de `busOptions`; el camp d’al·lèrgies, intoleràncies o dieta és opcional. En canviar a «No», estos camps es netegen i es desactiven. El recordatori dels camps obligatoris només es mostra després d’intentar guardar amb camps pendents.

«Enviar respostes» apareix després de guardar el primer invitat. En prémer-lo, una pantalla modal de càrrega bloqueja el web. Ara `simulateSendReplies` confirma la recepció després d’un segon, sense cap petició. L’èxit mostra el cor i «Gràcies»; si no hi ha recepció en deu segons, s’avorta l’enviament i l’error substituïx la graella i el botó. En els dos casos, no es pot tornar a enviar fins a recarregar, tampoc tornant a la pàgina des de l’historial.

**No transmet ni guarda les respostes de manera persistent.** La llista d’invitats només viu en memòria mentre la pàgina està oberta; en recarregar es reinicia. No utilitza cookies, `localStorage`, `sessionStorage`, analítica, API ni cap servei de formularis. La política de contingut de la landing bloqueja connexions de dades (`connect-src 'none'`) i enviaments de formularis (`form-action 'none'`). Les fonts i els recursos visuals són locals.

Quan es connecte un servei real més avant, caldrà substituir la simulació en `assets/js/rsvp.js` i revisar eixa política explícitament. El transport rep la llista de respostes i un `AbortSignal`, i ha de resoldre amb `{ received: true }` només quan es confirme la recepció. `sendRepliesWithTimeout` aplica el límit de deu segons i ignora confirmacions tardanes. La validació del navegador no substituïx la validació que necessitarà el servei futur.

## Comprovacions

```sh
npm test
npm run build
npm run preview
```

El resultat publicable queda en `dist/`: la landing, les dos redireccions de compatibilitat, tots els recursos i `.nojekyll`.

Per a executar també les proves de navegador:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

En macOS amb Google Chrome instal·lat, la prova l’utilitza automàticament i pots ometre la instal·lació de Chromium. En altres sistemes amb Chrome pots usar `BROWSER_CHANNEL=chrome npm run test:browser`.

Les proves de navegador comproven la landing a 1366, 820, 390 i 320 píxels, l’ordre de les seccions, els textos, la paleta, els recursos locals, les redireccions, el teclat i el flux de l’RSVP sense peticions ni persistència. Es proven dins de `/SaraPau/` per a reproduir les rutes de GitHub Pages. Per a comprovar també el resultat publicable i guardar captures:

```sh
SITE_ROOT=dist SCREENSHOTS_DIR=test-results npm run test:browser
```

## Publicar en GitHub Pages

1. Puja el projecte a la branca `main` del repositori `SaraPau`.
2. En GitHub, entra en **Settings → Pages → Build and deployment → Source** i tria **GitHub Actions**.
3. Executa el workflow **Publica la invitació en GitHub Pages**, o fes un nou push a `main`.

El workflow comprova el codi, prepara `dist/` i el publica. L’adreça prevista per al repositori actual és `https://e1d8.github.io/SaraPau/`. Totes les rutes internes són relatives; també funcionen si canvies el nom del repositori o uses un domini propi.

La configuració està preparada al repositori; esta entrega no activa Pages ni fa cap push automàticament.
