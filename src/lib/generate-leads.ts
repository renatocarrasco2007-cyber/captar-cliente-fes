import { getDb } from "@/db";
import { batches, leads } from "@/db/schema";
import { getSearchSettings } from "@/lib/config";
import { searchPlacesInArea, type PlaceResult } from "@/lib/places";
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
  areasTried: number;
};

export async function generateWeeklyBatch(): Promise<GenerateResult> {
  const db = getDb();
  const { searchAreas, targetLeadCount } = await getSearchSettings();

  const areas = shuffle(searchAreas);

  const existingPlaceIds = new Set(
    (await db.select({ placeId: leads.placeId }).from(leads)).map((r) => r.placeId)
  );

  const collected: (PlaceResult & { area: string })[] = [];
  const seenThisRun = new Set<string>();
  let areasTried = 0;
  let errors = 0;
  let lastError: unknown = null;

  for (const area of areas) {
    if (collected.length >= targetLeadCount) break;
    areasTried++;

    let results: PlaceResult[];
    try {
      results = await searchPlacesInArea(area);
    } catch (err) {
      console.error(`Error buscando en "${area}":`, err);
      errors++;
      lastError = err;
      continue;
    }

    for (const r of shuffle(results)) {
      if (collected.length >= targetLeadCount) break;
      if (existingPlaceIds.has(r.placeId) || seenThisRun.has(r.placeId)) continue;
      seenThisRun.add(r.placeId);
      collected.push({ ...r, area });
    }
  }

  if (collected.length === 0) {
    const detail =
      errors > 0
        ? ` Último error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
        : "";
    throw new Error(
      `No se encontraron clientes nuevos en ninguna de las ${areasTried} zonas buscadas.${detail}`
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
    areasTried,
  };
}
