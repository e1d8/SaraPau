# Configurar les confirmacions en Google Sheets

El web ja té el transport preparat. Falta crear el Google Sheet, publicar l’Apps Script en el teu compte i copiar la seua URL en `assets/js/rsvp-config.js`. Amb `mode: 'google'` i l’URL buida, l’enviament falla: no es mostra un èxit fictici.

## 1. Crear el full i el projecte

1. Crea un Google Sheet buit amb el nom que vulgues, per exemple **Boda Sara i Pau — Confirmacions**.
2. Mantín el full **privat**. Comparteix-lo només amb les persones que hagen de consultar les respostes.
3. Dins del full, obri **Extensions → Apps Script**. Això crea un projecte vinculat al document; no cal copiar l’ID del full manualment.
4. Substituïx el contingut de `Code.gs` pel de [google-apps-script/Code.gs](../google-apps-script/Code.gs).
5. En **Configuració del projecte**, activa l’opció de mostrar `appsscript.json` en l’editor. Substituïx el manifest pel de [google-apps-script/appsscript.json](../google-apps-script/appsscript.json).
6. Guarda el projecte.

El manifest utilitza el motor V8, la zona horària `Europe/Madrid` i el permís d’accés a Google Sheets. No necessites crear credencials d’API, configurar un servidor propi ni activar facturació.

## 2. Preparar les pestanyes

En el selector de funcions d’Apps Script, tria **`setupSpreadsheet`** i prem **Executar**. Google et demanarà autorització: revisa i autoritza el projecte que acabes de crear amb el compte propietari del full. Si un compte d’empresa impedix autoritzar-lo o publicar-lo per a qualsevol persona, caldrà que l’administració ho permeta o utilitzar un compte que ho admeta.

Esta funció crea o configura les dos pestanyes següents. Es pot executar de nou i conserva les respostes d’`Invitats`; actualitza les fórmules d’`Recompte`.

### Invitats

| Columna | Capçalera | Tipus i comportament |
| --- | --- | --- |
| A | Nom | Text del nom i cognoms. |
| B | Asistirà | Booleà real `TRUE` / `FALSE`, mostrat com una casella. |
| C | Bus | Desplegable d’una opció: `No`, `Anada`, `Anada+Tornada(00:00)`, `Anada+Tornada(02:00)`. |
| D | Menu especial | Text de les al·lèrgies, intoleràncies o dieta. |
| E | Timestamp | Data i hora generades per Google, mostrades com `dd/MM/yyyy HH:mm:ss`, en horari de Madrid. |

La fila 1 conté les capçaleres i queda immobilitzada. Cada invitat ocupa una fila diferent, també si no assistix. Les persones que no assistixen es guarden amb `Bus = No` i menú buit. Tots els invitats d’un mateix enviament compartixen timestamp.

### Recompte

| Indicador | Què compta |
| --- | --- |
| Assistents a la boda | Files amb `Asistirà = TRUE`. |
| Bus d’anada | Assistents amb `Anada`, `Anada+Tornada(00:00)` o `Anada+Tornada(02:00)`. |
| Bus de tornada (00:00) | Assistents amb `Anada+Tornada(00:00)`. |
| Bus de tornada (02:00) | Assistents amb `Anada+Tornada(02:00)`. |

El recompte es calcula amb fórmules i s’actualitza també si corregixes manualment una assistència o una opció de bus. No s’inclouen les persones que no assistixen. La configuració escriu les fórmules automàticament; no cal traduir-les ni introduir-les a mà.

No canvies els noms d’estes dos pestanyes, l’ordre de les columnes ni les capçaleres sense modificar també el codi. No s’afigen columnes tècniques ni una tercera pestanya: les reserves d’enviament es guarden en les propietats privades del projecte.

## 3. Revisar l’origen del web

Al principi de `Code.gs`, `allowedOrigins` conté:

```js
allowedOrigins: ['https://e1d8.github.io'],
```

És l’origen del web actual: **sense** `/SaraPau/` i sense barra final. Si utilitzes un domini propi, substituïx-lo o afig-lo a la llista.

Per a provar el servei real des de `npm run dev`, afig temporalment l’origen local:

```js
allowedOrigins: ['https://e1d8.github.io', 'http://127.0.0.1:4173'],
```

`http://localhost:4173` és un origen diferent; només cal afegir-lo si utilitzes eixa adreça. Després de canviar el codi, publica una nova versió de la implementació.

## 4. Publicar Apps Script

1. Prem **Implementar / Deploy → Nova implementació**.
2. Tria el tipus **Aplicació web / Web app**.
3. En **Executar com**, tria **Jo**, el compte propietari que has autoritzat.
4. En **Qui té accés**, tria **Qualsevol persona / Anyone**, també persones sense iniciar sessió. Els invitats no han d’autoritzar el teu projecte ni entrar al seu compte de Google.
5. Prem **Implementar** i copia la **URL de l’aplicació web**, amb esta forma:

   ```text
   https://script.google.com/macros/s/IDENTIFICADOR_DE_LA_IMPLEMENTACIO/exec
   ```

6. Obri eixa URL en una finestra privada del navegador. Ha de mostrar «Servei RSVP de Sara i Pau actiu. Protocol 1.», sense demanar iniciar sessió. Esta comprovació només verifica que l’aplicació és accessible; el guardat s’ha de provar en el pas següent.

Utilitza `/exec`, no `/dev`, la URL de l’editor, l’ID del projecte ni l’adreça del Google Sheet. Publica una única aplicació d’este projecte: `LockService.getScriptLock()` protegix les execucions del mateix projecte.

Quan actualitzes `Code.gs`, entra en **Implementar → Gestionar implementacions → Editar → Nova versió → Implementar**. Això conserva la URL i no obliga a canviar el web. Guardar el codi en l’editor, per si sol, no actualitza la versió pública.

## 5. Connectar el web

Edita [assets/js/rsvp-config.js](../assets/js/rsvp-config.js):

```js
export const rsvpConfig = Object.freeze({
  endpoint: 'https://script.google.com/macros/s/IDENTIFICADOR_DE_LA_IMPLEMENTACIO/exec',
  mode: 'google',
});
```

Després executa `npm run build` i publica el web amb el flux habitual de GitHub Pages. Si només ho proves en local, `npm run dev` ja llig el fitxer actualitzat.

`mode: 'demo'` permet provar la interfície sense enviar dades. S’ha de seleccionar explícitament; no hi ha canvi automàtic a simulació si Google falla. Per a les invitacions reals, deixa `mode: 'google'`.

L’URL `/exec` serà visible en el JavaScript públic: no és una contrasenya. El full continua privat. La llista d’orígens determina on s’envia la confirmació, però no autentica les persones: un endpoint anònim pot rebre peticions manuals. El servidor valida el contingut i limita cada enviament a 50 invitats.

## 6. Prova completa

És preferible utilitzar primer un full i una implementació de proves. Des del web, afig cinc invitats ficticis:

1. Assistix i no necessita bus.
2. Assistix i tria només anada.
3. Assistix i tria anada i tornada a les 00:00.
4. Assistix i tria anada i tornada a les 02:00.
5. No assistix.

Prem **Enviar respostes** i comprova:

- El web mostra l’èxit després de rebre la confirmació de Google.
- `Invitats` té cinc files noves amb les cinc columnes en l’ordre indicat.
- `Asistirà` conté booleans, `Bus` mostra les opcions del desplegable i `Timestamp` és una data real.
- `Recompte` mostra **4 assistents, 3 d’anada, 1 de tornada a les 00:00 i 1 de tornada a les 02:00**.

El botó **→** (o **Guardar modificacions** en editar) només incorpora l’invitat a la llista temporal dins de la finestra «Vindràs?». El botó **Enviar respostes 💌→** obri el resum; les dades s’envien juntes només després de prémer **Enviar 💌→** en eixa revisió. En recarregar es reinicia la interfície, però les files guardades en Google es conserven.

## Guardat, recepció i errors

El servidor valida tots els invitats abans d’escriure. Dins del bloqueig reserva les files i fa un únic `setValues()` per al cercle. Confirma l’èxit després de `SpreadsheetApp.flush()`. Els textos que podrien interpretar-se com una fórmula es guarden com a text literal.

Cada enviament té un identificador aleatori. Repetir **la mateixa petició amb el mateix identificador** no duplica les files; una execució interrompuda pot recuperar la reserva. Una recàrrega genera un enviament nou amb un identificador nou: no és una deduplicació de persones pel nom. Per això no s’han de tornar a enviar respostes ja guardades.

La pantalla de càrrega conserva el límit de trenta segons. Si no arriba confirmació, es tanca el transport i es mostra l’error; la interfície queda bloquejada fins a recarregar. **Tancar l’espera del navegador no pot parar una execució que Google ja haja començat:** davant d’un timeout, comprova `Invitats` abans de fer un enviament nou. Una recepció tardana s’ignora en el navegador.

Si falla la configuració, revisa:

- URL correcta acabada en `/exec`, mode `google` i nova versió desplegada.
- Accés anònim de l’aplicació web i execució com a propietari.
- `setupSpreadsheet` executat i permisos concedits.
- Origen del web inclòs en `allowedOrigins`.
- Pestanyes i capçaleres intactes.
- **Execucions** en Apps Script: es registra un codi d’error, sense noms ni informació alimentària.

### Si no s’ha guardat cap fila

Executa **`diagnoseSetup`** des de l’editor d’Apps Script. Només llig la configuració i el full: no crea invitats. Ha de mostrar `status: "OK"`, amb l’origen correcte i les posicions de les respostes. Si dona `NOT_CONFIGURED`, torna a executar `setupSpreadsheet`. Si dona un error de permisos, revisa l’autorització i que l’aplicació s’execute com el propietari correcte.

Per a vore el resultat, tria `diagnoseSetup` al selector del costat d’**Executar**, executa-la i obri **Registre d’execució / Execution log** en la barra superior de l’editor. La llista **Execucions** del menú lateral només indica l’estat general, com ara «Completed»; no és el resultat del diagnòstic.

`destinationMatchesActiveSpreadsheet: true` confirma que el destí configurat correspon al full vinculat que estàs revisant. `WRONG_SPREADSHEET` indica que la configuració apunta a un altre document. Este diagnòstic no escriu res.

- `guestCount`, `firstGuestRow` i `lastGuestRow` compten i localitzen les files amb nom. Comprova eixes files en `Invitats`, incloent les ocultes o filtrades.
- `lastDataRow` és l’última fila amb algun valor, incloses les caselles amb `FALSE`: **no és el nombre d’invitats**. `checkboxOnlyRows` compta les files buides que només tenen la casella desmarcada i, opcionalment, bus `No`.
- `nextWriteRow` és la primera fila disponible per a un invitat nou. Un cercle més gran pot necessitar un altre espai amb totes les files consecutives lliures.
- `nextReservedRow` és el punter conservat per compatibilitat amb versions anteriors; ja no decidix on començar a escriure.

Si una versió anterior mostra `lastDataRow: 1004` i `nextReservedRow: 1005`, comprova també `A1001:E1004`: podria haver guardat les respostes molt avall. Les caselles buides també podien fer que el codi saltara al final del full o rebutjara una fila amb `FALSE` com si continguera una altra resposta. El codi actual busca files realment disponibles des de la fila 2, accepta les caselles buides i conserva les dades i les reserves existents. Copia el `Code.gs` actualitzat en Apps Script i publica una **nova versió de la implementació existent**. No cal esborrar files ni reiniciar les propietats del projecte.

En la finestra **Error :(**, prem **Mostrar error** per consultar el codi, la resposta tècnica de Google o la traça original del navegador, i la data i hora. Pots usar **Descarregar error (.txt)** per guardar el diagnòstic localment i compartir-lo. El fitxer conserva literalment l’error rebut sense afegir-hi el formulari. Les traces internes d’Apps Script només poden mostrar-se si el servidor les inclou en la resposta; el desplegament actual retorna el codi d’error.

En el navegador, obri **Eines de desenvolupador → Consola** i busca `RSVP: enviament no confirmat.` després d’intentar enviar. El codi també està en l’atribut `data-error` de la secció `#rsvp`. No es registra cap nom ni menú en estos missatges.

`doPost` captura els errors i torna una resposta, de manera que l’execució pot constar com a **Completada** encara que no s’haja guardat res. Si Apps Script mostra «No logs are available for this execution», pots capturar la resposta de Google directament. Recarrega la pàgina i executa açò en la consola **abans** de provar l’enviament:

```js
window.addEventListener('message', e => {
  if (e.data?.type === 'sarapau:rsvp:receipt')
    console.log('Resposta RSVP:', e.data);
});
```

Revisa `received` i `error`. El missatge no conté noms ni menús. Si no arriba cap missatge, revisa també els errors de xarxa i CSP de la consola. Una prova amb una llista buida retorna expressament `INVALID_PAYLOAD` i no comprova el guardat d’invitats.

| Codi | Què revisar |
| --- | --- |
| `TIMEOUT` | No ha arribat una recepció vàlida en 30 segons. Comprova primer si s’han guardat les files. |
| `CONFIGURATION_ERROR` | URL `/exec` buida o incorrecta en `rsvp-config.js`. |
| `NOT_CONFIGURED` | `setupSpreadsheet` no ha acabat bé o el projecte apunta a un altre full. |
| `INVALID_HEADERS` | Nom i ordre exactes de les cinc capçaleres. |
| `INVALID_PAYLOAD` / `INVALID_GUEST` | Origen permés, límit de 50 invitats i camps acceptats. |
| `BUSY` | El bloqueig estava ocupat per una altra execució. |
| `RESERVATION_CONFLICT` | Una fila reservada conté dades diferents de les esperades. Actualitza el codi si només hi havia una casella `FALSE`; no esborres respostes existents. |
| `INVALID_RESERVATION` | Una propietat de reserva té un format invàlid. Revisa el codi i les propietats del projecte sense eliminar les reserves de respostes reals. |
| `SERVER_ERROR` | Revisa el registre de `doPost` en Apps Script; també es registra la línia on ha fallat. |

Si l’aplicació falla al cap de pocs segons amb un d’estos codis, allargar el timeout no corregix el problema de configuració. Després de canviar el codi d’Apps Script, publica una **nova versió** de la implementació; després de canviar el web, publica també els nous fitxers en GitHub Pages.

Si una còpia anterior mostra `Cannot read properties of null (reading 'setTabColor')` en `setupSpreadsheet`, actualitza `Code.gs` amb el fitxer corregit i torna a executar la funció abans de publicar. `setFrozenRows()` no retorna el full i no permet encadenar `setTabColor()`. Les pestanyes podien estar creades, però faltava guardar `SPREADSHEET_ID`. No cal tornar a crear el document: repetir la configuració conserva els invitats existents.

No ordenes, elimines ni mogues files mentre arriben enviaments: les reserves es referixen als números de fila. Per a consultar i ordenar, usa una vista de filtre o una còpia. Una execució interrompuda pot deixar un buit reservat; el recompte ignora les files buides. No esborres manualment les propietats `RSVP_*` del projecte que conté les respostes reals.

La comunicació usa un POST a un iframe ocult i un `postMessage` amb confirmació: no es dona per bo un `fetch` opac ni la simple càrrega de l’iframe. El web verifica el domini de Google, l’iframe emissor, l’identificador i el nombre d’invitats. No es carreguen connexions amb Google fins que es prem el botó d’enviar. No hi ha cookies, `localStorage`, `sessionStorage` ni analítica del projecte; Google processa la petició en el seu servei.

## Referències oficials

- [Aplicacions web d’Apps Script i permisos d’execució](https://developers.google.com/apps-script/guides/web).
- [LockService i flush abans d’alliberar el bloqueig](https://developers.google.com/apps-script/reference/lock/lock).
- [HtmlService i permisos d’incrustació](https://developers.google.com/apps-script/reference/html/html-output#setXFrameOptionsMode(XFrameOptionsMode)).
- [Validació de dades i desplegables](https://developers.google.com/apps-script/reference/spreadsheet/data-validation-builder).
- [Quotes d’Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
