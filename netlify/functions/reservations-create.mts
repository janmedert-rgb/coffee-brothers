// netlify/functions/reservations-create.mts
// POST /api/reservations
// Öffentlicher Endpoint für das Formular auf der Website.
// Validiert, speichert in Postgres, schickt Eingangsbestätigung an Gast.

import type { Context } from "@netlify/functions";
import { neon } from "@netlify/neon";
import { randomUUID } from "node:crypto";

const RESEND_API_KEY = Netlify.env.get("RESEND_API_KEY") || "";
const MAIL_FROM = Netlify.env.get("MAIL_FROM") || "Coffee Brothers <reservierung@coffeebrothers.bar>";
const MAIL_REPLY_TO = Netlify.env.get("MAIL_REPLY_TO") || "wach@coffeebrothers.bar";

// In-memory rate limit (pro Function-Instance). Für die paar Submissions am Tag reicht das easy.
const submitTimes = new Map<string, number[]>();
const MAX_SUBMITS_PER_HOUR = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const arr = (submitTimes.get(ip) || []).filter(t => t > hourAgo);
  if (arr.length >= MAX_SUBMITS_PER_HOUR) {
    submitTimes.set(ip, arr);
    return true;
  }
  arr.push(now);
  submitTimes.set(ip, arr);
  return false;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function sendGuestReceiptMail(reservation: {
  name: string;
  email: string;
  party_size: number;
  reservation_at: string;
  type: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing — no mail sent");
    return false;
  }

  const dt = new Date(reservation.reservation_at);
  const dateStr = dt.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const timeStr = dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  const subject = "Reservierung eingegangen — Coffee Brothers";
  const html = `
<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#041915;color:#f4ecdc;padding:24px;max-width:560px;margin:auto;">
  <h1 style="color:#82d3bf;margin:0 0 16px;">Danke, ${escapeHtml(reservation.name)}!</h1>
  <p>Deine Reservierung ist bei uns eingegangen. Wir melden uns kurz, sobald wir sie bestätigen können — meistens innerhalb weniger Stunden.</p>
  <div style="background:#0c2620;border:1px solid #1a3d35;padding:16px 20px;border-radius:14px;margin:20px 0;">
    <p style="margin:0 0 6px;color:#82d3bf;font-size:13px;text-transform:uppercase;letter-spacing:.1em;">Deine Reservierung</p>
    <p style="margin:4px 0;"><b>Datum:</b> ${dateStr}</p>
    <p style="margin:4px 0;"><b>Uhrzeit:</b> ${timeStr} Uhr</p>
    <p style="margin:4px 0;"><b>Personen:</b> ${reservation.party_size}</p>
    <p style="margin:4px 0;"><b>Anlass:</b> ${escapeHtml(reservation.type)}</p>
  </div>
  <p>Bei Rückfragen einfach auf diese Mail antworten oder uns auf WhatsApp schreiben: <a href="https://wa.me/4915567021202" style="color:#82d3bf;">+49 155 67021202</a></p>
  <p style="margin-top:32px;color:#82d3bf;font-weight:700;">Bis gleich!<br>Das Coffee Brothers Team</p>
  <hr style="border:none;border-top:1px solid #1a3d35;margin:32px 0 16px;">
  <p style="font-size:12px;color:rgba(244,236,220,.5);">Coffee Brothers · Obermarkt 8 · 67547 Worms</p>
</body></html>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [reservation.email],
        reply_to: MAIL_REPLY_TO,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Mail send failed:", err);
    return false;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]!);
}

export default async (req: Request, context: Context): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  // Rate-Limit per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-nf-client-connection-ip")
    || "unknown";
  if (rateLimited(ip)) {
    return jsonResponse(429, { error: "rate_limited", message: "Zu viele Anfragen, bitte später erneut." });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  // Honeypot
  if (body["bot-field"]) {
    // Bot detected. Pretend success, log silently.
    console.log("Honeypot triggered, silent drop. IP:", ip);
    return jsonResponse(200, { ok: true });
  }

  // Validation
  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const phone = body.phone ? body.phone.toString().trim() : null;
  const partySize = parseInt(body.guests ?? body.party_size, 10);
  const type = (body.type || "Tisch").toString().trim();
  const dateStr = (body.date || "").toString();
  const timeStr = (body.time || "").toString();
  const message = body.message ? body.message.toString().trim().slice(0, 500) : null;
  const children = body.children ? body.children.toString() : null;

  if (!name) return jsonResponse(400, { error: "missing_name" });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse(400, { error: "invalid_email" });
  if (!partySize || partySize < 1 || partySize > 20) return jsonResponse(400, { error: "invalid_party_size" });
  if (!dateStr || !timeStr) return jsonResponse(400, { error: "missing_datetime" });

  // Datum/Uhrzeit zusammenbauen (Europe/Berlin)
  // Inputs: date="2026-05-20", time="19:00"
  const reservationAt = new Date(`${dateStr}T${timeStr}:00+02:00`);
  if (isNaN(reservationAt.getTime())) return jsonResponse(400, { error: "invalid_datetime" });

  const now = Date.now();
  const oneHourFromNow = now + 60 * 60 * 1000;
  if (reservationAt.getTime() < oneHourFromNow) {
    return jsonResponse(400, { error: "datetime_in_past", message: "Bitte wähle einen Zeitpunkt mindestens 1 Stunde in der Zukunft." });
  }

  // Build full message with type and children info
  const fullMessage = [
    type ? `Anlass: ${type}` : null,
    children && children !== "Keine Kinder" ? `Kinder: ${children}` : null,
    message ? `Nachricht: ${message}` : null,
  ].filter(Boolean).join("\n") || null;

  const externalId = randomUUID();
  const sql = neon();

  try {
    await sql`
      INSERT INTO reservations (
        external_id, name, email, phone, party_size, reservation_at,
        type, children, message, status, source, created_at, updated_at
      ) VALUES (
        ${externalId}, ${name}, ${email}, ${phone}, ${partySize}, ${reservationAt.toISOString()},
        ${type}, ${children}, ${fullMessage}, 'pending', 'website', now(), now()
      )
    `;
  } catch (err) {
    console.error("DB insert failed:", err);
    return jsonResponse(500, { error: "database_error" });
  }

  // Eingangsbestätigung an Gast (fire-and-forget, schickt im Hintergrund)
  sendGuestReceiptMail({ name, email, party_size: partySize, reservation_at: reservationAt.toISOString(), type })
    .catch(err => console.error("Mail #1 failed:", err));

  return jsonResponse(201, { ok: true, external_id: externalId });
};

export const config = {
  path: "/api/reservations",
};
