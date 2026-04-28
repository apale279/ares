import type { Equipaggio, PersonaContatto } from '../types'

function riga(label: string, p: PersonaContatto): string {
  const n = [p.nome, p.cognome].filter(Boolean).join(' ')
  const t = p.telefono ? ` — tel. ${p.telefono}` : ''
  return `${label}: ${n || '—'}${t}`
}

export function equipaggioToPlainText(e: Equipaggio): string {
  return [
    riga('Autista', e.autista),
    riga('Capo equipaggio / medico', e.capoEquipaggio),
    riga('Soccorritore 1', e.soccorritore1),
    riga('Soccorritore 2', e.soccorritore2),
  ].join('\n')
}
