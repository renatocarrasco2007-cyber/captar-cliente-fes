import { geocodeArea } from "@/lib/geocode";
import { isGooglePlacesConfigured, searchGooglePlacesInArea } from "@/lib/google-places";

export type PlaceResult = {
  placeId: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  userRatingCount: number | null;
  lat: number | null;
  lng: number | null;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const USER_AGENT = "fes-captacion-clientes/1.0 (uso interno, contacto: fes.informaciones@gmail.com)";
const RADIUS_METERS = 6000;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function buildQuery(lat: number, lon: number): string {
  // Fetch every office/shop in range with a plain tag filter (fast, no regex)
  // and classify + filter by name locally — a server-side name regex over
  // this many elements times out on the public Overpass instance.
  const around = `around:${RADIUS_METERS},${lat},${lon}`;
  const clauses = [
    `node["office"](${around});`,
    `way["office"](${around});`,
    `node["shop"](${around});`,
    `way["shop"](${around});`,
  ];
  return `[out:json][timeout:25];\n(\n${clauses.join("\n")}\n);\nout center tags;`;
}

const REAL_ESTATE_KEYWORDS = ["inmobiliaria", "corretaje", "corredora", "propiedades"];
const ADMIN_KEYWORDS = ["administradora", "administración de edificios", "condominio", "comunidad edificio"];
const RENTAL_KEYWORDS = ["arriendo", "arriendos", "amoblado"];

function classifyCategory(tags: Record<string, string>): string | null {
  if (tags.office === "estate_agent" || tags.shop === "real_estate") return "Inmobiliaria / corretaje";
  if (tags.office === "coworking") return "Coworking";

  const name = (tags.name ?? "").toLowerCase();
  if (REAL_ESTATE_KEYWORDS.some((k) => name.includes(k))) return "Inmobiliaria / corretaje";
  if (ADMIN_KEYWORDS.some((k) => name.includes(k))) return "Administradora de edificios";
  if (RENTAL_KEYWORDS.some((k) => name.includes(k))) return "Arriendo / amoblado";

  // No known real-estate/coworking tag and no relevant keyword in the name:
  // most likely government offices, unrelated companies, etc. — skip.
  return null;
}

function extractPhone(tags: Record<string, string>): string | null {
  return tags["contact:phone"] ?? tags.phone ?? tags["contact:mobile"] ?? null;
}

function extractWebsite(tags: Record<string, string>): string | null {
  return tags["contact:website"] ?? tags.website ?? null;
}

function extractAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:street"],
    tags["addr:housenumber"],
    tags["addr:city"] ?? tags["addr:suburb"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOverpassQuery(query: string): Promise<OverpassElement[]> {
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(25_000),
        });

        if (!res.ok) {
          throw new Error(`Overpass error (${res.status}): ${(await res.text()).slice(0, 200)}`);
        }

        const data = await res.json();
        return (data.elements ?? []) as OverpassElement[];
      } catch (err) {
        lastError = err;
        await sleep(1500);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildMapsUrl(name: string, address: string | null, area: string): string {
  const query = address ? `${name}, ${address}` : `${name}, ${area}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function toPlaceResults(elements: OverpassElement[], area: string): PlaceResult[] {
  const results: PlaceResult[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;

    const category = classifyCategory(tags);
    if (!category) continue;

    const elLat = el.lat ?? el.center?.lat ?? null;
    const elLon = el.lon ?? el.center?.lon ?? null;
    const address = extractAddress(tags);

    results.push({
      placeId: `osm:${el.type}/${el.id}`,
      name,
      category,
      address,
      phone: extractPhone(tags),
      website: extractWebsite(tags),
      mapsUrl: buildMapsUrl(name, address, area),
      rating: null,
      userRatingCount: null,
      lat: elLat,
      lng: elLon,
    });
  }

  return results;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeByName(results: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  const out: PlaceResult[] = [];
  for (const r of results) {
    const key = normalizeName(r.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function searchPlacesInArea(area: string): Promise<PlaceResult[]> {
  const { lat, lon } = await geocodeArea(area);
  const elements = await runOverpassQuery(buildQuery(lat, lon));
  const osmResults = toPlaceResults(elements, area);

  if (!isGooglePlacesConfigured()) return osmResults;

  let googleResults: PlaceResult[] = [];
  try {
    googleResults = await searchGooglePlacesInArea(area);
  } catch (err) {
    console.error(`Google Places falló para "${area}":`, err);
  }

  // Google's data is generally richer (phone, rating) — keep its entry first
  // when both sources find the same business.
  return dedupeByName([...googleResults, ...osmResults]);
}
