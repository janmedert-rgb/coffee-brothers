/* ============================================
   COFFEE BROTHERS — BARISTA RUSH v2
   Pour-Timing · Schaum-Frenzy · Funny Gäste
   ============================================ */
(() => {
  "use strict";

  // ---------- Zutaten (amount = Anteil der Tasse) ----------
  const ING = {
    espresso:  { label: "Espresso", icon: "☕", color: "#4a2c17", amount: 0.25 },
    milk:      { label: "Milch",    icon: "🥛", color: "#f7f3ea", amount: 0.40 },
    chocolate: { label: "Schoko",   icon: "🍫", color: "#6b3a21", amount: 0.30 },
    caramel:   { label: "Caramel",  icon: "🍯", color: "#c69855", amount: 0.18 },
    vanilla:   { label: "Vanille",  icon: "🌼", color: "#f1e3b2", amount: 0.18 },
    matcha:    { label: "Matcha",   icon: "🍵", color: "#7da964", amount: 0.28 },
    chai:      { label: "Chai",     icon: "✨", color: "#b07b4f", amount: 0.28 },
    oreo:      { label: "Oreo",     icon: "🍪", color: "#3a3331", amount: 0.30 },
    strawberry:{ label: "Erdbeer",  icon: "🍓", color: "#d96a7c", amount: 0.38 },
    mango:     { label: "Mango",    icon: "🥭", color: "#e8b04b", amount: 0.38 },
    banana:    { label: "Banane",   icon: "🍌", color: "#efe3a8", amount: 0.30 },
  };
  const pour = (ing) => ({ type: "pour", ing });
  const FOAM = { type: "foam" };
  const BLEND = { type: "blend" };

  // ---------- Drinks von der echten Karte ----------
  const DRINKS = [
    { name: "Espresso",          price: 3.6, tier: 1, steps: [pour("espresso")] },
    { name: "Milchcafé",         price: 3.9, tier: 1, steps: [pour("espresso"), pour("milk")] },
    { name: "Cappuccino",        price: 3.9, tier: 1, steps: [pour("espresso"), pour("milk"), FOAM] },
    { name: "Latte Macchiato",   price: 3.9, tier: 1, steps: [pour("milk"), pour("espresso"), FOAM] },
    { name: "Hot Chocolate",     price: 4.5, tier: 1, steps: [pour("chocolate"), pour("milk"), FOAM] },
    { name: "Matcha Latte",      price: 4.6, tier: 2, steps: [pour("matcha"), pour("milk"), FOAM] },
    { name: "Chai Latte",        price: 4.6, tier: 2, steps: [pour("chai"), pour("milk"), FOAM] },
    { name: "Caramel Macchiato", price: 4.6, tier: 2, steps: [pour("caramel"), pour("milk"), pour("espresso"), FOAM] },
    { name: "White Macchiato",   price: 4.6, tier: 2, steps: [pour("vanilla"), pour("milk"), pour("espresso"), FOAM] },
    { name: "Café Frappé",       price: 4.6, tier: 3, steps: [pour("espresso"), pour("milk"), BLEND] },
    { name: "Chocolate Frappe",  price: 4.6, tier: 3, steps: [pour("chocolate"), pour("milk"), BLEND] },
    { name: "Oreo Frappe",       price: 4.6, tier: 3, steps: [pour("oreo"), pour("milk"), BLEND] },
    { name: "Matcha Frappé",     price: 4.6, tier: 3, steps: [pour("matcha"), pour("milk"), BLEND] },
    { name: "Erdbeer-Banana Smoothie", price: 4.6, tier: 3, steps: [pour("strawberry"), pour("banana"), BLEND] },
    { name: "Mango Smoothie",    price: 4.6, tier: 3, steps: [pour("mango"), pour("milk"), BLEND] },
  ];
  const BAMBINO = { name: "Bambinoccino", price: 0, tier: 0, kid: true, steps: [pour("milk"), FOAM] };

  // ---------- Funny Gäste ----------
  const GUESTS = [
    { name: "Resi · Stammgast",       hi: "Das Übliche. Aber ZACKIG, Schätzchen!",            yay: "Na also. Bis morgen, Schätzchen. 😘", bye: "Dann eben Filterkaffee. ZUHAUSE!" },
    { name: "Business-Bernd",         hi: "Einen Kaffee — ja Klaus, ich hör dir zu …",        yay: "Klaus, ich ruf zurück. DAS hier ist wichtiger.", bye: "Klaus? Das Meeting ist eskaliert." },
    { name: "Matcha-Mia · 12k Follower", hi: "Es muss instagrammable sein. Mein Feed ist beige!", yay: "OMG, das wird gepostet! #coffeebrothers", bye: "Unfollow. UNFOLLOW!!" },
    { name: "Skater-Justus",          hi: "Ey Brudi. Das Grüne. Du weißt schon.",             yay: "Safe, Brudi. Krass smooth.", bye: "Uncool, Brudi. Uncool." },
    { name: "Oma Helga",              hi: "Früher gab's nur Bohnenkaffee. Und der war GUT.",  yay: "Hach … fast so gut wie früher.", bye: "Das wär beim Konsum nicht passiert!" },
    { name: "Dom-Tourist Günther",    hi: "Wo ist der Dom? Und wo ist mein Kaffee?",          yay: "Besser als der Dom! Sag's keinem.", bye: "Ich frag jetzt im Dom nach Kaffee." },
    { name: "Laptop-Lukas",           hi: "WLAN-Passwort und Koffein. Reihenfolge egal.",     yay: "Kapitel 3 schreibt sich jetzt von selbst!", bye: "Deadline tot. Danke für nichts." },
    { name: "Erstes-Date-Paar",       hi: "EIN Becher, ZWEI Strohhalme. Kein Kommentar.",     yay: "Es läuft! Zweites Date gebucht. 💚", bye: "Das Date ist vorbei. Wegen DIR." },
    { name: "Yoga-Yvonne",            hi: "Mein Chakra braucht Koffein. Namaste, aber flott.",yay: "Inner peace. Outer Cappuccino. 🧘", bye: "DAS war NICHT achtsam von dir!" },
  ];
  const KID = { name: "Kids-Corner-Kind", hi: "Bambinoccino bitteeee! 🧸", yay: "MAMA! SCHAUM! 💚 (+1 Stammgast zurück)", bye: "*herzzerreißendes Schluchzen*" };

  // ---------- Events ----------
  const EVENTS = [
    { icon: "🚌", title: "TOURI-BUS AM DOM!",      desc: "Doppeltes Trinkgeld!",                 dur: 25, tip: 2, spawn: 1 },
    { icon: "📸", title: "FOODBLOGGERIN DA!",      desc: "Perfekte Zubereitung zählt doppelt!",  dur: 25, blog: true },
    { icon: "🔧", title: "MASCHINE VERKALKT!",     desc: "Grüne Zonen kleiner. Entkalken? Keine Zeit!", dur: 22, zone: 0.65 },
    { icon: "🎵", title: "GOOD-VIBES-STUNDE!",     desc: "Die Gäste chillen — Geduld eingefroren.", dur: 12, freeze: true },
    { icon: "☔", title: "PLATZREGEN!",            desc: "Ganz Worms flüchtet ins Café!",        dur: 20, spawn: 2, patience: 1.3 },
  ];

  const HS_KEY = "cb-barista-rush-highscore";
  const START_HEARTS = 3;
  const MAX_QUEUE = () => (S.served < 4 ? 2 : 3);

  // ---------- State ----------
  let S = null;
  let running = false, rafId = 0, lastT = 0, ticketSeq = 0;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toFixed(2).replace(".", ",") + " €";
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const screens = { start: $("screenStart"), game: $("screenGame"), over: $("screenOver") };
  const show = (name) => Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
  const highscore = () => parseFloat(localStorage.getItem(HS_KEY) || "0");

  // ---------- Sound ----------
  let audioCtx = null;
  function beep(freq, dur = 0.09, type = "sine", gain = 0.05) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch { /* Sound ist optional */ }
  }

  // ---------- Schwierigkeit ----------
  function zoneScale() {
    let z = S.served < 3 ? 1.3 : S.served < 8 ? 1 : Math.max(0.78, 1 - (S.served - 8) * 0.012);
    if (S.event?.zone) z *= S.event.zone;
    return z;
  }

  // ---------- Tickets ----------
  function spawnTicket(opts = {}) {
    if (S.tickets.length >= MAX_QUEUE()) return;
    const kid = !opts.simple && S.hearts < START_HEARTS && Math.random() < 0.16;
    const maxTier = S.served >= 9 ? 3 : S.served >= 4 ? 2 : 1;
    let pool = DRINKS.filter((d) => d.tier <= maxTier);
    if (opts.simple) pool = DRINKS.filter((d) => d.tier === 1 && d.steps.length <= 3);
    if (opts.drink) pool = [opts.drink];
    const drink = kid ? BAMBINO : rnd(pool);
    const taken = S.tickets.map((t) => t.guest);
    const free = GUESTS.filter((g) => !taken.includes(g));
    const guest = kid ? KID : rnd(free.length ? free : GUESTS);
    const patience = (24 + drink.steps.length * 9) * Math.max(0.55, 1 - S.served * 0.015) * (S.event?.patience || 1);
    const t = {
      id: ++ticketSeq, guest, drink,
      patience, patienceMax: patience,
      stepIdx: 0, layers: [], cumFill: 0, perfects: 0,
    };
    S.tickets.push(t);
    if (S.activeId == null) activate(t.id);
    speech(guest.hi);
    renderQueue();
  }

  const ticket = () => S.tickets.find((t) => t.id === S.activeId) || null;
  const step = () => { const t = ticket(); return t ? t.drink.steps[t.stepIdx] : null; };

  function activate(id) {
    S.activeId = id;
    resetTransient();
    renderOrder();
    renderQueue();
  }

  function resetTransient() {
    S.holding = false; S.pourFill = 0;
    S.needle = 0; S.foamProg = 0; S.foamZoneT = 0; S.foamTotT = 0;
    S.blendPos = 0; S.blendDir = 1;
  }

  function removeTicket(t) {
    S.tickets = S.tickets.filter((x) => x.id !== t.id);
    if (S.activeId === t.id) {
      S.activeId = null;
      if (S.tickets.length) activate(S.tickets[0].id);
      else { renderOrder(); renderQueue(); }
    } else renderQueue();
  }

  function loseGuest(t) {
    speech(t.guest.bye, true);
    feedback("💔");
    beep(150, 0.3, "sawtooth", 0.07);
    S.hearts--; S.vibes = 0;
    updateHud();
    removeTicket(t);
    if (S.hearts <= 0) gameOver();
  }

  // ---------- Events ----------
  function maybeEvent() {
    if (S.event || S.served < 4 || Math.random() > 0.35) return;
    const ev = rnd(EVENTS);
    S.event = ev;
    S.eventUntil = performance.now() + ev.dur * 1000;
    const banner = $("eventBanner");
    banner.textContent = `${ev.icon} ${ev.title} ${ev.desc}`;
    banner.classList.remove("hidden");
    beep(520, 0.15, "square"); beep(700, 0.2, "square");
    for (let i = 0; i < (ev.spawn || 0); i++) spawnTicket({ simple: true });
  }

  function tickEvent(now) {
    if (S.event && now > S.eventUntil) {
      S.event = null;
      $("eventBanner").classList.add("hidden");
    }
  }

  // ---------- Skill-Steps ----------
  function pourTol() { return 0.10 * zoneScale(); }
  const POUR_PERFECT = 0.035;

  function stepSuccess(perfect) {
    const t = ticket();
    const st = step();
    if (st.type === "pour") {
      t.layers.push({ color: ING[st.ing].color, h: S.pourFill });
      t.cumFill += S.pourFill;
    }
    if (perfect) { t.perfects++; feedback("PERFEKT! ✨"); beep(880, 0.12); beep(1175, 0.16); }
    else { feedback("✓"); beep(660, 0.1); }
    t.stepIdx++;
    resetTransient();
    if (t.stepIdx >= t.drink.steps.length) serve(t);
    else { renderOrder(); }
  }

  function releasePour() {
    const t = ticket(), st = step();
    if (!t || !st || st.type !== "pour") return;
    const target = ING[st.ing].amount, tol = pourTol();
    if (S.pourFill < target - tol) {
      hint("Mehr! Weiter eingießen …");
      return; // zu wenig — einfach weitergießen, kein Fail
    }
    if (S.pourFill <= target + tol) {
      stepSuccess(Math.abs(S.pourFill - target) <= POUR_PERFECT);
    } else {
      spill(t, "Übergelaufen! 🫗");
    }
  }

  function spill(t, msg) {
    feedback(msg);
    $("cup").classList.remove("spill"); void $("cup").offsetWidth; $("cup").classList.add("spill");
    beep(180, 0.25, "sawtooth", 0.07);
    S.vibes = 0;
    S.pourFill = 0; S.needle = 0; S.foamProg = Math.max(0, S.foamProg - 0.5);
    updateHud();
    renderOrder();
  }

  function tapFoam() {
    S.needle = Math.min(100, S.needle + 16);
    beep(280 + S.needle * 3, 0.05, "triangle", 0.04);
    if (S.needle >= 98) {
      spill(ticket(), "ÜBERGEKOCHT! 🌋");
      S.needle = 0;
    }
  }

  function releaseBlend() {
    const t = ticket();
    const lo = 60, hi = 60 + 28 * zoneScale();
    if (S.blendPos >= lo && S.blendPos <= hi) {
      const mid = (lo + hi) / 2;
      stepSuccess(Math.abs(S.blendPos - mid) <= 4);
    } else {
      feedback(S.blendPos < lo ? "Zu kurz gemixt! 🥴" : "Püriert zu Staub! 💨");
      beep(180, 0.2, "sawtooth", 0.06);
      S.blendPos = 0; S.blendDir = 1;
    }
  }

  // ---------- Servieren ----------
  function serve(t) {
    S.served++;
    const patFrac = Math.max(0, t.patience / t.patienceMax);
    const tipMult = S.event?.tip || 1;
    const allPerfect = t.perfects >= t.drink.steps.length;
    const tip = (t.drink.price * 0.4 * patFrac + t.perfects * 0.5) * tipMult + S.vibes * 0.15;
    const gain = t.drink.price + tip;
    S.score += gain;
    let vibeGain = 1 + (allPerfect ? 1 : 0);
    if (S.event?.blog) vibeGain *= 2;
    S.vibes += vibeGain;
    S.bestVibes = Math.max(S.bestVibes, S.vibes);
    if (t.drink.kid && S.hearts < START_HEARTS) S.hearts++;
    speech(t.guest.yay);
    moneyPop(gain);
    feedback(t.drink.kid ? "💚" : "💸");
    beep(740, 0.1); beep(988, 0.14); beep(1319, 0.18);
    updateHud();
    removeTicket(t);
    maybeEvent();
    if (!S.tickets.length) S.spawnIn = Math.min(S.spawnIn, 0.6);
  }

  // ---------- Rendering ----------
  function renderQueue() {
    const q = $("ticketQueue");
    q.innerHTML = "";
    S.tickets.forEach((t) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tq-card" + (t.id === S.activeId ? " active" : "");
      card.innerHTML = `<b>${t.drink.name}</b><span>${t.guest.name.split("·")[0].trim()}</span><div class="tq-pat"><div></div></div>`;
      card.addEventListener("click", () => { if (t.id !== S.activeId) { activate(t.id); beep(440, 0.06); } });
      t.patEl = card.querySelector(".tq-pat div");
      q.appendChild(card);
    });
  }

  function renderOrder() {
    const t = ticket();
    if (!t) {
      $("opDrink").textContent = "Kurze Verschnaufpause …";
      $("opPrice").textContent = "";
      $("opSteps").innerHTML = "";
      $("pourBand").classList.add("hidden");
      $("meter").classList.add("hidden");
      hint("Gleich kommt der nächste Gast!");
      $("actionBtn").disabled = true;
      renderCup();
      return;
    }
    $("actionBtn").disabled = false;
    $("opDrink").textContent = t.drink.name;
    $("opPrice").textContent = t.drink.price ? fmt(t.drink.price) : "for free 💚";

    const stepsBox = $("opSteps");
    stepsBox.innerHTML = "";
    t.drink.steps.forEach((st, i) => {
      const chip = document.createElement("span");
      chip.className = "op-step" + (i < t.stepIdx ? " done" : i === t.stepIdx ? " now" : "");
      chip.textContent = st.type === "pour" ? `${ING[st.ing].icon} ${ING[st.ing].label}`
        : st.type === "foam" ? "☁️ Aufschäumen" : "🌀 Mixen";
      stepsBox.appendChild(chip);
    });

    const st = step();
    const btn = $("actionBtn");
    if (st.type === "pour") {
      $("meter").classList.add("hidden");
      const target = ING[st.ing].amount, tol = pourTol();
      const band = $("pourBand");
      band.classList.remove("hidden");
      band.style.bottom = (t.cumFill + target - tol) * 100 + "%";
      band.style.height = tol * 2 * 100 + "%";
      btn.textContent = `⬇ HALTEN — ${ING[st.ing].label} eingießen`;
      hint("Halte gedrückt, lass in der grünen Zone los!");
    } else if (st.type === "foam") {
      $("pourBand").classList.add("hidden");
      $("meter").classList.remove("hidden");
      const zone = $("meterZone");
      const w = 34 * zoneScale();
      zone.style.left = 38 + "%"; zone.style.width = w + "%";
      btn.textContent = "👆 TIPPEN — Milch aufschäumen!";
      hint("Tippe im Takt — halte die Nadel im Grün. Nicht überkochen!");
    } else {
      $("pourBand").classList.add("hidden");
      $("meter").classList.remove("hidden");
      const zone = $("meterZone");
      const w = 28 * zoneScale();
      zone.style.left = "60%"; zone.style.width = w + "%";
      btn.textContent = "⬇ HALTEN — Mixen!";
      hint("Halte zum Mixen — lass den Zeiger im Grün los!");
    }
    renderCup();
  }

  function renderCup() {
    const t = ticket();
    const inner = $("cupInner");
    inner.innerHTML = "";
    if (!t) return;
    t.layers.forEach((l) => {
      const d = document.createElement("div");
      d.className = "cl";
      d.style.height = l.h * 100 + "%";
      d.style.background = l.color;
      inner.appendChild(d);
    });
    const st = step();
    if (st && st.type === "pour") {
      const d = document.createElement("div");
      d.className = "cl current";
      d.style.background = ING[st.ing].color;
      d.style.height = "0%";
      inner.appendChild(d);
      S.pourEl = d;
    } else S.pourEl = null;
    if (st && st.type === "foam") {
      const d = document.createElement("div");
      d.className = "cl foam-layer";
      d.style.height = "0%";
      inner.appendChild(d);
      S.foamEl = d;
    } else S.foamEl = null;
    $("cup").classList.toggle("blending", !!(st && st.type === "blend" && S.holding));
  }

  function hint(msg) { $("stepHint").textContent = msg; }

  function speech(msg, angry = false) {
    const b = $("speech");
    b.textContent = msg;
    b.classList.remove("hidden", "angry", "pop-in");
    if (angry) b.classList.add("angry");
    void b.offsetWidth;
    b.classList.add("pop-in");
    clearTimeout(S.speechTimer);
    S.speechTimer = setTimeout(() => b.classList.add("hidden"), 2800);
  }

  function feedback(symbol) {
    const f = $("cupFeedback");
    f.textContent = symbol;
    f.classList.remove("pop"); void f.offsetWidth; f.classList.add("pop");
  }

  function moneyPop(gain) {
    const m = $("moneyPop");
    m.textContent = "+" + fmt(gain);
    m.classList.remove("fly"); void m.offsetWidth; m.classList.add("fly");
  }

  function updateHud() {
    $("hudScore").textContent = fmt(S.score);
    $("hudVibes").textContent = "×" + Math.max(1, S.vibes);
    $("hudHearts").textContent = "💚".repeat(S.hearts) || "—";
  }

  // ---------- Loop ----------
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    tickEvent(now);

    // Geduld
    if (!S.event?.freeze) {
      for (const t of [...S.tickets]) {
        t.patience -= dt;
        if (t.patience <= 0) { loseGuest(t); if (!running) return; }
      }
    }
    S.tickets.forEach((t) => {
      if (t.patEl) {
        const f = Math.max(0, t.patience / t.patienceMax);
        t.patEl.style.width = f * 100 + "%";
        t.patEl.classList.toggle("low", f < 0.3);
      }
    });

    // Nachschub
    S.spawnIn -= dt;
    if (S.spawnIn <= 0) {
      spawnTicket();
      S.spawnIn = Math.max(4.5, 11 - S.served * 0.3) * (0.8 + Math.random() * 0.5);
    }

    // Aktiver Skill-Step
    const st = step();
    if (st) {
      if (st.type === "pour" && S.holding) {
        S.pourFill += dt * 0.34;
        const t = ticket();
        if (t.cumFill + S.pourFill >= 0.99 || S.pourFill > ING[st.ing].amount + pourTol() + 0.05) {
          S.holding = false;
          spill(t, "Übergelaufen! 🫗");
        }
      }
      if (st.type === "foam") {
        S.needle = Math.max(0, S.needle - dt * 26);
        const zLo = 38, zHi = 38 + 34 * zoneScale();
        S.foamTotT += dt;
        if (S.needle >= zLo && S.needle <= zHi) {
          S.foamZoneT += dt;
          S.foamProg += dt / 2.4;
          if (S.foamProg >= 1) {
            stepSuccess(S.foamZoneT / S.foamTotT > 0.8);
          }
        }
        $("meterNeedle").style.left = S.needle + "%";
        if (S.foamEl) S.foamEl.style.height = S.foamProg * 16 + "%";
        $("meterProgress").style.width = Math.min(100, S.foamProg * 100) + "%";
      }
      if (st.type === "blend" && S.holding) {
        S.blendPos += S.blendDir * dt * (85 + S.served * 1.5);
        if (S.blendPos >= 100) { S.blendPos = 100; S.blendDir = -1; }
        if (S.blendPos <= 0) { S.blendPos = 0; S.blendDir = 1; }
        $("meterNeedle").style.left = S.blendPos + "%";
        $("meterProgress").style.width = "0%";
      }
      if (S.pourEl) S.pourEl.style.height = S.pourFill * 100 + "%";
    }

    rafId = requestAnimationFrame(tick);
  }

  // ---------- Input ----------
  function bindAction() {
    const btn = $("actionBtn");
    const down = (e) => {
      e.preventDefault();
      if (!running || btn.disabled) return;
      const st = step();
      if (!st) return;
      if (st.type === "foam") tapFoam();
      else { S.holding = true; if (st.type === "blend") $("cup").classList.add("blending"); }
    };
    const up = () => {
      if (!running || !S.holding) return;
      S.holding = false;
      $("cup").classList.remove("blending");
      const st = step();
      if (st?.type === "pour") releasePour();
      if (st?.type === "blend") releaseBlend();
    };
    btn.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ---------- Start / Ende ----------
  function start() {
    S = {
      score: 0, vibes: 0, bestVibes: 0, served: 0, hearts: START_HEARTS,
      tickets: [], activeId: null, spawnIn: 7,
      event: null, eventUntil: 0,
      holding: false, pourFill: 0, needle: 0, foamProg: 0, foamZoneT: 0, foamTotT: 0,
      blendPos: 0, blendDir: 1, pourEl: null, foamEl: null, speechTimer: 0,
    };
    running = true;
    updateHud();
    $("eventBanner").classList.add("hidden");
    // Sanfter Einstieg: Resi will einen Cappuccino
    spawnTicket({ drink: DRINKS[2] });
    show("game");
    lastT = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(rafId);
    const best = highscore();
    const isRecord = S.score > best;
    if (isRecord) localStorage.setItem(HS_KEY, String(S.score));
    $("overHeadline").textContent = isRecord ? "Neuer Rekord! 🏆"
      : S.served === 0 ? "Härter als gedacht, oder?" : "Feierabend!";
    $("overScore").textContent = fmt(S.score);
    $("overServed").textContent = S.served;
    $("overCombo").textContent = "×" + Math.max(1, S.bestVibes);
    $("overBest").textContent = "Dein Highscore: " + fmt(Math.max(S.score, best));
    show("over");
  }

  function share() {
    const text = `☕ Ich habe bei Barista Rush ${fmt(S.score)} Tagesumsatz für die Coffee Brothers in Worms gemacht! Schaffst du mehr?`;
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: "Barista Rush — Coffee Brothers", text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text} ${url}`);
      const btn = $("btnShare"), old = btn.textContent;
      btn.textContent = "Kopiert! ✓";
      setTimeout(() => (btn.textContent = old), 1500);
    }
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    const best = highscore();
    $("startBest").textContent = best > 0 ? "Dein Highscore: " + fmt(best) : "";
    $("btnStart").addEventListener("click", start);
    $("btnRestart").addEventListener("click", start);
    $("btnShare").addEventListener("click", share);
    bindAction();
  });
})();
