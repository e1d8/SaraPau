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

Edita [assets/js/content.js](assets/js/content.js): noms, data, lloc, horaris i programa. El text inicial està en `home.opening`, la frase de comiat en `home.farewell` i el compte bancari en `bankAccount`. Els noms i telèfons de WhatsApp del peu provenen de `contacts`; els telèfons s’escriuen amb el prefix internacional, sense espais ni el signe `+`. La data de la boda és el 9 d’octubre de 2027.

Les fotografies estan en `assets/photos/` i les il·lustracions en `assets/illustrations/`. Els camps de contingut de les seccions anteriors s’han conservat per si es recuperen més avant; no es mostren en la landing actual. El títol i la descripció per als cercadors estan en `index.html`.

Les localitzacions estan en `places` i el programa en `timeline`. Cada fragment del programa pot ser un text o una referència `{ place: 'lluisos' }`, que es mostra com un enllaç a Google Maps amb l’adreça corresponent. Les referències amb `link: false` es mostren com a text sense enllaç. No hi ha mapa incrustat ni secció «Com arribar-hi».

`home.farewell` es mostra entre el programa i «Vindràs?». `home.giftMessage` és la frase de regal situada damunt del compte bancari i utilitza la tipografia dels títols del programa, com «La celebració». En mòbil, cada etapa del programa mostra el text centrat i la seua imatge davall.

L’IBAN té un botó de còpia que es transforma en un tick. El tick, la creu, el cor i la icona de copiar són gràfics SVG amb traç manuscrit i el color del text. En tornar a passar-hi el cursor, reapareix la icona de copiar; en prémer o clicar, es mostra el tick. Utilitza el porta-retalls del navegador, amb una alternativa per selecció si no està disponible. Si el navegador impedix les dos opcions, mostra un missatge per a copiar-lo manualment.

La paleta i l’adaptació a mòbil estan en `assets/css/site.css`. Les il·lustracions utilitzen màscares CSS per a recolorir el traç sense pintar-ne els espais transparents. El blanc continua blanc.

Les animacions d’entrada estan en `assets/js/motion.js`; les del formulari i les icones, en el CSS. En entrar per l’inici, els noms apareixen lletra a lletra, amb fade, creixement, un rebot suau i una cortina de gradient. Cada lletra i la màscara disposen d’un marge invisible d’un em per costat per deixar espai als ornaments durant el rebot. Les mateixes capes de lletres es conserven en acabar, tant als noms com al missatge: no se substituïxen per text pla, cosa que canviaria l’espaiat i els salts de línia. Les posicions dels noms es recalculen quan canvia l’amplària de la pantalla. La data entra mentre acaba el rebot, i després el missatge s’escriu lletra a lletra, amb pauses en la puntuació. La seqüència dura uns cinc segons i bloqueja el desplaçament fins al final. El missatge queda baix de la data i conserva l’altura mentre s’escriu. La resta d’elements espera fins al final i apareix quan arriba a la pantalla, en ordre de lectura, amb 250 ms entre inicis i entrades de 450 ms. La cua només considera elements encara visibles, i es cancel·la en activar moviment reduït o imprimir. `assets/js/navigation.js` desactiva la restauració de scroll: cada recàrrega comença dalt, també si l’URL contenia una àncora. Les entrades es mostren una sola vegada, conserven l’espai dels elements i no requerixen cap llibreria. El focus de teclat permet saltar la benvinguda i revela el contingut immediatament. La preferència de moviment reduït desactiva les animacions, també si es canvia mentre el web està obert.

El botó «Vindràs?» té Cupido flotant damunt i a l’esquerra i sis cors decoratius que naixen del botó, pugen i esclaten. Les animacions es reutilitzen sense afegir elements contínuament. Només funcionen quan el botó està en pantalla, la pestanya està visible i no hi ha cap finestra oberta. Cupido es conserva estàtic i els cors s’oculten amb moviment reduït. La decoració no captura clics ni forma part de la navegació amb teclat.

## RSVP: Google Sheets

La secció de confirmació mostra només «Vindràs?». El botó obri una finestra titulada «Invitats», amb la descripció «Afegix la resposta de tots els invitats del teu cercle», el llistat d’invitats, el botó `+` i «Enviar respostes 💌→», deshabilitat fins que hi haja alguna resposta. La `x` del gestor tanca la finestra i conserva els invitats guardats fins a recarregar. La `x` d’una alta o edició descarta només els canvis pendents d’eixe invitat i torna al gestor, conservant totes les respostes ja guardades. La tecla Escape seguix el mateix comportament. Cada formulari es titula «Invitat 1», «Invitat 2», etc. El botó «→» guarda la resposta i pregunta «Voleu respondre per un altre invitat?», sense botó de tancar: «Sí» inicia el següent invitat i «No» torna al llistat. Cada resposta ocupa una fila amb el nom complet (retallat amb punts suspensius si no cap), un llapis per editar i una paperera per eliminar. Clicar l’àrea del nom també obri l’edició, i es pot activar amb teclat. El nom complet queda disponible en editar i com a descripció dels controls. El botó `+` ocupa una fila completa al final del llistat. La paperera obri «Borrar l’invitat?» amb el nom: «Sí» elimina només eixa resposta pendent i «No», la `x` o Escape conserven la llista. La numeració i el resum s’actualitzen i eliminar l’últim invitat desactiva l’enviament; en editar, «Guardar modificacions» torna directament al llistat.

El formulari exigix nom i cognoms i una resposta a «Mos acompanyaràs?». Si la resposta és afirmativa, cal triar una de les quatre opcions de bus de `busOptions`; el camp d’al·lèrgies, intoleràncies o dieta és opcional. En canviar a «No», estos camps es netegen i es desactiven. El recordatori dels camps obligatoris només es mostra després d’intentar guardar amb camps pendents.

Les finestres de llistat, formulari i revisió aprofiten l’altura disponible amb 16 px de marge i una amplària màxima de 800 px. Les capçaleres i la `x` queden fora del contingut desplaçable. En el gestor també queda fixa la descripció; en els formularis, només es desplacen els camps. Els botons de confirmació conserven les majúscules i minúscules del seu text, compartixen el ressaltat verd clar `#D4DE95`, la mida de lletra i els marges de «Vindràs?», amb l’amplària ajustada al text i al límit de la finestra.

Els camps de text creixen automàticament d’una a quatre línies, també en editar una resposta o canviar l’amplària de la finestra. Si el text ocupa més espai, es pot desplaçar dins del camp. Les barres de desplaçament de la pàgina, les finestres i els camps compartixen colors i acabats. La barra principal se superposa al contingut sense fons ni espai reservat al lateral, de manera que la il·lustració també es veu per davall. Es pot arrossegar, i el desplaçament de roda, teclat i tàctil continua sent natiu. En obrir una finestra modal s’oculta la barra principal i s’utilitza la barra més fina del pop-up.

«Enviar respostes 💌→» s’activa després de guardar el primer invitat. En prémer-lo, apareix un resum de totes les respostes en una àrea desplaçable. El títol «Resum de respostes» queda en la mateixa fila que la `x`, fora de l’àrea desplaçable. La `x` i «Enviar 💌→» es mantenen visibles: la `x` torna al gestor per a revisar les respostes i «Enviar 💌→» inicia l’enviament. Només aleshores una pantalla modal de càrrega bloqueja el web i s’envien totes les respostes a Google Apps Script. Quan rep una confirmació vàlida, el web tanca les finestres i substituïx Cupido i «Vindràs?» per «Respostes enviades» amb text bàsic, «Gràcies» amb la tipografia de les etapes del programa, i un cor negre amb batecs cada cinc segons. L’èxit es manté fins a recarregar. Els reintents sense canvis reutilitzen l’identificador del lot; editar les respostes genera un identificador nou. Si no arriba en trenta segons, mostra l’error; tancar-lo i prémer «Vindràs?» torna al llistat i permet editar i reintentar. Una execució ja iniciada en Google pot acabar guardant després del timeout: cal revisar el full abans de repetir un enviament.

La finestra d’error mostra «Error :(» en la capçalera i el missatge habitual. «Mostrar error» desplega el codi, l’error tècnic original i la data i hora; «Ocultar error» torna a plegar-los. «Descarregar error (.txt)» genera un fitxer local amb el mateix diagnòstic: la resposta completa de Google en JSON o la traça original de l’error del navegador. No s’hi afegixen el formulari ni la configuració; el text del mateix error es conserva literalment. Els detalls es poden consultar i descarregar mentre està oberta la finestra d’error. Tancar i tornar a prémer «Vindràs?» recupera el llistat per a editar o reintentar. El contingut llarg es desplaça dins de la finestra amb la capçalera fixa. Apps Script retorna actualment el codi d’error; les seues traces internes només apareixeran en el diagnòstic si el servidor les inclou en la resposta. Les traces actuals continuen en els registres d’Apps Script; consultar-lo o descarregar-lo no transmet dades ni inicia cap enviament.

**Configuració completa:** [docs/google-sheets.md](docs/google-sheets.md). Inclou la creació del Google Sheet, l’autorització i publicació de l’Apps Script, el desplegable de bus i les fórmules de recompte. El codi per a Google està en [google-apps-script/Code.gs](google-apps-script/Code.gs) i el manifest en [google-apps-script/appsscript.json](google-apps-script/appsscript.json). `setupSpreadsheet` crea les dos pestanyes visibles, «Invitats» i «Recompte», amb una fila per invitat i exactament les cinc columnes demanades.

En [assets/js/rsvp-config.js](assets/js/rsvp-config.js), copia l’URL pública acabada en `/exec` i deixa `mode: 'google'`. L’URL ha de correspondre a una implementació activa; si falta o falla, no se simula un èxit. `mode: 'demo'` activa explícitament la simulació local d’un segon per a provar la interfície sense transmetre dades.

Les respostes pendents viuen només en memòria al navegador. No hi ha cookies, `localStorage`, `sessionStorage` ni analítica del projecte. Amb el mode Google, les respostes enviades es guarden en el teu full privat; la seua persistència ja no depén de la pàgina oberta. No es carreguen recursos de Google fins a prémer el botó d’enviar. La política de contingut manté `connect-src 'none'` i permet únicament el POST i el marc de resposta dels dominis d’Apps Script.

El servidor valida les dades, serialitza l’escriptura amb `LockService`, confirma amb `flush()` i utilitza identificadors de petició per recuperar reintents de la mateixa petició sense duplicar files. El navegador comprova l’origen, el marc emissor, l’identificador i el nombre d’invitats de la recepció.

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

Les proves de navegador comproven la landing a 1366, 820, 390 i 320 píxels, l’ordre de les seccions, els textos, la paleta, els recursos locals, les redireccions, el teclat i el flux de l’RSVP en mode demo sense peticions ni persistència al navegador, i el transport Google amb respostes simulades de la plataforma. Les proves del servidor executen el codi d’Apps Script amb dobles de Google Sheets; la prova final contra el teu compte es descriu en la guia de configuració. Es proven dins de `/SaraPau/` per a reproduir les rutes de GitHub Pages. Per a comprovar també el resultat publicable i guardar captures:

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

Les icones de carta, fletxa, paperera, cor i còpia es definixen en `assets/js/icons.js` com a vectors amb traç irregular i extrems redons. Les icones dels botons són decoratives; els controls mantenen noms accessibles.

En mòbil i dispositius tàctils, les àrees desplaçables i els camps llargs mostren ombres als extrems amb contingut ocult. S’actualitzen en desplaçar, escriure, canviar de finestra o redimensionar, sense afegir controls ni ocupar espai. La pàgina conserva la seua barra superposada sempre visible.
