// netlify/functions/reservations-pending.mts
// GET /api/reservations/pending
// Wird vom CB-OS Mini-PC alle 60s gepullt.
// Bearer-Token-Auth.

import type { Context } from "@netlify/functions";
import { neon } from "@netlify/neon";

const API_TOKEN = Netlify.env.get("CBOS_API_TOKEN") || "";

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

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "GET") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!checkAuth(req)) {
    return jsonResponse(401, { error: "invalid_token" });
  }

  const url = new URL(req.url);
  const since = url.searchParams.get("since"); // optional: nur Änderungen seit Zeitpunkt X

  const sql = neon();

  try {
    let rows;
    if (since) {
      // Optimierter Pfad: nur Updates seit dem letzten Pull
      rows = await sql`
        SELECT external_id, name, email, phone, party_size,
               reservation_at, type, children, message, status, source,
               created_at, updated_at
        FROM reservations
        WHERE updated_at > ${since}
        ORDER BY reservation_at ASC
      `;
    } else {
      // Standard: alle der letzten 60 Tage mit reservation_at >= now() - 1 Tag
      // (alte abgelaufene werden separat per cleanup-Function expired)
      rows = await sql`
        SELECT external_id, name, email, phone, party_size,
               reservation_at, type, children, message, status, source,
               created_at, updated_at
        FROM reservations
        WHERE created_at > now() - interval '60 days'
          AND reservation_at > now() - interval '1 day'
        ORDER BY reservation_at ASC
      `;
    }

    const reservations = rows.map((r: any) => ({
      external_id: r.external_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      party_size: r.party_size,
      reservation_at: r.reservation_at instanceof Date
        ? r.reservation_at.toISOString()
        : r.reservation_at,
      type: r.type,
      children: r.children,
      message: r.message,
      status: r.status,
      source: r.source,
      created_at: r.created_at instanceof Date
        ? r.created_at.toISOString()
        : r.created_at,
    }));

    return jsonResponse(200, {
      reservations,
      count: reservations.length,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("DB query failed:", err);
    return jsonResponse(500, { error: "database_error" });
  }
};

export const config = {
  path: "/api/reservations/pending",
};
