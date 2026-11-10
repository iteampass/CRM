import { COUNTRIES } from './countries'

/** Best-effort country detection from IP, falling back to browser locale/timezone. */
export async function detectCountryCode(): Promise<string | null> {
  const known = (code?: string | null) => {
    const up = code?.toUpperCase() ?? ''
    return COUNTRIES.some((c) => c.code === up) ? up : null
  }

  try {
    const res = await fetch('https://ipapi.co/json/', { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const json = (await res.json()) as { country_code?: string }
      const hit = known(json.country_code)
      if (hit) return hit
    }
  } catch {
    /* ignore */
  }

  try {
    const locale = navigator.language || ''
    const region = locale.split('-')[1]
    const hit = known(region)
    if (hit) return hit
  } catch {
    /* ignore */
  }

  return null
}
