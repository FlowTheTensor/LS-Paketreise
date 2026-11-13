// =============================================================================
//  Paketreise · Zwei Firmenzentralen und ein Industriespion
//  Das OSI-Modell als zwei Hochhäuser mit je sieben Etagen (Abteilungen).
//  Die Laptop GmbH schickt Anfragen an die Laborserver AG. Jede Etage packt
//  eine Hülle dazu, auf der Gegenseite nimmt die Partner-Etage sie wieder ab.
//  Dazwischen: die Telefonauskunft (DNS), die Pforte (Switch) – und Mr. Shark,
//  der am Kabel alles mitschneidet (Wireshark).
//  Sechs Freigabestufen vom Praktikanten bis zum Netzwerk-Detektiv:
//    1 Kapselung · 2 DNS · 3 ARP & Pforte · 4 TCP & Ports ·
//    5 HTTP · HTTPS · 6 Fehlersuche
// =============================================================================
//
//  Dateien
//    netz.js    das kleine Netz: Geräte, Hüllen, Szenarien (vorab berechnet)
//    stufen.js  Freigabestufen, Szenarien je Stufe, Prüfungsfragen
//    ui.js      Knöpfe, Auswahllisten, Eingabefelder
//    sketch.js  Ablauf und Zeichnen (Hochhäuser, Pforte, Paketlupe, Mitschnitt)
//
//  Bedienung
//    →         nächster Schritt
//    Leertaste automatisch ablaufen lassen / anhalten
//    R         Neustart
//    L         Paketlupe: Absender-Sicht / Sicht von Mr. Shark
//
//  Läuft mit p5.js 1.x und 2.x.
//  Hinweis: Alle Schleifen haben geschweifte Klammern – der p5-Web-Editor
//  kommt mit Schleifen ohne Klammern nicht zurecht.
// =============================================================================

const W = 1600;
const LEISTE = 48;
const H_INHALT = 900;
const H = H_INHALT + LEISTE;
let S = 1;

const SCHRIFTEN = {
  titel: ["Quicksand", "Arial"],
  text: ["Inter", "Arial"],
  mono: ["JetBrains Mono", "monospace"],
};
const schriftGeladen = { titel: false, text: false, mono: false };
let TITEL = "Arial";
let SCHRIFT = "Arial";
let MONO = "monospace";

function ladeSchriften() {
  if (!document.fonts || !document.fonts.load) {
    return;
  }
  for (const art of Object.keys(SCHRIFTEN)) {
    const name = SCHRIFTEN[art][0];
    Promise.all([document.fonts.load(`400 16px "${name}"`), document.fonts.load(`700 16px "${name}"`)])
      .then((ergebnis) => {
        if (ergebnis[0].length > 0 && ergebnis[1].length > 0) {
          schriftGeladen[art] = true;
          TITEL = schriftGeladen.titel ? SCHRIFTEN.titel[0] : SCHRIFTEN.titel[1];
          SCHRIFT = schriftGeladen.text ? SCHRIFTEN.text[0] : SCHRIFTEN.text[1];
          MONO = schriftGeladen.mono ? SCHRIFTEN.mono[0] : SCHRIFTEN.mono[1];
        }
      })
      .catch(() => {});
  }
}

const P_WELT = { x: 24, y: 84, w: 900, h: 540, titel: "Gewerbepark Teamnetz" };
const P_PAKET = { x: 24, y: 640, w: 520, h: 244, titel: "Paketlupe" };
const P_MITSCHNITT = { x: 560, y: 640, w: 364, h: 244, titel: "Mitschnitt von Mr. Shark" };
const P_ERKL = { x: 940, y: 84, w: 636, h: 380, titel: "" };
const P_STEUER = { x: 940, y: 480, w: 400, h: 404, titel: "" };
const P_FREIGABE = { x: 1356, y: 480, w: 220, h: 404, titel: "Freigaben" };
const KOPF_H = 34;

const FARBE = {
  papier: [251, 249, 245],
  flaeche: [255, 255, 255],
  flaeche2: [243, 238, 230],
  linie: [231, 225, 214],
  text: [29, 29, 28],
  grau: [91, 88, 82],
  blass: [125, 122, 114],
  akzent: [200, 30, 58],
  akzentHell: [228, 0, 43],
  senf: [184, 122, 28],
  gruen: [52, 128, 84],
  blau: [44, 92, 150],
  violett: [122, 74, 150],
  kabel: [70, 72, 76],
  hai: [96, 118, 138],
};

// Farbe je OSI-Schicht
const SCHICHT_FARBE = {
  7: [122, 74, 150],
  6: [200, 30, 58],
  5: [205, 98, 40],
  4: [184, 122, 28],
  3: [52, 128, 84],
  2: [24, 132, 140],
  1: [44, 92, 150],
};
const SCHICHT_KURZ = {
  7: "Fachabteilung",
  6: "Chiffrierbüro",
  5: "Sekretariat",
  4: "Versand",
  3: "Routenplanung",
  2: "Poststelle",
  1: "Kabelraum",
};
// Farben im Mitschnitt (angelehnt an Wireshark)
const PROTO_FARBE = {
  ARP: [250, 240, 215],
  DNS: [218, 238, 255],
  TCP: [231, 230, 255],
  HTTP: [228, 255, 199],
  TLS: [240, 228, 250],
};
const TEMPO = { langsam: 1.6, mittel: 1, schnell: 0.45 };

// -----------------------------------------------------------------------------
// Geometrie der Welt
// -----------------------------------------------------------------------------
const TURM = {
  laptop: { x: 40, w: 200, aussen: 240, innen: 214 },
  server: { x: 708, w: 200, aussen: 708, innen: 734 },
};
const TURM_OBEN = 160;
const ETAGE_H = 58;
const KABEL_Y = 537;
const PFORTE = { x: 380, y: 430, w: 180, h: 182 };
const AUSKUNFT = { x: 380, y: 126, w: 180, h: 166 };
const TOR = {
  1: { x: 380, y: KABEL_Y },
  2: { x: 560, y: KABEL_Y },
  3: { x: 470, y: 430 },
};
const ANSCHLUSS = {
  laptop: { x: 240, y: KABEL_Y },
  server: { x: 708, y: KABEL_Y },
  dns: { x: 470, y: 292 },
};
const HAI = { x: 310, y: KABEL_Y };
const BLASE = { x: 252, y: 330, w: 444, h: 80 };

function etageY(e) {
  return TURM_OBEN + (7 - e) * ETAGE_H;
}

function etageMitte(e) {
  return etageY(e) + ETAGE_H / 2;
}

// -----------------------------------------------------------------------------
// Zustand
// -----------------------------------------------------------------------------
let stufe = 0;
let modus = "ueben";
let beispielIdx = 0;
let tempo = "mittel";
let sim = null;
let schrittIdx = 0;
let laufAuto = false;
let animT0 = 0;
let haiSicht = false;

let aufgabe = null;
let serie = 0;
let rueckmeldung = null; // {ok, text}
let antwortIdx = -1;
let aufloesung = false;
let freigaben = [false, false, false, false, false, false];
let stempel = null;
let mcRechtecke = [];
let fehlerMeldung = null;
let cnv;

// =============================================================================
// Start
// =============================================================================
function setup() {
  ladeSchriften();
  const [cw, ch] = zeichenflaeche();
  cnv = createCanvas(cw, ch);
  S = width / W;
  ladeFreigaben();
  erstelleUi();
  cnv.parent(huelle);
  stufeWechseln(0, true);
  layoutUi();
}

function zeichenflaeche() {
  const cw = Math.max(800, Math.min(1600, windowWidth - 24, ((windowHeight - 24) * W) / H));
  return [Math.round(cw), Math.round((cw * H) / W)];
}

function windowResized() {
  const [cw, ch] = zeichenflaeche();
  resizeCanvas(cw, ch);
  S = width / W;
  layoutUi();
}

function draw() {
  try {
    logik();
    background(...FARBE.papier);
    push();
    scale(S);
    zeichneKopf();
    zeichneStufenLeiste();
    push();
    translate(0, LEISTE);
    zeichneStatus();
    zeichneWelt();
    zeichnePaketlupe();
    zeichneMitschnitt();
    zeichneLagebericht();
    zeichneSteuerung();
    zeichneFreigaben();
    zeichneStempel();
    zeichneFehlerMeldung();
    zeichneTooltip();
    pop();
    pop();
    aktualisiereUi();
  } catch (err) {
    behandleFehler(err);
  }
}

function behandleFehler(err) {
  console.error(err);
  fehlerMeldung = { text: String((err && err.message) || err), t0: millis() };
  laufAuto = false;
}

// Dauer der Animation eines Schritts
function animDauer(s) {
  if (!s) {
    return 0;
  }
  if (s.art === "nachricht") {
    return 2600 * TEMPO[tempo];
  }
  if (s.art === "leitung") {
    return 1500 * TEMPO[tempo];
  }
  if (s.art === "runter" || s.art === "hoch") {
    return 450 * TEMPO[tempo];
  }
  return 0;
}

// Lesezeit nach der Animation
function pausenDauer(s) {
  if (!s) {
    return 1000;
  }
  const lesen = Math.min(4200, 900 + s.text.length * 18);
  if (s.art === "runter" || s.art === "hoch") {
    return animDauer(s) + 1300 * TEMPO[tempo];
  }
  return animDauer(s) + lesen * TEMPO[tempo];
}

// Fortschritt der Animation des aktuellen Schritts (0 … 1)
function animT() {
  const s = aktSchritt();
  const d = animDauer(s);
  if (!d) {
    return 1;
  }
  return constrain((millis() - animT0) / d, 0, 1);
}

// Tooltip für abgeschnittene Zeilen (Paketlupe, Mitschnitt)
let tooltip = null;

function merkeTooltip(volltext, zeile) {
  if (inRechteck(mausPos(), zeile)) {
    tooltip = { text: volltext, x: zeile.x, y: zeile.y + zeile.h };
  }
}

function zeichneTooltip() {
  if (!tooltip) {
    return;
  }
  const t = tooltip;
  tooltip = null;
  const m = mausPos();
  textFont(MONO);
  textSize(11);
  textStyle(NORMAL);
  const pad = 8;
  const maxB = 520;
  const zeilen = umbrechen(t.text, maxB);
  const za = 11 * 1.45;
  let bw = 0;
  for (const z of zeilen) {
    bw = Math.max(bw, textWidth(z));
  }
  bw += pad * 2;
  const bh = zeilen.length * za + pad * 2 - 3;
  let x = constrain(m.x + 12, 8, W - bw - 8);
  let y = m.y + 18;
  if (y + bh > H_INHALT - 8) {
    y = m.y - bh - 10;
  }
  noStroke();
  fill(29, 29, 28, 40);
  rect(x + 1, y + 3, bw, bh, 6);
  fill(...FARBE.text);
  rect(x, y, bw, bh, 6);
  fill(...FARBE.papier);
  textAlign(LEFT, TOP);
  for (let i = 0; i < zeilen.length; i++) {
    text(zeilen[i], x + pad, y + pad + i * za);
  }
}

function logik() {
  if (!laufAuto) {
    return;
  }
  if (millis() - animT0 > pausenDauer(aktSchritt())) {
    if (!naechsterSchritt()) {
      laufAuto = false;
    }
  }
}

// =============================================================================
// Stufen, Modus, Szenarien
// =============================================================================
function stufeWechseln(neu, erzwingen) {
  if (!erzwingen && neu === stufe) {
    return;
  }
  stufe = neu;
  beispielIdx = 0;
  zuruecksetzen();
}

function modusWechseln(neu) {
  if (neu === modus) {
    return;
  }
  modus = neu;
  zuruecksetzen();
}

function zuruecksetzen() {
  laufAuto = false;
  serie = 0;
  rueckmeldung = null;
  aufloesung = false;
  aufgabe = null;
  if (modus === "pruefung") {
    naechsteAufgabe();
  } else {
    neueSimulation();
  }
  if (typeof leereEingaben === "function") {
    leereEingaben();
  }
}

function aktSzenarioId() {
  if (modus === "pruefung") {
    return aufgabe && aufgabe.szenario ? aufgabe.szenario : STUFEN[stufe].szenarien[0];
  }
  const liste = STUFEN[stufe].szenarien;
  return liste[Math.min(beispielIdx, liste.length - 1)];
}

function neueSimulation() {
  sim = SZENARIEN[aktSzenarioId()]();
  schrittIdx = 0;
  animT0 = millis();
  laufAuto = false;
}

function aktSchritt() {
  return sim ? sim.schritte[schrittIdx] : null;
}

function vorigerSchritt() {
  return sim && schrittIdx > 0 ? sim.schritte[schrittIdx - 1] : null;
}

function naechsterSchritt() {
  if (!sim || schrittIdx >= sim.schritte.length - 1) {
    return false;
  }
  schrittIdx++;
  animT0 = millis();
  return true;
}

function schrittKnopf() {
  if (sim && schrittIdx >= sim.schritte.length - 1) {
    neueSimulation();
    return;
  }
  naechsterSchritt();
}

function autoUmschalten() {
  if (sim && schrittIdx >= sim.schritte.length - 1) {
    neueSimulation();
  }
  laufAuto = !laufAuto;
  if (laufAuto && schrittIdx === 0) {
    animT0 = millis() - 100000;
  }
}

function neustart() {
  neueSimulation();
}

function beispielWechseln(i) {
  beispielIdx = i;
  neueSimulation();
}

// Zustand, der während der Animation noch „alt“ ist
function sichtbarerZustand() {
  const s = aktSchritt();
  const v = vorigerSchritt();
  if (!s) {
    return null;
  }
  const t = animT();
  const z = {
    mac: s.mac,
    arp: s.arp,
    dnsCache: s.dnsCache,
    mitschnitt: s.mitschnitt,
    hai: s.hai,
    browser: s.browser,
    verbindung: s.verbindung,
  };
  if (v && (s.art === "nachricht" || s.art === "leitung")) {
    const vomLaptop = s.nachricht && s.nachricht.von === "laptop";
    const tHai = s.art === "nachricht" ? (vomLaptop ? 0.42 : 0.7) : vomLaptop ? 0.25 : 0.8;
    if (t < tHai) {
      z.mitschnitt = v.mitschnitt;
      z.hai = v.hai;
    }
    if (t < (s.art === "nachricht" ? 0.5 : 0.5)) {
      z.mac = v.mac;
    }
    if (t < 1) {
      z.arp = v.arp;
      z.dnsCache = v.dnsCache;
      z.browser = v.browser;
      z.verbindung = v.verbindung;
    }
  }
  return z;
}

// =============================================================================
// Freigabeprüfung
// =============================================================================
function naechsteAufgabe() {
  aufgabe = neuePruefung(stufe);
  rueckmeldung = null;
  antwortIdx = -1;
  aufloesung = false;
  laufAuto = false;
  // Die Welt zeigt den Endzustand des Szenarios, damit der Mitschnitt lesbar ist
  sim = SZENARIEN[aktSzenarioId()]();
  // letzter Schritt mit einem Paket auf dem Kabel, damit die Paketlupe etwas zeigt
  schrittIdx = sim.schritte.length - 1;
  for (let i = sim.schritte.length - 1; i >= 0; i--) {
    const art = sim.schritte[i].art;
    if (art === "nachricht" || art === "leitung") {
      schrittIdx = i;
      break;
    }
  }
  animT0 = millis() - 100000;
  if (typeof leereEingaben === "function") {
    leereEingaben();
  }
}

function pruefeAntwort(eingabe) {
  if (!aufgabe || rueckmeldung) {
    return;
  }
  let ok;
  if (aufgabe.art === "mc") {
    antwortIdx = eingabe;
    ok = eingabe === aufgabe.richtig;
  } else {
    const txt = String(eingabe).trim().replace(",", ".");
    if (txt === "") {
      return;
    }
    ok = Number(txt) === aufgabe.antwort;
  }
  if (ok) {
    serie++;
    rueckmeldung = { ok: true, text: "Richtig!" };
    if (serie >= SERIE_ZIEL) {
      if (!freigaben[stufe]) {
        freigaben[stufe] = true;
        speichereFreigaben();
      }
      stempel = { stufe, t0: millis() };
      rueckmeldung.text = `Prüfsiegel erteilt: Freigabe als ${STUFEN[stufe].rang}!`;
      serie = 0;
    }
  } else {
    serie = 0;
    rueckmeldung = {
      ok: false,
      text: aufgabe.art === "zahl" ? `Leider falsch – richtig ist ${aufgabe.antwort}. Die Serie beginnt von vorn.` : "Leider falsch – die Serie beginnt von vorn.",
    };
  }
}

function zeigeAufloesung() {
  if (!aufgabe || !aufgabe.szenario) {
    return;
  }
  aufloesung = true;
  sim = SZENARIEN[aufgabe.szenario]();
  schrittIdx = 0;
  laufAuto = true;
  animT0 = millis() - 100000;
}

function ladeFreigaben() {
  try {
    const roh = window.localStorage.getItem("paketreise-freigaben");
    if (roh) {
      const liste = JSON.parse(roh);
      if (Array.isArray(liste) && liste.length === 6) {
        freigaben = liste.map((x) => x === true);
      }
    }
  } catch (e) {
    // kein Speicher verfügbar
  }
}

function speichereFreigaben() {
  try {
    window.localStorage.setItem("paketreise-freigaben", JSON.stringify(freigaben));
  } catch (e) {
    // kein Speicher verfügbar
  }
}

function freigabenZuruecksetzen() {
  freigaben = [false, false, false, false, false, false];
  speichereFreigaben();
}

// =============================================================================
// Maus und Tasten
// =============================================================================
function mausPos() {
  return { x: mouseX / S, y: mouseY / S - LEISTE };
}

function inRechteck(m, r) {
  return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
}

function mousePressed() {
  try {
    const m = mausPos();
    if (modus === "pruefung" && aufgabe && aufgabe.art === "mc" && !rueckmeldung) {
      for (let i = 0; i < mcRechtecke.length; i++) {
        if (inRechteck(m, mcRechtecke[i])) {
          pruefeAntwort(i);
          return;
        }
      }
    }
    // Klick auf Mr. Shark schaltet die Paketlupe um
    if (dist(m.x, m.y, HAI.x, HAI.y + 30) < 34) {
      haiSicht = !haiSicht;
    }
  } catch (err) {
    behandleFehler(err);
  }
}

function keyPressed() {
  if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT")) {
    return;
  }
  if (key === "l" || key === "L") {
    haiSicht = !haiSicht;
    return false;
  }
  if (modus === "pruefung" && !aufloesung) {
    return;
  }
  if (keyCode === RIGHT_ARROW) {
    schrittKnopf();
    return false;
  }
  if (key === " ") {
    autoUmschalten();
    return false;
  }
  if (key === "r" || key === "R") {
    neustart();
    return false;
  }
}

// =============================================================================
// Grundbausteine
// =============================================================================
function panel(p) {
  noStroke();
  fill(29, 29, 28, 10);
  rect(p.x + 1, p.y + 3, p.w, p.h, 12);
  fill(...FARBE.flaeche);
  stroke(...FARBE.linie);
  strokeWeight(1);
  rect(p.x, p.y, p.w, p.h, 12);
  stroke(...FARBE.linie);
  line(p.x + 12, p.y + KOPF_H, p.x + p.w - 12, p.y + KOPF_H);
  if (p.titel) {
    noStroke();
    fill(...FARBE.akzentHell);
    circle(p.x + 19, p.y + KOPF_H / 2 + 1, 7);
    fill(...FARBE.text);
    textFont(TITEL);
    textStyle(BOLD);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(p.titel, p.x + 30, p.y + KOPF_H / 2 + 1);
    textStyle(NORMAL);
  }
}

function hell(farbe, anteil) {
  return [lerp(farbe[0], 255, anteil), lerp(farbe[1], 255, anteil), lerp(farbe[2], 255, anteil)];
}

function umbrechen(txt, maxBreite) {
  const zeilen = [];
  for (const absatzText of String(txt).split("\n")) {
    const woerter = absatzText.split(" ");
    let akt = "";
    for (const wort of woerter) {
      const probe = akt ? akt + " " + wort : wort;
      if (textWidth(probe) > maxBreite && akt) {
        zeilen.push(akt);
        akt = wort;
      } else {
        akt = probe;
      }
    }
    zeilen.push(akt);
  }
  return zeilen;
}

function absatz(txt, x, y, breite, groesse, farbe, fett, maxZeilen) {
  textFont(SCHRIFT);
  textSize(groesse);
  textStyle(fett ? BOLD : NORMAL);
  textAlign(LEFT, TOP);
  fill(...(farbe || FARBE.text));
  noStroke();
  let zeilen = umbrechen(txt, breite);
  if (maxZeilen && zeilen.length > maxZeilen) {
    zeilen = zeilen.slice(0, maxZeilen);
    zeilen[maxZeilen - 1] += " …";
  }
  const za = groesse * 1.42;
  for (let i = 0; i < zeilen.length; i++) {
    text(zeilen[i], x, y + i * za);
  }
  textStyle(NORMAL);
  return zeilen.length * za;
}

function weich(t) {
  const u = constrain(t, 0, 1);
  return u * u * (3 - 2 * u);
}

// =============================================================================
// Kopf, Leiste, Status
// =============================================================================
function zeichneKopf() {
  noStroke();
  fill(...FARBE.flaeche);
  rect(0, 0, W, 56);
  stroke(...FARBE.linie);
  strokeWeight(1);
  line(0, 56, W, 56);
  noStroke();
  fill(...FARBE.akzentHell);
  circle(160, 28, 6);
  stroke(...FARBE.akzentHell);
  strokeWeight(3);
  line(170, 34, 180, 22);
  noStroke();
  fill(...FARBE.text);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(21);
  textAlign(LEFT, CENTER);
  text("Paketreise", 194, 21);
  textStyle(NORMAL);
  textFont(SCHRIFT);
  textSize(13);
  fill(...FARBE.blass);
  text(STUFEN[stufe].untertitel, 194, 41);
}

function zeichneStufenLeiste() {
  noStroke();
  fill(253, 240, 242);
  rect(0, 56, W, LEISTE);
  stroke(240, 200, 208);
  strokeWeight(1);
  line(0, 56 + LEISTE, W, 56 + LEISTE);
  noStroke();
  fill(...FARBE.akzent);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(15);
  textAlign(LEFT, CENTER);
  text("Stufe", 26, 56 + LEISTE / 2);
  textStyle(NORMAL);
  stroke(...FARBE.akzent);
  strokeWeight(2);
  const px = 26 + textWidth("Stufe") + 10;
  const py = 56 + LEISTE / 2;
  line(px, py - 5, px + 5, py);
  line(px + 5, py, px, py + 5);
  noStroke();
}

function zeichneStatus() {
  noStroke();
  fill(...FARBE.grau);
  textFont(SCHRIFT);
  textSize(13);
  textAlign(LEFT, CENTER);
  let txt;
  if (modus === "pruefung") {
    txt = `Freigabeprüfung „${STUFEN[stufe].rang}“: ${SERIE_ZIEL} richtige Antworten in Folge ergeben das Prüfsiegel. Die Welt zeigt das Ende des passenden Szenarios.`;
  } else {
    txt = "→ nächster Schritt · Leertaste automatisch · R Neustart · L oder Klick auf Mr. Shark: Paketlupe umschalten";
  }
  text(txt, 26, 70);
}

// Fehler-Hinweise nur beim Üben oder in der Auflösung zeigen
function zeigeLoesung() {
  return modus === "ueben" || aufloesung;
}

// =============================================================================
// Die Welt: zwei Hochhäuser, Auskunft, Pforte, Kabel, Mr. Shark
// =============================================================================
function zeichneWelt() {
  const p = P_WELT;
  panel(p);
  const s = aktSchritt();
  const z = sichtbarerZustand();
  if (!s || !z) {
    return;
  }
  const t = animT();
  const lage = paketLage(s, t);

  // Hinweis rechts im Kopf
  noStroke();
  fill(...FARBE.blass);
  textFont(SCHRIFT);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text("Teamnetz 192.168.1.0/24 · ein Switch, drei Geräte", p.x + p.w - 16, p.y + KOPF_H / 2 + 1);

  zeichneKabel(s, lage);
  zeichneTurm("laptop", s, lage);
  zeichneTurm("server", s, lage);
  zeichneAuskunft(s, lage);
  zeichnePforte(s, z, lage);
  zeichneBlase(z);
  zeichneHai(s, t);
  if (lage) {
    for (const k of lage.pakete) {
      zeichnePaket(k.x, k.y, s.nachricht, lage.sichtbar, k.skala, k.alpha, k.marke);
    }
  }
}

// ---------------------------------------------------------------------------
// Wo ist das Paket gerade?
// ---------------------------------------------------------------------------
function wegPunkt(pkte, t) {
  // Punkt auf einem Linienzug bei Anteil t (nach Länge)
  let laenge = 0;
  const abschnitte = [];
  for (let i = 0; i < pkte.length - 1; i++) {
    const l = dist(pkte[i].x, pkte[i].y, pkte[i + 1].x, pkte[i + 1].y);
    abschnitte.push(l);
    laenge += l;
  }
  let rest = constrain(t, 0, 1) * laenge;
  for (let i = 0; i < abschnitte.length; i++) {
    if (rest <= abschnitte[i] || i === abschnitte.length - 1) {
      const u = abschnitte[i] ? rest / abschnitte[i] : 1;
      return { x: lerp(pkte[i].x, pkte[i + 1].x, constrain(u, 0, 1)), y: lerp(pkte[i].y, pkte[i + 1].y, constrain(u, 0, 1)) };
    }
    rest -= abschnitte[i];
  }
  return pkte[pkte.length - 1];
}

function torVon(g) {
  return TOR[GERAETE[g].tor];
}

function obersteSchicht(n) {
  return Math.max(...n.huellen.map((h) => h.n));
}

// Weg vom Absender bis zum Tor der Pforte
function wegHin(g, oben) {
  if (g === "dns") {
    return [ANSCHLUSS.dns, TOR[3]];
  }
  const tu = TURM[g];
  return [
    { x: tu.innen, y: etageMitte(oben) },
    { x: tu.innen, y: etageMitte(1) },
    ANSCHLUSS[g],
    torVon(g),
  ];
}

// Weg vom Tor der Pforte zum Empfänger
function wegZu(g) {
  if (g === "dns") {
    return [TOR[3], ANSCHLUSS.dns];
  }
  return [torVon(g), ANSCHLUSS[g]];
}

function wegHoch(g, oben) {
  const tu = TURM[g];
  return [
    { x: tu.innen, y: etageMitte(1) },
    { x: tu.innen, y: etageMitte(oben) },
  ];
}

const PFORTE_MITTE = { x: 470, y: 594 };

function paketLage(s, t) {
  if (!s.nachricht) {
    return null;
  }
  const n = s.nachricht;
  const alle = n.huellen.map((h) => h.n);
  // Detail: Paket steht in einer Etage
  if (s.art === "runter" || s.art === "hoch") {
    const tu = TURM[s.seite];
    const von = s.art === "runter" ? Math.min(7, s.ebene + 1) : Math.max(1, s.ebene - 1);
    const startOben = s.art === "runter" && s.ebene === obersteSchicht(n);
    const y = startOben ? etageMitte(s.ebene) : lerp(etageMitte(von), etageMitte(s.ebene), weich(t));
    return {
      sichtbar: s.sichtbar,
      pakete: [{ x: tu.x + tu.w - 40, y, skala: 1, alpha: 255 }],
      etage: { seite: s.seite, ebene: s.ebene },
    };
  }
  const oben = obersteSchicht(n);
  const w = s.weg;
  // Abschnitte: [0, a) runter · [a, b) zur Pforte · [b, c) zu den Zielen · [c, 1] hoch
  let a = 0.25;
  let b = 0.5;
  let c = 0.75;
  let tt = t;
  if (s.art === "leitung") {
    a = 0;
    b = 0.5;
    c = 1;
  }
  const pakete = [];
  let etage = null;
  const skala = s.art === "leitung" ? 1 : 0.72;
  if (t >= 1 && s.art === "nachricht") {
    return { sichtbar: alle, pakete: [], etage: null, fertig: true };
  }
  if (tt < a) {
    const pkte = wegHin(n.von, oben).slice(0, 2);
    const pos = wegPunkt(pkte, tt / a);
    pakete.push({ x: pos.x, y: pos.y, skala, alpha: 255 });
    etage = { seite: n.von, ebene: constrain(Math.round(7 - (pos.y - TURM_OBEN - ETAGE_H / 2) / ETAGE_H), 1, 7) };
  } else if (tt < b) {
    const pkte = n.von === "dns" ? wegHin("dns", oben) : wegHin(n.von, oben).slice(1);
    const u = (tt - a) / (b - a);
    if (n.verloren) {
      const pos = wegPunkt(pkte, Math.min(u, 0.88));
      const alpha = u > 0.88 ? map(u, 0.88, 1, 255, 0) : 255;
      pakete.push({ x: pos.x, y: pos.y, skala, alpha, marke: u > 0.7 ? "✗ verloren" : null });
    } else {
      const pos = wegPunkt(pkte, u);
      pakete.push({ x: pos.x, y: pos.y, skala, alpha: 255 });
    }
  } else if (tt < c || s.art === "leitung") {
    const u = s.art === "leitung" ? constrain((tt - b) / (1 - b), 0, 1) : (tt - b) / (c - b);
    if (!n.verloren) {
      for (const ziel of w.ziele) {
        const ein = torVon(n.von);
        const aus = torVon(ziel);
        const pkte = [ein, { x: ein.x, y: PFORTE_MITTE.y }, { x: aus.x, y: PFORTE_MITTE.y }].concat(wegZu(ziel));
        if (s.art === "leitung" && TURM[ziel]) {
          pkte.push({ x: TURM[ziel].x + TURM[ziel].w - 40, y: KABEL_Y });
        }
        const pos = wegPunkt(pkte, u);
        const gemeint = ziel === w.empfaenger;
        pakete.push({
          x: pos.x,
          y: pos.y,
          skala,
          alpha: 255,
          marke: u > 0.85 && !gemeint && s.art === "nachricht" ? "✗ nicht für mich" : null,
        });
      }
    }
  } else {
    const u = (tt - c) / (1 - c);
    if (!n.verloren && w.empfaenger && w.ziele.indexOf(w.empfaenger) >= 0) {
      if (w.empfaenger === "dns") {
        const pos = ANSCHLUSS.dns;
        pakete.push({ x: pos.x, y: pos.y - 20 * u, skala: skala * (1 - u * 0.6), alpha: 255 * (1 - u) });
      } else {
        const pos = wegPunkt(wegHoch(w.empfaenger, oben), u);
        pakete.push({ x: pos.x, y: pos.y, skala, alpha: 255 });
        etage = { seite: w.empfaenger, ebene: constrain(Math.round(7 - (pos.y - TURM_OBEN - ETAGE_H / 2) / ETAGE_H), 1, 7) };
      }
    }
  }
  return { sichtbar: alle, pakete, etage };
}

// ---------------------------------------------------------------------------
// Kabel
// ---------------------------------------------------------------------------
function kabelAktiv(s, lage, g) {
  if (!lage || !s.nachricht || s.art === "runter" || s.art === "hoch") {
    return false;
  }
  const n = s.nachricht;
  return n.von === g || (s.weg && s.weg.ziele && s.weg.ziele.indexOf(g) >= 0);
}

function kabel(x1, y1, x2, y2, aktiv) {
  stroke(...(aktiv ? FARBE.akzent : FARBE.kabel));
  strokeWeight(aktiv ? 5 : 4);
  line(x1, y1, x2, y2);
  stroke(255, 255, 255, 90);
  strokeWeight(1);
  line(x1, y1 - 1, x2, y2 - 1);
}

function zeichneKabel(s, lage) {
  const ok = s.kabelOk;
  if (ok) {
    kabel(ANSCHLUSS.laptop.x, KABEL_Y, TOR[1].x, KABEL_Y, kabelAktiv(s, lage, "laptop"));
  } else {
    // Kabel hängt lose herunter
    kabel(ANSCHLUSS.laptop.x, KABEL_Y, 300, KABEL_Y, false);
    noFill();
    stroke(...FARBE.kabel);
    strokeWeight(4);
    bezier(300, KABEL_Y, 318, KABEL_Y, 330, KABEL_Y + 40, 342, KABEL_Y + 62);
    noStroke();
    fill(...FARBE.senf);
    rect(336, KABEL_Y + 58, 14, 18, 2);
    if (zeigeLoesung()) {
      fill(...FARBE.akzent);
      textFont(TITEL);
      textStyle(BOLD);
      textSize(13);
      textAlign(CENTER, TOP);
      text("✗ nicht eingesteckt", 352, KABEL_Y + 78);
      textStyle(NORMAL);
    }
  }
  kabel(TOR[2].x, KABEL_Y, ANSCHLUSS.server.x, KABEL_Y, kabelAktiv(s, lage, "server"));
  kabel(ANSCHLUSS.dns.x, ANSCHLUSS.dns.y, TOR[3].x, TOR[3].y, kabelAktiv(s, lage, "dns"));
}

// ---------------------------------------------------------------------------
// Hochhäuser
// ---------------------------------------------------------------------------
// In welchem Haus liegt der Fehler der jeweiligen Schicht?
const FEHLER_SEITE = { 1: "laptop", 3: "laptop", 4: "server", 6: "server", 7: "laptop" };

function zeichneTurm(g, s, lage) {
  const tu = TURM[g];
  const geraet = GERAETE[g];
  const ip = g === "laptop" ? s.laptopIp : geraet.ip;
  const ipFalsch = g === "laptop" && ip !== geraet.ip;
  // Schild
  noStroke();
  fill(...FARBE.text);
  rect(tu.x, 122, tu.w, 34, 6, 6, 0, 0);
  fill(255);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(14);
  textAlign(LEFT, CENTER);
  text(geraet.name, tu.x + 10, 132);
  textStyle(NORMAL);
  textFont(MONO);
  textSize(10.5);
  fill(...(ipFalsch && zeigeLoesung() ? [255, 150, 160] : [210, 206, 198]));
  if (g === "server") {
    textSize(9.5);
  }
  text(g === "server" ? `${ip} · ${geraet.dns}` : ip + (ipFalsch && zeigeLoesung() ? "  ← falsches Netz" : ""), tu.x + 10, 147);

  // Etagen
  for (let e = 7; e >= 1; e--) {
    const y = etageY(e);
    const farbe = SCHICHT_FARBE[e];
    let aktiv = false;
    if (lage && lage.etage && lage.etage.seite === g && lage.etage.ebene === e) {
      aktiv = true;
    }
    const fehler = zeigeLoesung() && s.fehlerSchicht === e && FEHLER_SEITE[e] === g;
    stroke(...FARBE.linie);
    strokeWeight(1);
    fill(...(aktiv ? hell(farbe, 0.78) : fehler ? hell(FARBE.akzent, 0.86) : e % 2 ? [250, 248, 244] : [244, 240, 233]));
    rect(tu.x, y, tu.w, ETAGE_H);
    noStroke();
    fill(...farbe);
    rect(tu.x, y, 8, ETAGE_H);
    // Fenster
    fill(...(aktiv ? [255, 226, 120] : [222, 228, 234]));
    for (let i = 0; i < 2; i++) {
      rect(tu.x + tu.w - 60 + i * 26, y + 12, 18, 14, 2);
      rect(tu.x + tu.w - 60 + i * 26, y + 32, 18, 14, 2);
    }
    fill(...FARBE.text);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(12.5);
    textAlign(LEFT, TOP);
    text(`${e} ${SCHICHTEN[e].name}`, tu.x + 16, y + 9);
    textStyle(NORMAL);
    fill(...FARBE.grau);
    textSize(11);
    text(SCHICHT_KURZ[e], tu.x + 16, y + 26);
    // Extras
    textSize(10);
    fill(...FARBE.blass);
    let extra = "";
    if (e === 7) {
      extra = g === "laptop" ? "Browser" : "nginx im Docker-Container";
    } else if (e === 4 && g === "server") {
      extra = s.portOffen ? "Port 8080 → 80 · 443" : "Port 8080: kein Anschluss!";
    } else if (e === 4 && g === "laptop") {
      extra = `Port ${51234}`;
    } else if (e === 2) {
      extra = "…" + geraet.mac.slice(-8);
    } else if (e === 6 && s.zertifikat !== "gueltig" && g === "server") {
      extra = "Zertifikat abgelaufen";
    }
    if (extra) {
      if (e === 4 && g === "server" && !s.portOffen && zeigeLoesung()) {
        fill(...FARBE.akzent);
      }
      text(extra, tu.x + 16, y + 41);
    }
    if (fehler) {
      fill(...FARBE.akzent);
      textFont(TITEL);
      textStyle(BOLD);
      textSize(16);
      textAlign(RIGHT, CENTER);
      text("✗", tu.x + tu.w - 70, y + ETAGE_H / 2);
      textStyle(NORMAL);
    }
  }
  // Rahmen
  noFill();
  stroke(...FARBE.text);
  strokeWeight(2);
  rect(tu.x, TURM_OBEN, tu.w, 7 * ETAGE_H);
  // Port-LED am Kabelanschluss
  const led = g !== "laptop" || s.kabelOk;
  noStroke();
  fill(...(led ? [80, 200, 110] : [150, 150, 150]));
  circle(ANSCHLUSS[g].x + (g === "laptop" ? -6 : 6), KABEL_Y - 12, 7);
}

// ---------------------------------------------------------------------------
// Telefonauskunft (DNS-Server)
// ---------------------------------------------------------------------------
function zeichneAuskunft(s, lage) {
  const a = AUSKUNFT;
  const n = s.nachricht;
  const beteiligt = n && n.proto === "DNS";
  noStroke();
  fill(...FARBE.text);
  rect(a.x, a.y, a.w, 30, 6, 6, 0, 0);
  fill(255);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(13.5);
  textAlign(LEFT, CENTER);
  text("☎ Telefonauskunft", a.x + 10, a.y + 11);
  textStyle(NORMAL);
  textFont(MONO);
  textSize(10);
  fill(210, 206, 198);
  text(`DNS-Server · ${GERAETE.dns.ip}`, a.x + 10, a.y + 24);
  stroke(...(beteiligt ? SCHICHT_FARBE[7] : FARBE.linie));
  strokeWeight(beteiligt ? 2 : 1);
  fill(...(beteiligt ? hell(SCHICHT_FARBE[7], 0.9) : FARBE.flaeche));
  rect(a.x, a.y + 30, a.w, a.h - 30, 0, 0, 6, 6);
  noStroke();
  fill(...FARBE.grau);
  textFont(SCHRIFT);
  textSize(11);
  textAlign(LEFT, TOP);
  text("Verzeichnis (Port 53)", a.x + 10, a.y + 38);
  let y = a.y + 58;
  // welcher Name wird gerade gesucht?
  let gesucht = null;
  if (beteiligt) {
    const h7 = n.huellen.find((h) => h.n === 7);
    const m = h7 && h7.felder[0][1].match(/([a-z-]+\.jps)/);
    gesucht = m ? m[1] : null;
  }
  for (const name of Object.keys(DNS_TABELLE)) {
    const treffer = name === gesucht;
    if (treffer) {
      fill(...hell(FARBE.gruen, 0.75));
      rect(a.x + 6, y - 3, a.w - 12, 20, 4);
    }
    fill(...FARBE.text);
    textFont(MONO);
    textSize(10.5);
    textAlign(LEFT, TOP);
    text(name, a.x + 10, y);
    textAlign(RIGHT, TOP);
    text(DNS_TABELLE[name].replace("192.168.1.", "….1."), a.x + a.w - 10, y);
    y += 22;
  }
  if (gesucht === null && beteiligt) {
    const h7 = n.huellen.find((h) => h.n === 7);
    if (h7 && h7.felder[0][1].indexOf("laborsever") >= 0) {
      fill(...FARBE.akzent);
      textFont(SCHRIFT);
      textStyle(BOLD);
      textSize(11);
      textAlign(LEFT, TOP);
      text("laborsever.jps? Unbekannt!", a.x + 10, y + 2);
      textStyle(NORMAL);
    }
  }
}

// ---------------------------------------------------------------------------
// Pforte (Switch) mit MAC-Tabelle
// ---------------------------------------------------------------------------
function zeichnePforte(s, z, lage) {
  const p = PFORTE;
  const aktiv = lage && lage.pakete.length && s.art !== "runter" && s.art !== "hoch";
  noStroke();
  fill(...FARBE.text);
  rect(p.x, p.y, p.w, 30, 6, 6, 0, 0);
  fill(255);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(13.5);
  textAlign(LEFT, CENTER);
  text("Pforte", p.x + 10, p.y + 11);
  textStyle(NORMAL);
  textFont(SCHRIFT);
  textSize(10);
  fill(210, 206, 198);
  text("Switch · Schicht 2", p.x + 10, p.y + 24);
  stroke(...(aktiv ? SCHICHT_FARBE[2] : FARBE.linie));
  strokeWeight(aktiv ? 2 : 1);
  fill(...FARBE.flaeche);
  rect(p.x, p.y + 30, p.w, p.h - 30, 0, 0, 6, 6);
  // Tore
  for (const nr of [1, 2, 3]) {
    const t = TOR[nr];
    noStroke();
    fill(...FARBE.text);
    rect(t.x - 7, t.y - 7, 14, 14, 2);
    fill(255);
    textFont(MONO);
    textStyle(BOLD);
    textSize(9);
    textAlign(CENTER, CENTER);
    text(nr, t.x, t.y);
    textStyle(NORMAL);
  }
  // Tafel
  noStroke();
  fill(...FARBE.grau);
  textFont(SCHRIFT);
  textSize(10.5);
  textAlign(LEFT, TOP);
  text("Tafel (MAC-Tabelle)", p.x + 14, p.y + 40);
  const eintraege = Object.keys(z.mac);
  let y = p.y + 58;
  if (!eintraege.length) {
    fill(...FARBE.blass);
    textSize(10.5);
    text("noch leer", p.x + 14, y);
  }
  for (const mac of Object.keys(GERAETE).map((k) => GERAETE[k].mac)) {
    if (z.mac[mac] === undefined) {
      continue;
    }
    fill(...FARBE.flaeche2);
    rect(p.x + 10, y - 2, p.w - 20, 18, 3);
    fill(...FARBE.text);
    textFont(MONO);
    textSize(10);
    textAlign(LEFT, TOP);
    text("…" + mac.slice(-8), p.x + 14, y + 1);
    textAlign(RIGHT, TOP);
    text(`Tor ${z.mac[mac]}`, p.x + p.w - 14, y + 1);
    y += 21;
  }
}

// ---------------------------------------------------------------------------
// Mr. Shark
// ---------------------------------------------------------------------------
function zeichneHai(s, t) {
  const x = HAI.x;
  const y = HAI.y + 6;
  const n = s.nachricht;
  const lauscht = n && (s.art === "nachricht" || s.art === "leitung") && (n.von === "laptop" || (s.weg.ziele || []).indexOf("laptop") >= 0) && t > 0.3 && t < 0.9;
  const wipp = lauscht ? sin(millis() / 90) * 2 : sin(millis() / 600) * 1.5;
  push();
  translate(x, y + wipp);
  // Abhörklemme am Kabel
  stroke(...FARBE.senf);
  strokeWeight(2);
  line(0, -6, 0, 10);
  noStroke();
  fill(...FARBE.senf);
  rect(-6, -10, 12, 8, 2);
  // Körper
  fill(...FARBE.hai);
  ellipse(0, 34, 70, 36);
  triangle(-6, 18, 10, 18, 0, 4); // Flosse
  triangle(30, 34, 46, 22, 46, 46); // Schwanz
  fill(232, 238, 242);
  ellipse(-6, 40, 44, 16); // Bauch
  // Sonnenbrille
  fill(20);
  rect(-30, 26, 14, 8, 3);
  rect(-14, 26, 14, 8, 3);
  stroke(20);
  strokeWeight(1.5);
  line(-16, 29, -14, 29);
  noStroke();
  // Grinsen
  stroke(255);
  strokeWeight(1.5);
  noFill();
  arc(-20, 40, 18, 8, 0.2, PI - 0.4);
  // Kopfhörer
  noFill();
  stroke(30);
  strokeWeight(2.5);
  arc(-8, 26, 34, 26, PI, TWO_PI);
  noStroke();
  fill(30);
  rect(-27, 22, 6, 9, 2);
  rect(6, 22, 6, 9, 2);
  pop();
  // Namensschild
  noStroke();
  fill(...(haiSicht ? FARBE.akzent : FARBE.text));
  textFont(TITEL);
  textStyle(BOLD);
  textSize(12);
  textAlign(CENTER, TOP);
  text("Mr. Shark", x, y + 56);
  textStyle(NORMAL);
}

function zeichneBlase(z) {
  const b = BLASE;
  noStroke();
  fill(29, 29, 28, 12);
  rect(b.x + 1, b.y + 3, b.w, b.h, 12);
  fill(...hell(FARBE.hai, 0.88));
  stroke(...FARBE.hai);
  strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 12);
  // Zipfel zum Hai
  fill(...hell(FARBE.hai, 0.88));
  triangle(HAI.x - 14, b.y + b.h - 1, HAI.x + 10, b.y + b.h - 1, HAI.x - 4, b.y + b.h + 24);
  stroke(...FARBE.hai);
  line(HAI.x - 14, b.y + b.h, HAI.x - 4, b.y + b.h + 24);
  line(HAI.x + 10, b.y + b.h, HAI.x - 4, b.y + b.h + 24);
  noStroke();
  fill(...FARBE.hai);
  textFont(TITEL);
  textStyle(BOLD);
  textSize(11.5);
  textAlign(LEFT, TOP);
  text("Mr. Shark murmelt:", b.x + 12, b.y + 8);
  textStyle(NORMAL);
  absatz(z.hai, b.x + 12, b.y + 26, b.w - 24, 12.5, FARBE.text, false, 3);
}

// ---------------------------------------------------------------------------
// Paket: ineinander geschachtelte Hüllen in den Farben der Schichten
// ---------------------------------------------------------------------------
function zeichnePaket(cx, cy, n, sichtbar, skala, alpha, marke) {
  if (!n) {
    return;
  }
  const lagen = n.huellen
    .map((h) => h.n)
    .filter((x) => !sichtbar || sichtbar.indexOf(x) >= 0)
    .sort((a, b) => a - b);
  const geheim = {};
  for (const h of n.huellen) {
    geheim[h.n] = h.geheim;
  }
  push();
  translate(cx, cy);
  scale(skala);
  const kern = 14;
  const schritt = 7;
  lagen.forEach((nr, i) => {
    const rest = lagen.length - i;
    const w = kern + rest * schritt;
    const h = w * 0.7;
    const f = SCHICHT_FARBE[nr];
    if (nr === 1) {
      noFill();
      stroke(f[0], f[1], f[2], alpha);
      strokeWeight(2);
      drawingContext.setLineDash([4, 3]);
      rect(-w / 2, -h / 2, w, h, 4);
      drawingContext.setLineDash([]);
      return;
    }
    stroke(255, 255, 255, alpha);
    strokeWeight(1);
    if (geheim[nr] && haiSicht) {
      fill(120, 120, 120, alpha);
    } else {
      fill(f[0], f[1], f[2], alpha);
    }
    rect(-w / 2, -h / 2, w, h, 4);
  });
  // Schloss bei verschlüsseltem Inhalt
  if (n.huellen.some((h) => h.geheim)) {
    noStroke();
    fill(255, 214, 90, alpha);
    rect(-5, -2, 10, 8, 1);
    noFill();
    stroke(255, 214, 90, alpha);
    strokeWeight(1.5);
    arc(0, -2, 7, 8, PI, TWO_PI);
  }
  pop();
  if (marke) {
    noStroke();
    fill(200, 30, 58, alpha);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(11);
    textAlign(CENTER, TOP);
    text(marke, cx, cy + 22);
    textStyle(NORMAL);
  }
}

// =============================================================================
// Paketlupe: alle Hüllen der aktuellen Nachricht
// =============================================================================
function kauderwelsch(text, saat) {
  const zeichen = "#%&$@*?!§~^=+";
  let r = "";
  let x = saat;
  for (let i = 0; i < Math.min(text.length, 34); i++) {
    x = (x * 31 + 7) % 997;
    r += text[i] === " " ? " " : zeichen[x % zeichen.length];
  }
  return r;
}

function zeichnePaketlupe() {
  const p = P_PAKET;
  p.titel = haiSicht ? "Paketlupe · Sicht von Mr. Shark" : "Paketlupe · Absender-Sicht";
  panel(p);
  const s = aktSchritt();
  const x = p.x + 16;
  let y = p.y + KOPF_H + 8;
  const b = p.w - 32;
  if (!s || !s.nachricht) {
    absatz("Gerade ist kein Paket unterwegs. Sobald eine Nachricht verschickt wird, siehst du hier alle Hüllen – von innen (Schicht 7) nach außen (Schicht 1).", x, y + 6, b, 13, FARBE.blass);
    return;
  }
  const n = s.nachricht;
  const sichtbar = s.sichtbar;
  const zeilenH = Math.min(24, (p.h - KOPF_H - 14) / n.huellen.length);
  for (const h of n.huellen) {
    const da = !sichtbar || sichtbar.indexOf(h.n) >= 0;
    const aktiv = s.ebene === h.n && (s.art === "runter" || s.art === "hoch");
    const f = SCHICHT_FARBE[h.n];
    const verdeckt = haiSicht && h.geheim;
    noStroke();
    if (aktiv) {
      fill(...hell(f, 0.82));
      rect(x - 6, y - 2, b + 12, zeilenH, 4);
    }
    fill(...(da ? f : hell(f, 0.7)));
    rect(x, y + 1, 26, zeilenH - 6, 3);
    fill(255);
    textFont(MONO);
    textStyle(BOLD);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("L" + h.n, x + 13, y + zeilenH / 2 - 2);
    textStyle(NORMAL);
    fill(...(da ? FARBE.text : FARBE.blass));
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(11.5);
    textAlign(LEFT, CENTER);
    let titel = h.titel;
    text(titel, x + 34, y + zeilenH / 2 - 2);
    const tw = Math.max(118, textWidth(titel) + 10);
    textStyle(NORMAL);
    textFont(MONO);
    textSize(10.5);
    let inhalt;
    if (!da) {
      inhalt = s.art === "hoch" ? "(schon ausgepackt)" : "(noch nicht verpackt)";
    } else if (verdeckt) {
      inhalt = kauderwelsch(h.felder.map((f2) => f2[1]).join(" "), h.n * 13 + 5);
      fill(...FARBE.blass);
    } else {
      inhalt = h.felder.map((f2) => (f2[0] ? `${f2[0]}: ${f2[1]}` : f2[1])).join(" · ");
    }
    const platz = b - tw - 34;
    const volltext = inhalt;
    let gekuerzt = false;
    while (textWidth(inhalt + "…") > platz && inhalt.length > 4) {
      inhalt = inhalt.slice(0, -2);
      gekuerzt = true;
    }
    if (gekuerzt) {
      inhalt += "…";
      merkeTooltip(`L${h.n} ${titel}: ${volltext}`, { x: x - 6, y: y - 2, w: b + 12, h: zeilenH });
    }
    text(inhalt, x + 34 + tw, y + zeilenH / 2 - 2);
    y += zeilenH;
  }
}

// =============================================================================
// Mitschnitt (wie Wireshark)
// =============================================================================
function zeichneMitschnitt() {
  const p = P_MITSCHNITT;
  panel(p);
  const z = sichtbarerZustand();
  const x = p.x + 12;
  const b = p.w - 24;
  let y = p.y + KOPF_H + 8;
  noStroke();
  fill(...FARBE.blass);
  textFont(MONO);
  textSize(10);
  textAlign(LEFT, TOP);
  text("Nr", x + 2, y);
  text("Protokoll", x + 28, y);
  text("Info", x + 96, y);
  y += 16;
  if (!z) {
    return;
  }
  const liste = z.mitschnitt;
  if (!liste.length) {
    absatz("Noch nichts mitgeschnitten. Mr. Shark sieht nur, was über das Kabel der Laptop GmbH läuft.", x + 2, y + 6, b - 4, 12, FARBE.blass);
    return;
  }
  const zeilenH = 19;
  const max = Math.floor((p.y + p.h - 8 - y) / zeilenH);
  const start = Math.max(0, liste.length - max);
  for (let i = start; i < liste.length; i++) {
    const e = liste[i];
    const neu = i === liste.length - 1;
    noStroke();
    if (e.fehler) {
      fill(30, 30, 30);
    } else {
      fill(...(PROTO_FARBE[e.proto] || FARBE.flaeche2));
    }
    rect(x, y, b, zeilenH - 2, 3);
    if (neu) {
      stroke(...FARBE.akzent);
      strokeWeight(1.5);
      noFill();
      rect(x, y, b, zeilenH - 2, 3);
      noStroke();
    }
    fill(...(e.fehler ? [255, 110, 120] : FARBE.text));
    textFont(MONO);
    textSize(10.5);
    textAlign(LEFT, CENTER);
    text(e.nr, x + 4, y + zeilenH / 2 - 1);
    textStyle(BOLD);
    text(e.proto, x + 28, y + zeilenH / 2 - 1);
    textStyle(NORMAL);
    let info = e.info;
    while (textWidth(info) > b - 102 && info.length > 4) {
      info = info.slice(0, -2);
    }
    if (info !== e.info) {
      info += "…";
      merkeTooltip(`${e.nr}  ${e.proto}  ${e.info}`, { x, y, w: b, h: zeilenH - 2 });
    }
    text(info, x + 96, y + zeilenH / 2 - 1);
    y += zeilenH;
  }
}

// =============================================================================
// Lagebericht (rechts oben)
// =============================================================================
function zeichneLagebericht() {
  const p = P_ERKL;
  p.titel = modus === "pruefung" ? "Prüfung" : "Lagebericht";
  panel(p);
  const x = p.x + 20;
  let y = p.y + KOPF_H + 14;
  const b = p.w - 40;
  if (modus === "pruefung") {
    zeichnePruefungsInfo(x, y, b);
    return;
  }
  const s = aktSchritt();
  if (!s) {
    return;
  }
  // Titel und Schrittzähler
  noStroke();
  fill(...FARBE.blass);
  textFont(SCHRIFT);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`${sim.titel} · Schritt ${schrittIdx + 1} von ${sim.schritte.length}`, x, y);
  // Schichten-Chips
  const n = s.nachricht;
  const da = n ? n.huellen.map((h) => h.n) : [];
  let cx = x + b - 7 * 30;
  for (let e = 7; e >= 1; e--) {
    const aktiv = s.ebene === e && (s.art === "runter" || s.art === "hoch");
    const f = SCHICHT_FARBE[e];
    const fehler = s.fehlerSchicht === e;
    fill(...(fehler ? FARBE.akzent : da.indexOf(e) >= 0 ? f : hell(f, 0.8)));
    if (aktiv) {
      stroke(...FARBE.text);
      strokeWeight(2);
    } else {
      noStroke();
    }
    rect(cx, y - 3, 26, 22, 4);
    noStroke();
    fill(255);
    textFont(MONO);
    textStyle(BOLD);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(e, cx + 13, y + 8);
    textStyle(NORMAL);
    cx += 30;
  }
  y += 30;
  if (s.fehlerSchicht) {
    noStroke();
    fill(...hell(FARBE.akzent, 0.88));
    rect(x, y, b, 26, 6);
    fill(...FARBE.akzent);
    textFont(SCHRIFT);
    textStyle(BOLD);
    textSize(13);
    textAlign(LEFT, CENTER);
    text(`✗ Hier hakt es: Schicht ${s.fehlerSchicht} · ${SCHICHTEN[s.fehlerSchicht].name} (${SCHICHT_KURZ[s.fehlerSchicht]})`, x + 10, y + 13);
    textStyle(NORMAL);
    y += 36;
  }
  absatz(s.text, x, y, b, 15, FARBE.text, false, 7);
  zeichneNotizen(x, p.y + p.h - 98, b);
}

// Browser, ARP- und DNS-Cache der Laptop GmbH
function zeichneNotizen(x, y, b) {
  const z = sichtbarerZustand();
  if (!z) {
    return;
  }
  noStroke();
  const fehler = z.browser.indexOf("✗") === 0 || z.browser.indexOf("⚠") === 0;
  fill(...(fehler ? hell(FARBE.akzent, 0.9) : FARBE.flaeche2));
  rect(x, y, b, 30, 6);
  fill(...FARBE.blass);
  textFont(SCHRIFT);
  textSize(11);
  textAlign(LEFT, CENTER);
  text("Browser", x + 10, y + 15);
  fill(...(fehler ? FARBE.akzent : FARBE.text));
  textFont(MONO);
  textSize(12);
  let br = z.browser || "(lädt …)";
  while (textWidth(br) > b - 80 && br.length > 4) {
    br = br.slice(0, -2);
  }
  text(br, x + 70, y + 15);
  // Caches
  const halb = (b - 10) / 2;
  const notiz = (nx, titel, eintraege) => {
    noStroke();
    fill(255, 247, 214);
    rect(nx, y + 38, halb, 50, 4);
    fill(...FARBE.grau);
    textFont(SCHRIFT);
    textSize(10.5);
    textAlign(LEFT, TOP);
    text(titel, nx + 8, y + 42);
    fill(...FARBE.text);
    textFont(MONO);
    textSize(10);
    if (!eintraege.length) {
      fill(...FARBE.blass);
      text("leer", nx + 8, y + 58);
    }
    eintraege.slice(0, 2).forEach((zeile, i) => text(zeile, nx + 8, y + 57 + i * 14));
  };
  notiz(
    x,
    "ARP-Cache der Laptop GmbH (IP → MAC)",
    Object.keys(z.arp).map((k) => `${k} → …${z.arp[k].slice(-8)}`)
  );
  notiz(
    x + halb + 10,
    "DNS-Cache der Laptop GmbH (Name → IP)",
    Object.keys(z.dnsCache).map((k) => `${k} → ${z.dnsCache[k]}`)
  );
}

function zeichnePruefungsInfo(x, y, b) {
  y += absatz(`Freigabeprüfung · ${STUFEN[stufe].rang}`, x, y, b, 18, FARBE.text, true) + 8;
  absatz(`Beantworte die Fragen rechts unten. ${SERIE_ZIEL} richtige Antworten in Folge ergeben das Prüfsiegel. Welt, Paketlupe und Mitschnitt zeigen das Szenario, um das es geht.`, x, y, b, 13, FARBE.grau);
  y += 54;
  // Serie: Pakete
  const abstand = Math.min(90, b / SERIE_ZIEL);
  for (let i = 0; i < SERIE_ZIEL; i++) {
    const px = x + i * abstand + 34;
    const an = i < serie;
    const lagen = [2, 3, 4, 7];
    lagen.forEach((nr, j) => {
      const w = 56 - j * 12;
      noStroke();
      fill(...(an ? SCHICHT_FARBE[nr] : hell([150, 146, 138], 0.3 + j * 0.15)));
      rect(px - w / 2, y + 22 - w * 0.35, w, w * 0.7, 4);
    });
  }
  y += 52;
  noStroke();
  fill(...FARBE.grau);
  textFont(MONO);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`${serie} / ${SERIE_ZIEL} in Folge`, x, y);
  y += 26;
  if (rueckmeldung) {
    const farbe = rueckmeldung.ok ? FARBE.gruen : FARBE.akzent;
    textFont(SCHRIFT);
    textSize(13);
    const zeilen = umbrechen(aufgabe.erklaerung || "", b - 24);
    const hBox = 34 + zeilen.length * 18 + 10;
    noStroke();
    fill(...hell(farbe, 0.88));
    rect(x, y, b, hBox, 8);
    fill(...farbe);
    textStyle(BOLD);
    textSize(14);
    textAlign(LEFT, TOP);
    text((rueckmeldung.ok ? "✓ " : "✗ ") + rueckmeldung.text, x + 12, y + 10);
    textStyle(NORMAL);
    absatz(aufgabe.erklaerung || "", x + 12, y + 34, b - 24, 13, FARBE.text);
  }
  if (aufloesung) {
    const s = aktSchritt();
    if (s) {
      absatz(s.text, x, P_ERKL.y + P_ERKL.h - 66, b, 12.5, FARBE.grau, false, 3);
    }
  }
}

// =============================================================================
// Steuerung (rechts unten)
// =============================================================================
function zeichneSteuerung() {
  const p = P_STEUER;
  p.titel = modus === "pruefung" ? "Frage" : "Steuerung";
  panel(p);
  const x = p.x + 18;
  const b = p.w - 36;
  const y = p.y + KOPF_H + 12;
  mcRechtecke = [];
  if (modus === "pruefung") {
    if (!aufgabe) {
      return;
    }
    const h = absatz(aufgabe.frage, x, y, b, 14, FARBE.text, true, 6);
    if (aufgabe.art === "mc") {
      let yy = Math.max(y + h + 10, p.y + 140);
      aufgabe.optionen.forEach((o, i) => {
        textFont(SCHRIFT);
        textSize(12.5);
        const zeilen = umbrechen(o, b - 40);
        const bh = Math.max(36, zeilen.length * 16 + 14);
        const r = { x, y: yy, w: b, h: bh };
        mcRechtecke.push(r);
        const hover = !rueckmeldung && inRechteck(mausPos(), r);
        let fuell = hover ? hell(FARBE.akzent, 0.92) : FARBE.flaeche2;
        let rahmen = hover ? FARBE.akzent : FARBE.linie;
        if (rueckmeldung) {
          if (i === aufgabe.richtig) {
            fuell = hell(FARBE.gruen, 0.82);
            rahmen = FARBE.gruen;
          } else if (i === antwortIdx) {
            fuell = hell(FARBE.akzent, 0.85);
            rahmen = FARBE.akzent;
          }
        }
        fill(...fuell);
        stroke(...rahmen);
        strokeWeight(1.5);
        rect(r.x, r.y, r.w, r.h, 8);
        noStroke();
        fill(...FARBE.grau);
        textFont(MONO);
        textStyle(BOLD);
        textSize(12);
        textAlign(LEFT, TOP);
        text("ABCD"[i], r.x + 10, r.y + 8);
        textStyle(NORMAL);
        fill(...FARBE.text);
        textFont(SCHRIFT);
        textSize(12.5);
        zeilen.forEach((zl, j) => text(zl, r.x + 30, r.y + 8 + j * 16));
        yy += bh + 6;
      });
    }
    return;
  }
  noStroke();
  fill(...FARBE.grau);
  textFont(SCHRIFT);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text("Szenario", x, p.y + 58);
  absatz(STUFEN[stufe].auftrag, x, p.y + 124, b, 13, FARBE.text, false, 9);
}

function zeichneFreigaben() {
  const p = P_FREIGABE;
  panel(p);
  const x = p.x + 14;
  const y = p.y + KOPF_H + 12;
  STUFEN.forEach((st, i) => {
    const zy = y + i * 52;
    const ok = freigaben[i];
    if (ok) {
      noStroke();
      fill(...FARBE.akzent);
      circle(x + 12, zy + 14, 22);
      fill(255);
      textFont(SCHRIFT);
      textStyle(BOLD);
      textSize(12);
      textAlign(CENTER, CENTER);
      text("✓", x + 12, zy + 15);
      textStyle(NORMAL);
    } else {
      noFill();
      stroke(...FARBE.linie);
      strokeWeight(2);
      drawingContext.setLineDash([3, 3]);
      circle(x + 12, zy + 14, 22);
      drawingContext.setLineDash([]);
    }
    noStroke();
    fill(...(i === stufe ? FARBE.akzent : ok ? FARBE.text : FARBE.blass));
    textFont(SCHRIFT);
    textStyle(i === stufe ? BOLD : NORMAL);
    textSize(12.5);
    textAlign(LEFT, TOP);
    text(`${i + 1} · ${st.name}`, x + 30, zy + 2);
    textStyle(NORMAL);
    fill(...(ok ? FARBE.grau : FARBE.blass));
    textSize(11);
    text(st.rang, x + 30, zy + 19);
  });
  const anzahl = freigaben.filter((f) => f).length;
  noStroke();
  textFont(SCHRIFT);
  textSize(11);
  textAlign(LEFT, TOP);
  fill(...(anzahl === 6 ? FARBE.akzent : FARBE.blass));
  absatz(anzahl === 6 ? "Alle Freigaben: Chefdetektiv der Paketreise!" : `${anzahl} von 6 Prüfsiegeln`, x, y + 6 * 52, p.w - 28, 11, anzahl === 6 ? FARBE.akzent : FARBE.blass);
}

function zeichneStempel() {
  if (!stempel) {
    return;
  }
  const t = millis() - stempel.t0;
  if (t > 3200) {
    stempel = null;
    return;
  }
  const p = P_WELT;
  const fall = 1 - weich(t / 300);
  const alpha = t > 2600 ? map(t, 2600, 3200, 255, 0) : 255;
  push();
  translate(p.x + p.w / 2, p.y + p.h / 2 + 10);
  rotate(-0.18);
  scale(1 + fall * 1.5);
  noStroke();
  fill(255, 255, 255, alpha * 0.85);
  circle(0, 0, 250);
  noFill();
  stroke(200, 30, 58, alpha);
  strokeWeight(7);
  circle(0, 0, 250);
  strokeWeight(2.5);
  circle(0, 0, 222);
  noStroke();
  fill(200, 30, 58, alpha);
  textFont(TITEL);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  textSize(30);
  text("FREIGEGEBEN", 0, -8);
  textSize(16);
  text(STUFEN[stempel.stufe].rang.toUpperCase(), 0, 26);
  textSize(11);
  text("Paketreise · Laborserver", 0, 56);
  textStyle(NORMAL);
  pop();
}

function zeichneFehlerMeldung() {
  if (!fehlerMeldung || millis() - fehlerMeldung.t0 > 8000) {
    return;
  }
  noStroke();
  fill(200, 30, 58, 235);
  rect(24, 846, 900, 34, 8);
  fill(255);
  textFont(SCHRIFT);
  textSize(13);
  textAlign(LEFT, CENTER);
  text("Interner Fehler (bitte neu laden): " + fehlerMeldung.text, 36, 863);
}
