import { geocodeArea } from "@/lib/geocode";

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

function buildBaselineQuery(lat: number, lon: number): string {
  const around = `around:${RADIUS_METERS},${lat},${lon}`;
  const clauses = [
    `node["office"="estate_agent"](${around});`,
    `way["office"="estate_agent"](${around});`,
    `node["shop"="real_estate"](${around});`,
    `way["shop"="real_estate"](${around});`,
    `node["office"="coworking"](${around});`,
    `way["office"="coworking"](${around});`,
    `node["office"="administrative"](${around});`,
    `way["office"="administrative"](${around});`,
  ];
  return `[out:json][timeout:20];\n(\n${clauses.join("\n")}\n);\nout center tags;`;
}

function classifyCategory(tags: Record<string, string>): string {
  if (tags.office === "estate_agent" || tags.shop === "real_estate") return "Inmobiliaria / corretaje";
  if (tags.office === "coworking") return "Coworking";
  if (tags.office === "administrative") return "Administradora de edificios";
  return "Empresa / oficina";
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

function toPlaceResults(elements: OverpassElement[]): PlaceResult[] {
  const results: PlaceResult[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;

    const elLat = el.lat ?? el.center?.lat ?? null;
    const elLon = el.lon ?? el.center?.lon ?? null;

    results.push({
      placeId: `osm:${el.type}/${el.id}`,
      name,
      category: classifyCategory(tags),
      address: extractAddress(tags),
      phone: extractPhone(tags),
      website: extractWebsite(tags),
      mapsUrl:
        elLat !== null && elLon !== null
          ? `https://www.google.com/maps/search/?api=1&query=${elLat},${elLon}`
          : null,
      rating: null,
      userRatingCount: null,
      lat: elLat,
      lng: elLon,
    });
  }

  return results;
}

export async function searchPlacesInArea(area: string): Promise<PlaceResult[]> {
  const { lat, lon } = await geocodeArea(area);
  const elements = await runOverpassQuery(buildBaselineQuery(lat, lon));
  return toPlaceResults(elements);
}
