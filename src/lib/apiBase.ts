/** Same-origin by default; set VITE_API_BASE_URL when API is hosted elsewhere. */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  return `${base}${path}`
}
