import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useAresStore } from '../store/aresStore'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const utenti = useAresStore((s) => s.impostazioni.utenti)
  const [nomeUtente, setNomeUtente] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    const u = nomeUtente.trim()
    const p = password
    if (!u || !p) {
      setErr('Inserisci nome utente e password.')
      return
    }
    const found = utenti.find(
      (x) => x.nomeUtente.trim().toLowerCase() === u.toLowerCase(),
    )
    if (!found || found.password !== p) {
      setErr('Credenziali non valide.')
      return
    }
    login({ userId: found.id, nomeUtente: found.nomeUtente })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="ares-settings" style={{ maxWidth: 420, margin: '48px auto' }}>
      <h1>Accesso ARES</h1>
      <p className="ares-muted">
        Utenti gestiti in Impostazioni → tab UTENTI. Default: <code>admin</code> /{' '}
        <code>admin</code> se non modificato.
      </p>
      <form className="ares-form-grid tight" onSubmit={submit}>
        <label className="full">
          Nome utente
          <input
            autoComplete="username"
            value={nomeUtente}
            onChange={(e) => setNomeUtente(e.target.value)}
          />
        </label>
        <label className="full">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {err ? <p className="ares-login-err">{err}</p> : null}
        <button type="submit" className="ares-btn primary">
          Entra
        </button>
      </form>
    </div>
  )
}
