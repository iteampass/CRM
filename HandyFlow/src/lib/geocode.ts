export interface GeoResult {
  latitude: number
  longitude: number
  formattedAddress: string
}

/**
 * Geocode a free-form address to coordinates.
 * Uses the OpenStreetMap Nominatim service (no API key required).
 */
export async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const raw = query.trim()
  if (raw.length < 4) return null
  // Floor / apt details confuse Nominatim — drop them before searching.
  const q = raw.replace(/,?\s*(Floor|Fl\.?|Apt\.?|Apartment|Unit)\s+\S+/gi, "").replace(/\s{2,}/g, " ").trim()
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    const hit = json[0]
    if (!hit) return null
    return {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      formattedAddress: hit.display_name,
    }
  } catch {
    return null
  }
}

export function mapEmbedUrl(lat: number, lon: number): string {
  const d = 0.005
  const bbox = [lon - d, lat - d, lon + d, lat + d].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
}
