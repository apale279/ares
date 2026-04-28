import { useAresStore } from '../store/aresStore'
import { equipaggioToPlainText } from '../utils/equipaggioPrint'

export function MezzoDetailModal({ onClose }: { onClose: () => void }) {
  const mezzoId = useAresStore((s) => s.modalMezzoId)
  const mezzo = useAresStore((s) =>
    s.modalMezzoId ? s.mezzi.find((m) => m.id === s.modalMezzoId) ?? null : null,
  )

  if (!mezzoId || !mezzo) return null

  return (
    <div className="ares-modal-backdrop ares-modal-stack" role="presentation" onClick={onClose}>
      <div
        className="ares-modal ares-modal--narrow"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>
            Mezzo {mezzo.sigla} ({mezzo.tipo})
          </h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="ares-modal-scroll">
          <p>
            Stato: <strong>{mezzo.stato}</strong>
          </p>
          <p className="ares-muted">Sigla radio: {mezzo.siglaRadio || '—'}</p>
          <p className="ares-muted">Targa: {mezzo.targa || '—'}</p>
          <label>
            Stazionamento
            <input value={mezzo.stazionamento} readOnly />
          </label>
          <p className="ares-muted">
            Coordinate:{' '}
            {mezzo.stazionamentoLat != null && mezzo.stazionamentoLng != null
              ? `${mezzo.stazionamentoLat.toFixed(5)}, ${mezzo.stazionamentoLng.toFixed(5)}`
              : '—'}
          </p>
          <h4>Equipaggio</h4>
          <pre className="ares-pre">{equipaggioToPlainText(mezzo.equipaggio)}</pre>
        </div>
      </div>
    </div>
  )
}
