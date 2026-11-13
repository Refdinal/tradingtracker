import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const { Pool } = pg
const app = express()
app.use(express.json())
app.use(cookieParser())
const allowedOrigins = process.env.CLIENT_URL?.split(',').map(origin => origin.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins?.length || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origin tidak diizinkan oleh konfigurasi CORS'))
  },
  credentials: true,
}))

let pool
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }, max: 5 })
}

let schemaPromise
async function ensureSchema() {
  if (!pool) return
  if (!schemaPromise) schemaPromise = pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      capital NUMERIC(20, 2) NOT NULL DEFAULT 1000000,
      risk NUMERIC(20, 2) NOT NULL DEFAULT 10000,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS trades (
      id BIGSERIAL PRIMARY KEY,
      trade_code TEXT NOT NULL UNIQUE,
      trade_date DATE NOT NULL,
      entry NUMERIC(24, 2) NOT NULL,
      stop NUMERIC(24, 2) NOT NULL,
      units NUMERIC(20, 8) NOT NULL,
      capital NUMERIC(24, 2) NOT NULL,
      tp1 NUMERIC(24, 2) NOT NULL,
      tp2 NUMERIC(24, 2) NOT NULL,
      tp3 NUMERIC(24, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'win', 'lose')),
      result NUMERIC(24, 2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await schemaPromise
}

const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me'
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me'
const signAccess = (username) => jwt.sign({ sub: username, type: 'access' }, accessSecret, { expiresIn: '15m' })
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(token, accessSecret)
    if (payload.type !== 'access') throw new Error('Invalid token type')
    req.user = payload.sub
    return next()
  } catch {
    return res.status(401).json({ error: 'Session expired' })
  }
}

function serialiseTrade(row) {
  return { id: row.trade_code, date: typeof row.trade_date === 'string' ? row.trade_date.slice(0, 10) : row.trade_date.toISOString().slice(0, 10), entry: Number(row.entry), stop: Number(row.stop), units: Number(row.units), capital: Number(row.capital), tp1: Number(row.tp1), tp2: Number(row.tp2), tp3: Number(row.tp3), status: row.status, result: row.result == null ? null : Number(row.result) }
}

app.get('/api/health', async (_req, res) => {
  try { await ensureSchema(); if (pool) await pool.query('SELECT 1'); res.json({ ok: true, database: Boolean(pool) }) }
  catch (error) { res.status(503).json({ ok: false, error: error.message }) }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {}
  const expectedUser = process.env.APP_USERNAME
  const expectedPassword = process.env.APP_PASSWORD
  if (!expectedUser || (!expectedPassword && !process.env.APP_PASSWORD_HASH)) return res.status(503).json({ error: 'Set APP_USERNAME and APP_PASSWORD in the environment' })
  const validUser = typeof username === 'string' && username === expectedUser
  let validPassword = false
  if (typeof password === 'string') {
    validPassword = process.env.APP_PASSWORD_HASH
      ? await bcrypt.compare(password, process.env.APP_PASSWORD_HASH)
      : password === expectedPassword
  }
  if (!validUser || !validPassword) return res.status(401).json({ error: 'Username atau password salah' })
  const accessToken = signAccess(username)
  const refreshToken = jwt.sign({ sub: username, type: 'refresh' }, refreshSecret, { expiresIn: '7d' })
  res.cookie('stack_refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 })
  return res.json({ accessToken, expiresIn: 900 })
})

app.post('/api/auth/refresh', (req, res) => {
  try {
    const token = req.cookies.stack_refresh || req.body?.refreshToken
    const payload = jwt.verify(token, refreshSecret)
    if (payload.type !== 'refresh') throw new Error('Invalid token type')
    const accessToken = signAccess(payload.sub)
    const refreshToken = jwt.sign({ sub: payload.sub, type: 'refresh' }, refreshSecret, { expiresIn: '7d' })
    res.cookie('stack_refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 })
    return res.json({ accessToken, expiresIn: 900 })
  } catch { return res.status(401).json({ error: 'Refresh session expired' }) }
})

app.post('/api/auth/logout', (_req, res) => { res.clearCookie('stack_refresh', { path: '/api/auth' }); res.status(204).end() })

app.get('/api/settings', auth, async (_req, res, next) => {
  try {
    await ensureSchema()
    if (!pool) return res.json({ capital: 1000000, risk: 10000 })
    const { rows } = await pool.query('SELECT capital, risk FROM settings WHERE id = 1')
    return res.json({ capital: Number(rows[0].capital), risk: Number(rows[0].risk) })
  } catch (error) { next(error) }
})

app.put('/api/settings', auth, async (req, res, next) => {
  const capital = Number(req.body?.capital)
  const risk = Number(req.body?.risk)
  if (!(capital > 0) || !(risk > 0)) return res.status(400).json({ error: 'Capital dan risk harus lebih besar dari nol' })
  try {
    await ensureSchema()
    if (!pool) return res.json({ capital, risk })
    const { rows } = await pool.query('UPDATE settings SET capital = $1, risk = $2, updated_at = NOW() WHERE id = 1 RETURNING capital, risk', [capital, risk])
    return res.json({ capital: Number(rows[0].capital), risk: Number(rows[0].risk) })
  } catch (error) { next(error) }
})

app.get('/api/trades', auth, async (_req, res, next) => {
  try {
    await ensureSchema()
    if (!pool) return res.json([])
    const { rows } = await pool.query('SELECT * FROM trades ORDER BY trade_date DESC, created_at DESC')
    return res.json(rows.map(serialiseTrade))
  } catch (error) { next(error) }
})

app.post('/api/trades', auth, async (req, res, next) => {
  const { date, entry, stop, units, capital, tp1, tp2, tp3 } = req.body || {}
  const values = [Number(entry), Number(stop), Number(units), Number(capital), Number(tp1), Number(tp2), Number(tp3)]
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || values.some(v => !Number.isFinite(v) || v <= 0) || values[0] <= values[1] || values[2] > 1) return res.status(400).json({ error: 'Data setup tidak valid' })
  try {
    await ensureSchema()
    const tradeCode = `TR-${Date.now().toString().slice(-6)}`
    if (!pool) return res.status(503).json({ error: 'Database belum dikonfigurasi' })
    const { rows } = await pool.query('INSERT INTO trades (trade_code, trade_date, entry, stop, units, capital, tp1, tp2, tp3) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [tradeCode, date, ...values])
    return res.status(201).json(serialiseTrade(rows[0]))
  } catch (error) { next(error) }
})

app.put('/api/trades/:id', auth, async (req, res, next) => {
  const { status, result } = req.body || {}
  if (!['running', 'win', 'lose'].includes(status)) return res.status(400).json({ error: 'Status tidak valid' })
  const parsedResult = result == null || result === '' ? null : Number(result)
  if (parsedResult !== null && (!Number.isFinite(parsedResult) || parsedResult < 0)) return res.status(400).json({ error: 'Hasil trade harus berupa angka positif' })
  if (status === 'running' && parsedResult !== null) return res.status(400).json({ error: 'Trade running tidak dapat memiliki hasil' })
  if (status !== 'running' && parsedResult === null) return res.status(400).json({ error: 'Masukkan nilai profit atau loss' })
  try {
    await ensureSchema()
    if (!pool) return res.status(503).json({ error: 'Database belum dikonfigurasi' })
    const { rows } = await pool.query('UPDATE trades SET status = $1, result = $2 WHERE trade_code = $3 RETURNING *', [status, status === 'lose' && parsedResult ? -parsedResult : parsedResult, req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Trade tidak ditemukan' })
    return res.json(serialiseTrade(rows[0]))
  } catch (error) { next(error) }
})

app.delete('/api/trades/:id', auth, async (req, res, next) => {
  try {
    await ensureSchema()
    if (!pool) return res.status(503).json({ error: 'Database belum dikonfigurasi' })
    const { rowCount } = await pool.query('DELETE FROM trades WHERE trade_code = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Trade tidak ditemukan' })
    return res.status(204).end()
  } catch (error) { next(error) }
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }))
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Terjadi kesalahan pada server' }) })

if (process.env.NODE_ENV !== 'production' || process.env.RUN_LOCAL_SERVER === 'true') {
  const port = Number(process.env.PORT || 3001)
  app.listen(port, () => console.log(`Stack API listening on port ${port}`))
}

export default app
