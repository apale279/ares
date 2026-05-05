/** Etichetta navigazione es. `1.3.0` → `V1.3` (da `__APP_VERSION__` in build). */
export function appVersionNavLabel(): string {
  const raw = __APP_VERSION__
  const parts = raw.split('.').filter(Boolean)
  if (parts.length >= 2) return `V${parts[0]}.${parts[1]}`
  return raw.startsWith('V') ? raw : `V${raw}`
}
