import { PmaVista } from './PmaVista'

export function PmaModulo() {
  return (
    <div>
      <div className="ares-settings" style={{ paddingBottom: 0 }}>
        <h1>Vista PMA</h1>
        <p className="ares-muted">
          Vista operativa PMA. Le funzioni cliniche specifiche verranno estese nei
          prossimi step.
        </p>
      </div>
      <PmaVista />
    </div>
  )
}
