import { useEffect, useMemo, useRef, useState } from 'react';
import { COMPARE_DIMS, SIZES, compareRows, focusCatsOf, fmt, pace, paceCls, weekdayName } from '../lib/calc.js';
import { HBars } from '../components/charts.jsx';
import { Panel, Seg, useSorted } from '../components/ui.jsx';
import SalFilter from '../components/SalFilter.jsx';
import { sfx } from '../lib/audio.js';

const SIZE_OPTS = [{ v: 'ALL', label: 'Semua' }, ...SIZES.map((s) => ({ v: s, label: s }))];
const DAY_OPTS = [{ v: 0, label: 'Semua' }, ...[1, 2, 3, 4, 5, 6].map((d) => ({ v: d, label: weekdayName(d) }))];
const PAR_OPTS = [{ v: 'ALL', label: 'Semua' }, { v: 'pj', label: 'Pareto JKS' }, { v: 'ps', label: 'Pareto SAK' }];
const CA_OPTS = [{ v: 'ALL', label: 'Semua' }, { v: 'ca', label: 'Sudah CA' }, { v: 'no', label: 'Belum CA' }];

const jt2 = (v) => fmt.jt(v, 2);
const METRICS = [
  { v: 'cur', label: 'ACT Okt', f: (r) => r.cur, show: (v) => jt2(v) },
  { v: 'lm', label: 'SEP', f: (r) => r.lm, show: (v) => jt2(v) },
  { v: 'l3m', label: 'L3M/bln', f: (r) => r.l3m, show: (v) => jt2(v) },
  { v: 'pLm', label: '% vs SEP', f: (r, tg) => pace(r.cur, r.lm, tg), show: (v) => fmt.pace(v), pct: true },
  { v: 'pL3', label: '% vs L3M', f: (r, tg) => pace(r.cur, r.l3m, tg), show: (v) => fmt.pace(v), pct: true },
  { v: 'bCur', label: 'Toko beli', f: (r) => r.bCur, show: (v) => fmt.int(v) },
  { v: 'n', label: 'Jumlah toko', f: (r) => r.n, show: (v) => (v == null ? '-' : fmt.int(v)), store: true },
  { v: 'ca', label: 'CA', f: (r) => r.ca, show: (v) => (v == null ? '-' : fmt.int(v)), store: true },
  { v: 'caPct', label: 'CA %', f: (r) => (r.n ? r.ca / r.n : null), show: (v) => (v == null ? '-' : fmt.pct(v, 0)), store: true },
  { v: 'caProd', label: 'CA Prod', f: (r) => r.caProd, show: (v) => (v == null ? '-' : fmt.int(v)), store: true },
  { v: 'tgt', label: 'Target DAP', f: (r) => (r.tgt > 0 ? r.tgt : null), show: (v) => (v == null ? '-' : jt2(v)), store: true },
  { v: 'acv', label: 'ACV vs DAP', f: (r) => (r.tgt > 0 ? r.cur / r.tgt : null), show: (v) => (v == null ? '-' : fmt.pct(v, 0)), store: true },
];
const DEF_METRICS = ['cur', 'lm', 'pLm', 'pL3', 'ca'];
const PRESET_KEY = 'tq_presets';
const loadPresets = () => { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]'); } catch { return []; } };

// indeks pencarian: tiap entri tahu halaman tujuannya
function buildIndex(data, time) {
  const E = [];
  const add = (label, hint, kw, go) => E.push({ label, hint, kw: (label + ' ' + hint + ' ' + kw).toLowerCase(), go });
  add('Sales performance', 'Performa · ACV vs target', 'performa performance sales ach acv target milestone bti gap timegone', { page: 'perf' });
  add('Salesman', 'Profil per salesman', 'salesman sales profil orang', { page: 'sales' });
  add('Fokus principal', 'Fokus → Principal', 'principal gen gppj mbr gbs rans flora', { page: 'focus', sub: 'principal' });
  add('Fokus kategori', 'Fokus → Kategori (sub brand)', 'kategori sub brand sku', { page: 'focus', sub: 'kategori' });
  add('Kategori fokus', 'Fokus → Kategori Fokus', 'kategori fokus focus', { page: 'focus', sub: 'fokus' });
  add('Ukuran toko', 'Fokus → Ukuran Toko (CC5)', 'ukuran small medium big superbig channel cc5', { page: 'focus', sub: 'ukuran' });
  add('Fokus per hari', 'Fokus → Per Hari Kunjungan', 'hari kunjungan rute per hari kontribusi senin selasa rabu kamis jumat sabtu', { page: 'focus', sub: 'hari' });
  add('Daftar toko', 'Toko · SKU per toko', 'toko outlet customer sku', { page: 'stores' });
  add('Pareto JKS', 'Pareto & CA → JKS', 'pareto jks 30', { page: 'pareto', sub: 'pj' });
  add('Pareto SAK', 'Pareto & CA → SAK', 'pareto sak 30', { page: 'pareto', sub: 'ps' });
  add('CA (Customer Active)', 'Pareto & CA → CA', 'ca customer active produktif belum ca', { page: 'pareto', sub: 'ca' });
  add('Grafik', 'Grafik · semua data', 'grafik chart diagram', { page: 'chart', sub: 'perf' });
  add('Bandingkan antar waktu', 'Grafik → Bandingkan', 'bandingkan banding compare growth sep l3m', { page: 'chart', sub: 'banding' });
  add('Tren harian', 'Grafik → Tren Harian', 'tren harian progres trend', { page: 'chart', sub: 'tren' });
  add('DAP hari ini', 'DAP · Daily Account Plan', 'dap daily account plan plan kunjungan pdf', { page: 'dap', today: true });
  for (let wd = 1; wd <= 6; wd++) add(`DAP ${weekdayName(wd)}`, 'DAP · tanggal terdekat', 'dap daily account plan ' + weekdayName(wd).toLowerCase(), { page: 'dap', wd });
  for (const s of data.salesmen) add(s, 'Salesman', 'salesman ' + s, { page: 'sales', sal: s });
  for (const p of data.principals) add(p, 'Principal · Fokus', 'principal ' + p, { page: 'focus', sub: 'principal' });
  for (const c of focusCatsOf(data)) add(c.name, 'Kategori Fokus', 'kategori fokus ' + c.kw.join(' '), { page: 'focus', sub: 'fokus' });
  for (const sz of SIZES) add(sz, 'Ukuran Toko', 'ukuran toko channel ' + sz, { page: 'focus', sub: 'ukuran' });
  const brands = [...new Set(data.subs.map((x) => x.b))];
  for (const b of brands) add(b, 'Brand · Bandingkan', 'brand ' + b, { page: 'chart', sub: 'banding', dim: 'brand' });
  for (const sb of data.subs) if (sb.n !== sb.b) add(sb.n, 'Kategori · Bandingkan', 'kategori sub brand ' + sb.n, { page: 'chart', sub: 'banding', dim: 'sub' });
  return E;
}

export default function Home({ data, time, D, user, team, sal, setSal, onGo, onStore, mode }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);

  const index = useMemo(() => buildIndex(data, time), [data, time]);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const toks = t.split(/\s+/);
    const out = index
      .filter((e) => toks.every((k) => e.kw.includes(k)))
      .map((e) => ({ e, sc: (e.label.toLowerCase().startsWith(t) ? 0 : e.label.toLowerCase().includes(t) ? 1 : 2) }))
      .sort((a, b) => a.sc - b.sc)
      .slice(0, 7)
      .map((x) => x.e);
    if (t.length >= 2) {
      const st = data.stores.filter((s) => s.name.toLowerCase().includes(t) || s.id.includes(t)).slice(0, 4);
      for (const s of st) out.push({ label: s.name, hint: `Toko · ${s.sales}`, go: { store: s } });
    }
    return out.slice(0, 10);
  }, [q, index, data]);

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    const f = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  const pick = (e) => {
    if (!e) return;
    sfx.nav();
    setOpen(false);
    setQ('');
    onGo(e.go);
  };

  // ---------- eksplorasi ----------
  const [dim, setDim] = useState('sales');
  const [metrics, setMetrics] = useState(DEF_METRICS);
  const [fSize, setFSize] = useState('ALL');
  const [fDay, setFDay] = useState(0);
  const [fPar, setFPar] = useState('ALL');
  const [fCa, setFCa] = useState('ALL');
  const [presets, setPresets] = useState(loadPresets);
  const [pname, setPname] = useState('');

  const filterFn = useMemo(() => {
    if (fSize === 'ALL' && !fDay && fPar === 'ALL' && fCa === 'ALL') return null;
    return (s) => {
      if (fSize !== 'ALL' && s.size !== fSize) return false;
      if (fDay && !s.hk.toUpperCase().includes(weekdayName(fDay).toUpperCase())) return false;
      if (fPar === 'pj' && !s.pj) return false;
      if (fPar === 'ps' && !s.ps) return false;
      if (fCa === 'ca' && s.act < 1) return false;
      if (fCa === 'no' && s.act >= 1) return false;
      return true;
    };
  }, [fSize, fDay, fPar, fCa]);

  const rows = useMemo(() => compareRows(data, dim, sal, filterFn), [data, dim, sal, filterFn]);
  const mdefs = METRICS.filter((m) => metrics.includes(m.v));
  const first = mdefs.find((m) => !m.pct) || mdefs[0];
  const tbl = useMemo(() => rows.map((r) => ({ ...r, ...Object.fromEntries(METRICS.map((m) => [m.v, m.f(r, time.tg)])) , label: r.label })), [rows, time.tg]);
  const { rows: sorted, th } = useSorted(tbl, first?.v || 'cur', -1);
  const isStoreDim = ['sales', 'pj', 'ps', 'size', 'hari'].includes(dim);

  const toggleM = (v) => setMetrics(metrics.includes(v) ? metrics.filter((x) => x !== v) : [...metrics, v]);
  const savePreset = () => {
    const name = pname.trim();
    if (!name) return;
    const p = [...presets.filter((x) => x.name !== name), { name, dim, metrics, fSize, fDay, fPar, fCa, sal }];
    setPresets(p);
    localStorage.setItem(PRESET_KEY, JSON.stringify(p));
    setPname('');
    sfx.ok();
  };
  const loadPreset = (p) => {
    setDim(p.dim); setMetrics(p.metrics); setFSize(p.fSize); setFDay(p.fDay); setFPar(p.fPar); setFCa(p.fCa);
    if (p.sal && (p.sal === 'ALL' || data.salesmen.includes(p.sal))) setSal(p.sal);
    sfx.pick();
  };
  const delPreset = (name) => {
    const p = presets.filter((x) => x.name !== name);
    setPresets(p);
    localStorage.setItem(PRESET_KEY, JSON.stringify(p));
  };

  return (
    <div className="grid">
      <Panel title={`HALO, ${String(user || '').toUpperCase()} · TIM ${String(data.meta.teamLabel || team).toUpperCase()}`} right={`data s/d ${time.asOf} · timegone ${fmt.pct(time.tg)}`}>
        <div className="search" ref={box}>
          <input
            className="input search-in"
            placeholder="Ketik apa yang mau dilihat: sales performance, pilus, hendra, pareto sak, DAP selasa..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % Math.max(1, hits.length)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((hi - 1 + hits.length) % Math.max(1, hits.length)); }
              else if (e.key === 'Enter') pick(hits[hi]);
              else if (e.key === 'Escape') setOpen(false);
            }}
            aria-label="Cari halaman atau indikator"
          />
          {open && hits.length > 0 && (
            <ul className="sugg" role="listbox">
              {hits.map((h, i) => (
                <li key={h.label + h.hint + i} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''} onMouseEnter={() => setHi(i)} onClick={() => pick(h)}>
                  <b>{h.label}</b><span>{h.hint}</span>
                </li>
              ))}
            </ul>
          )}
          {open && q.trim() && !hits.length && <div className="sugg none">Tidak ada yang cocok. Coba "performa", "pareto", "dap", nama salesman, atau nama brand.</div>}
        </div>
        <div className="chips">
          {[
            ['Sales performance', { page: 'perf' }],
            ['DAP hari ini', { page: 'dap', today: true }],
            ['Pareto SAK', { page: 'pareto', sub: 'ps' }],
            ['Kategori fokus', { page: 'focus', sub: 'fokus' }],
            ['Fokus per hari', { page: 'focus', sub: 'hari' }],
            ['Bandingkan', { page: 'chart', sub: 'banding' }],
          ].map(([l, g]) => <button key={l} className="btn sm" data-sfx="nav" onClick={() => onGo(g)}>{l}</button>)}
        </div>
        {D && (
          <div className="kpis k4" style={{ marginTop: 12 }}>
            <div className="kpi"><div className="l">Target {mode === 'bti' ? 'BTI' : 'Milestone'}</div><div className="v">{fmt.jt(D.total.tgt)}<small>jt</small></div><div className="s">{D.sales.length} salesman</div></div>
            <div className="kpi"><div className="l">Actual MTD</div><div className="v">{fmt.jt(D.total.act)}<small>jt</small></div><div className="s">{time.hk} dari {time.total} hari kerja</div></div>
            <div className="kpi hero"><div className="l">ACV</div><div className={'v ' + (D.total.acv >= time.tg ? 'ok' : D.total.acv >= time.tg * 0.8 ? 'mid' : 'low')}>{fmt.pct(D.total.acv)}</div><div className="s">timegone {fmt.pct(time.tg)}</div></div>
            <div className="kpi"><div className="l">CA</div><div className="v">{D.total.st.ca}<small>/ {D.total.st.n}</small></div><div className="s">{fmt.pct(D.total.st.caPct)} toko transaksi</div></div>
          </div>
        )}
      </Panel>

      <Panel title="EKSPLORASI · PILIH SENDIRI" right={`${sorted.length} baris`}>
        <div className="exp-row"><span className="mut lbl">Kelompokkan</span><Seg wrap value={dim} onChange={setDim} options={COMPARE_DIMS} /></div>
        <div className="exp-row"><span className="mut lbl">Salesman</span><SalFilter data={data} value={sal} onChange={setSal} /></div>
        <div className="exp-row"><span className="mut lbl">Indikator</span>
          <div className="chips">
            {METRICS.map((m) => {
              const dis = m.store && !isStoreDim;
              return (
                <button key={m.v} className={'btn sm tog' + (metrics.includes(m.v) && !dis ? ' on' : '')} disabled={dis} title={dis ? 'Hanya untuk kelompok berbasis toko' : ''} data-sfx="pick" onClick={() => toggleM(m.v)}>{m.label}</button>
              );
            })}
          </div>
        </div>
        <details>
          <summary style={{ cursor: 'pointer' }}>Filter toko {(fSize !== 'ALL' || fDay || fPar !== 'ALL' || fCa !== 'ALL') && <span className="tag y">AKTIF</span>}</summary>
          <div className="exp-row"><span className="mut lbl">Ukuran</span><Seg wrap value={fSize} onChange={setFSize} options={SIZE_OPTS} /></div>
          <div className="exp-row"><span className="mut lbl">Hari kunjungan</span><Seg wrap value={fDay} onChange={setFDay} options={DAY_OPTS} /></div>
          <div className="exp-row"><span className="mut lbl">Pareto</span><Seg wrap value={fPar} onChange={setFPar} options={PAR_OPTS} /></div>
          <div className="exp-row"><span className="mut lbl">Status CA</span><Seg wrap value={fCa} onChange={setFCa} options={CA_OPTS} /></div>
        </details>

        <div className="scroll" style={{ marginTop: 10 }}>
          <table className="t">
            <thead>
              <tr>
                {th('label', COMPARE_DIMS.find((d) => d.v === dim)?.label || 'Item', 'l')}
                {mdefs.filter((m) => !(m.store && !isStoreDim)).map((m) => th(m.v, m.label))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.label}>
                  <td className="nm">{r.label}</td>
                  {mdefs.filter((m) => !(m.store && !isStoreDim)).map((m) => (
                    <td key={m.v} className={m.pct ? paceCls(r[m.v]) : ''}>{m.show(r[m.v])}</td>
                  ))}
                </tr>
              ))}
              {!sorted.length && <tr><td colSpan={9} className="mut" style={{ textAlign: 'center', padding: 18 }}>Tidak ada data untuk pilihan ini</td></tr>}
            </tbody>
          </table>
        </div>
        {first && sorted.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="mut" style={{ marginBottom: 6 }}>{first.label} per {COMPARE_DIMS.find((d) => d.v === dim)?.label.toLowerCase()}</div>
            <HBars
              rows={sorted.slice(0, 12).map((r) => ({ label: r.label.length > 22 ? r.label.slice(0, 21) + '…' : r.label, v: Math.max(0, r[first.v] ?? 0), text: first.show(r[first.v]) }))}
              labelW={150}
            />
          </div>
        )}

        <div className="exp-row" style={{ marginTop: 14 }}>
          <span className="mut lbl">Preset</span>
          <input className="input" style={{ minWidth: 0, width: 190 }} placeholder="Nama preset" value={pname} onChange={(e) => setPname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && savePreset()} />
          <button className="btn sm" disabled={!pname.trim()} data-sfx="none" onClick={savePreset}>Simpan susunan ini</button>
        </div>
        {presets.length > 0 && (
          <div className="chips" style={{ marginTop: 6 }}>
            {presets.map((p) => (
              <span key={p.name} className="chip-x">
                <button className="btn sm" data-sfx="none" onClick={() => loadPreset(p)}>{p.name}</button>
                <button className="x" aria-label={'Hapus preset ' + p.name} data-sfx="back" onClick={() => delPreset(p.name)}>×</button>
              </span>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
