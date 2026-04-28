/**
 * Campo indirizzo con autocomplete Mapbox (popover + debounce).
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
import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react'
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
  onDraftCommit?: (text: string) => void
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
  HTMLInputElement,
  PhotonAddressFieldProps
>(function PhotonAddressField(
  {
    value,
    onChange,
    onDraftCommit,
    onBlur,
    name,
    id: idProp,
    disabled = false,
    placeholder = DEFAULT_PLACEHOLDER,
    debounceMs = 300,
    className = '',
    previewText = '',
    limit = 8,
  },
  ref,
) {
  const uid = useId()
  const listId = `${uid}-list`
  const wrapRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [results, setResults] = useState<PhotonAddressValue[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const blurCloseTimer = useRef<number | null>(null)

  const inputText = value?.display_name?.trim() || previewText?.trim() || ''

  useEffect(() => {
    if (!open) {
      setDraft(inputText)
      setActiveIndex(-1)
    }
  }, [inputText, open])

  const normalizeFreeText = useCallback((text: string): string => {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((part) => {
        if (!part) return part
        return part[0]!.toUpperCase() + part.slice(1).toLowerCase()
      })
      .join(' ')
  }, [])

  useEffect(() => {
    if (!open) return
    const q = draft.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setActiveIndex(-1)
      return
    }
    setLoading(true)
    const t = window.setTimeout(() => {
      searchPhoton(q, { limit, lang: 'it', boundedItaly: true })
        .then((hits) => {
          setResults(hits)
          setActiveIndex(hits.length > 0 ? 0 : -1)
        })
        .catch(() => {
          setResults([])
          setActiveIndex(-1)
        })
        .finally(() => setLoading(false))
    }, debounceMs)
    return () => window.clearTimeout(t)
  }, [draft, open, debounceMs, limit])

  const pick = useCallback(
    (hit: PhotonAddressValue) => {
      onChange(hit)
      setDraft(hit.display_name)
      setOpen(false)
      setResults([])
      setActiveIndex(-1)
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
      setActiveIndex(-1)
      onBlur?.()
    },
    [onChange, onBlur],
  )

  const acceptTypedValue = useCallback(async () => {
    const q = draft.trim()
    if (q.length < 2) {
      if (!q) onChange(null)
      return
    }
    const best = results[activeIndex] ?? results[0] ?? null
    if (best) {
      pick(best)
      return
    }
    const fallback = await searchPhoton(q, { limit: 1, lang: 'it', boundedItaly: true })
    if (fallback[0]) {
      pick(fallback[0])
      return
    }
    const normalized = normalizeFreeText(q)
    setDraft(normalized)
    onDraftCommit?.(normalized)
    setOpen(false)
    onBlur?.()
  }, [
    activeIndex,
    draft,
    normalizeFreeText,
    onBlur,
    onChange,
    onDraftCommit,
    pick,
    results,
  ])

  return (
    <div
      className={`ares-photon-field ${className}`.trim()}
      ref={wrapRef}
    >
      <div className="ares-photon-input-wrap">
        <MapPin className="ares-photon-trigger-icon" size={18} aria-hidden />
        <input
          ref={ref}
          id={idProp}
          name={name}
          className="ares-photon-input"
          autoComplete="off"
          disabled={disabled}
          value={draft}
          placeholder={placeholder}
          aria-controls={listId}
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => {
            if (blurCloseTimer.current) {
              window.clearTimeout(blurCloseTimer.current)
              blurCloseTimer.current = null
            }
            setOpen(true)
          }}
          onBlur={() => {
            blurCloseTimer.current = window.setTimeout(() => {
              setOpen(false)
              blurCloseTimer.current = null
            }, 120)
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (!open) setOpen(true)
              setActiveIndex((prev) => {
                if (results.length === 0) return -1
                return prev < results.length - 1 ? prev + 1 : 0
              })
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((prev) => {
                if (results.length === 0) return -1
                return prev <= 0 ? results.length - 1 : prev - 1
              })
              return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              void acceptTypedValue()
              return
            }
            if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {loading ? (
          <Loader2
            className="ares-photon-loader"
            size={18}
            aria-label="Caricamento"
          />
        ) : null}
        {(draft.trim() || value || previewText.trim()) && !disabled && (
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
          <ul id={listId} className="ares-photon-results" role="listbox">
            {!loading &&
              draft.trim().length >= 2 &&
              results.length === 0 && (
                <li className="ares-photon-empty">
                  Nessun risultato. Premi Invio per mantenere e normalizzare il testo.
                </li>
              )}
            {results.map((hit, i) => (
              <li key={`${hit.lat}-${hit.lon}-${i}`} role="option">
                <button
                  type="button"
                  className={`ares-photon-result-btn ${i === activeIndex ? 'is-active' : ''}`}
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
