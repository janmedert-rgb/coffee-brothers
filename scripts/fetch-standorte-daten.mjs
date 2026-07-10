// Datenpipeline für die Standort-Analyse (standorte.html).
// Läuft offline/lokal: node scripts/fetch-standorte-daten.mjs
// Quellen: Kreisgrenzen (OpenDataSoft georef-germany-kreis, © GeoBasis-DE/BKG, dl-de/by-2-0),
// Einwohner (Wikidata), Angebot (OpenStreetMap via Overpass API, ODbL).
// Ergebnis: data/rlp-kreise.geo.json + data/standorte.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GEO_URL = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-germany-kreis/exports/geojson?refine=lan_name%3A%22Rheinland-Pfalz%22';
const GEM_URL = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-germany-gemeinde/exports/geojson?refine=lan_name%3A%22Rheinland-Pfalz%22';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';

const KATEGORIEN = {
  // Gastronomie
  eis: { label: 'Eiscafés', match: t => t.amenity === 'ice_cream' },
  cafe: { label: 'Cafés', match: t => t.amenity === 'cafe' },
  bar: { label: 'Bars & Pubs', match: t => t.amenity === 'bar' || t.amenity === 'pub' },
  baeckerei: { label: 'Bäckereien', match: t => t.shop === 'bakery' },
  metzgerei: { label: 'Metzgereien', match: t => t.shop === 'butcher' },
  // Handwerk & Dienstleistung
  friseur: { label: 'Friseure', match: t => t.shop === 'hairdresser' },
  kfz: { label: 'Kfz-Werkstätten', match: t => t.shop === 'car_repair' },
  elektriker: { label: 'Elektriker', match: t => t.craft === 'electrician' },
  shk: { label: 'Sanitär & Heizung', match: t => t.craft === 'plumber' || t.craft === 'hvac' },
  schreiner: { label: 'Schreinereien', match: t => t.craft === 'carpenter' || t.craft === 'joiner' },
  maler: { label: 'Maler', match: t => t.craft === 'painter' },
  dachdecker: { label: 'Dachdecker', match: t => t.craft === 'roofer' },
};

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// --- 1. Kreisgrenzen Rheinland-Pfalz (RS beginnt mit 07) ---
console.log('Lade Kreisgrenzen …');
const de = await fetchJson(GEO_URL);
const roundCoords = c => Array.isArray(c[0]) ? c.map(roundCoords) : [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4];
const kreise = de.features.map(f => ({
  type: 'Feature',
  properties: {
    rs: f.properties.krs_code[0],
    name: f.properties.krs_name[0].replace(/^(Landkreis|Kreisfreie Stadt|Stadtkreis)\s+/, ''),
    typ: f.properties.krs_type,
  },
  geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
}));
console.log(`  ${kreise.length} Kreise/kreisfreie Städte in RLP`);
if (kreise.length !== 36) console.warn('  WARNUNG: erwartet 36!');

// --- 1b. Gemeindegrenzen (2.301 Gemeinden) ---
console.log('Lade Gemeindegrenzen …');
const deGem = await fetchJson(GEM_URL);
const gemeinden = deGem.features.map(f => ({
  type: 'Feature',
  properties: {
    rs: f.properties.gem_code[0], // 12-stelliger Regionalschlüssel
    name: f.properties.gem_name_short[0],
    kreis: f.properties.krs_code[0],
    vg: (f.properties.vwg_name || [''])[0],
  },
  geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
}));
console.log(`  ${gemeinden.length} Gemeinden`);

// --- 2. Einwohnerzahlen via Wikidata (P440 = Kreisschlüssel, P1082 = Einwohner) ---
console.log('Lade Einwohnerzahlen (Wikidata) …');
const sparql = `SELECT ?key (MAX(?pop) AS ?population) WHERE {
  ?item wdt:P440 ?key . FILTER(STRSTARTS(?key, "07"))
  ?item wdt:P1082 ?pop .
} GROUP BY ?key`;
const wd = await fetchJson(`${WIKIDATA_URL}?format=json&query=${encodeURIComponent(sparql)}`, {
  headers: { 'User-Agent': 'coffee-brothers-standortanalyse/1.0 (wach@coffeebrothers.bar)' },
});
const popByRs = {};
for (const b of wd.results.bindings) popByRs[b.key.value] = Number(b.population.value);
console.log(`  Einwohnerzahlen für ${Object.keys(popByRs).length} Kreis-Schlüssel`);

// Gemeinde-Einwohner via P1388 (12-stelliger Regionalschlüssel)
const sparqlGem = `SELECT ?rs (MAX(?pop) AS ?population) WHERE {
  ?item wdt:P1388 ?rs . FILTER(STRSTARTS(?rs, "07"))
  ?item wdt:P1082 ?pop .
} GROUP BY ?rs`;
const wdGem = await fetchJson(`${WIKIDATA_URL}?format=json&query=${encodeURIComponent(sparqlGem)}`, {
  headers: { 'User-Agent': 'standort-radar/1.0 (janmedert@gmail.com)' },
});
const popByGemRs = {};
for (const b of wdGem.results.bindings) popByGemRs[b.rs.value] = Number(b.population.value);
const gemMitPop = gemeinden.filter(g => popByGemRs[g.properties.rs] != null).length;
console.log(`  Einwohnerzahlen für ${gemMitPop}/${gemeinden.length} Gemeinden`);

// --- 3. Angebot aus OpenStreetMap ---
console.log('Lade POIs (Overpass, kann ~1 min dauern) …');
const query = `[out:json][timeout:300];
area["ISO3166-2"="DE-RP"][admin_level=4]->.rlp;
(
  nwr["amenity"~"^(cafe|bar|pub|ice_cream)$"](area.rlp);
  nwr["shop"~"^(bakery|butcher|hairdresser|car_repair)$"](area.rlp);
  nwr["craft"~"^(electrician|plumber|hvac|carpenter|joiner|painter|roofer)$"](area.rlp);
);
out center qt;`;
// via curl (Node-fetch wird teils mit 406 abgelehnt); Overpass 406t sporadisch -> Retries
let osm;
for (let attempt = 1; ; attempt++) {
  try {
    osm = JSON.parse(execFileSync('curl', ['-s', '--fail', '--data-urlencode', `data=${query}`, OVERPASS_URL], { maxBuffer: 256 * 1024 * 1024 }).toString());
    break;
  } catch (e) {
    if (attempt >= 5) throw e;
    console.log(`  Versuch ${attempt} fehlgeschlagen, warte ${attempt * 15}s …`);
    execFileSync('sleep', [String(attempt * 15)]);
  }
}
console.log(`  ${osm.elements.length} POIs geladen`);

// --- 4. POIs den Kreisen zuordnen (Point-in-Polygon, Ray-Casting) ---
function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFeature(pt, geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some(rings => inRing(pt, rings[0]) && rings.slice(1).every(hole => !inRing(pt, hole)));
}
// Bounding-Boxen als Vorfilter
function makeLocator(features) {
  const boxes = features.map(f => {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of polys) for (const [x, y] of rings[0]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  });
  return (lon, lat) => features.findIndex((f, i) => {
    const b = boxes[i];
    return lon >= b.minX && lon <= b.maxX && lat >= b.minY && lat <= b.maxY && inFeature([lon, lat], f.geometry);
  });
}
const locKreis = makeLocator(kreise);
const locGem = makeLocator(gemeinden);

const counts = Object.fromEntries(kreise.map(f => [f.properties.rs,
  Object.fromEntries(Object.keys(KATEGORIEN).map(k => [k, 0]))]));
const gemCounts = Object.fromEntries(gemeinden.map(f => [f.properties.rs,
  Object.fromEntries(Object.keys(KATEGORIEN).map(k => [k, 0]))]));
const betriebe = []; // Namen für die Detail-Ansicht je Gemeinde
let unmatched = 0;
for (const el of osm.elements) {
  const lon = el.lon ?? el.center?.lon, lat = el.lat ?? el.center?.lat;
  if (lon == null) continue;
  const tags = el.tags || {};
  const kat = Object.keys(KATEGORIEN).find(k => KATEGORIEN[k].match(tags));
  if (!kat) continue;
  const ki = locKreis(lon, lat);
  if (ki === -1) { unmatched++; continue; }
  counts[kreise[ki].properties.rs][kat]++;
  const gi = locGem(lon, lat);
  if (gi !== -1) {
    const gemRs = gemeinden[gi].properties.rs;
    gemCounts[gemRs][kat]++;
    betriebe.push({ n: tags.name || '(ohne Namen)', c: kat, g: gemRs });
  }
}
console.log(`  zugeordnet, ${unmatched} außerhalb der Kreisgrenzen, ${betriebe.length} Betriebe erfasst`);

// --- 5. Scores berechnen: Einwohner je Anbieter, normiert 0–100 je Kategorie ---
const rows = kreise.map(f => {
  const rs = f.properties.rs;
  const pop = popByRs[rs] || null;
  const c = counts[rs];
  const row = { rs, name: f.properties.name, typ: f.properties.typ, pop, anbieter: c, proAnbieter: {}, score: {} };
  for (const k of Object.keys(KATEGORIEN)) row.proAnbieter[k] = pop ? Math.round(pop / Math.max(c[k], 1)) : null;
  return row;
});
for (const k of Object.keys(KATEGORIEN)) {
  const vals = rows.map(r => r.proAnbieter[k]).filter(v => v != null);
  const min = Math.min(...vals), max = Math.max(...vals);
  for (const r of rows) {
    const v = r.proAnbieter[k];
    r.score[k] = v == null ? null : Math.round(((v - min) / (max - min)) * 100);
  }
}

// Gemeinde-Zeilen: Score = Perzentilrang von "Einwohner je Anbieter" je Kategorie
// (bei 0 Anbietern zählt die volle Einwohnerzahl -> große Orte ohne Angebot ranken oben)
const gemRows = gemeinden.map(f => {
  const rs = f.properties.rs;
  const pop = popByGemRs[rs] ?? null;
  return { rs, name: f.properties.name, vg: f.properties.vg, kreis: f.properties.kreis, pop, anbieter: gemCounts[rs], score: {} };
});
for (const k of Object.keys(KATEGORIEN)) {
  const vals = gemRows.filter(r => r.pop).map(r => r.pop / Math.max(r.anbieter[k], 1)).sort((a, b) => a - b);
  for (const r of gemRows) {
    if (!r.pop) { r.score[k] = null; continue; }
    const v = r.pop / Math.max(r.anbieter[k], 1);
    let lo = 0, hi = vals.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; }
    r.score[k] = Math.round((lo / (vals.length - 1)) * 100);
  }
}

mkdirSync('data', { recursive: true });
writeFileSync('data/rlp-kreise.geo.json', JSON.stringify({ type: 'FeatureCollection', features: kreise }));
writeFileSync('data/rlp-gemeinden.geo.json', JSON.stringify({ type: 'FeatureCollection', features: gemeinden }));
writeFileSync('data/gemeinden.json', JSON.stringify({ gemeinden: gemRows }));
writeFileSync('data/betriebe.json', JSON.stringify({ betriebe }));
writeFileSync('data/standorte.json', JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  quellen: 'OpenStreetMap (ODbL), Wikidata, GeoBasis-DE/BKG (dl-de/by-2-0)',
  kategorien: Object.fromEntries(Object.entries(KATEGORIEN).map(([k, v]) => [k, v.label])),
  // craft=* ist in OSM deutlich lückenhafter erfasst als shop=*/amenity=*
  duenneDaten: ['elektriker', 'shk', 'schreiner', 'maler', 'dachdecker'],
  kreise: rows,
}, null, 1));
console.log('Fertig: data/rlp-kreise.geo.json, rlp-gemeinden.geo.json, standorte.json, gemeinden.json, betriebe.json');
const worms = rows.find(r => r.name === 'Worms');
console.log('Beispiel Worms:', JSON.stringify(worms));
