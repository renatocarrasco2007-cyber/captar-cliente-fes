import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { leads, LEAD_STATUSES } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const update: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };

  if (typeof body.status === "string") {
    if (!LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
    }
    update.status = body.status;
    if (body.status === "contactado" && !body.skipContactedAt) {
      update.contactedAt = new Date();
    }
  }

  if (typeof body.notes === "string") {
    update.notes = body.notes;
  }

  const [updated] = await db.update(leads).set(update).where(eq(leads.id, id)).returning();

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Lead no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead: updated });
}
