# Configurar les confirmacions en Google Sheets

El formulari de bus per trajectes utilitza el **protocol 2**. Si ja teniu el full de Sara i Pau, obri el projecte d’Apps Script vinculat i actualitza la implementació existent. Així podreu utilitzar la mateixa URL `/exec`.

## 1. Crear el full i el projecte

1. Obri el Google Sheet existent amb el compte propietari. Per a una instal·lació nova, crea un full buit, per exemple **Boda Sara i Pau — Confirmacions**.
2. Mantín el full **privat**. Comparteix-lo només amb les persones que hagen de consultar les respostes.
3. Dins del full, obri **Extensions → Apps Script**. Això crea un projecte vinculat al document; no cal copiar l’ID del full manualment.
4. Substituïx el contingut de `Code.gs` pel de [google-apps-script/Code.gs](../google-apps-script/Code.gs).
5. En **Configuració del projecte**, activa l’opció de mostrar `appsscript.json` en l’editor. Substituïx el manifest pel de [google-apps-script/appsscript.json](../google-apps-script/appsscript.json).
6. Guarda el projecte.

El manifest activa el servici avançat **Google Sheets API v4** amb el nom `Sheets`. Comprova que apareix en **Servicis** a l’editor. Si el projecte d’Apps Script està vinculat a un projecte estàndard de Google Cloud, activa també Google Sheets API en eixe projecte. El permís d’identitat permet comprovar el compte propietari i configurar les proteccions. [Activar els servicis avançats d’Apps Script](https://developers.google.com/apps-script/guides/services/advanced)

## 2. Preparar les pestanyes

Per a reiniciar el full existent, tria **`resetRsvpSpreadsheet`** en el selector de funcions d’Apps Script, prem **Executar** i autoritza el projecte amb el compte propietari. **Este pas buida les dades i les reserves antigues de l’RSVP** i prepara «RESPOSTES», «Invitats» i «Recompte» amb el format nou. Quan acaba la configuració, el reinici queda tancat. Si s’interromp durant el buidatge, torna a executar la mateixa funció per completar-lo.

En un full buit, executa **`setupSpreadsheet`**. Usa també esta funció per a aplicar de nou els formats, les proteccions i les fórmules quan el protocol 2 ja està en ús. Les files guardades es conserven. Després del reinici, `diagnoseSetup` ha de mostrar `status: "OK"`, `version: 2`, `responseCount: 0` i `guestCount: 0`.

### RESPOSTES i Invitats

| Columna | Capçalera | Tipus i comportament |
| --- | --- | --- |
| A | Nom | Text del nom i cognoms. |
| B | Asistirà | Booleà real `TRUE` / `FALSE`, mostrat com una casella. |
| C | Bus anada | Desplegable amb `No` i `13:30`. |
| D | Bus tornada | Desplegable amb `No`, `00:00` i `02:00`. |
| E | Menu especial | Text de les al·lèrgies, intoleràncies o dieta. |
| F | Timestamp | Data i hora generades per Google, mostrades com `dd/MM/yyyy HH:mm:ss`, en horari de Madrid. |

Cada enviament afig una fila per invitat a cada pestanya. Les hores es guarden com a text, de manera que `00:00` conserva els zeros. Si l’invitat no assistix, els dos trajectes es guarden amb `No` i el menú queda buit. Tots els invitats del lot compartixen timestamp.

«RESPOSTES» conserva l’original i «Invitats» és la còpia de treball. Les dos pestanyes protegides són «RESPOSTES» i «Recompte». Les persones amb permís d’edició poden fer les correccions en «Invitats». El propietari conserva el permís sobre les pestanyes protegides que Google Sheets li atorga. [Protecció de fulls en Apps Script](https://developers.google.com/apps-script/reference/spreadsheet/protection)

### Recompte

| Indicador | Què compta |
| --- | --- |
| Assistents a la boda | Files amb nom i `Asistirà = TRUE`. |
| Bus d’anada | Assistents amb `Bus anada = 13:30`. |
| Bus de tornada (00:00) | Assistents amb `Bus tornada = 00:00`. |
| Bus de tornada (02:00) | Assistents amb `Bus tornada = 02:00`. |

Les fórmules s’instal·len automàticament i recalculen els totals quan corregixes «Invitats». Una persona que només faça la tornada suma únicament en l’hora que ha triat.

Conserva els noms de les tres pestanyes, les capçaleres i l’ordre de les columnes. Els identificadors dels enviaments es guarden com a metadades tècniques del full.

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

Per al full existent, obri **Implementar → Gestionar implementacions → Editar → Nova versió → Implementar**. Actualitza la implementació original per conservar la mateixa URL i comprova que l’aplicació s’executa com el propietari. El formulari del protocol 2 s’ha de publicar després d’actualitzar Apps Script.

Per a una instal·lació nova:

1. Prem **Implementar / Deploy → Nova implementació**.
2. Tria el tipus **Aplicació web / Web app**.
3. En **Executar com**, tria **Jo**, el compte propietari que has autoritzat.
4. En **Qui té accés**, tria **Qualsevol persona / Anyone**, també persones sense iniciar sessió. Els invitats no han d’autoritzar el teu projecte ni entrar al seu compte de Google.
5. Prem **Implementar** i copia la **URL de l’aplicació web**, amb esta forma:

   ```text
   https://script.google.com/macros/s/IDENTIFICADOR_DE_LA_IMPLEMENTACIO/exec
   ```

6. Obri eixa URL en una finestra privada del navegador. Ha de mostrar «Servei RSVP de Sara i Pau actiu. Protocol 2.», sense demanar iniciar sessió. El guardat es comprova amb el formulari.

Utilitza `/exec`, no `/dev`, la URL de l’editor, l’ID del projecte ni l’adreça del Google Sheet. Publica una única aplicació d’este projecte: `LockService.getScriptLock()` protegix les execucions del mateix projecte.

Si algú tenia la invitació oberta durant el canvi, haurà de recarregar-la per a enviar amb el nou formulari. El protocol 2 rebutja les peticions del formulari antic.

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
3. Assistix i tria només tornada a les 00:00.
4. Assistix i tria anada i tornada a les 02:00.
5. No assistix.

Prem **Enviar respostes** i comprova:

- El web mostra l’èxit després de rebre la confirmació de Google.
- «RESPOSTES» i «Invitats» tenen cinc files noves amb les sis columnes en l’ordre indicat.
- «Recompte» mostra **4 assistents, 2 d’anada, 1 de tornada a les 00:00 i 1 de tornada a les 02:00**.
- Amb un compte editor, comprova que «RESPOSTES» i «Recompte» queden protegides. Canvia la tornada del tercer invitat a `02:00` en «Invitats». El recompte ha de passar a **0** de tornada a les 00:00 i **2** a les 02:00, i la seua resposta original ha de conservar `00:00`.

El botó **→** (o **Guardar modificacions** en editar) només incorpora l’invitat a la llista temporal dins de la finestra «Vindràs?». El botó **Enviar respostes 💌→** obri el resum; les dades s’envien juntes només després de prémer **Enviar 💌→** en eixa revisió. En recarregar es reinicia la interfície, però les files guardades en Google es conserven.

## Guardat, recepció i errors

El servidor valida tots els invitats i, dins del bloqueig, escriu les dos còpies i la marca del lot en una sola operació. Si falla l’operació, cap de les dos còpies s’escriu a soles. Els textos que podrien interpretar-se com una fórmula es guarden com a text literal. [Guardat atòmic amb Google Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate)

Cada lot té un identificador que es reutilitza en reintentar-lo amb les mateixes respostes. Repetir la mateixa petició reconeix la marca del lot i confirma l’enviament sense tornar a escriure files. Una edició del lot o una recàrrega crea un identificador nou. Si hi ha dubtes, consulta l’original de l’enviament en «RESPOSTES».

La pantalla de càrrega conserva el límit de trenta segons. Si no arriba confirmació, es tanca el transport i es mostra l’error; es pot tornar al llistat tancant l’error i prement «Vindràs?». **Tancar l’espera del navegador no pot parar una execució que Google ja haja començat:** davant d’un timeout, comprova `Invitats` abans de fer un enviament nou. Una recepció tardana s’ignora en el navegador.

Si falla la configuració, revisa:

- URL correcta acabada en `/exec`, mode `google` i nova versió desplegada.
- Accés anònim de l’aplicació web i execució com a propietari.
- `setupSpreadsheet` executat i permisos concedits.
- Origen del web inclòs en `allowedOrigins`.
- Pestanyes i capçaleres intactes.
- **Execucions** en Apps Script: es registra un codi d’error, sense noms ni informació alimentària.

### Si no s’ha guardat cap fila

Executa **`diagnoseSetup`** des de l’editor d’Apps Script. Ha de mostrar `status: "OK"` i `version: 2`, l’origen permés, `protectedSheets: ["RESPOSTES", "Recompte"]` i els totals `responseCount` i `guestCount`. Les correccions en «Invitats» poden fer que els totals siguen diferents. Si falla, comprova el codi d’error.

Per a vore el resultat, tria `diagnoseSetup` al selector del costat d’**Executar**, executa-la i obri **Registre d’execució / Execution log** en la barra superior de l’editor. La llista **Execucions** del menú lateral només indica l’estat general, com ara «Completed»; no és el resultat del diagnòstic.

`destinationMatchesActiveSpreadsheet: true` confirma que el destí configurat correspon al full vinculat que estàs revisant. `WRONG_SPREADSHEET` indica que la configuració apunta a un altre document. Este diagnòstic no escriu res.

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
| `NOT_CONFIGURED` | Acaba la preparació del protocol 2 amb `resetRsvpSpreadsheet` o `setupSpreadsheet`, segons el pas 2. |
| `SHEETS_API_UNAVAILABLE` | Actualitza `appsscript.json` i comprova que el servici `Sheets` està activat. |
| `OWNER_REQUIRED` / `WRONG_SPREADSHEET` | Obri el projecte vinculat des del full correcte i executa la configuració amb el compte propietari. |
| `PROTECTION_MISSING` | Revisar les proteccions de «RESPOSTES» i «Recompte» o aplicar-les de nou amb `setupSpreadsheet`. |
| `INVALID_HEADERS` | Comprova les sis capçaleres i el seu ordre. Si encara hi ha la columna antiga «Bus», revisa el pas de reinici. |
| `VERSION_UNSUPPORTED` | Publica les versions noves d’Apps Script i del web en l’ordre indicat i recarrega la invitació. |
| `INVALID_PAYLOAD` / `INVALID_GUEST` | Origen permés, límit de 50 invitats i camps acceptats. |
| `BUSY` | El bloqueig estava ocupat per una altra execució. |
| `REQUEST_CONFLICT` | S’ha intentat reutilitzar l’identificador d’un lot guardat amb un contingut diferent. Comprova l’enviament original en «RESPOSTES». |
| `SERVER_ERROR` | Revisa el registre de `doPost` en Apps Script; també es registra la línia on ha fallat. |

Si l’aplicació falla al cap de pocs segons amb un d’estos codis, allargar el timeout no corregix el problema de configuració. Després de canviar el codi d’Apps Script, publica una **nova versió** de la implementació; després de canviar el web, publica també els nous fitxers en GitHub Pages.

La comunicació usa un POST a un iframe ocult i un `postMessage` amb confirmació: no es dona per bo un `fetch` opac ni la simple càrrega de l’iframe. El web verifica el domini de Google, l’iframe emissor, l’identificador i el nombre d’invitats. No es carreguen connexions amb Google fins que es prem el botó d’enviar. No hi ha cookies, `localStorage`, `sessionStorage` ni analítica del projecte; Google processa la petició en el seu servei.

## Referències oficials

- [Aplicacions web d’Apps Script i permisos d’execució](https://developers.google.com/apps-script/guides/web).
- [LockService i flush abans d’alliberar el bloqueig](https://developers.google.com/apps-script/reference/lock/lock).
- [HtmlService i permisos d’incrustació](https://developers.google.com/apps-script/reference/html/html-output#setXFrameOptionsMode(XFrameOptionsMode)).
- [Validació de dades i desplegables](https://developers.google.com/apps-script/reference/spreadsheet/data-validation-builder).
- [Quotes d’Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
