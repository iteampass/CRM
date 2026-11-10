/** Missing country data must never broaden a handyman's view to all countries. */
export function sameCountry(viewerCountry: string | null | undefined, country: string | null | undefined) {
  const normalized = viewerCountry?.trim().toUpperCase();
  return Boolean(normalized && country?.trim().toUpperCase() === normalized);
}

export function scopeHandymanCountry<T>(
  items: T[],
  role: "client" | "handyman" | "admin",
  country: string | null | undefined,
  countryOf: (item: T) => string | null | undefined,
): T[] {
  return role === "handyman" ? items.filter((item) => sameCountry(country, countryOf(item))) : items;
}
