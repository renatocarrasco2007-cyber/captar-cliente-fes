import { getDb } from "@/db";
import { batches, leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { LeadTable } from "@/components/LeadTable";
import { Countdown } from "@/components/Countdown";
import { GenerateButton } from "@/components/GenerateButton";
import type { LeadDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const db = getDb();

  const [latestBatch] = await db.select().from(batches).orderBy(desc(batches.createdAt)).limit(1);

  const batchLeads = latestBatch
    ? ((await db
        .select()
        .from(leads)
        .where(eq(leads.batchId, latestBatch.id))
        .orderBy(desc(leads.rating))) as unknown as LeadDTO[])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Clientes de la semana</h1>
          {latestBatch ? (
            <p className="mt-1 text-sm text-slate-500">
              Lote del {formatDate(latestBatch.weekStart)} al {formatDate(latestBatch.weekEnd)} ·{" "}
              {latestBatch.leadCount} contactos · próximo lote en{" "}
              <Countdown weekEnd={latestBatch.weekEnd} />
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Todavía no se ha generado ningún lote de clientes.
            </p>
          )}
        </div>
        <GenerateButton />
      </div>

      <LeadTable leads={batchLeads} />
    </div>
  );
}
