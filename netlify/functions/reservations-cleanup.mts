// netlify/functions/reservations-cleanup.mts
// Scheduled Function: läuft jeden Tag um 3 Uhr nachts.
// Markiert pending-Reservierungen, deren Zeitpunkt in der Vergangenheit liegt, als "expired".

import type { Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request) => {
  const sql = neon();
  try {
    const result = await sql`
      UPDATE reservations
      SET status = 'expired', updated_at = now()
      WHERE status = 'pending'
        AND reservation_at < now()
      RETURNING external_id
    `;
    console.log(`Expired ${result.length} reservations`);
    return new Response(JSON.stringify({ expired_count: result.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup failed:", err);
    return new Response(JSON.stringify({ error: "cleanup_failed" }), { status: 500 });
  }
};

export const config: Config = {
  schedule: "0 3 * * *", // jeden Tag um 3 Uhr UTC
};
