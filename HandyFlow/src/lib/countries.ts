export interface Country {
  name: string
  code: string
  dial: string
}

export const COUNTRIES: Country[] = [
  { name: 'Albania', code: 'AL', dial: '+355' },
  { name: 'Argentina', code: 'AR', dial: '+54' },
  { name: 'Australia', code: 'AU', dial: '+61' },
  { name: 'Austria', code: 'AT', dial: '+43' },
  { name: 'Belgium', code: 'BE', dial: '+32' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dial: '+387' },
  { name: 'Brazil', code: 'BR', dial: '+55' },
  { name: 'Bulgaria', code: 'BG', dial: '+359' },
  { name: 'Canada', code: 'CA', dial: '+1' },
  { name: 'Croatia', code: 'HR', dial: '+385' },
  { name: 'Czechia', code: 'CZ', dial: '+420' },
  { name: 'Denmark', code: 'DK', dial: '+45' },
  { name: 'Estonia', code: 'EE', dial: '+372' },
  { name: 'Finland', code: 'FI', dial: '+358' },
  { name: 'France', code: 'FR', dial: '+33' },
  { name: 'Germany', code: 'DE', dial: '+49' },
  { name: 'Greece', code: 'GR', dial: '+30' },
  { name: 'Hungary', code: 'HU', dial: '+36' },
  { name: 'Iceland', code: 'IS', dial: '+354' },
  { name: 'India', code: 'IN', dial: '+91' },
  { name: 'Ireland', code: 'IE', dial: '+353' },
  { name: 'Italy', code: 'IT', dial: '+39' },
  { name: 'Japan', code: 'JP', dial: '+81' },
  { name: 'Latvia', code: 'LV', dial: '+371' },
  { name: 'Lithuania', code: 'LT', dial: '+370' },
  { name: 'Luxembourg', code: 'LU', dial: '+352' },
  { name: 'Malta', code: 'MT', dial: '+356' },
  { name: 'Mexico', code: 'MX', dial: '+52' },
  { name: 'Montenegro', code: 'ME', dial: '+382' },
  { name: 'Netherlands', code: 'NL', dial: '+31' },
  { name: 'New Zealand', code: 'NZ', dial: '+64' },
  { name: 'North Macedonia', code: 'MK', dial: '+389' },
  { name: 'Norway', code: 'NO', dial: '+47' },
  { name: 'Poland', code: 'PL', dial: '+48' },
  { name: 'Portugal', code: 'PT', dial: '+351' },
  { name: 'Romania', code: 'RO', dial: '+40' },
  { name: 'Serbia', code: 'RS', dial: '+381' },
  { name: 'Slovakia', code: 'SK', dial: '+421' },
  { name: 'Slovenia', code: 'SI', dial: '+386' },
  { name: 'South Africa', code: 'ZA', dial: '+27' },
  { name: 'Spain', code: 'ES', dial: '+34' },
  { name: 'Sweden', code: 'SE', dial: '+46' },
  { name: 'Switzerland', code: 'CH', dial: '+41' },
  { name: 'Turkey', code: 'TR', dial: '+90' },
  { name: 'Ukraine', code: 'UA', dial: '+380' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971' },
  { name: 'United Kingdom', code: 'GB', dial: '+44' },
  { name: 'United States', code: 'US', dial: '+1' },
]

export function dialFor(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.dial ?? ''
}

export function formatAddress(a: {
  street?: string | null
  streetNumber?: string | null
  floor?: string | null
  zipCode?: string | null
  city?: string | null
  country?: string | null
}): string {
  const line1 = [a.street, a.streetNumber].filter(Boolean).join(' ')
  const floor = a.floor ? `Floor ${a.floor}` : ''
  const line2 = [a.zipCode, a.city].filter(Boolean).join(' ')
  return [line1, floor, line2, a.country].filter(Boolean).join(', ')
}

export function flagFor(code: string): string {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
}
