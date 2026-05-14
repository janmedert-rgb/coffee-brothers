# Coffee Brothers Worms — Website

Statische HTML-Website für Netlify-Hosting.

## Seiten
- `index.html` — Landing
- `menu.html` — Komplette Speisekarte (57+ Items in 7 Kategorien)
- `specials.html` — Limited Drops & seasonal Specials
- `reservieren.html` — Reservierungsformular (Netlify Form, auto-submit zu wach@coffeebrothers.bar)
- `bestellen.html` — Vorbestellung via WhatsApp + Catering
- `besuch.html` — Adresse, Öffnungszeiten, Maps, Café-Gallery
- `impressum.html` — § 5 DDG konform
- `datenschutz.html` — DSGVO konform, 10 Sektionen
- `danke.html` — Form-Submission Erfolg

## Assets
- `assets/img/` — Logos, Menu-Boards, Special-Drops
- `assets/img/cafe/` — 20 echte Café-Fotos (WebP, optimiert)
- `assets/css/styles.css` — Komplettes Design-System
- `assets/js/app.js` — Mobile-Menu, Slider, Reveals, Magnetic

## Netlify Setup
- `netlify.toml` — Build-Config + Caching-Headers + Security
- `netlify/functions/menu.js` — Future API für CMS (`/api/menu`)
- `data/menu.json` — Speisekarten-Daten (CMS-ready)
- Form: `reservation` mit `data-netlify="true"` — Submissions landen automatisch im Netlify-Backend, Email-Notification an wach@coffeebrothers.bar einrichten

## Nach dem ersten Deploy bei Netlify
1. **Forms aktivieren:** Site Settings → Forms → Notifications → Email Notification zu wach@coffeebrothers.bar
2. **Custom Domain:** coffee-brothers.de connecten (A: 75.2.60.5, CNAME www → lustrous-cannoli-b645bb.netlify.app)
3. **SSL:** Let's Encrypt automatisch aktivieren

## Features
- Sticky Topbar mit Glassmorphism
- Hero mit Steam-Effekt + Magnetic Logo
- Marquee Band
- Cream-Specials-Sektion mit Auto-Slider + Swipe
- Reveal-on-Scroll Animations
- Cursor-Glow auf Desktop
- Mobile-Menü mit solid background + Auto-Close + ESC + Outside-Click
- Mobile-CTA-Bar unten (WhatsApp/Route/Menü)
- Google Maps Embed auf /besuch
- Reservierungsform mit Auto-Min-Date + alle Anlässe + Kinder-Frage
- 20 echte Café-Fotos in WebP

## Brand
- Mint #82d3bf
- Cream #f4ecdc
- Gold #c69855
- BG dunkles Forest Green #041915
- "Good Coffee. Good People. Good Vibes."
- WhatsApp: +49 155 67021202
- Mail: wach@coffeebrothers.bar
- Adresse: Obermarkt 8, 67547 Worms
