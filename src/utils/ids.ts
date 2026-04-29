function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function nuovoIdEvento(idsEsistenti: Set<string>): string {
  let id: string
  do {
    id = `E_${random6()}`
  } while (idsEsistenti.has(id))
  return id
}

export function nuovoIdMissione(idsEsistenti: Set<string>): string {
  let id: string
  do {
    id = `M_${random6()}`
  } while (idsEsistenti.has(id))
  return id
}

export function nuovoIdMezzo(): string {
  return `mezzo_${crypto.randomUUID()}`
}

export function nuovoIdPaziente(idsEsistenti: Set<string>): string {
  let id: string
  do {
    id = `P_${random6()}`
  } while (idsEsistenti.has(id))
  return id
}

export function nuovoIdValutazione(): string {
  return `val_${crypto.randomUUID()}`
}

export function nuovoIdNota(): string {
  return `N_${random6()}`
}
