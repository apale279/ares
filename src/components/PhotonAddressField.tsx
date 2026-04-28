/**
 * Campo indirizzo con autocomplete Photon (popover + debounce).
 *
 * Con react-hook-form (valore oggetto o null):
 *
 * ```tsx
 * import { Controller, useForm } from 'react-hook-form'
 * import { PhotonAddressField } from './PhotonAddressField'
 * import type { PhotonAddressValue } from '../utils/photon'
 *
 * type Form = { sede: PhotonAddressValue | null }
 * const { control } = useForm<Form>({ defaultValues: { sede: null } })
 *
 * <Controller
 *   name="sede"
 *   control={control}
 *   render={({ field }) => (
 *     <PhotonAddressField
 *       {...field}
 *       previewText={undefined}
 *     />
 *   )}
 * />
 * ```
 */
import { Loader2, MapPin } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  searchPhoton,
  type PhotonAddressValue,
} from '../utils/photon'

export type { PhotonAddressValue }

const DEFAULT_PLACEHOLDER =
  'Cerca un indirizzo in Italia (via, piazza, comune…)'

export type PhotonAddressFieldProps = {
  value: PhotonAddressValue | null
  onChange: (next: PhotonAddressValue | null) => void
  onBlur?: () => void
  name?: string
  id?: string
  disabled?: boolean
  placeholder?: string
  debounceMs?: number
  className?: string
  /** Se `value` è null, testo da mostrare sul pulsante (es. bozza non confermata) */
  previewText?: string
  limit?: number
}

export const PhotonAddressField = forwardRef<
  HTMLButtonElement,
  PhotonAddressFieldProps
>(function PhotonAddressField(
  {
    value,
    onChange,
    onBlur,
    name,
    id: idProp,
    disabled = false,
    placeholder = DEFAULT_PLACEHOLDER,
    debounceMs = 400,
    className = '',
    previewText = '',
    limit = 8,
  },
  ref,
) {
  const uid = useId()
  const listId = `${uid}-list`
  const inputId = `${uid}-input`
  const wrapRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [results, setResults] = useState<PhotonAddressValue[]>([])
  const [loading, setLoading] = useState(false)

  const buttonLabel =
    value?.display_name?.trim() ||
    previewText?.trim() ||
    ''

  useEffect(() => {
    if (!open) return
    const q = draft.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = window.setTimeout(() => {
      searchPhoton(q, { limit, lang: 'it', boundedItaly: true })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, debounceMs)
    return () => window.clearTimeout(t)
  }, [draft, open, debounceMs, limit])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const openPopover = useCallback(() => {
    if (disabled) return
    setDraft(value?.display_name ?? previewText ?? '')
    setOpen(true)
  }, [disabled, value, previewText])

  const pick = useCallback(
    (hit: PhotonAddressValue) => {
      onChange(hit)
      setOpen(false)
      onBlur?.()
    },
    [onChange, onBlur],
  )

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
      setDraft('')
      setResults([])
      onBlur?.()
    },
    [onChange, onBlur],
  )

  return (
    <div
      className={`ares-photon-field ${className}`.trim()}
      ref={wrapRef}
    >
      <div className="ares-photon-trigger-wrap">
        <button
          ref={ref}
          type="button"
          id={idProp}
          data-field={name}
          className="ares-photon-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? setOpen(false) : openPopover())}
        >
          <MapPin className="ares-photon-trigger-icon" size={18} aria-hidden />
          <span className="ares-photon-trigger-text">
            {buttonLabel || (
              <span className="ares-photon-placeholder">{placeholder}</span>
            )}
          </span>
        </button>
        {(value || previewText.trim()) && !disabled && (
          <button
            type="button"
            className="ares-photon-clear"
            aria-label="Cancella indirizzo"
            onClick={clear}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="ares-photon-popover" role="dialog" aria-label="Ricerca indirizzo">
          <div className="ares-photon-popover-head">
            <input
              id={inputId}
              className="ares-photon-input"
              autoComplete="off"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              aria-controls={listId}
              aria-autocomplete="list"
            />
            {loading ? (
              <Loader2
                className="ares-photon-loader"
                size={20}
                aria-label="Caricamento"
              />
            ) : null}
          </div>
          <ul id={listId} className="ares-photon-results" role="listbox">
            {!loading &&
              draft.trim().length >= 2 &&
              results.length === 0 && (
                <li className="ares-photon-empty">Nessun risultato</li>
              )}
            {results.map((hit, i) => (
              <li key={`${hit.lat}-${hit.lon}-${i}`} role="option">
                <button
                  type="button"
                  className="ares-photon-result-btn"
                  onClick={() => pick(hit)}
                >
                  {hit.display_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
})

PhotonAddressField.displayName = 'PhotonAddressField'
