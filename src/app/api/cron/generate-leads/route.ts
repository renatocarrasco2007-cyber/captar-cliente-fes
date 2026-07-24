import { NextResponse } from "next/server";
import { generateWeeklyBatch } from "@/lib/generate-leads";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await generateWeeklyBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Error generando lote semanal:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
