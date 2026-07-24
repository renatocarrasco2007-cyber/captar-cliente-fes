import { getDb } from "@/db";
import { batches, leads } from "@/db/schema";
import { getSearchSettings } from "@/lib/config";
import { searchPlaces, type PlaceResult } from "@/lib/places";
import { inArray } from "drizzle-orm";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type GenerateResult = {
  batchId: string;
  weekStart: string;
  weekEnd: string;
  leadCount: number;
  combosTried: number;
};

export async function generateWeeklyBatch(): Promise<GenerateResult> {
  const db = getDb();
  const { searchAreas, categories, targetLeadCount } = await getSearchSettings();

  const combos = shuffle(
    categories.flatMap((category) => searchAreas.map((area) => ({ category, area })))
  );

  const existingPlaceIds = new Set(
    (await db.select({ placeId: leads.placeId }).from(leads)).map((r) => r.placeId)
  );

  const collected: (PlaceResult & { category: string; area: string })[] = [];
  const seenThisRun = new Set<string>();
  let combosTried = 0;
  let errors = 0;
  let lastError: unknown = null;

  for (const combo of combos) {
    if (collected.length >= targetLeadCount) break;
    combosTried++;

    let results: PlaceResult[];
    try {
      results = await searchPlaces(combo.category, combo.area);
    } catch (err) {
      console.error(`Error buscando "${combo.category}" en "${combo.area}":`, err);
      errors++;
      lastError = err;
      continue;
    }

    for (const r of results) {
      if (collected.length >= targetLeadCount) break;
      if (existingPlaceIds.has(r.placeId) || seenThisRun.has(r.placeId)) continue;
      seenThisRun.add(r.placeId);
      collected.push({ ...r, category: combo.category, area: combo.area });
    }
  }

  if (collected.length === 0 && errors === combosTried && combosTried > 0) {
    throw new Error(
      `No se pudo generar el lote: todas las búsquedas fallaron. Último error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [batch] = await db
    .insert(batches)
    .values({
      weekStart: today.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      leadCount: collected.length,
    })
    .returning();

  if (collected.length > 0) {
    // Extra safety: skip any place_id inserted concurrently between the read above and now.
    const recheck = await db
      .select({ placeId: leads.placeId })
      .from(leads)
      .where(
        inArray(
          leads.placeId,
          collected.map((c) => c.placeId)
        )
      );
    const recheckSet = new Set(recheck.map((r) => r.placeId));
    const toInsert = collected.filter((c) => !recheckSet.has(c.placeId));

    if (toInsert.length > 0) {
      await db.insert(leads).values(
        toInsert.map((c) => ({
          batchId: batch.id,
          placeId: c.placeId,
          name: c.name,
          category: c.category,
          searchArea: c.area,
          address: c.address,
          phone: c.phone,
          website: c.website,
          mapsUrl: c.mapsUrl,
          rating: c.rating,
          userRatingCount: c.userRatingCount,
          lat: c.lat,
          lng: c.lng,
        }))
      );
    }
  }

  return {
    batchId: batch.id,
    weekStart: batch.weekStart,
    weekEnd: batch.weekEnd,
    leadCount: collected.length,
    combosTried,
  };
}
