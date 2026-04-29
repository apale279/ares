export function shortAddress(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  const cutAt = lower.indexOf(' provincia')
  if (cutAt < 0) return raw
  return raw
    .slice(0, cutAt)
    .trim()
    .replace(/[,\s-]+$/g, '')
}
