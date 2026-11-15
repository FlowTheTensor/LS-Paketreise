# Paketreise · Zwei Firmenzentralen und ein Industriespion

Im Gewerbepark Teamnetz stehen zwei Hochhäuser: die **Laptop GmbH** (der Laptop eines Schülers) und die **Laborserver AG** (der Laborserver mit nginx im Docker-Container). Jedes Hochhaus hat **sieben Etagen, eine für jede OSI-Schicht**. Schickt die Laptop GmbH eine Anfrage los, packt jede Abteilung auf dem Weg nach unten eine Hülle dazu. Bei der Laborserver AG nimmt auf dem Weg nach oben die Partner-Abteilung genau diese Hülle wieder ab. Dazwischen liegen die **Telefonauskunft** (DNS-Server), die **Pforte** (Switch) und **Mr. Shark**, ein Industriespion, der am Kabel alles mitschneidet (Wireshark).

Die Schüler steppen nur durch, sie programmieren nicht selbst. Es gibt sechs Freigabestufen vom *Praktikanten* bis zum *Netzwerk-Detektiv*. Im Mittelpunkt stehen DNS, HTTPS und typische Fehler aus dem Labor.

Erstellt für den Unterricht an der Jakob-Preh-Schule ([bsnes.de](https://www.bsnes.de)), Fachschule für Elektrotechnik, Fach Informationstechnik, 1. Schuljahr (Lerngebiet Netzwerktechnik, Vorbereitung auf den Laboraufbau mit Switches und Wireshark).

**Live-Version:** [Hier direkt anschauen](https://flowthetensor.github.io/LS-Paketreise/)

---

## Der Gewerbepark

| Im Gewerbepark | Im Netz |
|---|---|
| Laptop GmbH, 192.168.1.15 | Laptop eines Schülers (Client, Browser) |
| Laborserver AG, 192.168.1.20 · laborserver.jps | Laborserver, nginx im Docker-Container (`docker run -p 8080:80 nginx`) |
| Telefonauskunft, 192.168.1.2 | DNS-Server |
| Pforte mit 3 Toren und einer Tafel | Switch mit 3 Ports und MAC-Tabelle |
| Kabel | Patchkabel |
| Mr. Shark mit Abhörklemme | Wireshark (mitschneiden am Kabel des Laptops) |
| Durchwahl | Port |
| Lautsprecherdurchsage an alle | Broadcast (ff:ff:ff:ff:ff:ff) |
| Firmenausweis, beglaubigt von der Prüfstelle | Zertifikat, signiert von einer CA |
| Tresorkoffer | TLS-Verschlüsselung |

## Die sieben Etagen

| Etage | OSI-Schicht | Abteilung | Hülle in der Simulation |
|---|---|---|---|
| 7 | Anwendung | Fachabteilung | HTTP-Anfrage/-Antwort, DNS-Frage/-Antwort |
| 6 | Darstellung | Übersetzungs- und Chiffrierbüro | Zeichenkodierung (UTF-8) bzw. TLS-Verschlüsselung |
| 5 | Sitzung | Sekretariat | Verbindung bzw. TLS-Sitzung offen halten |
| 4 | Transport | Versandabteilung | TCP-Segment oder UDP-Datagramm: Ports, Seq, Ack, Flags |
| 3 | Vermittlung | Routenplanung | IP-Paket: Quell-/Ziel-IP, TTL |
| 2 | Sicherung | Poststelle | Ethernet-Frame: Quell-/Ziel-MAC, Prüfsumme (FCS) |
| 1 | Bitübertragung | Kabelraum | Bits als elektrische Signale |

Jede Schicht hat eine eigene Farbe. Die **Paketlupe** zeigt alle Hüllen der aktuellen Nachricht und lässt sich auf die **Sicht von Mr. Shark** umschalten: Verschlüsselte Hüllen erscheinen dann nur noch als Kauderwelsch.

## Die sechs Freigabestufen

| Stufe | Thema | Freigabe als | Szenarien |
|---|---|---|---|
| 1 | Kapselung | Praktikant | HTTP-Anfrage und -Antwort Etage für Etage, ein- und auspacken |
| 2 | DNS | Telefonist | laborserver.jps nachschlagen (UDP, Port 53) · Tippfehler mit NXDOMAIN |
| 3 | ARP & Pforte | Pförtner | erster Kontakt mit leerer MAC-Tabelle (Broadcast, Fluten, Lernen) · alles schon gelernt |
| 4 | TCP & Ports | Versandleiter | Drei-Wege-Handshake, Docker-Portweiterleitung 8080 → 80, Ack-Nummern · verlorenes Paket wird wiederholt |
| 5 | HTTP · HTTPS | Sicherheitschef | Anmelden mit HTTP (Passwort im Klartext) · Anmelden mit HTTPS (TLS-Handshake, Zertifikat) · die komplette Reise von ARP bis zur verschlüsselten Seite |
| 6 | Fehlersuche | Netzwerk-Detektiv | fünf typische Laborfehler |

### Stufe 5: Was sieht Mr. Shark?

| | HTTP | HTTPS |
|---|---|---|
| IP-Adressen (Schicht 3) | lesbar | lesbar |
| Ports (Schicht 4) | lesbar (8080) | lesbar (443) |
| MAC-Adressen (Schicht 2) | lesbar | lesbar |
| Benutzername und Passwort | **lesbar** | verschlüsselt |
| Inhalt der Webseite | **lesbar** | verschlüsselt |

Die äußeren Hüllen müssen lesbar bleiben, sonst fände das Paket nicht ans Ziel. Darum verrät auch HTTPS, *wer mit wem* spricht, aber nicht *was*.

Die komplette Reise braucht 14 Pakete, bis die Seite im Browser erscheint:

```
ARP   Wer hat 192.168.1.2?            ← erst den DNS-Server finden
ARP   192.168.1.2 ist bei 00:1b:…
DNS   Anfrage: A laborserver.jps
DNS   Antwort: 192.168.1.20
ARP   Wer hat 192.168.1.20?           ← dann den Server finden
ARP   192.168.1.20 ist bei b8:27:…
TCP   SYN · SYN, ACK · ACK            ← Verbindung aufbauen
TLS   Client Hello · Server Hello + Zertifikat · Schlüsseltausch
TLS   Application Data (Anfrage, Antwort) – verschlüsselt
```

Genau diese Folge finden die Schüler später im Labor in ihrem eigenen Wireshark-Mitschnitt wieder.

### Stufe 6: Typische Fehler im Labor

| Fall | Browser meldet | Ursache | Schicht | So sieht es im Mitschnitt aus |
|---|---|---|---|---|
| 1 | Keine Internetverbindung | Kabel nicht eingesteckt | 1 | gar nichts, Port-LED aus |
| 2 | DNS_PROBE_FINISHED_NXDOMAIN | Tippfehler `laborsever.jps` | 7 | DNS-Anfrage, Antwort NXDOMAIN, danach nichts mehr |
| 3 | Zeitüberschreitung | Laptop hat 192.168.2.15 statt 192.168.1.15 | 3 | nur ARP-Anfragen nach dem Gateway 192.168.2.1, keine Antwort |
| 4 | ERR_CONNECTION_REFUSED | Container ohne `-p 8080:80` gestartet | 4 | SYN, dann sofort RST |
| 5 | Diese Verbindung ist nicht sicher | Zertifikat abgelaufen | 6 | TCP-Handshake klappt, TLS bricht mit Alert ab |

Die Leitfrage für die Detektivarbeit: **Bis zu welcher Etage klappt es noch?**

## Paket verfolgen und Freigabeprüfung

**Paket verfolgen** (Kopfzeile links): Szenario wählen und Schritt für Schritt durchgehen. Jeder Schritt wird erklärt. Die Welt zeigt das Paket auf seinem Weg, die Paketlupe seine Hüllen, der Mitschnitt alle Pakete, die über das Kabel der Laptop GmbH gelaufen sind. Unten rechts im Lagebericht stehen Browser, ARP-Cache und DNS-Cache der Laptop GmbH.

**Freigabeprüfung** (Kopfzeile rechts): Fragen zur Stufe, teils Multiple Choice, teils mit Zahlenantwort. Die Welt zeigt dabei das Ende des passenden Szenarios, damit Mitschnitt und Paketlupe als Hinweis gelesen werden können.

- **5 richtige Antworten in Folge** ergeben das Prüfsiegel. Ein Fehler setzt die Serie zurück, ebenso „Andere Frage“.
- Nach jeder Antwort steht die Erklärung im Feld *Prüfung*. Mit „Ablauf zeigen“ läuft das passende Szenario von vorn ab.
- Die Prüfsiegel werden im Browser gespeichert (localStorage). „zurücksetzen“ im Feld *Freigaben* löscht sie.

Beispiele für Prüfungsfragen:

| Stufe | Fragen |
|---|---|
| 1 | In welcher Schicht steht die Ziel-MAC / der Ziel-Port / die TTL? Reihenfolge der Kapselung · Frame, Paket, Segment |
| 2 | Wozu dient DNS? Welcher Port? Was bedeutet NXDOMAIN? Warum UDP? |
| 3 | Ziel-MAC einer ARP-Anfrage · An wie viele Tore leitet die Pforte weiter? An welches Tor? Woher lernt der Switch? |
| 4 | Handshake · Ack = Seq + Länge (zufällige Zahlen) · Standardports 22/53/80/443 · `docker run -p a:b` |
| 5 | Was sieht der Spion bei HTTPS, was nicht? Wozu das Zertifikat? Statuscodes 200 und 404 · Schicht der Verschlüsselung |
| 6 | Browsermeldung und Mitschnitt → Ursache · Fehlerursache → OSI-Schicht |

## Bedienung

| Aktion | Wirkung |
|---|---|
| Stufen-Leiste (Reiter 1–6) | Freigabestufe wechseln, ✓ = Prüfsiegel vorhanden |
| Szenario | Ablauf wählen |
| „Schritt“ oder **→** | nächster Schritt |
| „Automatisch“ oder **Leertaste** | ablaufen lassen / anhalten |
| „Neustart“ oder **R** | Szenario von vorn |
| Tempo | langsam, mittel, schnell |
| „Sicht von Mr. Shark“, **L** oder Klick auf Mr. Shark | Paketlupe umschalten |

## Ideen für den Unterricht

- **Einstieg:** Stufe 1 am Beamer. Die Klasse ruft bei jeder Etage, welche Hülle als Nächstes dazukommt.
- **Briefumschlag-Spiel:** Sieben Schüler pro Hochhaus, jeder steckt die Nachricht in einen weiteren Umschlag und beschriftet ihn. Auf der Gegenseite wird ausgepackt. Mr. Shark darf jeden Umschlag lesen, aber nur, wenn er nicht versiegelt ist.
- **Vor dem Labor:** Stufe 5 „Die komplette Reise“ zeigen, dann im Labor mit den Ubiquiti-Switches nachbauen und in Wireshark dieselbe Folge suchen (Filter `arp`, `dns`, `tcp.port == 8080`, `tls`).
- **HTTP gegen HTTPS live:** Im Labor eine Anmeldeseite über HTTP aufrufen und das Passwort im eigenen Mitschnitt finden. Warum klappt das bei HTTPS nicht?
- **Fehlerfälle als Stationen:** Im Labor die fünf Fehler absichtlich einbauen (Kabel ziehen, IP verstellen, Container ohne `-p` starten …). Die Teams diagnostizieren mit Wireshark und benennen die Schicht.
- **Brücke zu Docker:** Was bedeutet `-p 8080:80` genau? Warum ist der Container ohne Portfreigabe von außen nicht erreichbar, obwohl nginx läuft?
- **Ausblick 2. Schuljahr:** Der Raspberry Pi an der Modellanlage ist auch eine „Laborserver AG“. OPC UA nutzt TCP Port 4840.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite, bindet Schriften, p5.js und die Skripte ein |
| `style.css` | Gestaltung im Corporate Design der Schule |
| `netz.js` | das kleine Netz: Geräte, Hüllen der Schichten, Switch-Logik und alle Szenarien, reines JavaScript ohne p5 |
| `stufen.js` | Freigabestufen, Szenarien je Stufe, Fehlerfälle, Prüfungsfragen |
| `ui.js` | Knöpfe, Auswahllisten, Eingabefelder |
| `sketch.js` | Ablauf, Zeichnen: Hochhäuser, Auskunft, Pforte, Mr. Shark, Paketlupe, Mitschnitt |
| `assets/logo-jps.png` | Logo der Jakob-Preh-Schule |
| `libraries/p5.min.js` | p5.js (lokal, damit die Seite auch offline läuft) |

### Ein eigenes Szenario ergänzen

In `netz.js` eine Funktion in `SZENARIEN` anlegen und den Baukasten benutzen:

```js
meinSzenario() {
  const b = baukasten("Mein Szenario", BEKANNT);          // BEKANNT: alle Tabellen schon gefüllt
  b.info("Einleitender Text.");
  b.sende(b.dnsAnfrage("drucker.jps"), "Erklärung zu diesem Paket.");
  b.sende(b.dnsAntwort("drucker.jps", "192.168.1.30"), "Erklärung zur Antwort.");
  return b.ergebnis();
},
```

Dann in `stufen.js` den Namen in `SZENARIO_NAMEN` eintragen und in die Liste `szenarien` einer Stufe schreiben. Der Baukasten rechnet MAC-Tabelle, Fluten und den Mitschnitt selbst aus.

## Lokal starten

Am einfachsten in VS Code mit der Erweiterung **Live Server**: Rechtsklick auf `index.html` → „Open with Live Server“.

## Technische Hinweise

- Läuft mit **p5.js 1.x** (lokal mitgeliefert) und **p5.js 2.x**. Dafür verzichtet der Code bewusst auf Funktionen, die sich zwischen den Versionen geändert haben (z. B. `preload`, `loadFont`).
- Die Schriften (Quicksand, Inter, JetBrains Mono) kommen von Google Fonts. Ohne Internet weicht die Seite automatisch auf Systemschriften aus.
- Alle Schleifen haben geschweifte Klammern: Der p5-Web-Editor baut in Schleifen eine Endlosschleifen-Sicherung ein, die bei Schleifen ohne Klammern fehlschlägt.
- Jedes Szenario wird vorab komplett durchgerechnet. Die Anzeige blättert nur durch diese Schritte. Während ein Paket unterwegs ist, zeigen Mitschnitt, MAC-Tabelle und Caches noch den alten Stand und springen erst um, wenn das Paket an der passenden Stelle vorbeikommt.
- Das Modell ist bewusst vereinfacht: ein einziges Subnetz ohne Router, Sequenznummern relativ ab 0 (wie Wireshark sie anzeigt), TLS 1.3 auf drei Schritte gekürzt, keine Verbindungsabbau-Segmente (FIN). Dass TLS in der Praxis zwischen Schicht 4 und 7 sitzt, wird zugunsten der klaren Zuordnung „Verschlüsselung = Schicht 6“ ausgeblendet.
- Fehler in `draw()` werden abgefangen und als Hinweis angezeigt, statt das Programm einzufrieren.

## Lizenz

[![CC BY 4.0](https://img.shields.io/badge/Lizenz-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/deed.de)

**Paketreise · Zwei Firmenzentralen und ein Industriespion** von **Christoph Rothaug, Jakob-Preh-Schule Bad Neustadt**, steht unter der Lizenz [Creative Commons Namensnennung 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.de). Der vollständige Lizenztext steht in der Datei [`LICENSE`](LICENSE).

Du darfst das Material (Quellcode, Texte, Aufgaben und Grafiken) kopieren, weitergeben und verändern, auch kommerziell. Dafür musst du

- den Urheber nennen: *Christoph Rothaug, Jakob-Preh-Schule Bad Neustadt*,
- auf die Lizenz verlinken: <https://creativecommons.org/licenses/by/4.0/deed.de>,
- angeben, ob du etwas verändert hast.

Vorschlag für die Namensnennung: *„Paketreise · Zwei Firmenzentralen und ein Industriespion“ von Christoph Rothaug, Jakob-Preh-Schule Bad Neustadt, CC BY 4.0, https://github.com/FlowTheTensor/LS-Paketreise*

**Ausgenommen** von dieser Lizenz sind:

| Bestandteil | Rechte |
|---|---|
| `libraries/p5.min.js` | [p5.js](https://p5js.org), GNU LGPL 2.1 |
| `assets/logo-jps.png` | Logo der Jakob-Preh-Schule – alle Rechte bei der Schule |
| Schriften Quicksand, Inter, JetBrains Mono | über Google Fonts eingebunden, SIL Open Font License 1.1 |
