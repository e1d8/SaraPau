// Edita este fitxer per a personalitzar la invitació. Les dades actuals són de demostració.
export const wedding = {
  couple: 'Sara i Pau',
  date: '2027-06-21',
  dateShort: '21-06-27',
  dateLong: '21 de juny de 2027',
  location: 'Napa Valley, Califòrnia',
  time: '16.00 – 22.00 h',
  replyBy: '20 de maig de 2027',
  venue: {
    name: 'The Estate at Napa Valley',
    address: '123 Vineyard Lane, Napa, CA 94558, Estats Units',
    mapsUrl: 'https://maps.app.goo.gl/HCJv9ZPmUABzNe6x5',
    description: 'La nostra celebració tindrà lloc al cor de Napa Valley, entre vinyes i paisatges plens d’encant.',
    car: 'Hi haurà aparcament al recinte per a totes les persones convidades. Vos recomanem arribar amb un poc d’antelació per a gaudir d’un trajecte tranquil i sense presses.',
    transit: 'L’accés al recinte en transport públic pot ser limitat. Si viatgeu sense cotxe, podeu combinar el transport local amb un trajecte curt en taxi fins al lloc de la celebració.',
  },
  contacts: [
    { name: 'Sara', email: 'sara@example.com' },
    { name: 'Pau', email: 'pau@example.com' },
  ],
  photos: {
    invitation: 'couple-landscape.jpg',
    postcard: 'couple-postcard.jpg',
    story: 'couple-story-alternate.jpg',
    memoryOne: 'memory-one.jpg',
    memoryTwo: 'memory-two.jpg',
    forever: 'couple-forever.jpg',
  },
  home: {
    invitation: 'Amb molta il·lusió, vos convidem a formar part de la celebració de la nostra boda. Ens faria molt feliços compartir amb vosaltres l’inici d’esta nova etapa.',
    details: 'Hem preparat cada detall de la nostra boda amb molta estima perquè siga un dia especial i inoblidable. Descobriu els horaris, el lloc i els moments que tenim tantes ganes de compartir amb vosaltres.',
    story: 'Totes les històries d’amor són boniques, però la nostra és la que més ens agrada. Des que ens vam conéixer, hem compartit records, rialles i un camí que ens ha portat fins ací.',
    rsvp: 'Ens faria molta il·lusió comptar amb vosaltres. Digueu-nos si ens acompanyareu en este dia tan especial.',
    farewell: 'La vostra presència és el millor regal. Esperem de tot cor que pugueu compartir este dia tan especial amb nosaltres.',
  },
  timeline: [
    { time: '16.00 h', title: 'La cerimònia', text: 'Acompanyeu-nos en l’inici del nostre «per sempre», en una cerimònia plena d’amor, envoltats de família i amistats.' },
    { time: '17.00 h', title: 'El còctel', text: 'Gaudiu d’un aperitiu amb begudes especials, mossets deliciosos i converses en bona companyia.' },
    { time: '18.30 h', title: 'El sopar', text: 'Ens espera un sopar preparat amb molta cura per a celebrar junts una vesprada inoblidable.' },
    { time: '19.30 h', title: 'Festa i ball', text: 'Que sone la música i comence la festa! Balleu amb nosaltres i celebrem-ho davall de les estreles.' },
  ],
  dresscode: 'Vos demanem que vingueu amb vestimenta formal. Podeu inspirar-vos en estos tons.',
  entourageIntro: 'Amb l’estima i el suport de les persones que ens acompanyen de més a prop.',
  entourage: [
    { role: 'Padrins', names: 'Michael Smith, John Storm, Andreas Lucky' },
    { role: 'Dames d’honor', names: 'Emily Brown, Elice Anderson, Zara Witney' },
    { role: 'Acompanyants', names: 'Christian Jake, Atony' },
    { role: 'La xiqueta de les flors', names: 'Lily Taylor' },
  ],
  registry: {
    text: 'Tindre-vos al nostre costat és el millor regal. Per a les persones que ens heu preguntat, ací podreu trobar els detalls de la nostra llista de regals.',
    // Quan tingueu una llista real, substituïu null per una adreça https://…
    url: null,
    placeholder: 'Encara estem preparant la llista de regals. De moment, el millor regal és compartir este dia amb vosaltres.',
  },
  accommodationIntro: 'Perquè pugueu gaudir d’un cap de setmana tranquil a Napa Valley, hem seleccionat alguns allotjaments prop del recinte. Vos recomanem reservar amb antelació.',
  hotels: [
    { name: 'Carneros Resort and Spa', distance: 'A 15 minuts en cotxe', text: 'Un refugi entre les vinyes i els paisatges de Napa Valley.', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Carneros+Resort+and+Spa+Napa' },
    { name: 'Archer Hotel Napa', distance: 'A 10 minuts en cotxe', text: 'Un hotel modern amb encant al cor del centre de Napa.', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Archer+Hotel+Napa' },
    { name: 'Silverado Resort', distance: 'A 20 minuts en cotxe', text: 'Un allotjament elegant, amb jardins, camps de golf i espais per a desconnectar.', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Silverado+Resort+Napa' },
  ],
  story: {
    opening: 'No totes les històries d’amor comencen amb un gran romanç. A vegades, creixen a poc a poc, entre moments quotidians, silencis còmodes i rialles compartides. Sense adonar-nos-en, ens vam convertir en la llar de l’altre.',
    chapters: [
      { title: 'El principi', text: 'El que va començar amb una simple presentació es va convertir, a poc a poc, en una cosa que cap dels dos esperava. Entre converses, rialles i moments tranquils, vam descobrir com de bé estàvem junts. Allò que semblava quotidià es va transformar en el principi d’una història molt especial.' },
      { title: 'Créixer junts', text: 'Amb el temps, el nostre vincle es va fer més fort en cada etapa de la vida. Vam aprendre, ens vam ajudar i ens vam animar, mentre creàvem records que guardarem per sempre. Junts hem descobert que l’amor també viu en les coses menudes que compartim cada dia.' },
      { title: 'Comença el nostre per sempre', text: 'Després de tants moments, aventures i somnis compartits, vam saber que havíem trobat la nostra llar en l’altre. Amb el cor ple d’il·lusió i agraïment, vam decidir començar el següent capítol del nostre camí: junts, per sempre.' },
    ],
  },
};
