/* Standort-Analyse: Choropleth der RLP-Kreise und -Gemeinden nach Versorgungslücke.
   Datengrundlage: data/standorte.json, data/gemeinden.json, data/betriebe.json,
   data/rlp-kreise.geo.json, data/rlp-gemeinden.geo.json
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
  let cat = 'cafe' in data.kategorien ? 'cafe' : Object.keys(data.kategorien)[0];
  let level = 'kreis';
  // Gemeinde-Daten werden erst beim Umschalten geladen
  let gem = null; // { geo, byRs, betriebeByGem, layer }

  const fmt = n => n == null ? '–' : n.toLocaleString('de-DE');
  const color = s => s == null ? NODATA : RAMP[Math.min(4, Math.floor(s / 20))];

  const map = L.map('sa-map', { scrollWheelZoom: false, attributionControl: false, zoomSnap: 0.25, preferCanvas: true });

  const kreisLayer = L.geoJSON(geo, {
    style: f => styleOf(byRs[f.properties.rs]),
    onEachFeature(f, l) {
      l.bindTooltip(() => kreisTip(byRs[f.properties.rs]), { className: 'sa-tip', sticky: true, opacity: 1 });
      l.on('mouseover', () => l.setStyle({ weight: 2.5, color: '#f4ecdc' }).bringToFront());
      l.on('mouseout', () => { kreisLayer.resetStyle(l); marker.bringToFront(); });
    },
  }).addTo(map);
  map.fitBounds(kreisLayer.getBounds(), { padding: [10, 10] });

  const marker = L.circleMarker([49.6303, 8.3654], {
    radius: 7, color: SURFACE, weight: 2, fillColor: '#c69855', fillOpacity: 1,
  }).addTo(map).bindTooltip('<div class="sa-tip"><h5>Worms</h5>Euer Standort</div>', { className: 'sa-tip', opacity: 1 });

  function styleOf(row) {
    return { fillColor: color(row?.score[cat]), fillOpacity: 1, color: SURFACE, weight: level === 'kreis' ? 1.5 : 0.6 };
  }

  function kreisTip(k) {
    if (!k) return '';
    return `<h5>${k.name}${k.typ === 'Kreisfreie Stadt' ? ' (Stadt)' : ''}</h5><table>
      <tr><td>Einwohner</td><td>${fmt(k.pop)}</td></tr>
      <tr><td>${data.kategorien[cat]}</td><td>${fmt(k.anbieter[cat])}</td></tr>
      <tr><td>Einwohner je Anbieter</td><td>${fmt(k.proAnbieter[cat])}</td></tr>
      <tr><td>Lücken-Score</td><td>${k.score[cat] ?? '–'} / 100</td></tr></table>`;
  }

  function gemTip(g) {
    if (!g) return '';
    const kreisName = byRs[g.kreis]?.name || '';
    return `<h5>${g.name}</h5><table>
      <tr><td>Kreis</td><td>${kreisName}</td></tr>
      <tr><td>Einwohner</td><td>${fmt(g.pop)}</td></tr>
      <tr><td>${data.kategorien[cat]}</td><td>${fmt(g.anbieter[cat])}</td></tr>
      <tr><td>Lücken-Score</td><td>${g.score[cat] ?? '–'} / 100</td></tr></table>
      <div class="sa-tip-hint">Klicken für Betriebsliste</div>`;
  }

  function gemPopup(g) {
    const namen = gem.betriebeByGem[g.rs]?.[cat] || [];
    const list = namen.length
      ? `<ul class="sa-blist">${namen.slice(0, 15).map(n => `<li>${n}</li>`).join('')}</ul>` +
        (namen.length > 15 ? `<div class="sa-tip-hint">… und ${namen.length - 15} weitere</div>` : '')
      : `<div class="sa-tip-hint">Kein Anbieter in OpenStreetMap erfasst — mögliche Lücke.</div>`;
    return `<div class="sa-pop"><h5>${g.name}</h5>
      ${fmt(g.pop)} Einwohner · ${data.kategorien[cat]}: ${g.anbieter[cat]}${list}</div>`;
  }

  async function loadGemeinden() {
    const [gGeo, gData, bData] = await Promise.all([
      fetch('data/rlp-gemeinden.geo.json').then(r => r.json()),
      fetch('data/gemeinden.json').then(r => r.json()),
      fetch('data/betriebe.json').then(r => r.json()),
    ]);
    const byGemRs = Object.fromEntries(gData.gemeinden.map(g => [g.rs, g]));
    const betriebeByGem = {};
    for (const b of bData.betriebe) {
      (betriebeByGem[b.g] ??= {});
      (betriebeByGem[b.g][b.c] ??= []).push(b.n);
    }
    const layer = L.geoJSON(gGeo, {
      style: f => styleOf(byGemRs[f.properties.rs]),
      onEachFeature(f, l) {
        const row = byGemRs[f.properties.rs];
        l.bindTooltip(() => gemTip(row), { className: 'sa-tip', sticky: true, opacity: 1 });
        l.bindPopup(() => gemPopup(row), { className: 'sa-pop-wrap', maxWidth: 300 });
        l.on('mouseover', () => l.setStyle({ weight: 2, color: '#f4ecdc' }).bringToFront());
        l.on('mouseout', () => { layer.resetStyle(l); marker.bringToFront(); });
      },
    });
    gem = { byRs: byGemRs, betriebeByGem, layer };
  }

  function activeLayer() { return level === 'kreis' ? kreisLayer : gem.layer; }

  async function setLevel(l) {
    if (l === level) return;
    if (l === 'gem' && !gem) {
      document.getElementById('sa-note').textContent = 'Lade 2.301 Gemeinden …';
      await loadGemeinden();
    }
    map.removeLayer(activeLayer());
    level = l;
    activeLayer().addTo(map);
    marker.bringToFront();
    updateNote();
    renderTable();
  }

  function restyle() {
    kreisLayer.setStyle(f => styleOf(byRs[f.properties.rs]));
    if (gem) gem.layer.setStyle(f => styleOf(gem.byRs[f.properties.rs]));
  }

  // --- Umschalter: Ebene + Kategorie ---
  const levels = document.getElementById('sa-levels');
  for (const [key, label] of [['kreis', 'Landkreise'], ['gem', 'Städte & Gemeinden']]) {
    const b = document.createElement('button');
    b.className = 'sa-cat' + (key === level ? ' active' : '');
    b.textContent = label;
    b.onclick = async () => {
      levels.querySelectorAll('.sa-cat').forEach(x => x.classList.toggle('active', x === b));
      await setLevel(key);
    };
    levels.appendChild(b);
  }

  const cats = document.getElementById('sa-cats');
  for (const [key, label] of Object.entries(data.kategorien)) {
    const b = document.createElement('button');
    b.className = 'sa-cat' + (key === cat ? ' active' : '');
    b.textContent = label;
    b.onclick = () => {
      cat = key;
      cats.querySelectorAll('.sa-cat').forEach(x => x.classList.toggle('active', x === b));
      restyle();
      updateNote();
      renderTable();
    };
    cats.appendChild(b);
  }

  // --- Legende + Fußnote ---
  const LAB = ['0–19', '20–39', '40–59', '60–79', '80–100'];
  document.getElementById('sa-legend').innerHTML =
    '<span class="lab">gut versorgt</span>' +
    RAMP.map((c, i) => `<span class="sa-swatch" style="background:${c}" title="Score ${LAB[i]}"></span>`).join('') +
    '<span class="lab">größte Lücke&nbsp;→&nbsp;Chance</span>';

  const sparse = new Set(data.duenneDaten || []);
  function updateNote() {
    const basis = level === 'kreis'
      ? 'Lücken-Score = Einwohner je Anbieter, über alle 36 Kreise auf 0–100 normiert.'
      : 'Lücken-Score = Perzentilrang von Einwohner je Anbieter über alle 2.301 Gemeinden. Gemeinde anklicken zeigt die Liste der erfassten Betriebe.';
    document.getElementById('sa-note').textContent =
      `${basis} Quellen: ${data.quellen}. Stand: ${data.generated}. Nachfrage-Signale folgen in Ausbaustufe 2.` +
      (sparse.has(cat) ? ` ⚠ ${data.kategorien[cat]} sind in OpenStreetMap nur lückenhaft erfasst — das reale Angebot ist deutlich größer, Werte nur als grobe Tendenz lesen.` : '');
  }
  updateNote();

  // --- Tabelle ---
  function renderTable() {
    const t = document.getElementById('sa-table');
    if (level === 'kreis') {
      const rows = [...data.kreise].sort((a, b) => (b.score[cat] ?? -1) - (a.score[cat] ?? -1));
      t.innerHTML =
        `<thead><tr><th>#</th><th>Kreis / Stadt</th><th class="num">Einwohner</th><th class="num">${data.kategorien[cat]}</th><th class="num">Einw. je Anbieter</th><th>Lücken-Score</th></tr></thead><tbody>` +
        rows.map((k, i) => `<tr${k.name === 'Worms' ? ' class="worms"' : ''}><td>${i + 1}</td><td>${k.name}${k.typ === 'Kreisfreie Stadt' ? ' (Stadt)' : ''}</td>
          <td class="num">${fmt(k.pop)}</td><td class="num">${fmt(k.anbieter[cat])}</td><td class="num">${fmt(k.proAnbieter[cat])}</td>
          <td><span class="sa-scorebar"><i style="width:${k.score[cat] ?? 0}%;background:${color(k.score[cat])}"></i></span>${k.score[cat] ?? '–'}</td></tr>`).join('') +
        '</tbody>';
    } else {
      const rows = gem ? Object.values(gem.byRs)
        .filter(g => g.pop && g.anbieter[cat] === 0)
        .sort((a, b) => b.pop - a.pop).slice(0, 30) : [];
      t.innerHTML =
        `<thead><tr><th>#</th><th>Größte Orte ohne ${data.kategorien[cat]}</th><th>Verbandsgemeinde</th><th>Kreis</th><th class="num">Einwohner</th></tr></thead><tbody>` +
        rows.map((g, i) => `<tr><td>${i + 1}</td><td>${g.name}</td><td>${g.vg || '–'}</td><td>${byRs[g.kreis]?.name || ''}</td><td class="num">${fmt(g.pop)}</td></tr>`).join('') +
        '</tbody>';
    }
  }
  renderTable();
})();
