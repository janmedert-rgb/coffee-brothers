# 🧱 Brick Studio – 3D Lego-Baukasten

Eine kreative Browser-App zum Bauen eigener 3D-Lego-Modelle. Läuft ohne
Installation auf PC, Tablet und Handy.

**Öffnen:** `lego/index.html` lokal im Browser oder online unter `/lego/`.

## Funktionen
- 🧱 Echte 3D-Steine stapeln, drehen und auf einer 32×32-Bauplatte platzieren
- 🎨 15 klassische Lego-Farben
- 📐 12 Steingrößen (1×1 bis 4×4) + Umschalter **Stein / Platte**
- ↻ Steine drehen, 🗑️ einzeln löschen, ↶ Schritte rückgängig machen
- 💾 Modell speichern/laden (im Browser) sowie als Datei `.brick` exportieren/importieren
- 📷 Modell als PNG-Bild exportieren
- 🖱️ Maus & Touch: Ziehen = drehen, Pinch/Rad = zoomen, Klick/Tipp = bauen

## Steuerung
| Aktion | Tastatur |
|--------|----------|
| Stein drehen | `R` |
| Rückgängig | `Strg`/`Cmd` + `Z` |
| Löschmodus | `Entf` |

## Technik
Reines HTML + JavaScript mit [three.js](https://threejs.org) (per CDN).
Keine Build-Tools, keine Abhängigkeiten zu installieren – eine einzige Datei.
