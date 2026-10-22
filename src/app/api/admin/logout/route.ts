import { clearAdminCookie } from "@/lib/admin/auth";
import { isAllowedOrigin } from "@/lib/guardrails/origin";
import { logServerEvent } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json(
      { ok: false, error: "origin_not_allowed" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  logServerEvent("admin_logout");
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "Set-Cookie": clearAdminCookie() },
    },
  );
}
