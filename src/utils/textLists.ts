/** Converte testo multiriga in elenco voci (snello per impostazioni). */
export function vociDaTestoMultiriga(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    const t = line.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function testoMultirigaDaVoci(items: string[]): string {
  return items.join('\n')
}
