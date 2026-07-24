import Link from "next/link";
import { getDb } from "@/db";
import { batches } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function HistorialPage() {
  const db = getDb();
  const allBatches = await db.select().from(batches).orderBy(desc(batches.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Historial de lotes</h1>

      {allBatches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Todavía no hay lotes generados.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {allBatches.map((b) => (
            <Link
              key={b.id}
              href={`/historial/${b.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">
                {formatDate(b.weekStart)} — {formatDate(b.weekEnd)}
              </span>
              <span className="text-slate-500">{b.leadCount} clientes</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
