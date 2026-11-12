// =============================================================================
//  netz.js – das kleine Netzwerk und seine Szenarien (reines JavaScript)
// =============================================================================
//  Drei Teilnehmer im Gewerbepark (Teamnetz im Labor):
//    Laptop GmbH     = Laptop eines Schülers
//    Laborserver AG  = Laborserver mit nginx im Docker-Container
//    Telefonauskunft = DNS-Server
//  verbunden über die Pforte (Switch) mit drei Toren.
//
//  Ein Szenario wird vorab komplett durchgerechnet und liefert eine Liste von
//  Schritten. Jeder Schritt enthält den Zustand (MAC-Tabelle der Pforte,
//  ARP- und DNS-Cache, Mitschnitt von Mr. Shark) und ggf. eine Nachricht mit
//  allen Hüllen der OSI-Schichten.
// =============================================================================

const SCHICHTEN = {
  7: { name: "Anwendung", abteilung: "Fachabteilung" },
  6: { name: "Darstellung", abteilung: "Übersetzungs- und Chiffrierbüro" },
  5: { name: "Sitzung", abteilung: "Sekretariat" },
  4: { name: "Transport", abteilung: "Versandabteilung" },
  3: { name: "Vermittlung", abteilung: "Routenplanung" },
  2: { name: "Sicherung", abteilung: "Poststelle" },
  1: { name: "Bitübertragung", abteilung: "Kabelraum" },
};

const GERAETE = {
  laptop: { name: "Laptop GmbH", ip: "192.168.1.15", mac: "a4:5e:60:11:22:33", tor: 1 },
  server: { name: "Laborserver AG", ip: "192.168.1.20", mac: "b8:27:eb:44:55:66", tor: 2, dns: "laborserver.jps" },
  dns: { name: "Telefonauskunft", ip: "192.168.1.2", mac: "00:1b:21:aa:bb:cc", tor: 3 },
};
const BROADCAST = "ff:ff:ff:ff:ff:ff";
const CLIENT_PORT = 51234;

const DNS_TABELLE = {
  "laborserver.jps": "192.168.1.20",
  "drucker.jps": "192.168.1.30",
  "lehrer-pc.jps": "192.168.1.10",
};

function geraetVonMac(mac) {
  return Object.keys(GERAETE).find((k) => GERAETE[k].mac === mac) || null;
}

function kurzMac(mac) {
  return mac === BROADCAST ? "ff:ff:…:ff (alle)" : "…" + mac.slice(-8);
}

// -----------------------------------------------------------------------------
// Hüllen der Schichten
// -----------------------------------------------------------------------------
function umschlag(n, titel, felder, geheim) {
  return { n, titel, felder, geheim: !!geheim };
}

function eth(von, nach, typ) {
  return umschlag(2, "Ethernet-Frame", [
    ["Ziel-MAC", nach],
    ["Quell-MAC", von],
    ["Typ", typ],
    ["Prüfsumme (FCS)", "0x" + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0")],
  ]);
}

function bits() {
  return umschlag(1, "Bits auf dem Kabel", [["Signal", "Präambel 1010…1011, dann alle Bits der Hüllen"]]);
}

function ip(von, nach, proto) {
  return umschlag(3, "IP-Paket", [
    ["Quell-IP", von],
    ["Ziel-IP", nach],
    ["TTL", "64"],
    ["Protokoll", proto],
  ]);
}

function tcp(sport, dport, flags, seq, ack, len) {
  const f = [
    ["Quell-Port", String(sport)],
    ["Ziel-Port", String(dport)],
    ["Flags", flags],
    ["Seq", String(seq)],
  ];
  if (ack !== null && ack !== undefined) {
    f.push(["Ack", String(ack)]);
  }
  if (len) {
    f.push(["Länge", `${len} Byte`]);
  }
  return umschlag(4, "TCP-Segment", f);
}

function udp(sport, dport) {
  return umschlag(4, "UDP-Datagramm", [
    ["Quell-Port", String(sport)],
    ["Ziel-Port", String(dport)],
  ]);
}

// -----------------------------------------------------------------------------
// Szenario-Baukasten
// -----------------------------------------------------------------------------
function neuerZustand(opt) {
  return {
    mac: Object.assign({}, opt.macTabelle || {}),
    arp: Object.assign({}, opt.arpCache || {}),
    dnsCache: Object.assign({}, opt.dnsCache || {}),
    mitschnitt: [],
    kabelOk: opt.kabelOk !== false,
    laptopIp: opt.laptopIp || GERAETE.laptop.ip,
    zertifikat: opt.zertifikat || "gueltig",
    portOffen: opt.portOffen !== false,
    browser: opt.browser || "",
    hai: "Mr. Shark lauert am Kabel zwischen Laptop GmbH und Pforte …",
    verbindung: opt.verbindung || "keine",
  };
}

function baukasten(titel, opt) {
  const z = neuerZustand(opt || {});
  const schritte = [];
  let nr = 0;

  function bild(art, text, extra) {
    schritte.push(
      Object.assign(
        {
          art,
          text,
          mac: Object.assign({}, z.mac),
          arp: Object.assign({}, z.arp),
          dnsCache: Object.assign({}, z.dnsCache),
          mitschnitt: z.mitschnitt.slice(),
          kabelOk: z.kabelOk,
          laptopIp: z.laptopIp,
          zertifikat: z.zertifikat,
          portOffen: z.portOffen,
          browser: z.browser,
          hai: z.hai,
          verbindung: z.verbindung,
          nachricht: null,
          weg: [],
          ebene: null,
          seite: null,
          sichtbar: null, // bei Detail-Schritten: welche Hüllen schon da sind
        },
        extra || {}
      )
    );
  }

  // Weg durch die Pforte berechnen, MAC-Tabelle lernen lassen
  function wegDurchPforte(n) {
    const quelle = n.von;
    const torEin = GERAETE[quelle].tor;
    const zielMac = n.zielMac;
    const lern = !z.mac[GERAETE[quelle].mac];
    z.mac[GERAETE[quelle].mac] = torEin;
    let ziele;
    let info;
    if (zielMac === BROADCAST) {
      ziele = Object.keys(GERAETE).filter((k) => k !== quelle);
      info = "Broadcast: Die Pforte schickt Kopien an alle anderen Tore.";
    } else if (z.mac[zielMac]) {
      ziele = [Object.keys(GERAETE).find((k) => GERAETE[k].tor === z.mac[zielMac])];
      info = `Die Pforte kennt ${kurzMac(zielMac)} → nur an Tor ${z.mac[zielMac]}.`;
    } else {
      ziele = Object.keys(GERAETE).filter((k) => k !== quelle);
      info = `Die Pforte kennt ${kurzMac(zielMac)} noch nicht → sie flutet an alle anderen Tore.`;
    }
    const lernText = lern ? ` Sie lernt: ${kurzMac(GERAETE[quelle].mac)} sitzt hinter Tor ${torEin}.` : "";
    return { ziele, info: info + lernText };
  }

  // Was Mr. Shark am Kabel sieht
  function haiNotiz(n) {
    const sicht = n.huellen.filter((h) => !h.geheim && h.n >= 2);
    if (n.huellen.some((h) => h.geheim)) {
      return `„${n.proto} von ${n.quelleIp || "?"} an ${n.zielIp || "?"}, Port ${n.zielPort || "?"} … der Inhalt ist nur Kauderwelsch. Mist!“`;
    }
    const inhalt = n.huellen.find((h) => h.n === 7);
    if (inhalt) {
      return `„Ha! ${inhalt.felder.map((f) => f[1]).join(" · ")}“`;
    }
    return `„${n.proto}: ${n.info}“` + (sicht.length ? "" : "");
  }

  function mitschneiden(n) {
    nr++;
    z.mitschnitt.push({
      nr,
      quelle: n.quelleIp || kurzMac(GERAETE[n.von].mac),
      ziel: n.zielIp || (n.zielMac === BROADCAST ? "alle" : kurzMac(n.zielMac)),
      proto: n.proto,
      info: n.info,
      geheim: n.huellen.some((h) => h.geheim),
      fehler: !!n.fehler,
    });
    z.hai = haiNotiz(n);
  }

  // eine Nachricht kompakt verschicken (Absender runter, Kabel, Empfänger hoch)
  function sende(n, text, nachher) {
    if (!z.kabelOk && (n.von === "laptop" || n.nach === "laptop")) {
      bild("info", text + " Doch im Kabelraum leuchtet keine Lampe: keine Verbindung!", { fehlerSchicht: 1 });
      return;
    }
    const w = wegDurchPforte(n);
    if (n.von === "laptop" || n.ziele === undefined) {
      // Mr. Shark sitzt am Kabel der Laptop GmbH
    }
    const ueberHai = n.von === "laptop" || w.ziele.indexOf("laptop") >= 0;
    if (ueberHai) {
      mitschneiden(n);
    }
    let ziele = w.ziele;
    if (n.nurAn) {
      ziele = ziele.filter((x) => x === n.nurAn || n.nurAn === "alle");
    }
    if (nachher) {
      nachher(z);
    }
    bild("nachricht", text + " " + (n.verloren ? "" : w.info), { nachricht: n, weg: { von: n.von, ziele: n.verloren ? [] : ziele, empfaenger: n.nach }, fehlerSchicht: n.fehlerSchicht || null });
  }

  // eine Nachricht ausführlich durch alle Etagen schicken
  function sendeDetail(n) {
    const von = n.von;
    const nach = n.nach;
    const vorhanden = n.huellen.map((h) => h.n);
    const oben = Math.max(...vorhanden);
    for (let e = oben; e >= 1; e--) {
      const h = n.huellen.find((x) => x.n === e);
      const s = SCHICHTEN[e];
      let txt;
      if (e === 1) {
        txt = `Etage 1 · ${s.abteilung}: Alle Hüllen werden in Bits umgewandelt und als elektrische Signale aufs Kabel geschickt.`;
      } else if (h) {
        txt = `Etage ${e} · ${s.abteilung} (${s.name}): packt ein und klebt die Hülle „${h.titel}“ dazu: ${h.felder.map((f) => `${f[0]} ${f[1]}`).join(", ")}.`;
      } else {
        txt = `Etage ${e} · ${s.abteilung}: hier gibt es nichts dazuzupacken.`;
      }
      bild("runter", txt, { nachricht: n, seite: von, ebene: e, sichtbar: vorhanden.filter((x) => x >= e) });
    }
    const w = wegDurchPforte(n);
    mitschneiden(n);
    bild("leitung", `Auf dem Kabel: Die Bits laufen zur Pforte. Mr. Shark hört mit. ${w.info}`, { nachricht: n, weg: { von, ziele: w.ziele, empfaenger: nach }, sichtbar: vorhanden });
    for (let e = 1; e <= oben; e++) {
      const h = n.huellen.find((x) => x.n === e);
      const s = SCHICHTEN[e];
      let txt;
      if (e === 1) {
        txt = `Etage 1 · ${s.abteilung} der ${GERAETE[nach].name}: Die Signale werden wieder zu Bits und Hüllen.`;
      } else if (e === 2) {
        txt = `Etage 2 · ${s.abteilung}: Ist die Ziel-MAC meine? Ja. Prüfsumme stimmt. Die Ethernet-Hülle wird entfernt.`;
      } else if (e === 3) {
        txt = `Etage 3 · ${s.abteilung}: Ziel-IP ${n.zielIp} ist meine Adresse. IP-Hülle ab.`;
      } else if (e === 4) {
        txt = `Etage 4 · ${s.abteilung}: Ziel-Port ${n.zielPort} – ${n.portText || "diese Durchwahl ist besetzt"}. Hülle ab.`;
      } else if (h) {
        txt = `Etage ${e} · ${s.abteilung}: nimmt die Hülle „${h.titel}“ ab.`;
      } else {
        txt = `Etage ${e} · ${s.abteilung}: nichts zu tun.`;
      }
      if (e === oben) {
        txt += ` Oben angekommen: ${n.ankunft || "Die Fachabteilung liest den Inhalt."}`;
      }
      bild("hoch", txt, { nachricht: n, seite: nach, ebene: e, sichtbar: vorhanden.filter((x) => x > e) });
    }
  }

  // ----------------------------------------------------------------------------
  // Nachrichten-Bausteine
  // ----------------------------------------------------------------------------
  const L = GERAETE.laptop;
  const S = GERAETE.server;
  const D = GERAETE.dns;

  function nachricht(von, nach, proto, info, huellen, extra) {
    const v = GERAETE[von];
    const ziel = nach === "alle" ? null : GERAETE[nach];
    const h3 = huellen.find((x) => x.n === 3);
    const h4 = huellen.find((x) => x.n === 4);
    const h2 = huellen.find((x) => x.n === 2);
    return Object.assign(
      {
        von,
        nach: nach === "alle" ? (extra && "antwortVon" in extra ? extra.antwortVon : null) : nach,
        proto,
        info,
        huellen: huellen.concat([bits()]).sort((a, b) => b.n - a.n),
        zielMac: h2 ? h2.felder[0][1] : ziel ? ziel.mac : BROADCAST,
        quelleIp: h3 ? h3.felder[0][1] : null,
        zielIp: h3 ? h3.felder[1][1] : null,
        zielPort: h4 ? h4.felder[1][1] : null,
      },
      extra || {}
    );
  }

  const api = {
    z,
    info: (text, extra) => bild("info", text, extra),
    sende,
    sendeDetail,
    nachricht,
    // ARP
    arpAnfrage(ipGesucht, antwortVon, vonIp) {
      const n = nachricht("laptop", "alle", "ARP", `Wer hat ${ipGesucht}? Sag es ${vonIp || L.ip}`, [
        eth(L.mac, BROADCAST, "ARP (0x0806)"),
        umschlag(2, "ARP-Anfrage", [["Frage", `Wer hat ${ipGesucht}?`], ["Absender", `${vonIp || L.ip} / ${L.mac}`]]),
      ], { antwortVon });
      return n;
    },
    arpAntwort(von, nach) {
      const v = GERAETE[von];
      return nachricht(von, nach, "ARP", `${v.ip} ist bei ${v.mac}`, [
        eth(v.mac, GERAETE[nach].mac, "ARP (0x0806)"),
        umschlag(2, "ARP-Antwort", [["Antwort", `${v.ip} ist bei ${v.mac}`]]),
      ]);
    },
    // DNS
    dnsAnfrage(name) {
      return nachricht("laptop", "dns", "DNS", `Anfrage: A ${name}`, [
        umschlag(7, "DNS-Anfrage", [["Frage", `Welche IP hat ${name}?`]]),
        umschlag(6, "Darstellung", [["Format", "DNS-Nachrichtenformat, unverschlüsselt"]]),
        umschlag(5, "Sitzung", [["Sitzung", "keine – eine einzelne Frage"]]),
        udp(53001, 53),
        ip(z.laptopIp, D.ip, "UDP (17)"),
        eth(L.mac, D.mac, "IPv4 (0x0800)"),
      ], { portText: "Durchwahl 53 = DNS-Auskunft" });
    },
    dnsAntwort(name, ergebnis) {
      return nachricht("dns", "laptop", "DNS", ergebnis ? `Antwort: ${name} = ${ergebnis}` : `Antwort: ${name} – NXDOMAIN (unbekannt)`, [
        umschlag(7, "DNS-Antwort", [["Antwort", ergebnis ? `${name} hat die IP ${ergebnis}` : `${name} gibt es nicht (NXDOMAIN)`]]),
        umschlag(6, "Darstellung", [["Format", "DNS-Nachrichtenformat, unverschlüsselt"]]),
        umschlag(5, "Sitzung", [["Sitzung", "keine – eine einzelne Antwort"]]),
        udp(53, 53001),
        ip(D.ip, z.laptopIp, "UDP (17)"),
        eth(D.mac, L.mac, "IPv4 (0x0800)"),
      ], { fehler: !ergebnis, portText: "Antwort an Durchwahl 53001" });
    },
    // TCP-Steuersegmente
    tcpSeg(von, nach, flags, seq, ack, dport, info, extra) {
      const v = GERAETE[von];
      const w = GERAETE[nach];
      const vonPort = von === "laptop" ? CLIENT_PORT : dport;
      const zuPort = von === "laptop" ? dport : CLIENT_PORT;
      return nachricht(von, nach, "TCP", `${vonPort} → ${zuPort} [${flags}] ${info || ""}`.trim(), [
        tcp(vonPort, zuPort, flags, seq, ack),
        ip(von === "laptop" ? z.laptopIp : v.ip, nach === "laptop" ? z.laptopIp : w.ip, "TCP (6)"),
        eth(v.mac, w.mac, "IPv4 (0x0800)"),
      ], extra || {});
    },
    // Anwendungsdaten über TCP (HTTP), optional verschlüsselt (HTTPS)
    daten(von, nach, dport, http, zeilen, seq, ack, geheim, extra) {
      const v = GERAETE[von];
      const w = GERAETE[nach];
      const vonPort = von === "laptop" ? CLIENT_PORT : dport;
      const zuPort = von === "laptop" ? dport : CLIENT_PORT;
      const len = zeilen.join(" ").length + 40;
      const h = [
        umschlag(7, http, zeilen.map((zl, i) => [i === 0 ? "Inhalt" : "", zl]), geheim),
        umschlag(6, geheim ? "TLS-Verschlüsselung" : "Darstellung", geheim ? [["Verschlüsselt", "AES-256 mit dem gemeinsamen Sitzungsschlüssel"]] : [["Format", "Text, UTF-8"]], geheim),
        umschlag(5, "Sitzung", [["Sitzung", geheim ? "TLS-Sitzung 1 offen" : "Verbindung offen (Keep-Alive)"]], geheim),
        tcp(vonPort, zuPort, "PSH, ACK", seq, ack, len),
        ip(von === "laptop" ? z.laptopIp : v.ip, nach === "laptop" ? z.laptopIp : w.ip, "TCP (6)"),
        eth(v.mac, w.mac, "IPv4 (0x0800)"),
      ];
      return nachricht(von, nach, geheim ? "TLS" : "HTTP", geheim ? "Application Data (verschlüsselt)" : zeilen[0], h, Object.assign({ len }, extra || {}));
    },
    tls(von, nach, art, felder, extra) {
      const v = GERAETE[von];
      const w = GERAETE[nach];
      const vonPort = von === "laptop" ? CLIENT_PORT : 443;
      const zuPort = von === "laptop" ? 443 : CLIENT_PORT;
      return nachricht(von, nach, "TLS", art, [
        umschlag(6, `TLS: ${art}`, felder),
        umschlag(5, "Sitzung", [["Sitzung", "TLS-Sitzung wird aufgebaut"]]),
        tcp(vonPort, zuPort, "PSH, ACK", 1, 1),
        ip(von === "laptop" ? z.laptopIp : v.ip, nach === "laptop" ? z.laptopIp : w.ip, "TCP (6)"),
        eth(v.mac, w.mac, "IPv4 (0x0800)"),
      ], extra || {});
    },
  };
  api.ergebnis = () => ({ titel, schritte });
  api.bild = bild;
  return api;
}

// Vorbelegung: alle kennen sich schon
const BEKANNT = {
  macTabelle: { [GERAETE.laptop.mac]: 1, [GERAETE.server.mac]: 2, [GERAETE.dns.mac]: 3 },
  arpCache: { [GERAETE.server.ip]: GERAETE.server.mac, [GERAETE.dns.ip]: GERAETE.dns.mac },
  dnsCache: { "laborserver.jps": GERAETE.server.ip },
  verbindung: "offen",
};
const NUR_DNS_BEKANNT = {
  macTabelle: { [GERAETE.laptop.mac]: 1, [GERAETE.dns.mac]: 3 },
  arpCache: { [GERAETE.dns.ip]: GERAETE.dns.mac },
};

// =============================================================================
// Szenarien
// =============================================================================
function handshake(b, port) {
  b.sende(b.tcpSeg("laptop", "server", "SYN", 0, null, port, "", { portText: `Durchwahl ${port}` }), `TCP-Handshake 1/3: Die Versandabteilung ruft Durchwahl ${port} an: „Hallo, Laptop GmbH hier, können wir reden?“ (SYN)`);
  b.sende(b.tcpSeg("server", "laptop", "SYN, ACK", 0, 1, port), "TCP-Handshake 2/3: „Hier Laborserver AG, ich höre Sie – hören Sie mich?“ (SYN, ACK)");
  b.sende(b.tcpSeg("laptop", "server", "ACK", 1, 1, port), "TCP-Handshake 3/3: „Ja, laut und deutlich!“ (ACK) – die Verbindung steht.", (z) => {
    z.verbindung = "offen";
  });
}

function tlsHandshake(b, zert) {
  b.sende(b.tls("laptop", "server", "Client Hello", [["Vorschlag", "TLS 1.3, Verschlüsselung AES-256"], ["Zufallszahl", "7f3a…"]]), "TLS 1/3: Das Chiffrierbüro schlägt vor, wie verschlüsselt werden soll (Client Hello).");
  const gueltig = zert === "gueltig";
  b.sende(
    b.tls("server", "laptop", "Server Hello, Zertifikat", [
      ["Antwort", "einverstanden: TLS 1.3, AES-256"],
      ["Zertifikat für", gueltig || zert === "abgelaufen" ? "laborserver.jps" : "laborserver.jps (selbst ausgestellt)"],
      ["ausgestellt von", gueltig || zert === "abgelaufen" ? "Prüfstelle JPS-CA" : "niemandem – selbst unterschrieben"],
      ["gültig bis", zert === "abgelaufen" ? "31.07.2025 – ABGELAUFEN" : "31.07.2027"],
      ["öffentlicher Schlüssel", "04:a1:9c…"],
    ]),
    "TLS 2/3: Die Laborserver AG zeigt ihren Firmenausweis (Zertifikat) und schickt ihren öffentlichen Schlüssel."
  );
  if (!gueltig) {
    b.sende(
      b.tls("laptop", "server", "Alert: Zertifikat ungültig", [["Alarm", zert === "abgelaufen" ? "certificate_expired" : "unknown_ca (Aussteller unbekannt)"]], { fehler: true }),
      `Das Chiffrierbüro prüft den Ausweis: ${zert === "abgelaufen" ? "Er ist abgelaufen!" : "Er ist von niemandem beglaubigt!"} Es bricht ab (Alert).`,
      (z) => {
        z.browser = "⚠ Warnung: Diese Verbindung ist nicht sicher (Zertifikat ungültig)";
        z.verbindung = "abgebrochen";
      }
    );
    return false;
  }
  b.sende(b.tls("laptop", "server", "Schlüsseltausch, Finished", [["Prüfung", "Zertifikat echt: von Prüfstelle JPS-CA beglaubigt ✓"], ["Schlüsselanteil", "geheimer Sitzungsschlüssel wird vereinbart"]]), "TLS 3/3: Der Ausweis ist echt. Beide vereinbaren einen geheimen Sitzungsschlüssel – ab jetzt ist alles verschlüsselt.", (z) => {
    z.verbindung = "verschlüsselt";
  });
  return true;
}

const SZENARIEN = {
  kapselAnfrage() {
    const b = baukasten("HTTP-Anfrage durch alle Etagen", BEKANNT);
    b.info("Die Fachabteilung der Laptop GmbH möchte die Startseite der Laborserver AG sehen: http://laborserver.jps:8080. Adresse, MAC und Verbindung sind schon bekannt – wir verfolgen nur die Anfrage selbst, Etage für Etage.");
    b.sendeDetail(b.daten("laptop", "server", 8080, "HTTP-Anfrage", ["GET / HTTP/1.1", "Host: laborserver.jps"], 1, 1, false, {
      portText: "Docker leitet Durchwahl 8080 in den Container weiter (dort Port 80)",
      ankunft: "nginx im Docker-Container liest „GET /“ und sucht die Startseite heraus.",
    }));
    b.info("Geschafft! Jede Etage hat beim Absender genau eine Hülle dazugepackt und beim Empfänger genau diese Hülle wieder abgenommen. Jede Etage „spricht“ also nur mit ihrer Partner-Etage.");
    return b.ergebnis();
  },
  kapselAntwort() {
    const b = baukasten("HTTP-Antwort zurück", BEKANNT);
    b.info("Jetzt der Rückweg: Die Laborserver AG schickt die Startseite zurück. Diesmal packt das Hochhaus der Laborserver AG ein, und die Laptop GmbH packt aus.");
    b.sendeDetail(b.daten("server", "laptop", 8080, "HTTP-Antwort", ["HTTP/1.1 200 OK", "<h1>Laborserver Team 3</h1>"], 1, 60, false, {
      portText: "die Durchwahl, von der die Anfrage kam",
      ankunft: "Der Browser zeigt „Laborserver Team 3“ an.",
    }));
    b.info("Die Seite ist da. Beachte: Die Ports sind jetzt vertauscht – Quelle 8080, Ziel 51234.");
    return b.ergebnis();
  },
  dnsOk() {
    const b = baukasten("Name auflösen", NUR_DNS_BEKANNT);
    b.info("Im Browser steht nur der Name „laborserver.jps“. Die Routenplanung braucht aber eine IP-Adresse. Also fragt die Laptop GmbH erst bei der Telefonauskunft (DNS-Server) nach.");
    b.sende(b.dnsAnfrage("laborserver.jps"), "DNS-Anfrage über UDP an Port 53: „Welche IP hat laborserver.jps?“");
    b.sende(b.dnsAntwort("laborserver.jps", DNS_TABELLE["laborserver.jps"]), "Die Auskunft schaut in ihr Verzeichnis und antwortet: 192.168.1.20.", (z) => {
      z.dnsCache["laborserver.jps"] = DNS_TABELLE["laborserver.jps"];
    });
    b.info("Die Antwort wird im DNS-Cache gemerkt. Beim nächsten Mal muss die Laptop GmbH nicht mehr fragen.");
    return b.ergebnis();
  },
  dnsNx() {
    const b = baukasten("Tippfehler im Namen", NUR_DNS_BEKANNT);
    b.info("Diesmal hat sich jemand vertippt: „laborsever.jps“ (ohne r).");
    b.sende(b.dnsAnfrage("laborsever.jps"), "DNS-Anfrage: „Welche IP hat laborsever.jps?“");
    b.sende(b.dnsAntwort("laborsever.jps", null), "Die Auskunft findet den Namen nicht und antwortet NXDOMAIN (Non-Existent Domain).", (z) => {
      z.browser = "✗ Diese Website ist nicht erreichbar: DNS_PROBE_FINISHED_NXDOMAIN";
    });
    b.info("Der Browser zeigt einen Fehler. Ohne IP-Adresse kann die Routenplanung nichts verschicken – der Laborserver bekommt nie etwas mit.", { fehlerSchicht: 7 });
    return b.ergebnis();
  },
  arpErst() {
    const b = baukasten("Erster Kontakt: ARP und Pforte", { dnsCache: { "laborserver.jps": GERAETE.server.ip } });
    b.info("Die Laptop GmbH kennt die IP 192.168.1.20, aber die Poststelle (Schicht 2) braucht die MAC-Adresse. Und die Pforte hat noch niemanden kennengelernt – ihre Tabelle ist leer.");
    b.sende(b.arpAnfrage(GERAETE.server.ip, "server"), "ARP-Anfrage als Lautsprecherdurchsage an alle (Ziel-MAC ff:ff:ff:ff:ff:ff): „Wer hat 192.168.1.20?“");
    b.info("Die Telefonauskunft hört die Durchsage, aber 192.168.1.20 ist nicht ihre Adresse – sie ignoriert sie. Die Laborserver AG fühlt sich angesprochen.");
    b.sende(b.arpAntwort("server", "laptop"), "Die Laborserver AG antwortet direkt: „192.168.1.20 bin ich, meine MAC ist b8:27:eb:44:55:66.“", (z) => {
      z.arp[GERAETE.server.ip] = GERAETE.server.mac;
    });
    b.sende(b.tcpSeg("laptop", "server", "SYN", 0, null, 8080), "Jetzt geht es gezielt weiter: das erste TCP-Segment an die gelernte MAC.");
    b.info("Die Pforte kennt jetzt Laptop GmbH (Tor 1) und Laborserver AG (Tor 2) und muss nicht mehr fluten. Die Laptop GmbH hat die MAC im ARP-Cache.");
    return b.ergebnis();
  },
  arpBekannt() {
    const b = baukasten("Alles schon bekannt", BEKANNT);
    b.info("Ein paar Minuten später: ARP-Cache und MAC-Tabelle sind gefüllt.");
    b.sende(b.tcpSeg("laptop", "server", "SYN", 0, null, 8080), "Keine Durchsage nötig: Die Poststelle kennt die MAC, die Pforte das Tor.");
    b.info("Ein Switch lernt also mit jedem Frame dazu – er schaut auf die Quell-MAC und merkt sich das Tor.");
    return b.ergebnis();
  },
  tcpHttp() {
    const b = baukasten("Verbindung, Anfrage, Antwort", BEKANNT);
    b.z.verbindung = "keine";
    b.info("Die Laptop GmbH ruft http://laborserver.jps:8080 auf. Auf dem Laborserver läuft nginx in einem Docker-Container, gestartet mit „docker run -p 8080:80 nginx“.");
    handshake(b, 8080);
    b.sende(b.daten("laptop", "server", 8080, "HTTP-Anfrage", ["GET / HTTP/1.1", "Host: laborserver.jps"], 1, 1, false), "Die HTTP-Anfrage geht an Durchwahl 8080. Docker leitet sie in den Container an Port 80 weiter, wo nginx lauscht.");
    b.sende(b.daten("server", "laptop", 8080, "HTTP-Antwort", ["HTTP/1.1 200 OK", "<h1>Laborserver Team 3</h1>"], 1, 61, false), "nginx antwortet mit „200 OK“ und der Seite. Ack 61 bestätigt: alle 60 Byte der Anfrage sind angekommen.", (z) => {
      z.browser = "✓ Laborserver Team 3";
    });
    b.sende(b.tcpSeg("laptop", "server", "ACK", 61, 120, 8080, "Empfang bestätigt"), "Die Versandabteilung bestätigt den Empfang (ACK). Bei TCP wird jede Lieferung quittiert.");
    return b.ergebnis();
  },
  tcpVerlust() {
    const b = baukasten("Paket verloren – TCP wiederholt", BEKANNT);
    b.info("Die Verbindung steht schon. Jetzt geht die Anfrage auf dem Weg verloren (z. B. wackeliger Stecker an der Pforte).");
    b.sende(b.daten("laptop", "server", 8080, "HTTP-Anfrage", ["GET / HTTP/1.1", "Host: laborserver.jps"], 1, 1, false, { verloren: true }), "Die Anfrage startet … und kommt bei der Pforte nie an.");
    b.info("Die Versandabteilung wartet auf die Empfangsbestätigung (ACK). Nach einer Wartezeit (Timeout) ist klar: verloren gegangen.");
    b.sende(b.daten("laptop", "server", 8080, "HTTP-Anfrage (Wiederholung)", ["GET / HTTP/1.1", "Host: laborserver.jps"], 1, 1, false, { wiederholung: true }), "TCP schickt dasselbe Segment noch einmal – mit derselben Sequenznummer.");
    b.sende(b.daten("server", "laptop", 8080, "HTTP-Antwort", ["HTTP/1.1 200 OK", "<h1>Laborserver Team 3</h1>"], 1, 61, false), "Diesmal klappt es. Die Fachabteilung hat vom Verlust nichts gemerkt – darum kümmert sich Schicht 4.", (z) => {
      z.browser = "✓ Laborserver Team 3";
    });
    return b.ergebnis();
  },
  httpKlar() {
    const b = baukasten("Anmelden mit HTTP (unverschlüsselt)", BEKANNT);
    b.z.verbindung = "keine";
    b.info("Team 3 meldet sich am Laborserver an – über HTTP, also ohne Verschlüsselung.");
    handshake(b, 8080);
    b.sende(b.daten("laptop", "server", 8080, "HTTP-Anfrage", ["POST /login HTTP/1.1", "benutzer=team3&passwort=Kabelsalat!"], 1, 1, false), "Benutzername und Passwort gehen im Klartext über das Kabel …");
    b.sende(b.daten("server", "laptop", 8080, "HTTP-Antwort", ["HTTP/1.1 200 OK", "Willkommen, Team 3!"], 1, 70, false), "Die Anmeldung klappt – aber Mr. Shark hat alles mitgeschrieben.", (z) => {
      z.browser = "✓ Willkommen, Team 3!  (⚠ nicht sicher)";
    });
    b.info("Mr. Shark kennt jetzt das Passwort. Bei HTTP ist jede Hülle lesbar – auch der Inhalt ganz innen.");
    return b.ergebnis();
  },
  https() {
    const b = baukasten("Anmelden mit HTTPS (verschlüsselt)", BEKANNT);
    b.z.verbindung = "keine";
    b.info("Dieselbe Anmeldung über HTTPS (Port 443). Vor dem ersten Datenpaket kommt ein zweiter Handshake: der TLS-Handshake mit Ausweiskontrolle.");
    handshake(b, 443);
    tlsHandshake(b, "gueltig");
    b.sende(b.daten("laptop", "server", 443, "HTTP-Anfrage", ["POST /login HTTP/1.1", "benutzer=team3&passwort=Kabelsalat!"], 1, 1, true), "Dieselben Zugangsdaten – diesmal im Tresorkoffer. Das Chiffrierbüro (Schicht 6) hat verschlüsselt.");
    b.sende(b.daten("server", "laptop", 443, "HTTP-Antwort", ["HTTP/1.1 200 OK", "Willkommen, Team 3!"], 1, 70, true), "Die Antwort ist ebenfalls verschlüsselt. Nur die beiden Chiffrierbüros kennen den Schlüssel.", (z) => {
      z.browser = "🔒 Willkommen, Team 3!";
    });
    b.info("Mr. Shark sieht nur die äußeren Hüllen: wer mit wem (IP), welche Durchwahl (443), wie viel. Den Inhalt kann er nicht lesen.");
    return b.ergebnis();
  },
  komplett() {
    const b = baukasten("Die komplette Reise", {});
    b.info("Frisch gestartet, alle Caches leer. Der Browser soll https://laborserver.jps öffnen. Was passiert alles, bevor die Seite erscheint?");
    // ARP für den DNS-Server
    b.sende(b.arpAnfrage(GERAETE.dns.ip, "dns"), "Zuerst muss die Laptop GmbH die Auskunft erreichen: ARP-Durchsage „Wer hat 192.168.1.2?“");
    b.sende(b.arpAntwort("dns", "laptop"), "Die Auskunft meldet ihre MAC.", (z) => {
      z.arp[GERAETE.dns.ip] = GERAETE.dns.mac;
    });
    b.sende(b.dnsAnfrage("laborserver.jps"), "DNS: „Welche IP hat laborserver.jps?“");
    b.sende(b.dnsAntwort("laborserver.jps", GERAETE.server.ip), "„192.168.1.20.“", (z) => {
      z.dnsCache["laborserver.jps"] = GERAETE.server.ip;
    });
    b.sende(b.arpAnfrage(GERAETE.server.ip, "server"), "ARP-Durchsage: „Wer hat 192.168.1.20?“");
    b.sende(b.arpAntwort("server", "laptop"), "Die Laborserver AG meldet ihre MAC.", (z) => {
      z.arp[GERAETE.server.ip] = GERAETE.server.mac;
    });
    handshake(b, 443);
    tlsHandshake(b, "gueltig");
    b.sende(b.daten("laptop", "server", 443, "HTTP-Anfrage", ["GET / HTTP/1.1", "Host: laborserver.jps"], 1, 1, true), "Endlich: die eigentliche Anfrage, verschlüsselt.");
    b.sende(b.daten("server", "laptop", 443, "HTTP-Antwort", ["HTTP/1.1 200 OK", "<h1>Laborserver Team 3</h1>"], 1, 60, true), "Die Seite kommt zurück.", (z) => {
      z.browser = "🔒 Laborserver Team 3";
    });
    b.info("14 Pakete für eine einzige Webseite! Genau diese Folge findest du im Labor in deinem Wireshark-Mitschnitt wieder.");
    return b.ergebnis();
  },
  // --- typische Fehler im Labor --------------------------------------------
  fehlerKabel() {
    const b = baukasten("Fehler: Kabel steckt nicht", Object.assign({}, BEKANNT, { kabelOk: false }));
    b.info("Team 3 baut das Netz auf und will den Laborserver aufrufen. Der Browser lädt und lädt …");
    b.sende(b.dnsAnfrage("laborserver.jps"), "Die Laptop GmbH will die Auskunft fragen.");
    b.bild("info", "Mr. Sharks Mitschnitt bleibt leer: Es kommt überhaupt nichts auf dem Kabel an. Das Netzwerksymbol am Laptop zeigt „Kabel nicht angeschlossen“, die Port-LED am Switch ist aus.", { fehlerSchicht: 1, browser: "✗ Keine Internetverbindung" });
    return b.ergebnis();
  },
  fehlerName() {
    return SZENARIEN.dnsNx();
  },
  fehlerSubnetz() {
    const b = baukasten("Fehler: falsches Subnetz", Object.assign({}, NUR_DNS_BEKANNT, { laptopIp: "192.168.2.15", dnsCache: { "laborserver.jps": GERAETE.server.ip } }));
    b.info("Die Laptop GmbH hat sich beim IP-Plan vertippt: 192.168.2.15/24 statt 192.168.1.15/24. Ziel ist 192.168.1.20.");
    b.info("Die Routenplanung (Schicht 3) vergleicht: 192.168.2.x und 192.168.1.x – verschiedene Netze! Also müsste das Paket über den Router (Gateway 192.168.2.1). Den gibt es im Teamnetz aber nicht.", { fehlerSchicht: 3 });
    for (let i = 1; i <= 3; i++) {
      b.sende(b.arpAnfrage("192.168.2.1", null, "192.168.2.15"), `ARP-Durchsage ${i}/3: „Wer hat 192.168.2.1 (das Gateway)?“ – niemand antwortet.`, null);
    }
    b.bild("info", "Keine Antwort, nie. Der Laborserver ist zwar per Kabel erreichbar, aber die Laptop GmbH schickt gar nicht erst zu ihm. Im Mitschnitt: nur ARP-Anfragen nach dem Gateway, keine Antwort.", { fehlerSchicht: 3, browser: "✗ Server nicht erreichbar (Zeitüberschreitung)" });
    return b.ergebnis();
  },
  fehlerPort() {
    const b = baukasten("Fehler: Container-Port nicht freigegeben", Object.assign({}, BEKANNT, { portOffen: false }));
    b.z.verbindung = "keine";
    b.info("Auf dem Laborserver läuft nginx im Container – aber gestartet mit „docker run nginx“, ohne „-p 8080:80“. Durchwahl 8080 ist also nicht belegt.");
    b.sende(b.tcpSeg("laptop", "server", "SYN", 0, null, 8080, "", { portText: "Durchwahl 8080 – kein Anschluss!" }), "TCP-Handshake 1/3: Anruf bei Durchwahl 8080 (SYN).");
    b.sende(b.tcpSeg("server", "laptop", "RST, ACK", 0, 1, 8080, "Verbindung abgelehnt", { fehler: true }), "Die Versandabteilung der Laborserver AG: „Kein Anschluss unter dieser Nummer!“ (RST).", (z) => {
      z.browser = "✗ Verbindung verweigert (ERR_CONNECTION_REFUSED)";
    });
    b.info("Netzwerk, IP und MAC sind in Ordnung – der Fehler liegt bei der Durchwahl (Port), also auf Schicht 4. Lösung: Container mit „-p 8080:80“ starten.", { fehlerSchicht: 4 });
    return b.ergebnis();
  },
  fehlerZertifikat() {
    const b = baukasten("Fehler: Zertifikat abgelaufen", Object.assign({}, BEKANNT, { zertifikat: "abgelaufen" }));
    b.z.verbindung = "keine";
    b.info("Die Laborserver AG hat ihr Zertifikat nicht verlängert.");
    handshake(b, 443);
    tlsHandshake(b, "abgelaufen");
    b.info("Die TCP-Verbindung stand, die Pakete kamen an – aber das Chiffrierbüro (Schicht 6) vertraut dem Ausweis nicht. Lösung: Zertifikat erneuern.", { fehlerSchicht: 6 });
    return b.ergebnis();
  },
};

if (typeof module !== "undefined") {
  module.exports = { SCHICHTEN, GERAETE, SZENARIEN, BROADCAST, DNS_TABELLE, kurzMac };
}
