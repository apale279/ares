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

function parseAresPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { mezzi: [], missioni: [], eventi: [] }
  }
  const state = payload.state ?? {}
  return {
    mezzi: Array.isArray(state.mezzi) ? state.mezzi : [],
    missioni: Array.isArray(state.missioni) ? state.missioni : [],
    eventi: Array.isArray(state.eventi) ? state.eventi : [],
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

async function getChatsForMezzo(mezzoId) {
  const { data, error } = await supabase
    .from('telegram_mezzo_claims')
    .select('chat_id')
    .eq('mezzo_id', mezzoId)
  if (error) throw error
  return (data ?? []).map((r) => r.chat_id)
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

function missionMessage(missione, evento, mezzoSigla) {
  const luogo = evento?.indirizzo?.trim() ? evento.indirizzo : 'Luogo non specificato'
  return (
    `Nuova missione assegnata al tuo mezzo ${mezzoSigla}\n\n` +
    `Missione: ${missione.id}\n` +
    `Evento: ${missione.eventoId}\n` +
    `Codice: ${missione.codice}\n` +
    `Stato iniziale: ${missione.stato}\n` +
    `Luogo: ${luogo}`
  )
}

async function notifyMissionAllertato(nextState) {
  const { missioni, eventi, mezzi } = nextState
  for (const m of missioni) {
    const existing = missionCache.get(m.id)
    missionCache.set(m.id, m)
    if (!existing) continue
    if (existing.stato === 'ALLERTATO' || m.stato !== 'ALLERTATO') continue

    const chats = await getChatsForMezzo(m.mezzoId)
    if (!chats.length) continue

    const evento = eventi.find((e) => e.id === m.eventoId)
    const mezzo = mezzi.find((z) => z.id === m.mezzoId)
    const mezzoSigla = mezzo?.sigla ?? m.mezzoId
    const text =
      'MISSIONE ALLERTATA\n\n' + missionMessage(m, evento, mezzoSigla)

    await Promise.all(
      chats.map(async (chatId) => {
        try {
          await bot.telegram.sendMessage(chatId, text)
        } catch (err) {
          console.error('[Telegram notify error]', chatId, err)
        }
      }),
    )
  }
}

async function bootstrapMissionCache() {
  const state = await getCurrentAresState()
  for (const m of state.missioni) missionCache.set(m.id, m)
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
        await notifyMissionAllertato(next)
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
  await bot.launch()
  console.log('Telegram bot online')

  const shutdown = async () => {
    console.log('Stopping Telegram bot...')
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
