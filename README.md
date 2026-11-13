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

L’IBAN té un botó de còpia que es transforma en un tick. El tick, la creu, el cor i la icona de copiar són gràfics SVG amb traç manuscrit i el color del text. En tornar a passar-hi el cursor, reapareix la icona de copiar; en prémer o clicar, es mostra el tick. Utilitza el porta-retalls del navegador, amb una alternativa per selecció si no està disponible. Si el navegador impedix les dos opcions, mostra un missatge per a copiar-lo manualment.

La paleta i l’adaptació a mòbil estan en `assets/css/site.css`. Les il·lustracions utilitzen màscares CSS per a recolorir el traç sense pintar-ne els espais transparents. El blanc continua blanc.

Les animacions d’entrada estan en `assets/js/motion.js`; les del formulari i les icones, en el CSS. En entrar per l’inici, la benvinguda presenta primer els noms, després la data i després el missatge, durant uns dos segons. La resta d’elements espera fins al final i apareix quan arriba a la pantalla. Les entrades es mostren una sola vegada, conserven l’espai dels elements i no requerixen cap llibreria. El focus de teclat permet saltar la benvinguda i revela el contingut immediatament. La preferència de moviment reduït desactiva les animacions, també si es canvia mentre el web està obert.

## RSVP: només una prova local

La confirmació permet afegir diversos invitats en una graella de cinc columnes. El botó `+` obri el formulari en una finestra modal. Cada resposta guardada genera un botó amb les tres primeres lletres del nom i un llapis per a editar-la. «Guardar resposta» mostra el resum i «Continuar» tanca la finestra. Tancar una resposta sense guardar descarta només els canvis d’eixa finestra.

El formulari exigix nom i cognoms i una resposta a «Mos acompanyaràs?». Si la resposta és afirmativa, cal triar una de les quatre opcions de bus de `busOptions`; el camp d’al·lèrgies, intoleràncies o dieta és opcional. En canviar a «No», estos camps es netegen i es desactiven. El recordatori dels camps obligatoris només es mostra després d’intentar guardar amb camps pendents.

Els camps de text creixen automàticament d’una a quatre línies, també en editar una resposta o canviar l’amplària de la finestra. Si el text ocupa més espai, es pot desplaçar dins del camp. Les barres de desplaçament de la pàgina, les finestres i els camps compartixen colors i acabats. La barra principal se superposa al contingut sense fons ni espai reservat al lateral, de manera que la il·lustració també es veu per davall. Es pot arrossegar, i el desplaçament de roda, teclat i tàctil continua sent natiu. En obrir una finestra modal s’oculta la barra principal i s’utilitza la barra més fina del pop-up.

«Enviar respostes» apareix després de guardar el primer invitat. En prémer-lo, una pantalla modal de càrrega bloqueja el web. Ara `simulateSendReplies` confirma la recepció després d’un segon, sense cap petició. L’èxit mostra «Confirmació ✔» i «Gràcies ♡»; si no hi ha recepció en deu segons, s’avorta l’enviament, el títol passa a «Confirmació ✘» i l’error substituïx la graella i el botó. En els dos casos, no es pot tornar a enviar fins a recarregar, tampoc tornant a la pàgina des de l’historial.

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

## Previsualització en compartir

Les tres adreces HTML inclouen metadades [Open Graph](https://ogp.me/) i Twitter Card directament en la capçalera, sense dependre de JavaScript: títol «Sara ∞ Pau», descripció «9 d'octubre de 2027» i imatge `assets/social/cupid.png`. La descripció de compartició és independent de la data visible configurada en `content.js`.

La imatge és una exportació de `assets/illustrations/cupid.svg`, en verd oliva sobre fons blanc, en PNG de 1200 × 630 píxels. Per a regenerar-la després de canviar el vector o el color principal, amb les dependències de desenvolupament i Chrome/Chromium instal·lats:

```sh
npm run render:share
```

Les adreces de la imatge i de la pàgina són HTTPS absolutes. El workflow utilitza l’adreça que proporciona GitHub Pages; en construir fora de GitHub, es pot indicar una altra amb `SITE_URL=https://el-teu-domini.example/ npm run build`. Per defecte s’utilitza `https://e1d8.github.io/SaraPau/`.

Cal publicar els fitxers nous, inclòs el PNG, perquè les aplicacions puguen llegir-los. Les proves locals comproven l’HTML inicial i la imatge amb agents de WhatsApp i Telegram; no substituïxen una comprovació dins de les aplicacions contra la versió publicada. Les previsualitzacions que estes aplicacions ja hagen guardat poden tardar a actualitzar-se.
