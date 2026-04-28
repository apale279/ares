export function formatDataOra(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
