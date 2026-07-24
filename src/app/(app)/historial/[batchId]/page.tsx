import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { batches, leads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LeadTable } from "@/components/LeadTable";
import type { LeadDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function HistorialBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const db = getDb();

  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch) notFound();

  const batchLeads = (await db
    .select()
    .from(leads)
    .where(eq(leads.batchId, batchId))
    .orderBy(desc(leads.rating))) as unknown as LeadDTO[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Lote del {formatDate(batch.weekStart)} al {formatDate(batch.weekEnd)}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{batch.leadCount} clientes</p>
      </div>
      <LeadTable leads={batchLeads} />
    </div>
  );
}
