// netlify/functions/reservations-status.mts
// POST /api/reservations/:external_id/status
// CB-OS pusht hier Confirm/Decline rein.
// Idempotent: zweites Push schickt keine Mail nochmal.

import type { Context } from "@netlify/functions";
import { neon } from "@netlify/neon";

const API_TOKEN = Netlify.env.get("CBOS_API_TOKEN") || "";
const RESEND_API_KEY = Netlify.env.get("RESEND_API_KEY") || "";
const MAIL_FROM = Netlify.env.get("MAIL_FROM") || "Coffee Brothers <reservierung@coffeebrothers.bar>";
const MAIL_REPLY_TO = Netlify.env.get("MAIL_REPLY_TO") || "wach@coffeebrothers.bar";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function checkAuth(req: Request): boolean {
  if (!API_TOKEN) return false;
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  return m[1] === API_TOKEN;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]!);
}

async function sendFinalMail(reservation: any, status: "confirmed" | "declined", note: string | null): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing");
    return false;
  }

  const dt = new Date(reservation.reservation_at);
  const dateStr = dt.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const timeStr = dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  const noteBlock = note ? `
    <div style="background:#0c2620;border-left:3px solid #82d3bf;padding:14px 16px;margin:20px 0;border-radius:6px;">
      <p style="margin:0 0 6px;color:#82d3bf;font-size:12px;text-transform:uppercase;letter-spacing:.1em;">Nachricht von uns</p>
      <p style="margin:0;">${escapeHtml(note).replace(/\n/g, "<br>")}</p>
    </div>` : "";

  let subject: string;
  let intro: string;
  let outro: string;
  let accentColor: string;

  if (status === "confirmed") {
    accentColor = "#82d3bf";
    subject = `Reservierung bestätigt — Coffee Brothers`;
    intro = `<h1 style="color:#82d3bf;margin:0 0 16px;">Dein Tisch wartet, ${escapeHtml(reservation.name)}! ☕</h1>
             <p>Wir bestätigen deine Reservierung — wir freuen uns auf dich.</p>`;
    outro = `<p>Wenn du etwas verschieben musst oder Fragen hast, einfach kurz auf diese Mail antworten oder uns auf <a href="https://wa.me/4915567021202" style="color:#82d3bf;">WhatsApp</a> schreiben.</p>
             <p style="margin-top:32px;color:#82d3bf;font-weight:700;">Bis bald!<br>Das Coffee Brothers Team</p>`;
  } else {
    accentColor = "#c69855";
    subject = `Reservierung leider nicht möglich — Coffee Brothers`;
    intro = `<h1 style="color:#c69855;margin:0 0 16px;">Hi ${escapeHtml(reservation.name)},</h1>
             <p>leider können wir deine Reservierung diesmal nicht annehmen. Tut uns wirklich leid!</p>`;
    outro = `<p>Du bist natürlich gerne spontan willkommen — meistens finden wir noch einen Platz. Oder versuch's mit einem anderen Datum, dann freuen wir uns wieder.</p>
             <p style="margin-top:32px;color:#c69855;font-weight:700;">Bis hoffentlich bald<br>Das Coffee Brothers Team</p>`;
  }

  const html = `
<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#041915;color:#f4ecdc;padding:24px;max-width:560px;margin:auto;">
  ${intro}
  <div style="background:#0c2620;border:1px solid #1a3d35;padding:16px 20px;border-radius:14px;margin:20px 0;">
    <p style="margin:0 0 6px;color:${accentColor};font-size:13px;text-transform:uppercase;letter-spacing:.1em;">Deine Reservierung</p>
    <p style="margin:4px 0;"><b>Datum:</b> ${dateStr}</p>
    <p style="margin:4px 0;"><b>Uhrzeit:</b> ${timeStr} Uhr</p>
    <p style="margin:4px 0;"><b>Personen:</b> ${reservation.party_size}</p>
    ${reservation.type ? `<p style="margin:4px 0;"><b>Anlass:</b> ${escapeHtml(reservation.type)}</p>` : ""}
  </div>
  ${noteBlock}
  ${outro}
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

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!checkAuth(req)) {
    return jsonResponse(401, { error: "invalid_token" });
  }

  // External ID aus URL extrahieren
  const url = new URL(req.url);
  const match = url.pathname.match(/\/api\/reservations\/([^/]+)\/status$/);
  if (!match) {
    return jsonResponse(400, { error: "invalid_path" });
  }
  const externalId = match[1];

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const newStatus = body.status;
  const note = body.note ? String(body.note).trim() : null;
  const ifCurrent = body.if_current_status || null; // optional Optimistic Lock

  if (newStatus !== "confirmed" && newStatus !== "declined") {
    return jsonResponse(400, { error: "invalid_status", message: "status must be 'confirmed' or 'declined'" });
  }

  const sql = neon();

  // Reservation laden
  let rows;
  try {
    rows = await sql`
      SELECT external_id, name, email, phone, party_size, reservation_at,
             type, children, message, status, confirmation_mail_sent_at
      FROM reservations
      WHERE external_id = ${externalId}
      LIMIT 1
    `;
  } catch (err) {
    console.error("DB query failed:", err);
    return jsonResponse(500, { error: "database_error" });
  }

  if (rows.length === 0) {
    return jsonResponse(404, { error: "not_found" });
  }

  const r: any = rows[0];

  // Optimistic Lock Check
  if (ifCurrent && r.status !== ifCurrent) {
    return jsonResponse(409, { error: "status_changed", current_status: r.status });
  }

  // Idempotenz: schon im finalen Status?
  if (r.status === newStatus && r.confirmation_mail_sent_at) {
    return jsonResponse(200, {
      external_id: externalId,
      status: r.status,
      mail_sent: false,
      idempotent: true,
    });
  }

  // Conflict: schon in einem ANDEREN finalen Status
  if (r.status !== "pending" && r.status !== newStatus) {
    return jsonResponse(409, {
      error: "status_already_set",
      current_status: r.status,
    });
  }

  // Status updaten
  try {
    await sql`
      UPDATE reservations
      SET status = ${newStatus},
          status_note = ${note},
          updated_at = now()
      WHERE external_id = ${externalId}
    `;
  } catch (err) {
    console.error("DB update failed:", err);
    return jsonResponse(500, { error: "database_error" });
  }

  // Mail schicken
  const reservationForMail = {
    name: r.name,
    email: r.email,
    party_size: r.party_size,
    reservation_at: r.reservation_at instanceof Date ? r.reservation_at.toISOString() : r.reservation_at,
    type: r.type,
  };
  const mailSent = await sendFinalMail(reservationForMail, newStatus, note);

  if (mailSent) {
    try {
      await sql`
        UPDATE reservations
        SET confirmation_mail_sent_at = now()
        WHERE external_id = ${externalId}
      `;
    } catch (err) {
      console.error("DB update mail_sent failed:", err);
    }
  }

  return jsonResponse(200, {
    external_id: externalId,
    status: newStatus,
    mail_sent: mailSent,
  });
};

export const config = {
  path: "/api/reservations/:external_id/status",
};
