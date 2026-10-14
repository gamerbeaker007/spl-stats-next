import { connection } from "next/server";

/** Running server's deployment id — polled by stale tabs to detect a new deploy. */
export async function GET() {
  await connection();
  return Response.json(
    { deploymentId: process.env.NEXT_PUBLIC_DEPLOYMENT_ID ?? "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
