import { NextResponse } from "next/server";
import { generateWeeklyBatch } from "@/lib/generate-leads";

export const maxDuration = 300;

export async function POST() {
  try {
    const result = await generateWeeklyBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Error generando lote manual:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
