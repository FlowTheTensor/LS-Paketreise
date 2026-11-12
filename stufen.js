// =============================================================================
//  stufen.js – Freigabestufen, Szenarien je Stufe, Prüfungsfragen
// =============================================================================

const SERIE_ZIEL = 5;

const STUFEN = [
  {
    id: "kapselung",
    name: "Kapselung",
    rang: "Praktikant",
    untertitel: "Stufe 1 · Sieben Etagen, sieben Hüllen: das OSI-Modell",
    szenarien: ["kapselAnfrage", "kapselAntwort"],
    auftrag: "Verfolge eine Anfrage Etage für Etage: Beim Absender packt jede Abteilung eine Hülle dazu, beim Empfänger nimmt die Partner-Abteilung genau diese Hülle wieder ab.",
  },
  {
    id: "dns",
    name: "DNS",
    rang: "Telefonist",
    untertitel: "Stufe 2 · Die Telefonauskunft übersetzt Namen in IP-Adressen",
    szenarien: ["dnsOk", "dnsNx"],
    auftrag: "Menschen merken sich Namen, die Routenplanung braucht IP-Adressen. Beobachte, wie die Laptop GmbH bei der Telefonauskunft nachfragt – und was bei einem Tippfehler passiert.",
  },
  {
    id: "arp",
    name: "ARP & Pforte",
    rang: "Pförtner",
    untertitel: "Stufe 3 · MAC-Adressen finden, der Switch lernt mit",
    szenarien: ["arpErst", "arpBekannt"],
    auftrag: "Die Poststelle braucht zur IP die MAC-Adresse. Achte auf die Lautsprecherdurchsage (Broadcast) und darauf, wie sich die Tafel der Pforte (MAC-Tabelle) füllt.",
  },
  {
    id: "tcp",
    name: "TCP & Ports",
    rang: "Versandleiter",
    untertitel: "Stufe 4 · Handshake, Durchwahlen und Empfangsbestätigungen",
    szenarien: ["tcpHttp", "tcpVerlust"],
    auftrag: "Die Versandabteilung baut erst eine Verbindung auf (Drei-Wege-Handshake), schickt dann an eine Durchwahl (Port) und lässt sich jede Lieferung quittieren.",
  },
  {
    id: "https",
    name: "HTTP · HTTPS",
    rang: "Sicherheitschef",
    untertitel: "Stufe 5 · Was Mr. Shark mitlesen kann – und was nicht",
    szenarien: ["httpKlar", "https", "komplett"],
    auftrag: "Vergleiche die Anmeldung mit HTTP und mit HTTPS. Schalte die Lupe auf „Sicht von Mr. Shark“ und schau, welche Hüllen er lesen kann.",
  },
  {
    id: "fehler",
    name: "Fehlersuche",
    rang: "Netzwerk-Detektiv",
    untertitel: "Stufe 6 · Typische Laborfehler im Mitschnitt erkennen",
    szenarien: ["fehlerKabel", "fehlerName", "fehlerSubnetz", "fehlerPort", "fehlerZertifikat"],
    auftrag: "Fünf typische Fehler aus dem Labor. Lies den Mitschnitt von Mr. Shark wie ein Detektiv: Bis zu welcher Etage klappt es noch – und wo bleibt es hängen?",
  },
];

// Namen der Szenarien für die Auswahlliste
const SZENARIO_NAMEN = {
  kapselAnfrage: "Anfrage: Laptop GmbH → Laborserver AG",
  kapselAntwort: "Antwort: Laborserver AG → Laptop GmbH",
  dnsOk: "laborserver.jps nachschlagen",
  dnsNx: "Tippfehler: laborsever.jps",
  arpErst: "Erster Kontakt (alles leer)",
  arpBekannt: "Später (alles gelernt)",
  tcpHttp: "Verbindung, Anfrage, Antwort",
  tcpVerlust: "Ein Paket geht verloren",
  httpKlar: "Anmelden mit HTTP",
  https: "Anmelden mit HTTPS",
  komplett: "Die komplette Reise (alles leer)",
  fehlerKabel: "Fall 1: „Keine Verbindung“",
  fehlerName: "Fall 2: „Seite nicht gefunden“",
  fehlerSubnetz: "Fall 3: „Zeitüberschreitung“",
  fehlerPort: "Fall 4: „Verbindung verweigert“",
  fehlerZertifikat: "Fall 5: „Nicht sicher“",
};

// Lösung der Fehlerfälle
const FEHLER_FAELLE = {
  fehlerKabel: { schicht: 1, ursache: "Das Netzwerkkabel steckt nicht (keine Port-LED)", meldung: "Keine Internetverbindung" },
  fehlerName: { schicht: 7, ursache: "Tippfehler im Servernamen – DNS kennt ihn nicht (NXDOMAIN)", meldung: "DNS_PROBE_FINISHED_NXDOMAIN" },
  fehlerSubnetz: { schicht: 3, ursache: "Falsche IP-Adresse: Laptop liegt in einem anderen Subnetz", meldung: "Zeitüberschreitung" },
  fehlerPort: { schicht: 4, ursache: "Container ohne -p 8080:80 gestartet – Port nicht freigegeben", meldung: "ERR_CONNECTION_REFUSED" },
  fehlerZertifikat: { schicht: 6, ursache: "Das Zertifikat des Servers ist abgelaufen", meldung: "Diese Verbindung ist nicht sicher" },
};

// -----------------------------------------------------------------------------
// Hilfen
// -----------------------------------------------------------------------------
function zufall(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function waehle(liste) {
  return liste[zufall(0, liste.length - 1)];
}
function mischen(liste) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = zufall(0, i);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Multiple Choice: erste Option ist die richtige, wird gemischt
function mc(frage, optionen, erklaerung, szenario) {
  const gemischt = mischen(optionen.map((o, i) => ({ o, richtig: i === 0 })));
  return { art: "mc", frage, optionen: gemischt.map((x) => x.o), richtig: gemischt.findIndex((x) => x.richtig), erklaerung, szenario };
}

function zahl(frage, antwort, erklaerung, szenario) {
  return { art: "zahl", frage, antwort, erklaerung, szenario };
}

// -----------------------------------------------------------------------------
// Fragen
// -----------------------------------------------------------------------------
const FELDER = [
  ["die Ziel-IP-Adresse", 3],
  ["die Quell-IP-Adresse", 3],
  ["die TTL (Lebensdauer des Pakets)", 3],
  ["die Ziel-MAC-Adresse", 2],
  ["die Quell-MAC-Adresse", 2],
  ["die Prüfsumme (FCS) des Frames", 2],
  ["der Ziel-Port (Durchwahl)", 4],
  ["die Sequenznummer", 4],
  ["die Flags SYN und ACK", 4],
  ["der Befehl „GET / HTTP/1.1“", 7],
  ["die DNS-Frage „Welche IP hat laborserver.jps?“", 7],
  ["die TLS-Verschlüsselung", 6],
  ["die Zeichenkodierung (UTF-8)", 6],
  ["der Auf- und Abbau der Sitzung", 5],
  ["die elektrischen Signale auf dem Kupferkabel", 1],
];

const MC_KAPSEL = [
  ["In welcher Reihenfolge packt der Absender die Hüllen?", ["von Schicht 7 nach unten bis Schicht 1", "von Schicht 1 nach oben bis Schicht 7", "alle Schichten gleichzeitig", "nur die Schichten 1, 2 und 3"], "Beim Absender wandert die Nachricht von oben (Anwendung) nach unten (Kabel)."],
  ["Welche Hülle liegt beim Ethernet-Frame ganz außen (abgesehen von den Bits)?", ["die Hülle der Schicht 2 mit den MAC-Adressen", "die IP-Hülle der Schicht 3", "die TCP-Hülle der Schicht 4", "die HTTP-Anfrage"], "Zuletzt verpackt die Poststelle (Schicht 2) – deshalb liegt ihre Hülle außen."],
  ["Mit wem „spricht“ die Versandabteilung (Schicht 4) der Laptop GmbH?", ["mit der Versandabteilung (Schicht 4) der Laborserver AG", "mit der Pforte (Switch)", "mit der Poststelle der eigenen Firma", "mit Mr. Shark"], "Jede Schicht kommuniziert logisch mit ihrer Partner-Schicht auf der Gegenseite."],
  ["Was macht eine Schicht beim Empfänger?", ["Sie nimmt die Hülle ihrer Partner-Schicht ab und reicht den Rest nach oben", "Sie packt eine weitere Hülle dazu", "Sie schickt alles sofort zurück", "Sie verschlüsselt den Inhalt"], "Entkapselung: Jede Etage nimmt genau ihre Hülle ab."],
  ["Wie heißt die Einheit der Schicht 3?", ["Paket", "Frame", "Segment", "Bit"], "Schicht 2: Frame · Schicht 3: Paket · Schicht 4: Segment (bzw. Datagramm bei UDP)."],
  ["Wie heißt die Einheit der Schicht 2?", ["Frame", "Paket", "Segment", "Sitzung"], "Die Poststelle verschickt Frames mit MAC-Adressen."],
];

const MC_DNS = [
  ["Wozu dient DNS?", ["Es übersetzt Namen wie laborserver.jps in IP-Adressen", "Es verschlüsselt Webseiten", "Es vergibt MAC-Adressen", "Es verbindet Kabel"], "DNS ist die Telefonauskunft des Netzes."],
  ["Über welchen Port fragt man einen DNS-Server?", ["53", "80", "443", "8080"], "DNS lauscht auf Port 53 (meist über UDP)."],
  ["Was bedeutet die DNS-Antwort NXDOMAIN?", ["Den angefragten Namen gibt es nicht", "Der Server ist überlastet", "Die Verbindung ist verschlüsselt", "Das Kabel ist nicht eingesteckt"], "Non-Existent Domain – meist ein Tippfehler."],
  ["Warum fragt der Laptop beim zweiten Aufruf nicht erneut nach?", ["Die Antwort steht noch im DNS-Cache", "Der Switch hat sich die IP gemerkt", "DNS funktioniert nur einmal", "Der Server schickt die IP von selbst"], "Antworten werden eine Zeit lang zwischengespeichert."],
  ["Welches Transportprotokoll nutzt eine normale DNS-Anfrage?", ["UDP", "TCP mit Handshake", "HTTPS", "ARP"], "Eine kurze Frage, eine kurze Antwort – dafür reicht UDP ohne Verbindungsaufbau."],
  ["Auf welcher OSI-Schicht ist DNS angesiedelt?", ["Schicht 7 (Anwendung)", "Schicht 3 (Vermittlung)", "Schicht 2 (Sicherung)", "Schicht 4 (Transport)"], "DNS ist ein Anwendungsprotokoll – es nutzt UDP und IP darunter."],
  ["Im Browser steht http://192.168.1.20:8080. Wird eine DNS-Anfrage gestellt?", ["Nein – die IP-Adresse ist ja schon bekannt", "Ja, immer", "Ja, aber nur für den Port", "Nur bei HTTPS"], "DNS wird nur gebraucht, wenn ein Name aufgelöst werden muss."],
];

const MC_ARP = [
  ["Wozu dient ARP?", ["Es findet zu einer bekannten IP-Adresse die MAC-Adresse", "Es findet zu einem Namen die IP-Adresse", "Es verschlüsselt Frames", "Es vergibt IP-Adressen"], "ARP verbindet Schicht 3 (IP) und Schicht 2 (MAC)."],
  ["An welche Ziel-MAC geht eine ARP-Anfrage?", ["ff:ff:ff:ff:ff:ff (Broadcast an alle)", "an die MAC des Servers", "an die MAC des Switches", "00:00:00:00:00:00"], "Die MAC ist ja noch unbekannt – also eine Durchsage an alle."],
  ["Woher lernt der Switch, welche MAC hinter welchem Port sitzt?", ["aus der Quell-MAC jedes ankommenden Frames", "aus der Ziel-IP", "aus DNS-Antworten", "der Lehrer trägt es ein"], "Jeder Frame verrät, von welchem Port er kam – das merkt sich der Switch."],
  ["Was macht ein Switch mit einem Frame an eine unbekannte Ziel-MAC?", ["Er schickt ihn an alle anderen Ports (Fluten)", "Er verwirft ihn", "Er schickt ihn zurück", "Er fragt den DNS-Server"], "Unbekanntes Ziel → fluten. Die Antwort verrät dann den richtigen Port."],
  ["Auf welcher OSI-Schicht arbeitet ein einfacher Switch?", ["Schicht 2 (Sicherung)", "Schicht 1 (Bitübertragung)", "Schicht 3 (Vermittlung)", "Schicht 7 (Anwendung)"], "Ein Switch entscheidet anhand von MAC-Adressen."],
  ["Wer antwortet auf „Wer hat 192.168.1.20?“", ["nur das Gerät mit dieser IP-Adresse", "alle Geräte", "der Switch", "der DNS-Server"], "Alle hören die Durchsage, aber nur der Gemeinte antwortet."],
];

const MC_TCP = [
  ["Wie heißen die drei Segmente des TCP-Handshakes?", ["SYN – SYN, ACK – ACK", "GET – OK – ACK", "Hello – Hello – Bye", "ACK – SYN – FIN"], "Hallo? – Hallo, hörst du mich? – Ja!"],
  ["Was passiert bei TCP, wenn eine Bestätigung (ACK) ausbleibt?", ["Das Segment wird nach einer Wartezeit erneut gesendet", "Die Daten sind für immer verloren", "Der Switch schickt es noch einmal", "Die Anwendung muss neu gestartet werden"], "TCP sorgt für zuverlässige Übertragung."],
  ["Wozu dienen Ports?", ["Sie adressieren die richtige Anwendung auf einem Gerät", "Sie adressieren das richtige Gerät im Netz", "Sie ersetzen die MAC-Adresse", "Sie verschlüsseln die Daten"], "IP = Firma, Port = Durchwahl der Abteilung."],
  ["Was ist der Unterschied zwischen TCP und UDP?", ["TCP baut eine Verbindung auf und bestätigt alles, UDP nicht", "UDP ist verschlüsselt, TCP nicht", "TCP arbeitet auf Schicht 3, UDP auf Schicht 4", "Es gibt keinen"], "UDP: schnell und einfach (z. B. DNS). TCP: zuverlässig (z. B. HTTP)."],
  ["Mit „docker run -p 8080:80 nginx“ … ", ["erreicht man nginx von außen über Port 8080", "lauscht nginx im Container auf Port 8080", "ist der Container nur über Port 80 erreichbar", "werden 8080 Container gestartet"], "-p Host-Port:Container-Port – außen 8080, innen 80."],
];

const PORTS = [
  ["HTTP", 80],
  ["HTTPS", 443],
  ["DNS", 53],
  ["SSH", 22],
];

const MC_HTTPS = [
  ["Was kann Mr. Shark bei einer HTTPS-Anmeldung NICHT lesen?", ["das Passwort", "die IP-Adressen", "die Ziel-Portnummer 443", "die MAC-Adressen"], "Verschlüsselt ist der Inhalt – die äußeren Hüllen bleiben lesbar."],
  ["Was kann Mr. Shark auch bei HTTPS lesen?", ["wer mit wem kommuniziert (IP-Adressen)", "das Passwort", "den Inhalt der Webseite", "den Benutzernamen"], "Die IP-Hülle muss lesbar bleiben, sonst findet das Paket nicht ans Ziel."],
  ["Auf welcher OSI-Schicht verschlüsselt TLS?", ["Schicht 6 (Darstellung)", "Schicht 2 (Sicherung)", "Schicht 3 (Vermittlung)", "Schicht 1 (Bitübertragung)"], "Im Modell gehört Verschlüsselung zur Darstellungsschicht – dem Chiffrierbüro."],
  ["Wozu dient das Zertifikat des Servers?", ["Es beweist, dass der Server wirklich laborserver.jps ist", "Es beschleunigt die Verbindung", "Es enthält das Passwort", "Es ersetzt die IP-Adresse"], "Wie ein Firmenausweis, von einer Prüfstelle (CA) beglaubigt."],
  ["Welcher Port gehört standardmäßig zu HTTPS?", ["443", "80", "53", "8080"], "HTTP 80, HTTPS 443."],
  ["Was bedeutet der HTTP-Statuscode 200?", ["OK – die Anfrage war erfolgreich", "Seite nicht gefunden", "Serverfehler", "Weiterleitung"], "200 OK, 404 Not Found, 500 Server Error."],
  ["Was bedeutet der HTTP-Statuscode 404?", ["Die angeforderte Seite gibt es nicht", "Alles in Ordnung", "Zertifikat abgelaufen", "Das Kabel steckt nicht"], "404 Not Found – der Server läuft, aber die Seite fehlt."],
  ["Was passiert vor dem ersten verschlüsselten Datenpaket?", ["erst TCP-Handshake, dann TLS-Handshake", "nur ein ARP-Broadcast", "nur der TLS-Handshake ohne TCP", "gar nichts"], "Erst die Leitung (TCP), dann die Ausweiskontrolle und Schlüsselvereinbarung (TLS)."],
];

function neuePruefung(stufe) {
  const id = STUFEN[stufe].id;
  if (id === "kapselung") {
    if (Math.random() < 0.65) {
      const f = waehle(FELDER);
      return zahl(`In welcher OSI-Schicht (1–7) steht ${f[0]}?`, f[1], `${f[0][0].toUpperCase() + f[0].slice(1)} gehört zu Schicht ${f[1]} · ${SCHICHTEN[f[1]].name} (${SCHICHTEN[f[1]].abteilung}).`, "kapselAnfrage");
    }
    const q = waehle(MC_KAPSEL);
    return mc(q[0], q[1], q[2], "kapselAnfrage");
  }
  if (id === "dns") {
    const q = waehle(MC_DNS);
    return mc(q[0], q[1], q[2], q[0].indexOf("NXDOMAIN") >= 0 ? "dnsNx" : "dnsOk");
  }
  if (id === "arp") {
    if (Math.random() < 0.5) {
      const q = waehle(MC_ARP);
      return mc(q[0], q[1], q[2], "arpErst");
    }
    // An wie viele Tore leitet die Pforte weiter?
    const art = waehle(["bekannt", "unbekannt", "broadcast"]);
    const ziel = waehle(["server", "dns"]);
    const name = GERAETE[ziel].name;
    if (art === "broadcast") {
      return zahl("Die Pforte hat 3 Tore, an jedem hängt ein Gerät. Die Laptop GmbH (Tor 1) schickt eine ARP-Anfrage. An wie viele Tore leitet die Pforte sie weiter?", 2, "Broadcast geht an alle Tore außer dem, von dem er kam: 2.", "arpErst");
    }
    if (art === "unbekannt") {
      return zahl(`Die MAC-Tabelle der Pforte enthält nur den Eintrag für Tor 1. Die Laptop GmbH (Tor 1) schickt einen Frame an die MAC der ${name}. An wie viele Tore leitet die Pforte ihn weiter?`, 2, "Ziel-MAC unbekannt → fluten an alle anderen Tore: 2.", "arpErst");
    }
    return zahl(`Die MAC-Tabelle der Pforte kennt alle drei Geräte. Die Laptop GmbH schickt einen Frame an die MAC der ${name}. An welches Tor (Nummer) geht er?`, GERAETE[ziel].tor, `Die Tafel sagt: ${GERAETE[ziel].mac} sitzt hinter Tor ${GERAETE[ziel].tor}.`, "arpBekannt");
  }
  if (id === "tcp") {
    const art = waehle(["mc", "ack", "port", "docker"]);
    if (art === "mc") {
      const q = waehle(MC_TCP);
      return mc(q[0], q[1], q[2], q[0].indexOf("ACK") >= 0 ? "tcpVerlust" : "tcpHttp");
    }
    if (art === "ack") {
      const seq = zufall(1, 900);
      const len = zufall(20, 400);
      return zahl(`Die Laptop GmbH schickt ein Segment mit Seq ${seq} und ${len} Byte Daten. Welche Ack-Nummer schickt die Laborserver AG zurück?`, seq + len, `Ack = Seq + Länge = ${seq} + ${len} = ${seq + len}. Die Ack-Nummer sagt: „Bis hierhin ist alles da, als Nächstes erwarte ich Byte ${seq + len}.“`, "tcpHttp");
    }
    if (art === "port") {
      const p = waehle(PORTS);
      return zahl(`Welchen Standard-Port verwendet ${p[0]}?`, p[1], `${p[0]} = Port ${p[1]}. (HTTP 80 · HTTPS 443 · DNS 53 · SSH 22)`, p[0] === "DNS" ? "dnsOk" : "tcpHttp");
    }
    const host = waehle([8080, 8081, 8000, 3000, 9090]);
    const innen = waehle([80, 80, 5000, 3000, 1880]);
    if (Math.random() < 0.5) {
      return zahl(`Ein Container wurde mit „docker run -p ${host}:${innen} …“ gestartet. Welchen Port musst du im Browser angeben?`, host, `-p Host:Container → im Browser den Host-Port ${host}. Docker leitet an Port ${innen} im Container weiter.`, "tcpHttp");
    }
    return zahl(`Ein Container wurde mit „docker run -p ${host}:${innen} …“ gestartet. Auf welchem Port lauscht der Dienst im Container?`, innen, `-p Host:Container → im Container Port ${innen}, von außen ${host}.`, "tcpHttp");
  }
  if (id === "https") {
    const q = waehle(MC_HTTPS);
    return mc(q[0], q[1], q[2], q[0].indexOf("NICHT") >= 0 || q[0].indexOf("auch") >= 0 ? "https" : "komplett");
  }
  // Fehlersuche
  const fall = waehle(Object.keys(FEHLER_FAELLE));
  const f = FEHLER_FAELLE[fall];
  if (Math.random() < 0.5) {
    const falsch = Object.keys(FEHLER_FAELLE)
      .filter((k) => k !== fall)
      .map((k) => FEHLER_FAELLE[k].ursache);
    return mc(`Der Browser meldet „${f.meldung}“. Schau dir den Mitschnitt an (▶ Ablauf zeigen hilft nach der Antwort). Was ist die Ursache?`, [f.ursache, ...mischen(falsch).slice(0, 3)], `${f.ursache}. Der Fehler liegt auf Schicht ${f.schicht} · ${SCHICHTEN[f.schicht].name}.`, fall);
  }
  return zahl(`Fehlerfall: ${f.ursache}. Auf welcher OSI-Schicht (1–7) liegt dieser Fehler?`, f.schicht, `Schicht ${f.schicht} · ${SCHICHTEN[f.schicht].name} (${SCHICHTEN[f.schicht].abteilung}). Alles darunter funktioniert noch.`, fall);
}

if (typeof module !== "undefined") {
  module.exports = { STUFEN, SZENARIO_NAMEN, FEHLER_FAELLE, SERIE_ZIEL, neuePruefung };
}
