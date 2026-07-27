import type { PlaceResult } from "@/lib/places";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.location",
].join(",");

type GoogleQuery = { query: string; category: string };

const GOOGLE_QUERIES: GoogleQuery[] = [
  { query: "inmobiliaria", category: "Inmobiliaria / corretaje" },
  { query: "corretaje de propiedades", category: "Inmobiliaria / corretaje" },
  { query: "administradora de edificios", category: "Administradora de edificios" },
  { query: "coworking", category: "Coworking" },
  { query: "arriendo de departamentos amoblados", category: "Arriendo / amoblado" },
  { query: "administración de arriendos turísticos tipo Airbnb", category: "Arriendo turístico / Airbnb" },
];

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
};

export function isGooglePlacesConfigured(): boolean {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return Boolean(key && key !== "PENDIENTE_CONFIGURAR");
}

async function searchGoogleText(query: string, area: string): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY!;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${query} en ${area}`,
      languageCode: "es",
      maxResultCount: 15,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google Places API error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.places ?? []) as GooglePlace[];
}

export async function searchGooglePlacesInArea(area: string): Promise<PlaceResult[]> {
  const results: PlaceResult[] = [];
  const seen = new Set<string>();

  for (const { query, category } of GOOGLE_QUERIES) {
    let places: GooglePlace[];
    try {
      places = await searchGoogleText(query, area);
    } catch (err) {
      console.error(`Google Places falló para "${query}" en "${area}":`, err);
      continue;
    }

    for (const p of places) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);

      results.push({
        placeId: `google:${p.id}`,
        name: p.displayName?.text ?? "Sin nombre",
        category,
        address: p.formattedAddress ?? null,
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      });
    }
  }

  return results;
}
