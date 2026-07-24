import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_SEARCH_AREAS = [
  "Concepción, Chile",
  "Chiguayante, Chile",
  "San Pedro de la Paz, Chile",
  "Hualpén, Chile",
  "Talcahuano, Chile",
  "Penco, Chile",
  "Lirquén, Chile",
  "Palomares, Talcahuano, Chile",
];

export const DEFAULT_CATEGORIES = [
  "inmobiliaria",
  "administradora de edificios",
  "administrador de propiedades",
  "corretaje de propiedades",
  "arriendo de oficinas",
  "coworking",
  "gestión de arriendos turísticos",
  "arriendo de departamentos amoblados",
];

export const DEFAULT_TARGET_LEAD_COUNT = 30;

export type SearchSettings = {
  searchAreas: string[];
  categories: string[];
  targetLeadCount: number;
};

async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const db = getDb();
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function getSearchSettings(): Promise<SearchSettings> {
  const [areasRaw, categoriesRaw, targetRaw] = await Promise.all([
    getSetting("search_areas"),
    getSetting("categories"),
    getSetting("target_lead_count"),
  ]);

  return {
    searchAreas: areasRaw ? JSON.parse(areasRaw) : DEFAULT_SEARCH_AREAS,
    categories: categoriesRaw ? JSON.parse(categoriesRaw) : DEFAULT_CATEGORIES,
    targetLeadCount: targetRaw ? Number(targetRaw) : DEFAULT_TARGET_LEAD_COUNT,
  };
}

export async function updateSearchSettings(partial: Partial<SearchSettings>) {
  if (partial.searchAreas) {
    await setSetting("search_areas", JSON.stringify(partial.searchAreas));
  }
  if (partial.categories) {
    await setSetting("categories", JSON.stringify(partial.categories));
  }
  if (partial.targetLeadCount !== undefined) {
    await setSetting("target_lead_count", String(partial.targetLeadCount));
  }
}
