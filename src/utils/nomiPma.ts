import type { Impostazioni } from '../types'

/** Nomi PMA per menu e vista: preferisce anagrafica postazioniPma */
export function nomiPmaDaImpostazioni(imp: Impostazioni): string[] {
  const fromPost = (imp.postazioniPma ?? [])
    .map((p) => p.nome.trim())
    .filter(Boolean)
  if (fromPost.length) return [...new Set(fromPost)].sort((a, b) => a.localeCompare(b, 'it'))
  return [...new Set((imp.pma ?? []).map((x) => String(x).trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'it'),
  )
}
