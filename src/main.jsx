import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, ArrowUpRight, Bitcoin, CalendarDays, Check, ChevronDown,
  CircleHelp, Clock3, Command, Download, LayoutDashboard, LogOut, Trash2,
  MoreHorizontal, Plus, Search, Settings2, Shield, SlidersHorizontal,
  Target, TrendingUp, Wallet, X,
} from 'lucide-react'
import './styles.css'

const initialTrades = [
  { id: 'TR-024', date: '2026-11-12', entry: 1_654_200_000, stop: 1_631_800_000, units: 0.00044643, capital: 738_529, tp1: 1_676_600_000, tp2: 1_699_000_000, tp3: 1_721_400_000, status: 'running', result: null },
  { id: 'TR-023', date: '2026-11-10', entry: 1_628_400_000, stop: 1_605_900_000, units: 0.00044444, capital: 723_732, tp1: 1_650_900_000, tp2: 1_673_400_000, tp3: 1_695_900_000, status: 'win', result: 18_450 },
  { id: 'TR-022', date: '2026-11-08', entry: 1_671_500_000, stop: 1_648_500_000, units: 0.00043478, capital: 726_735, tp1: 1_694_500_000, tp2: 1_717_500_000, tp3: 1_740_500_000, status: 'lose', result: -10_000 },
  { id: 'TR-021', date: '2026-11-05', entry: 1_612_000_000, stop: 1_587_000_000, units: 0.0004, capital: 644_800, tp1: 1_637_000_000, tp2: 1_662_000_000, tp3: 1_687_000_000, status: 'win', result: 24_200 },
]

const money = (n, decimals = 0) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(Number(n) || 0)
const formatDate = (date) => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('stack_token'))
  const [trades, setTrades] = useState([])
  const [settings, setSettings] = useState({ capital: 1_000_000, risk: 10_000 })
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(error => console.error('PWA service worker registration failed:', error))
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([fetch('/api/trades', { headers }), fetch('/api/settings', { headers })])
      .then(async ([t, s]) => {
        if (t.status === 401 || s.status === 401) throw new Error('session')
        if (t.ok) setTrades(await t.json())
        if (s.ok) setSettings(await s.json())
      }).catch(() => {})
  }, [token])

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status !== 'running')
    const wins = trades.filter(t => t.status === 'win').length
    const pnl = trades.reduce((sum, t) => sum + (Number(t.result) || 0), 0)
    return { total: trades.length, running: trades.filter(t => t.status === 'running').length, wins, losses: trades.filter(t => t.status === 'lose').length, winrate: closed.length ? Math.round(wins / closed.length * 100) : 0, pnl }
  }, [trades])

  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  const authFetch = async (path, options = {}) => {
    if (!token) return null
    return fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } })
  }
  const saveSettings = async (next) => {
    setSettings(next)
    const response = await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify(next) })
    if (response && !response.ok) notify('Pengaturan gagal disimpan ke server')
    else notify('Pengaturan berhasil diperbarui')
    setModal(null)
  }
  const saveTrade = async (trade) => {
    const response = await authFetch('/api/trades', { method: 'POST', body: JSON.stringify(trade) })
    if (response?.ok) { const saved = await response.json(); setTrades(current => [saved, ...current]) }
    else if (response) { const data = await response.json(); notify(data.error || 'Trade gagal disimpan'); return }
    setModal(null)
    notify(response ? 'Setup trading ditambahkan ke jurnal' : 'Server belum terhubung')
  }
  const updateTrade = async (trade) => {
    const response = await authFetch(`/api/trades/${trade.id}`, { method: 'PUT', body: JSON.stringify(trade) })
    if (response && !response.ok) { const data = await response.json(); notify(data.error || 'Perubahan gagal disimpan'); return }
    if (response) trade = await response.json()
    setTrades(current => current.map(item => item.id === trade.id ? trade : item))
    setModal(null)
    notify('Jurnal trading berhasil diperbarui')
  }
  const deleteTrade = async (trade) => {
    const response = await authFetch(`/api/trades/${encodeURIComponent(trade.id)}`, { method: 'DELETE' })
    if (response && !response.ok) {
      const data = await response.json().catch(() => ({}))
      notify(data.error || 'Trade gagal dihapus')
      return
    }
    setTrades(current => current.filter(item => item.id !== trade.id))
    setModal(null)
    notify('Trade berhasil dihapus')
  }
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); localStorage.removeItem('stack_token'); setToken(null) }

  if (!token) return <Login onLogin={(value) => { localStorage.setItem('stack_token', value); setToken(value) }} />

  const shownTrades = trades.filter(t => (filter === 'all' || t.status === filter) && `${t.id} ${t.date}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Bitcoin size={22} strokeWidth={2.3} /></div><span>stack<span className="brand-period">.</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="workspace-switch"><div className="workspace-avatar">R</div><span><b>Personal desk</b><small>Private workspace</small></span><ChevronDown size={15} /></button>
      <div className="nav-label">MENU</div>
      <nav className="main-nav"><button className="nav-item active"><LayoutDashboard size={17} /><span>Overview</span><span className="nav-active-mark" /></button><button className="nav-item" onClick={() => document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth' })}><Activity size={17} /><span>Trading journal</span><span className="nav-count">{trades.length}</span></button></nav>
      <div className="sidebar-bottom"><div className="risk-card"><div className="risk-card-top"><div className="risk-icon"><Shield size={15} /></div><span>RISK PER TRADE</span><MoreHorizontal size={17} /></div><div className="risk-value">Rp {money(settings.risk)}</div><div className="risk-caption"><span className="risk-dot" /> Fixed risk budget</div><div className="risk-progress"><i /></div><button className="risk-edit" onClick={() => setModal({ type: 'settings' })}><Settings2 size={13} /> Edit risk settings <span>→</span></button></div><button className="sidebar-link"><CircleHelp size={16} /> Help & support</button><button className="profile" onClick={logout}><div className="profile-avatar">R</div><span><b>Refdinal</b><small>Personal account</small></span><LogOut size={15} /></button></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Tutup menu" />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Command size={18} /></button><div className="breadcrumb">Workspace <span>/</span> <b>Overview</b></div><div className="topbar-right"><div className="market-status"><i /> Market tracker <span>MANUAL</span></div><div className="topbar-divider" /><button className="date-chip"><CalendarDays size={15} /> {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</button><button className="top-avatar">R</button></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR TRADING DESK</div><h1>Good morning, Refdinal <span className="wave">✳</span></h1><p className="welcome-sub">A clear view of your BTC trading performance.</p></div><div className="welcome-actions"><button className="button-secondary" onClick={() => setModal({ type: 'settings' })}><SlidersHorizontal size={15} /> Settings</button><button className="button-primary" onClick={() => setModal({ type: 'new' })}><Plus size={17} strokeWidth={2.5} /> New trade</button></div></section>
        <section className="stats-grid"><StatCard label="TOTAL TRADES" value={stats.total} icon={<Activity size={17} />} detail={<><span className="positive"><ArrowUpRight size={13} /> {stats.total ? 'Journal updated' : 'Start tracking'}</span><span className="detail-muted"> · all time</span></>} accent="mint" /><StatCard label="RUNNING" value={stats.running} icon={<Clock3 size={17} />} detail={<><span className="detail-muted">Open positions</span><span className="live-dot" /></>} accent="blue" /><StatCard label="WIN / LOSE" value={<><span className="win-number">{stats.wins}</span><span className="stat-slash"> / </span><span className="lose-number">{stats.losses}</span></>} icon={<Target size={17} />} detail={<><span className="tiny-legend"><i className="legend-win" /> Win</span><span className="tiny-legend"><i className="legend-lose" /> Lose</span></>} accent="purple" /><StatCard label="WIN RATE" value={<>{stats.winrate}<span className="percent">%</span></>} icon={<TrendingUp size={17} />} detail={<><span className="detail-muted">Based on closed trades</span></>} accent="orange" />
        </section>
        <section className="overview-grid"><div className="panel balance-panel"><div className="panel-heading"><div><div className="panel-kicker">PORTFOLIO OVERVIEW</div><h2>Trading capital</h2></div><button className="icon-button panel-more" onClick={() => setModal({ type: 'settings' })}><MoreHorizontal size={20} /></button></div><div className="balance-main"><div><div className="balance-label">TOTAL ALLOCATION</div><div className="balance-amount">Rp {money(settings.capital)}</div></div><div className="balance-change"><span className={stats.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>{stats.pnl >= 0 ? '+' : ''}Rp {money(stats.pnl)}</span><small>realized P/L</small></div></div><div className="allocation-bar"><span style={{ width: `${settings.capital ? Math.min(100, Math.max(8, stats.running * 12)) : 0}%` }} /></div><div className="allocation-legend"><span><i className="legend-capital" /> Allocated capital <b>Rp {money(settings.capital)}</b></span><span><i className="legend-risk" /> Risk budget <b>Rp {money(settings.risk)}</b></span></div><div className="balance-footer"><span><Wallet size={14} /> Capital per setup</span><b>Rp {money(settings.capital)}</b><button onClick={() => setModal({ type: 'settings' })}>Adjust <ArrowUpRight size={13} /></button></div></div>
          <div className="panel setup-panel"><div className="panel-heading"><div><div className="panel-kicker">QUICK REFERENCE</div><h2>Daily setup</h2></div><div className="setup-icon"><Target size={17} /></div></div><div className="setup-table"><div className="setup-row"><span>Risk / trade</span><b>Rp {money(settings.risk)}</b></div><div className="setup-row"><span>Position size</span><b className="mono">{trades[0] ? `${money(trades[0].units, 8)} BTC` : '— BTC'}</b></div><div className="setup-row"><span>Active setup</span><b className="setup-active"><i /> {stats.running} position{stats.running === 1 ? '' : 's'}</b></div></div><button className="setup-cta" onClick={() => setModal({ type: 'new' })}>Calculate a new setup <span>→</span></button></div></section>
        <section className="journal-section" id="journal"><div className="journal-heading"><div><div className="panel-kicker">YOUR ACTIVITY</div><h2>Trading journal <span className="journal-count">{trades.length}</span></h2></div><button className="export-button" onClick={() => { const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'stack-trading-journal.json'; link.click(); URL.revokeObjectURL(link.href); notify('Jurnal berhasil diekspor') }}><Download size={15} /> Export</button></div>
          <div className="journal-toolbar"><div className="filter-tabs">{[['all', 'All trades'], ['running', 'Running'], ['win', 'Win'], ['lose', 'Lose']].map(([key, label]) => <button key={key} className={filter === key ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter(key)}>{label}{key === 'all' && <span>{trades.length}</span>}</button>)}</div><div className="journal-tools"><label className="search-box"><Search size={15} /><input placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd></label><button className="icon-button table-filter" onClick={() => setModal({ type: 'settings' })}><SlidersHorizontal size={16} /></button></div></div>
          <div className="table-wrap"><table><thead><tr><th>TRADE ID</th><th>DATE</th><th>ENTRY PRICE</th><th>STOP LOSS</th><th>SIZE <small>BTC</small></th><th>CAPITAL</th><th>TAKE PROFIT</th><th>RESULT</th><th>STATUS</th><th /></tr></thead><tbody>{shownTrades.map(trade => <tr key={trade.id} onClick={() => setModal({ type: 'edit', trade })}><td><span className="trade-id">{trade.id}</span></td><td className="date-cell">{formatDate(trade.date)}</td><td className="price-cell">Rp {money(trade.entry)}</td><td className="price-cell muted-price">Rp {money(trade.stop)}</td><td className="unit-cell">{money(trade.units, 8)}</td><td className="price-cell">Rp {money(trade.capital)}</td><td className="tp-cell">Rp {money(trade.tp1)}</td><td className={Number(trade.result) < 0 ? 'result-negative' : Number(trade.result) > 0 ? 'result-positive' : 'result-empty'}>{trade.result == null ? '—' : `${Number(trade.result) > 0 ? '+' : ''}Rp ${money(trade.result)}`}</td><td><Status status={trade.status} /></td><td><button className="row-more" onClick={e => { e.stopPropagation(); setModal({ type: 'edit', trade }) }}><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table>{shownTrades.length === 0 && <div className="empty-state"><div className="empty-icon"><Activity size={22} /></div><b>{trades.length ? 'Tidak ada trade yang cocok' : 'Jurnal masih kosong'}</b><span>Tambahkan setup trading pertama Anda untuk memulai.</span><button className="button-primary" onClick={() => setModal({ type: 'new' })}><Plus size={15} /> New trade</button></div>}</div>
          <div className="table-footer"><span>Showing <b>{shownTrades.length ? 1 : 0}–{shownTrades.length}</b> of <b>{trades.length}</b> trades</span><div className="pagination"><button disabled>←</button><button className="page-active">1</button><button disabled>→</button></div></div>
        </section>
        <footer className="page-footer"><span>© 2026 Stack Trading Journal</span><span><i /> Data stays private to your workspace</span><span>Built for discipline <b>✳</b></span></footer>
      </div>
    </main>
    {modal && <TradeModal modal={modal} settings={settings} onClose={() => setModal(null)} onSaveSettings={saveSettings} onSaveTrade={saveTrade} onUpdateTrade={updateTrade} onDeleteTrade={deleteTrade} />}
    {notice && <div className="toast"><span><Check size={14} /></span>{notice}</div>}
  </div>
}

function StatCard({ label, value, icon, detail, accent }) {
  return <div className="stat-card"><div className="stat-top"><span className="stat-label">{label}</span><span className={`stat-icon ${accent}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>
}

function Status({ status }) {
  const labels = { running: 'Running', win: 'Win', lose: 'Lose' }
  return <span className={`status-badge ${status}`}><i />{labels[status]}</span>
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Login gagal')
      onLogin(data.accessToken)
    } catch (e) { setError(e.message === 'Failed to fetch' ? 'Server belum terhubung. Periksa konfigurasi backend.' : e.message) }
    finally { setBusy(false) }
  }
  return <div className="login-screen"><div className="login-glow" /><div className="login-card"><div className="brand login-brand"><div className="brand-mark"><Bitcoin size={22} /></div><span>stack<span className="brand-period">.</span></span></div><div className="login-eyebrow"><span /> PRIVATE TRADING DESK</div><h1>Your edge,<br />in focus.</h1><p>Masuk untuk melihat jurnal dan performa trading BTC Anda.</p><form onSubmit={submit}><label>USERNAME<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required /></label><label>PASSWORD<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required /></label>{error && <div className="login-error">{error}</div>}<button className="button-primary login-button" disabled={busy}>{busy ? 'Menghubungkan…' : 'Masuk ke workspace'} <span>→</span></button></form><div className="login-private"><Shield size={14} /> Workspace privat · hanya untuk Anda</div></div><div className="login-foot">STACK <span>·</span> BTC TRADING JOURNAL</div></div>
}

function TradeModal({ modal, settings, onClose, onSaveSettings, onSaveTrade, onUpdateTrade, onDeleteTrade }) {
  const isSettings = modal.type === 'settings'
  const isEdit = modal.type === 'edit'
  const oldTrade = modal.trade || {}
  const [form, setForm] = useState(isSettings ? settings : { date: oldTrade.date || new Date().toISOString().slice(0, 10), entry: oldTrade.entry || '', stop: oldTrade.stop || '', status: oldTrade.status || 'running', result: oldTrade.result == null ? '' : Math.abs(oldTrade.result) })
  const [saving, setSaving] = useState(false)
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const entry = Number(form.entry) || 0
  const stop = Number(form.stop) || 0
  const risk = Number(settings.risk) || 0
  const units = entry > stop && risk ? Number((risk / (entry - stop)).toFixed(8)) : 0
  const capital = Number((entry * units).toFixed(0))
  const valid = units > 0 && capital <= Number(settings.capital)
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    if (isSettings) await onSaveSettings({ capital: Number(form.capital), risk: Number(form.risk) })
    else if (isEdit) await onUpdateTrade({ ...oldTrade, status: form.status, result: form.result === '' ? null : Number(form.result) * (form.status === 'lose' ? -1 : 1) })
    else await onSaveTrade({ date: form.date, entry, stop, units, capital, tp1: Number(((capital + risk) / units).toFixed(0)), tp2: Number(((capital + risk * 2) / units).toFixed(0)), tp3: Number(((capital + risk * 3) / units).toFixed(0)), status: 'running', result: null })
    setSaving(false)
  }
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal-card"><div className="modal-heading"><div><div className="panel-kicker">{isSettings ? 'WORKSPACE PREFERENCES' : isEdit ? 'TRADING JOURNAL' : 'NEW POSITION'}</div><h2>{isSettings ? 'Trading settings' : isEdit ? `Edit ${oldTrade.id}` : 'Build a setup'}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
    {isSettings ? <form onSubmit={submit} className="modal-form"><p className="modal-description">Set your personal trading capital and maximum risk per setup.</p><Field label="TRADING CAPITAL · IDR" value={form.capital} onChange={v => update('capital', v)} placeholder="1000000" /><Field label="RISK BUDGET · IDR" value={form.risk} onChange={v => update('risk', v)} placeholder="10000" /><div className="modal-note"><Shield size={15} /> Risk is used to calculate position size and take-profit levels.</div><div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>Save settings <Check size={15} /></button></div></form> : isEdit ? <form onSubmit={submit} className="modal-form"><p className="modal-description">Perbarui status dan hasil trade. Semua angka hasil dalam rupiah.</p><div className="trade-summary"><span>{formatDate(oldTrade.date)}</span><b>Entry Rp {money(oldTrade.entry)}</b><span>Size {money(oldTrade.units, 8)} BTC</span></div><label className="field-label">STATUS JURNAL<select value={form.status} onChange={e => update('status', e.target.value)}><option value="running">Running</option><option value="win">Win</option><option value="lose">Lose</option></select></label>{form.status !== 'running' && <Field label={form.status === 'win' ? 'PROFIT · IDR' : 'LOSS · IDR (INPUT POSITIF)'} value={form.result} onChange={v => update('result', v)} placeholder="10000" />}<div className="modal-actions modal-actions-split"><button type="button" className="button-danger" onClick={() => { if (window.confirm(`Hapus trade ${oldTrade.id}? Tindakan ini tidak dapat dibatalkan.`)) onDeleteTrade(oldTrade) }}><Trash2 size={14} /> Hapus trade</button><div><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving || (form.status !== 'running' && form.result === '')}>Save changes <Check size={15} /></button></div></div></form> : <form onSubmit={submit} className="modal-form"><p className="modal-description">Masukkan level entry dan stop loss untuk menghitung ukuran posisi otomatis.</p><Field label="TANGGAL TRADE" type="date" value={form.date} onChange={v => update('date', v)} /><Field label="ENTRY PRICE · IDR" value={form.entry} onChange={v => update('entry', v)} placeholder="1654200000" /><Field label="STOP LOSS · IDR" value={form.stop} onChange={v => update('stop', v)} placeholder="1631800000" />
      <div className="calc-box"><div className="calc-heading"><span><Activity size={14} /> CALCULATED SETUP</span>{entry > stop && <span className={valid ? 'valid-label' : 'invalid-label'}><i /> {valid ? 'VALID SETUP' : 'CAPITAL EXCEEDED'}</span>}</div><div className="calc-grid"><div><small>POSITION SIZE</small><b>{money(units, 8)} <i>BTC</i></b></div><div><small>ENTRY CAPITAL</small><b className={entry > stop && !valid ? 'invalid-value' : ''}>Rp {money(capital)}</b></div></div><div className="calc-tps"><span>TAKE PROFIT LEVELS</span><div><b>TP 1 <i>Rp {money(units ? (capital + risk) / units : 0)}</i></b><b>TP 2 <i>Rp {money(units ? (capital + risk * 2) / units : 0)}</i></b><b>TP 3 <i>Rp {money(units ? (capital + risk * 3) / units : 0)}</i></b></div></div></div><div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving || !valid || !form.date}>Add to journal <ArrowUpRight size={15} /></button></div></form>}</div></div>
}

function Field({ label, value, onChange, placeholder, type = 'number' }) {
  return <label className="field-label">{label}<input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} required min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} /></label>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
