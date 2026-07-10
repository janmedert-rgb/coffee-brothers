/* Standort-Analyse: Choropleth der RLP-Landkreise nach Versorgungslücke.
   Datengrundlage: data/standorte.json + data/rlp-kreise.geo.json
   (erzeugt von scripts/fetch-standorte-daten.mjs) */
(async function () {
  // Sequentielle Mint-Rampe (dunkel = gut versorgt, hell = größte Lücke),
  // validiert gegen die Panel-Fläche (dataviz-Palette-Checks)
  const RAMP = ['#265f50', '#3f8069', '#5ca287', '#7fc6a9', '#a6ebcd'];
  const NODATA = '#39423f';
  const SURFACE = '#0c2620';

  const [geo, data] = await Promise.all([
    fetch('data/rlp-kreise.geo.json').then(r => r.json()),
    fetch('data/standorte.json').then(r => r.json()),
  ]);
  const byRs = Object.fromEntries(data.kreise.map(k => [k.rs, k]));
  let cat = Object.keys(data.kategorien)[0];

  const fmt = n => n == null ? '–' : n.toLocaleString('de-DE');
  const color = s => s == null ? NODATA : RAMP[Math.min(4, Math.floor(s / 20))];

  const map = L.map('sa-map', { scrollWheelZoom: false, attributionControl: false, zoomSnap: 0.25 });

  const layer = L.geoJSON(geo, {
    style: styleOf,
    onEachFeature(f, l) {
      l.bindTooltip(() => tipHtml(byRs[f.properties.rs]), { className: 'sa-tip', sticky: true, opacity: 1 });
      l.on('mouseover', () => l.setStyle({ weight: 2.5, color: '#f4ecdc' }).bringToFront());
      l.on('mouseout', () => { layer.resetStyle(l); marker.bringToFront(); });
    },
  }).addTo(map);
  map.fitBounds(layer.getBounds(), { padding: [10, 10] });

  // Coffee Brothers, Obermarkt 8, Worms
  const marker = L.circleMarker([49.6303, 8.3654], {
    radius: 7, color: SURFACE, weight: 2, fillColor: '#c69855', fillOpacity: 1,
  }).addTo(map).bindTooltip('<div class="sa-tip"><h5>Coffee Brothers</h5>Obermarkt 8, Worms</div>', { className: 'sa-tip', opacity: 1 });

  function styleOf(f) {
    const k = byRs[f.properties.rs];
    return { fillColor: color(k?.score[cat]), fillOpacity: 1, color: SURFACE, weight: 1.5 };
  }

  function tipHtml(k) {
    if (!k) return '';
    return `<h5>${k.name}${k.typ === 'Kreisfreie Stadt' ? ' (Stadt)' : ''}</h5><table>
      <tr><td>Einwohner</td><td>${fmt(k.pop)}</td></tr>
      <tr><td>${data.kategorien[cat]}</td><td>${fmt(k.anbieter[cat])}</td></tr>
      <tr><td>Einwohner je Anbieter</td><td>${fmt(k.proAnbieter[cat])}</td></tr>
      <tr><td>Lücken-Score</td><td>${k.score[cat] ?? '–'} / 100</td></tr></table>`;
  }

  // --- Kategorie-Umschalter ---
  const cats = document.getElementById('sa-cats');
  for (const [key, label] of Object.entries(data.kategorien)) {
    const b = document.createElement('button');
    b.className = 'sa-cat' + (key === cat ? ' active' : '');
    b.textContent = label;
    b.setAttribute('role', 'tab');
    b.onclick = () => {
      cat = key;
      cats.querySelectorAll('.sa-cat').forEach(x => x.classList.toggle('active', x === b));
      layer.setStyle(styleOf);
      renderTable();
    };
    cats.appendChild(b);
  }

  // --- Legende ---
  const LAB = ['0–19', '20–39', '40–59', '60–79', '80–100'];
  document.getElementById('sa-legend').innerHTML =
    '<span class="lab">gut versorgt</span>' +
    RAMP.map((c, i) => `<span class="sa-swatch" style="background:${c}" title="Score ${LAB[i]}"></span>`).join('') +
    '<span class="lab">größte Lücke&nbsp;→&nbsp;Chance</span>';

  document.getElementById('sa-note').textContent =
    `Lücken-Score = Einwohner je Anbieter, über alle 36 Kreise auf 0–100 normiert (100 = wenigste Anbieter pro Kopf in RLP). ` +
    `Quellen: ${data.quellen}. Stand: ${data.generated}. Nachfrage-Signale (Suchvolumen, Kaufkraft) folgen in Ausbaustufe 2.`;

  // --- Ranking-Tabelle ---
  function renderTable() {
    const rows = [...data.kreise].sort((a, b) => (b.score[cat] ?? -1) - (a.score[cat] ?? -1));
    document.getElementById('sa-table').innerHTML =
      `<thead><tr><th>#</th><th>Kreis / Stadt</th><th class="num">Einwohner</th><th class="num">${data.kategorien[cat]}</th><th class="num">Einw. je Anbieter</th><th>Lücken-Score</th></tr></thead><tbody>` +
      rows.map((k, i) => `<tr${k.name === 'Worms' ? ' class="worms"' : ''}><td>${i + 1}</td><td>${k.name}${k.typ === 'Kreisfreie Stadt' ? ' (Stadt)' : ''}</td>
        <td class="num">${fmt(k.pop)}</td><td class="num">${fmt(k.anbieter[cat])}</td><td class="num">${fmt(k.proAnbieter[cat])}</td>
        <td><span class="sa-scorebar"><i style="width:${k.score[cat] ?? 0}%;background:${color(k.score[cat])}"></i></span>${k.score[cat] ?? '–'}</td></tr>`).join('') +
      '</tbody>';
  }
  renderTable();
})();
