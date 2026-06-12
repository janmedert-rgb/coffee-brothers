/* ============================================
   COFFEE BROTHERS — BARISTA RUSH
   Echte Drinks. Echte Rezepte. Echter Rush.
   ============================================ */
(() => {
  "use strict";

  // ---------- Zutaten ----------
  const INGREDIENTS = {
    espresso: { label: "Espresso", icon: "☕", color: "#4a2c17" },
    milk:     { label: "Milch",    icon: "🥛", color: "#f7f3ea" },
    foam:     { label: "Schaum",   icon: "☁️", color: "#fdf6e3" },
    chocolate:{ label: "Schoko",   icon: "🍫", color: "#6b3a21" },
    caramel:  { label: "Caramel",  icon: "🍯", color: "#c69855" },
    vanilla:  { label: "Vanille",  icon: "🌼", color: "#f1e3b2" },
    matcha:   { label: "Matcha",   icon: "🍵", color: "#7da964" },
    chai:     { label: "Chai",     icon: "✨", color: "#b07b4f" },
    ice:      { label: "Eis",      icon: "🧊", color: "#bfe3ea" },
    oreo:     { label: "Oreo",     icon: "🍪", color: "#2f2a28" },
  };

  // ---------- Drinks von der echten Karte ----------
  // tier 1 ab Start, tier 2 ab 5 Drinks, tier 3 ab 12 Drinks
  const DRINKS = [
    { name: "Espresso",           desc: "Kräftig, direkt, frisch gemahlen.", price: 3.6, tier: 1, recipe: ["espresso"] },
    { name: "Espresso Macchiato", desc: "Espresso mit feinem Milchschaum.",  price: 3.8, tier: 1, recipe: ["espresso", "foam"] },
    { name: "Milchcafé",          desc: "Soft, milchig, comforting.",        price: 3.9, tier: 1, recipe: ["espresso", "milk"] },
    { name: "Cappuccino",         desc: "Espresso mit cremigem Milchschaum.",price: 3.9, tier: 1, recipe: ["espresso", "milk", "foam"] },
    { name: "Latte Macchiato",    desc: "Milch zuerst — geschichtet!",       price: 3.9, tier: 1, recipe: ["milk", "espresso", "foam"] },
    { name: "Flat White",         desc: "Doppelter Espresso, silky milk.",   price: 3.9, tier: 1, recipe: ["espresso", "espresso", "milk"] },
    { name: "Hot Chocolate",      desc: "Warm, süß, cozy.",                  price: 4.5, tier: 1, recipe: ["chocolate", "milk", "foam"] },

    { name: "Caramel Macchiato",  desc: "Unser süßer Klassiker.",            price: 4.6, tier: 2, recipe: ["milk", "espresso", "caramel"] },
    { name: "White Macchiato",    desc: "Vanillig und cremig.",              price: 4.6, tier: 2, recipe: ["vanilla", "milk", "espresso"] },
    { name: "Black Macchiato",    desc: "Dark caramel notes.",               price: 4.6, tier: 2, recipe: ["espresso", "caramel", "foam"] },
    { name: "Flavoured Latte",    desc: "Mit Sirup nach Wahl.",              price: 4.6, tier: 2, recipe: ["espresso", "milk", "vanilla"] },
    { name: "Matcha Latte",       desc: "Green energy.",                     price: 4.6, tier: 2, recipe: ["matcha", "milk"] },
    { name: "Chai Latte",         desc: "Spiced, warm, smooth.",             price: 4.6, tier: 2, recipe: ["chai", "milk", "foam"] },

    { name: "Café Frappé",        desc: "Iced Coffee Classic.",              price: 4.6, tier: 3, recipe: ["ice", "espresso", "milk"] },
    { name: "Chocolate Frappe",   desc: "White oder Black.",                 price: 4.6, tier: 3, recipe: ["ice", "chocolate", "milk"] },
    { name: "Matcha Frappé",      desc: "Cremig, grün, kalt.",               price: 4.6, tier: 3, recipe: ["ice", "matcha", "milk"] },
    { name: "Mocca Frappe",       desc: "Coffee × Chocolate.",               price: 4.6, tier: 3, recipe: ["ice", "espresso", "chocolate", "milk"] },
    { name: "Oreo Frappe",        desc: "Cookie Crunch.",                    price: 4.6, tier: 3, recipe: ["ice", "oreo", "milk", "foam"] },
  ];

  // Bonus-Bestellung: bringt ein Leben zurück
  const BAMBINOCCINO = {
    name: "Bambinoccino", desc: "Für die Kleinen — for free. Richtig serviert: +1 Leben!",
    price: 0, tier: 0, recipe: ["milk", "foam"], bonusLife: true,
  };

  const CUSTOMERS = [
    "Stammgast Resi", "Dom-Tourist", "Mama aus der Kids Corner", "Student im Lernstress",
    "Der Frühaufsteher", "Business-Call-Bernd", "Matcha-Girl", "Skater vom Obermarkt",
    "Oma Helga", "Erstes Date am Fenstertisch", "Der Laptop-Nomade", "Brudi von nebenan",
  ];

  const TRAINING_ORDERS = 5;   // so lange ist das Rezept sichtbar
  const START_LIVES = 3;
  const HS_KEY = "cb-barista-rush-highscore";

  // ---------- State ----------
  let score, lives, combo, bestCombo, served, cup, order, peeked;
  let timeTotal, timeLeft, lastTick, rafId, running = false;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const screens = { start: $("screenStart"), game: $("screenGame"), over: $("screenOver") };

  const fmt = (n) => n.toFixed(2).replace(".", ",") + " €";

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  }

  function highscore() {
    return parseFloat(localStorage.getItem(HS_KEY) || "0");
  }

  // ---------- Sound (dezente WebAudio-Bloops) ----------
  let audioCtx = null;
  function beep(freq, dur = 0.09, type = "sine", gain = 0.05) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch { /* Sound ist optional */ }
  }

  // ---------- Aufbau ----------
  function buildIngredientGrid() {
    const grid = $("ingredientGrid");
    grid.innerHTML = "";
    Object.entries(INGREDIENTS).forEach(([id, ing]) => {
      const btn = document.createElement("button");
      btn.className = "ing-btn";
      btn.type = "button";
      btn.innerHTML = `<span>${ing.icon}</span><span>${ing.label}</span>`;
      btn.addEventListener("click", () => addIngredient(id));
      grid.appendChild(btn);
    });
  }

  // ---------- Runden-Logik ----------
  function pickOrder() {
    // Bambinoccino taucht ab und zu auf, wenn ein Leben fehlt
    if (lives < START_LIVES && served > 3 && Math.random() < 0.18) return BAMBINOCCINO;
    const maxTier = served >= 12 ? 3 : served >= 5 ? 2 : 1;
    const pool = DRINKS.filter((d) => d.tier <= maxTier);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function newOrder() {
    order = pickOrder();
    cup = [];
    peeked = false;

    $("ticketCustomer").textContent = order.bonusLife
      ? "Kleiner Gast aus der Kids Corner"
      : CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    $("ticketPrice").textContent = order.price ? fmt(order.price) : "for free 💚";
    $("ticketDrink").textContent = order.name;
    $("ticketDesc").textContent = order.desc;

    const showRecipe = served < TRAINING_ORDERS || order.bonusLife;
    renderRecipe(showRecipe);
    $("btnPeek").classList.toggle("hidden", showRecipe);
    renderCup();

    // Zeit: Basis + pro Zutat, wird mit Fortschritt knapper
    const difficulty = Math.max(0.55, 1 - served * 0.02);
    timeTotal = (5 + order.recipe.length * 3) * difficulty;
    timeLeft = timeTotal;
    lastTick = performance.now();
  }

  function renderRecipe(visible) {
    const box = $("ticketRecipe");
    box.innerHTML = "";
    if (!visible) {
      box.innerHTML = `<span class="recipe-chip">🤫 ${order.recipe.length} Zutaten — du kennst die Karte!</span>`;
      return;
    }
    order.recipe.forEach((id, i) => {
      const chip = document.createElement("span");
      chip.className = "recipe-chip" + (i < cup.length && cup[i] === id ? " done" : "");
      chip.textContent = `${INGREDIENTS[id].icon} ${INGREDIENTS[id].label}`;
      box.appendChild(chip);
    });
  }

  function recipeVisible() {
    return served < TRAINING_ORDERS || order.bonusLife || peeked;
  }

  function renderCup() {
    const layers = $("cupLayers");
    layers.innerHTML = "";
    cup.forEach((id) => {
      const l = document.createElement("div");
      l.className = "cup-layer";
      l.style.background = INGREDIENTS[id].color;
      layers.appendChild(l);
    });
  }

  function addIngredient(id) {
    if (!running) return;
    if (cup.length >= 5) { shakeTicket(); return; }
    cup.push(id);
    beep(300 + cup.length * 60, 0.07, "triangle");
    renderCup();
    if (recipeVisible()) renderRecipe(true);
  }

  function shakeTicket() {
    const t = $("orderTicket");
    t.classList.remove("shake");
    void t.offsetWidth;
    t.classList.add("shake");
  }

  function feedback(symbol) {
    const f = $("cupFeedback");
    f.textContent = symbol;
    f.classList.remove("pop");
    void f.offsetWidth;
    f.classList.add("pop");
  }

  // ---------- Servieren / Fehler ----------
  function serve() {
    if (!running) return;
    const ok = cup.length === order.recipe.length && cup.every((v, i) => v === order.recipe[i]);
    if (ok) {
      served++;
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const tipFactor = (peeked ? 0.5 : 1) * (timeLeft / timeTotal);
      const tip = order.price * 0.5 * tipFactor;
      const comboBonus = (combo - 1) * 0.2;
      score += order.price + tip + comboBonus;
      if (order.bonusLife && lives < START_LIVES) lives++;
      feedback(order.bonusLife ? "💚" : "✨");
      beep(660, 0.12); beep(880, 0.15);
      updateHud();
      newOrder();
    } else {
      fail("❌");
    }
  }

  function fail(symbol) {
    combo = 0;
    lives--;
    feedback(symbol);
    shakeTicket();
    beep(160, 0.25, "sawtooth", 0.06);
    updateHud();
    if (lives <= 0) { gameOver(); return; }
    newOrder();
  }

  function updateHud() {
    $("hudScore").textContent = fmt(score);
    $("hudCombo").textContent = "×" + Math.max(1, combo);
    $("hudLives").textContent = "☕".repeat(lives) || "—";
  }

  // ---------- Loop ----------
  function tick(now) {
    if (!running) return;
    timeLeft -= (now - lastTick) / 1000;
    lastTick = now;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimeBar();
      fail("⏰");
      if (!running) return;
    }
    updateTimeBar();
    rafId = requestAnimationFrame(tick);
  }

  function updateTimeBar() {
    const bar = $("timeBar");
    const pct = (timeLeft / timeTotal) * 100;
    bar.style.width = pct + "%";
    bar.classList.toggle("warn", pct < 35);
  }

  // ---------- Start / Ende ----------
  function start() {
    score = 0; lives = START_LIVES; combo = 0; bestCombo = 0; served = 0;
    running = true;
    updateHud();
    newOrder();
    show("game");
    lastTick = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(rafId);

    const best = highscore();
    const isRecord = score > best;
    if (isRecord) localStorage.setItem(HS_KEY, String(score));

    $("overHeadline").textContent = isRecord ? "Neuer Rekord! 🏆" : "Schicht beendet!";
    $("overScore").textContent = fmt(score);
    $("overServed").textContent = served;
    $("overCombo").textContent = "×" + Math.max(1, bestCombo);
    $("overBest").textContent = "Dein Highscore: " + fmt(Math.max(score, best));
    show("over");
  }

  function share() {
    const text = `☕ Ich habe bei Barista Rush ${fmt(score)} Tagesumsatz für die Coffee Brothers in Worms gemacht! Schaffst du mehr?`;
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: "Barista Rush — Coffee Brothers", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`);
      const btn = $("btnShare");
      const old = btn.textContent;
      btn.textContent = "Kopiert! ✓";
      setTimeout(() => (btn.textContent = old), 1500);
    }
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    buildIngredientGrid();
    const best = highscore();
    $("startBest").textContent = best > 0 ? "Dein Highscore: " + fmt(best) : "";

    $("btnStart").addEventListener("click", start);
    $("btnRestart").addEventListener("click", start);
    $("btnServe").addEventListener("click", serve);
    $("btnClear").addEventListener("click", () => { cup = []; renderCup(); if (recipeVisible()) renderRecipe(true); beep(220, 0.08); });
    $("btnPeek").addEventListener("click", () => {
      peeked = true;
      renderRecipe(true);
      $("btnPeek").classList.add("hidden");
    });
    $("btnShare").addEventListener("click", share);
  });
})();
