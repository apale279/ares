import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

for (const envPath of [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env.local'),
  path.resolve(process.cwd(), 'backend/.env'),
]) {
  dotenv.config({ path: envPath, override: false })
}

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ?? process.env.VITE_TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY
const ARES_STATE_ROW_ID = process.env.ARES_STATE_ROW_ID ?? 'default'
const APP_BASE_URL = (process.env.APP_BASE_URL ?? process.env.VITE_APP_BASE_URL ?? '').replace(/\/+$/, '')

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN env variable')
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase env variables. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).',
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

/** @type {Map<string, any>} */
const missionCache = new Map()
/** @type {Map<string, string>} */
const missionDispatchTokenCache = new Map()
/** @type {Map<string, any>} */
const noteCache = new Map()

function parseAresPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { mezzi: [], missioni: [], eventi: [], note: [], pazienti: [] }
  }
  const state = payload.state ?? {}
  return {
    mezzi: Array.isArray(state.mezzi) ? state.mezzi : [],
    missioni: Array.isArray(state.missioni) ? state.missioni : [],
    eventi: Array.isArray(state.eventi) ? state.eventi : [],
    note: Array.isArray(state.note) ? state.note : [],
    pazienti: Array.isArray(state.pazienti) ? state.pazienti : [],
  }
}

async function getCurrentAresState() {
  const { data, error } = await supabase
    .from('ares_state')
    .select('payload')
    .eq('id', ARES_STATE_ROW_ID)
    .maybeSingle()
  if (error) throw error
  const payload = data?.payload ?? { state: {} }
  return parseAresPayload(payload)
}

async function getCurrentAresPayloadRow() {
  const { data, error } = await supabase
    .from('ares_state')
    .select('id,payload')
    .eq('id', ARES_STATE_ROW_ID)
    .maybeSingle()
  if (error) throw error
  if (!data?.payload || typeof data.payload !== 'object') {
    return { id: ARES_STATE_ROW_ID, payload: { state: {} } }
  }
  return data
}

async function getChatsForMezzo(mezzoId, mezzoSigla) {
  const byId = await supabase
    .from('telegram_mezzo_claims')
    .select('chat_id')
    .eq('mezzo_id', mezzoId)
  if (byId.error) throw byId.error
  const chats = new Set((byId.data ?? []).map((r) => r.chat_id))
  if (!chats.size && mezzoSigla) {
    const bySigla = await supabase
      .from('telegram_mezzo_claims')
      .select('chat_id')
      .eq('mezzo_sigla', mezzoSigla)
    if (bySigla.error) throw bySigla.error
    for (const row of bySigla.data ?? []) chats.add(row.chat_id)
  }
  return [...chats]
}

async function getAllClaimedChats() {
  const { data, error } = await supabase
    .from('telegram_mezzo_claims')
    .select('chat_id')
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.chat_id))]
}

function buildMezziKeyboard(mezzi) {
  const rows = mezzi.map((m) => [
    Markup.button.callback(
      `${m.sigla} (${m.tipo}) - ${m.stato}`,
      `CLAIM:${m.id}`,
    ),
  ])
  return Markup.inlineKeyboard(rows)
}

async function sendMezziList(ctx) {
  const { mezzi } = await getCurrentAresState()
  if (mezzi.length === 0) {
    await ctx.reply('Nessun mezzo presente al momento.')
    return
  }
  await ctx.reply(
    'Seleziona il mezzo di cui sei capo equipaggio:',
    buildMezziKeyboard(mezzi),
  )
}

bot.start(async (ctx) => {
  await ctx.reply(
    'Bot ARES attivo. Ti mostro l\'elenco mezzi disponibili da associare al tuo chat Telegram.',
  )
  await sendMezziList(ctx)
})

bot.command('mezzi', async (ctx) => {
  await sendMezziList(ctx)
})

bot.command('miei_mezzi', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const { data, error } = await supabase
    .from('telegram_mezzo_claims')
    .select('mezzo_id, mezzo_sigla')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) {
    await ctx.reply('Non hai ancora mezzi associati. Usa /mezzi.')
    return
  }
  const lines = data.map((d) => `- ${d.mezzo_sigla} (${d.mezzo_id})`)
  await ctx.reply(`Mezzi associati a questa chat:\n${lines.join('\n')}`)
})

bot.action(/^CLAIM:(.+)$/, async (ctx) => {
  const mezzoId = ctx.match[1]
  const chatId = String(ctx.chat.id)
  const username = ctx.from?.username ?? null

  const { mezzi } = await getCurrentAresState()
  const mezzo = mezzi.find((m) => m.id === mezzoId)
  if (!mezzo) {
    await ctx.answerCbQuery('Mezzo non trovato')
    return
  }

  const { error } = await supabase.from('telegram_mezzo_claims').upsert(
    {
      mezzo_id: mezzo.id,
      mezzo_sigla: mezzo.sigla,
      chat_id: chatId,
      telegram_username: username,
    },
    {
      onConflict: 'mezzo_id,chat_id',
    },
  )
  if (error) throw error

  await ctx.answerCbQuery('Mezzo associato')
  await ctx.reply(
    `Perfetto. Da ora sei associato al mezzo ${mezzo.sigla}.\nRiceverai messaggi quando viene creata una missione su questo mezzo.`,
  )
})

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function codiceDot(codice) {
  if (codice === 'ROSSO') return '🔴'
  if (codice === 'VERDE/GIALLO') return '🟡'
  if (codice === 'GIALLO') return '🟡'
  return '🟢'
}

function buildMapsUrl(evento) {
  if (typeof evento?.lat === 'number' && typeof evento?.lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${evento.lat},${evento.lng}&travelmode=driving`
  }
  const addr = evento?.indirizzo?.trim()
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`
  }
  return null
}

function buildMezzoVistaUrl(mezzoSigla) {
  if (!APP_BASE_URL) return null
  return `${APP_BASE_URL}/mezzo?sigla=${encodeURIComponent(mezzoSigla)}`
}

function missionMessageHtml(missione, evento, mezzoSigla) {
  const dot = codiceDot(missione.codice)
  const mapsUrl = buildMapsUrl(evento)
  const mezzoVistaUrl = buildMezzoVistaUrl(mezzoSigla)
  const indirizzo = evento?.indirizzo?.trim() || 'Luogo non specificato'
  const parts = [
    `<b>MISSIONE INVIATA MANUALMENTE</b>`,
    `<b>Mezzo:</b> ${escapeHtml(mezzoSigla)}`,
    `${dot} <b>ID evento:</b> ${escapeHtml(missione.eventoId)}`,
    `<b>ID missione:</b> ${escapeHtml(missione.id)}`,
    mapsUrl
      ? `<b>Indirizzo:</b> <a href="${mapsUrl}">${escapeHtml(indirizzo)}</a>`
      : `<b>Indirizzo:</b> ${escapeHtml(indirizzo)}`,
    `<b>Classificazione:</b> ${escapeHtml(evento?.classificazioneSoccorso ?? '—')}${
      evento?.dettaglioClassificazioneSoccorso
        ? ` (${escapeHtml(evento.dettaglioClassificazioneSoccorso)})`
        : ''
    }`,
    `<b>Motivo:</b> ${escapeHtml(evento?.motivoSoccorso ?? '—')}${
      evento?.dettaglioMotivoSoccorso
        ? ` (${escapeHtml(evento.dettaglioMotivoSoccorso)})`
        : ''
    }`,
    `<b>Descrizione:</b> ${escapeHtml(evento?.descrizione ?? '—')}`,
  ]
  if (mezzoVistaUrl) {
    parts.push(`<a href="${mezzoVistaUrl}">Apri vista mezzo (${escapeHtml(mezzoSigla)})</a>`)
  }
  return parts.join('\n')
}

const MISSION_STATE_ORDER = [
  'ALLERTARE',
  'ALLERTATO',
  'PARTITO',
  'IN_POSTO',
  'DIRETTO_IN_H',
  'ARRIVATO_IN_H',
  'RIENTRO',
  'FINE_MISSIONE',
]

/** Etichetta dello stato (stesso significato dell’app centrale). */
const LABEL_STATO_MISSIONE = {
  ALLERTARE: 'Allertare',
  ALLERTATO: 'Allertato',
  PARTITO: 'Partito',
  IN_POSTO: 'In posto',
  DIRETTO_IN_H: 'Diretto in H',
  ARRIVATO_IN_H: 'Arrivato in H',
  RIENTRO: 'Rientro',
  FINE_MISSIONE: 'Fine missione',
}

/** Un solo passo in avanti rispetto allo stato attuale sul DB (anche se la centrale ha saltato stati dall’interfaccia). */
function nextMissionState(stato) {
  const idx = MISSION_STATE_ORDER.indexOf(stato)
  if (idx < 0 || idx >= MISSION_STATE_ORDER.length - 1) return stato
  return MISSION_STATE_ORDER[idx + 1]
}

/**
 * Telegram `callback_data` max 64 byte. Prefix `ADV:` + missionId + `:` + rev.
 */
function buildAdvanceKeyboard(missioneId, currentState, statoRevision) {
  const next = nextMissionState(currentState)
  if (next === currentState) {
    return Markup.inlineKeyboard([])
  }
  const label = LABEL_STATO_MISSIONE[next] ?? next
  const rev = typeof statoRevision === 'number' ? statoRevision : 0
  const payload = `ADV:${missioneId}:${rev}`
  if (Buffer.byteLength(payload, 'utf8') > 64) {
    console.warn('[Telegram] callback_data troppo lungo per missione', missioneId)
  }
  return Markup.inlineKeyboard([[Markup.button.callback(label, payload)]])
}

/** @returns {{ missioneId: string, rev: number | null } | null} */
function parseAdvancePayload(data) {
  if (typeof data !== 'string') return null
  if (data.startsWith('ADV:')) {
    const rest = data.slice(4)
    const last = rest.lastIndexOf(':')
    if (last <= 0) return null
    const missioneId = rest.slice(0, last)
    const rev = Number.parseInt(rest.slice(last + 1), 10)
    return Number.isFinite(rev) ? { missioneId, rev } : null
  }
  if (data.startsWith('ADVANCE:')) {
    const rest = data.slice(8)
    const last = rest.lastIndexOf(':')
    if (last > 0) {
      const cand = rest.slice(last + 1)
      const rev = Number.parseInt(cand, 10)
      if (Number.isFinite(rev) && cand === String(rev)) {
        return { missioneId: rest.slice(0, last), rev }
      }
    }
    return { missioneId: rest, rev: null }
  }
  return null
}

async function getMezzoIdsForChat(chatId) {
  const { data, error } = await supabase
    .from('telegram_mezzo_claims')
    .select('mezzo_id')
    .eq('chat_id', chatId)
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.mezzo_id))]
}

function reconcileEventi(eventi, missioni) {
  const byEvent = new Map()
  for (const m of missioni) {
    const arr = byEvent.get(m.eventoId) ?? []
    arr.push(m)
    byEvent.set(m.eventoId, arr)
  }
  return (eventi ?? []).map((e) => {
    if (e.stato === 'CHIUSO') return e
    const list = byEvent.get(e.id) ?? []
    if (list.length === 0) return { ...e, stato: 'IN_ATTESA' }
    const tutteChiuse = list.every((m) => m.stato === 'FINE_MISSIONE')
    if (tutteChiuse) return { ...e, stato: 'CHIUSO' }
    return { ...e, stato: 'APERTO' }
  })
}

async function clearMissionDispatchRequest(missioneId, requestToken) {
  const row = await getCurrentAresPayloadRow()
  const payload = row.payload
  const state = payload.state ?? {}
  const missioni = Array.isArray(state.missioni) ? [...state.missioni] : []
  const idx = missioni.findIndex((m) => m.id === missioneId)
  if (idx < 0) return
  if ((missioni[idx]?.telegramDispatchRequestedAt ?? null) !== requestToken) return
  missioni[idx] = { ...missioni[idx], telegramDispatchRequestedAt: null }
  const { error } = await supabase
    .from('ares_state')
    .update({
      payload: {
        ...payload,
        state: { ...state, missioni },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', ARES_STATE_ROW_ID)
  if (error) {
    console.error('[Telegram clear request error]', missioneId, error)
  }
}

async function isNoteAlreadyDispatched(notaId) {
  const { data, error } = await supabase
    .from('telegram_note_dispatches')
    .select('id')
    .eq('nota_id', notaId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.id)
}

async function markNoteDispatched(nota) {
  const { error } = await supabase.from('telegram_note_dispatches').upsert(
    {
      nota_id: nota.id,
      requested_at: nota.telegramBroadcastRequestedAt ?? null,
      title: nota.titolo ?? null,
      body: nota.testo ?? null,
      sent_at: new Date().toISOString(),
    },
    { onConflict: 'nota_id' },
  )
  if (error) throw error
}

function noteMessageHtml(nota) {
  const titolo = nota?.titolo?.trim() || 'Nota'
  const testo = nota?.testo?.trim() || 'Nessun testo'
  return `<b>NOTA OPERATIVA</b>\n<b>${escapeHtml(titolo)}</b>\n\n${escapeHtml(testo)}`
}

async function notifyRequestedMissions(nextState) {
  const { missioni, eventi, mezzi } = nextState
  for (const m of missioni) {
    const existing = missionCache.get(m.id)
    missionCache.set(m.id, m)
    if (!m.telegramDispatchRequestedAt) continue
    if (existing?.telegramDispatchRequestedAt === m.telegramDispatchRequestedAt) continue
    if (missionDispatchTokenCache.get(m.id) === m.telegramDispatchRequestedAt) continue

    const evento = eventi.find((e) => e.id === m.eventoId)
    const mezzo = mezzi.find((z) => z.id === m.mezzoId)
    const mezzoSigla = mezzo?.sigla ?? m.mezzoId
    const chats = await getChatsForMezzo(m.mezzoId, mezzoSigla)
    await clearMissionDispatchRequest(m.id, m.telegramDispatchRequestedAt)
    missionDispatchTokenCache.set(m.id, m.telegramDispatchRequestedAt)
    if (!chats.length) continue
    const text = missionMessageHtml(m, evento, mezzoSigla)

    await Promise.all(
      chats.map(async (chatId) => {
        try {
          await bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: buildAdvanceKeyboard(m.id, m.stato, m.statoRevision).reply_markup,
          })
        } catch (err) {
          console.error('[Telegram notify error]', chatId, err)
        }
      }),
    )
  }
}

async function handleMissionAdvanceCallback(ctx, data) {
  const parsed = parseAdvancePayload(data)
  if (!parsed) {
    await ctx.answerCbQuery('Pulsante non valido')
    return
  }
  const { missioneId, rev: callbackRev } = parsed
  const chatId = String(ctx.chat.id)
  const row = await getCurrentAresPayloadRow()
  const payload = row.payload
  const state = payload.state ?? {}
  const missioni = Array.isArray(state.missioni) ? [...state.missioni] : []
  const mezzi = Array.isArray(state.mezzi) ? [...state.mezzi] : []
  const pazienti = Array.isArray(state.pazienti) ? [...state.pazienti] : []
  const eventi = Array.isArray(state.eventi) ? [...state.eventi] : []
  const idx = missioni.findIndex((m) => m.id === missioneId)
  if (idx < 0) {
    await ctx.answerCbQuery('Missione non trovata')
    return
  }
  const missione = missioni[idx]
  const chats = await getChatsForMezzo(missione.mezzoId, null)
  if (!chats.includes(chatId)) {
    await ctx.answerCbQuery('Non autorizzato su questo mezzo')
    return
  }
  const currentRev = missione.statoRevision ?? 0
  if (callbackRev !== null && callbackRev !== currentRev) {
    await ctx.answerCbQuery(
      'Stato aggiornato dalla centrale. Attendi un nuovo avviso o usa l’app.',
      { show_alert: true },
    )
    return
  }
  const next = nextMissionState(missione.stato)
  if (next === missione.stato) {
    await ctx.answerCbQuery('Nessun avanzamento disponibile')
    return
  }
  const now = new Date().toISOString()
  const newRev = currentRev + 1
  missioni[idx] = {
    ...missione,
    stato: next,
    statoHistory: [...(missione.statoHistory ?? []), { stato: next, at: now }],
    statoRevision: newRev,
  }
  missionCache.set(missioneId, missioni[idx])
  let pazientiNext = pazienti
  if (next === 'ARRIVATO_IN_H') {
    pazientiNext = pazienti.map((p) => {
      if (
        p.eventoId !== missione.eventoId ||
        p.mezzoTrasportoId !== missione.mezzoId ||
        p.esito !== 'TRASPORTATO'
      ) {
        return p
      }
      const tipo = p.tipoDestinazioneTrasporto ?? 'OSPEDALE'
      const slegato = { ...p, mezzoTrasportoId: null }
      if (tipo === 'OSPEDALE') {
        return {
          ...slegato,
          arrivoInOspedaleAt: p.arrivoInOspedaleAt ?? now,
          trasportoCompletatoAt: p.trasportoCompletatoAt ?? now,
        }
      }
      return { ...slegato, pmaArrivoAt: p.pmaArrivoAt ?? now }
    })
  }
  let mezziNext = mezzi
  if (next === 'FINE_MISSIONE') {
    mezziNext = mezzi.map((mz) =>
      mz.id === missione.mezzoId ? { ...mz, stato: 'DISPONIBILE' } : mz,
    )
  }
  const eventiNext = reconcileEventi(eventi, missioni)
  const nextPayload = {
    ...payload,
    state: {
      ...state,
      missioni,
      mezzi: mezziNext,
      pazienti: pazientiNext,
      eventi: eventiNext,
    },
  }
  const { error } = await supabase
    .from('ares_state')
    .update({ payload: nextPayload, updated_at: now })
    .eq('id', ARES_STATE_ROW_ID)
  if (error) {
    console.error('[Telegram advance error]', error)
    await ctx.answerCbQuery('Errore aggiornando stato')
    return
  }
  await ctx.answerCbQuery(LABEL_STATO_MISSIONE[next] ?? next)
  try {
    const kb = buildAdvanceKeyboard(missioneId, next, newRev)
    await ctx.editMessageReplyMarkup(kb.reply_markup)
  } catch {
    /* messaggio troppo vecchio o non inline: ignora */
  }
}

bot.action(/^ADV:.+$/, async (ctx) => {
  await handleMissionAdvanceCallback(ctx, ctx.callbackQuery.data)
})

bot.action(/^ADVANCE:.+$/, async (ctx) => {
  await handleMissionAdvanceCallback(ctx, ctx.callbackQuery.data)
})

bot.on('message', async (ctx, next) => {
  const loc = ctx.message?.location
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return next()
  }
  const chatId = String(ctx.chat.id)
  try {
    const mezzoIds = await getMezzoIdsForChat(chatId)
    if (mezzoIds.length === 0) {
      await ctx.reply(
        'Nessun mezzo associato a questa chat. Usa /mezzi per collegarti a un mezzo.',
      )
      return
    }
    const row = await getCurrentAresPayloadRow()
    const payload = row.payload
    const st = payload.state ?? {}
    const missioni = Array.isArray(st.missioni) ? [...st.missioni] : []
    const now = new Date().toISOString()
    const mezzoSet = new Set(mezzoIds)
    const candidates = missioni
      .map((m, i) => ({ m, i }))
      .filter(
        ({ m }) =>
          mezzoSet.has(m.mezzoId) &&
          m.stato &&
          m.stato !== 'FINE_MISSIONE',
      )
      .sort(
        (a, b) =>
          String(b.m.createdAt ?? '').localeCompare(String(a.m.createdAt ?? '')),
      )
    const pick = candidates[0]
    if (!pick) {
      await ctx.reply('Nessuna missione attiva per i tuoi mezzi al momento.')
      return
    }
    const { m: mis, i } = pick
    missioni[i] = {
      ...mis,
      telegramLastPosition: {
        lat: loc.latitude,
        lng: loc.longitude,
        at: now,
      },
    }
    const { error } = await supabase
      .from('ares_state')
      .update({
        payload: {
          ...payload,
          state: { ...st, missioni },
        },
        updated_at: now,
      })
      .eq('id', ARES_STATE_ROW_ID)
    if (error) {
      console.error('[Telegram location error]', error)
      await ctx.reply('Errore nel salvataggio della posizione.')
      return
    }
    missionCache.set(mis.id, missioni[i])
    await ctx.reply(
      `Posizione registrata sulla missione ${mis.id} (${mis.stato}).`,
    )
  } catch (err) {
    console.error('[Telegram location handler]', err)
    await ctx.reply('Errore elaborando la posizione.')
  }
})

async function notifyRequestedNotes(nextState) {
  const chats = await getAllClaimedChats()
  if (!chats.length) return
  for (const nota of nextState.note) {
    const old = noteCache.get(nota.id)
    noteCache.set(nota.id, nota)
    if (!nota.telegramBroadcastRequestedAt) continue
    if (old?.telegramBroadcastRequestedAt === nota.telegramBroadcastRequestedAt) continue
    if (await isNoteAlreadyDispatched(nota.id)) continue
    const text = noteMessageHtml(nota)
    await Promise.all(
      chats.map(async (chatId) => {
        try {
          await bot.telegram.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          })
        } catch (err) {
          console.error('[Telegram note error]', chatId, err)
        }
      }),
    )
    await markNoteDispatched(nota)
  }
}

async function bootstrapMissionCache() {
  const state = await getCurrentAresState()
  for (const m of state.missioni) missionCache.set(m.id, m)
  for (const n of state.note) noteCache.set(n.id, n)
}

async function runDispatchCycle(nextState) {
  const state = nextState ?? (await getCurrentAresState())
  await notifyRequestedMissions(state)
  await notifyRequestedNotes(state)
}

function subscribeAresState() {
  const channel = supabase
    .channel('telegram-bot-ares-state')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ares_state',
        filter: `id=eq.${ARES_STATE_ROW_ID}`,
      },
      async (payload) => {
        const next = parseAresPayload(payload.new?.payload)
        await runDispatchCycle(next)
      },
    )
    .subscribe((status) => {
      console.log('[Realtime]', status)
    })

  return channel
}

async function main() {
  await bootstrapMissionCache()
  const channel = subscribeAresState()
  const pollTimer = setInterval(() => {
    runDispatchCycle().catch((err) => {
      console.error('[Dispatch poll error]', err)
    })
  }, 5000)
  await bot.launch()
  console.log('Telegram bot online')

  const shutdown = async () => {
    console.log('Stopping Telegram bot...')
    clearInterval(pollTimer)
    bot.stop('SIGTERM')
    await supabase.removeChannel(channel)
    process.exit(0)
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Fatal telegram bot error:', err)
  process.exit(1)
})
