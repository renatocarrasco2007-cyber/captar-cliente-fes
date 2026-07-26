const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "fes-captacion-clientes/1.0 (uso interno, contacto: fes.informaciones@gmail.com)";

export type GeoPoint = { lat: number; lon: number };

const cache = new Map<string, GeoPoint>();

export async function geocodeArea(area: string): Promise<GeoPoint> {
  const cached = cache.get(area);
  if (cached) return cached;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(area)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
  });

  if (!res.ok) {
    throw new Error(`Nominatim error (${res.status}) buscando "${area}"`);
  }

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (results.length === 0) {
    throw new Error(`No se encontró la zona "${area}" en OpenStreetMap`);
  }

  const point = { lat: Number(results[0].lat), lon: Number(results[0].lon) };
  cache.set(area, point);
  return point;
}
