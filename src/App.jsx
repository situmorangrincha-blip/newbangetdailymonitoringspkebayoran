import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio, sfx } from './lib/audio.js';
import { derive, timeInfo } from './lib/calc.js';
import { DEFAULT_ROSTER } from './lib/parse.js';
import { NAMES, OWNER, TEAM_LABEL, clearAuth, loadTeams, probe, saveTeam, setAuth } from './lib/store.js';
import Stage from './components/Stage.jsx';
import Scene3D from './components/Scene3D.jsx';
import UploadModal from './components/UploadModal.jsx';
import StoreModal from './components/StoreModal.jsx';
import { Pass, ViewPick, Who } from './components/Gate.jsx';
import { Panel, Seg } from './components/ui.jsx';
import Performance from './pages/Performance.jsx';
import Focus from './pages/Focus.jsx';
import Stores from './pages/Stores.jsx';
import Pareto from './pages/Pareto.jsx';
import Salesman from './pages/Salesman.jsx';
import Charts from './pages/Charts.jsx';
import Home from './pages/Home.jsx';
import Dap, { defaultDapDate } from './pages/Dap.jsx';

const PAGES = [
  { id: 'home', label: 'BERANDA', part: 'Panggung' },
  { id: 'perf', label: 'PERFORMA', part: 'Kepala' },
  { id: 'focus', label: 'FOKUS', part: 'Senjata' },
  { id: 'stores', label: 'TOKO', part: 'Dada' },
  { id: 'pareto', label: 'PARETO & CA', part: 'Tangan' },
  { id: 'sales', label: 'SALESMAN', part: 'Kaki' },
  { id: 'chart', label: 'GRAFIK', part: 'Mata' },
  { id: 'dap', label: 'DAP', part: 'Misi' },
];
const SHOT = { home: 'med', dap: 'dap' };
const loadJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };

const Logo = () => (
  <svg viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
    <rect width="8" height="8" fill="#2a1450" />
    <rect x="1" y="1" width="6" height="1" fill="#ffb7d5" />
    <rect x="1" y="3" width="2" height="4" fill="#ffd23f" />
    <rect x="4" y="4" width="1" height="3" fill="#ff7eb6" />
    <rect x="6" y="2" width="1" height="5" fill="#ffb7d5" />
  </svg>
);

const fmtUp = (iso) => {
  try {
    return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function App() {
  const [phase, setPhase] = useState('probe'); // probe | who | pass | view | loading | ready | error
  const [storeMode, setStoreMode] = useState('cloud');
  const [info, setInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState(null); // arjuna | bima | both
  const [teamSel, setTeamSel] = useState('arjuna');
  const [sets, setSets] = useState({ arjuna: null, bima: null });
  const [bootErr, setBootErr] = useState('');
  const [page, setPage] = useState('home');
  const [subs, setSubs] = useState({ focus: 'principal', pareto: 'pj', chart: 'perf' });
  const [cmpDim, setCmpDim] = useState('sales');
  const [dapDay, setDapDay] = useState(null);
  const [holMap, setHolMap] = useState(() => loadJson('tq_hol', {}));
  const [roster, setRosterState] = useState(() => loadJson('tq_roster', DEFAULT_ROSTER));
  const [mode, setMode] = useState('milestone');
  const [sal, setSal] = useState('ALL');
  const [up, setUp] = useState(false);
  const [store, setStore] = useState(null);
  const [aud, setAud] = useState(audio.get());
  const [snapping, setSnapping] = useState(false);
  const [snapWy, setSnapWy] = useState(false);
  const [snapBg, setSnapBg] = useState(null);
  const [toast, setToast] = useState('');
  const [timeOv, setTimeOvState] = useState(() => { try { return JSON.parse(localStorage.getItem('tq_time') || 'null'); } catch { return null; } });
  const prev = useRef({ page: 'home' });
  const scene = useRef(null);

  const setTimeOv = (v) => { setTimeOvState(v); if (v) localStorage.setItem('tq_time', JSON.stringify(v)); else localStorage.removeItem('tq_time'); };
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 3200); };

  useEffect(() => {
    probe().then((r) => { setStoreMode(r.mode); setInfo(r.info); setPhase('who'); });
  }, []);

  const team = view === 'both' ? teamSel : view || 'arjuna';
  const ready = phase === 'ready';
  const data = ready ? sets[team] : null;
  const time = useMemo(() => (data ? timeInfo(data.meta.period, timeOv) : null), [data, timeOv]);
  const effMode = (d) => (mode === 'bti' && !d.meta.hasBti ? 'milestone' : mode);
  const D = useMemo(() => (data ? derive(data, effMode(data), time) : null), [data, mode, time]); // eslint-disable-line
  const holKey = time ? `${time.y}-${time.m}` : '';
  const holidays = holMap[holKey] || [];
  const setHolidays = (arr) => { const m = { ...holMap, [holKey]: arr }; setHolMap(m); localStorage.setItem('tq_hol', JSON.stringify(m)); };
  const setRoster = (r) => { setRosterState(r); localStorage.setItem('tq_roster', JSON.stringify(r)); };
  const autoTime = useMemo(() => (data ? timeInfo(data.meta.period, null) : { auto: 0, total: 27 }), [data]);
  const both = useMemo(() => {
    if (!(ready && view === 'both' && sets.arjuna && sets.bima)) return null;
    return ['arjuna', 'bima'].map((t) => ({ team: t, label: 'Tim ' + TEAM_LABEL[t], D: derive(sets[t], effMode(sets[t]), timeInfo(sets[t].meta.period, timeOv)) }));
  }, [ready, view, sets, mode, timeOv]); // eslint-disable-line

  useEffect(() => { prev.current = { page }; });
  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  // sfx otomatis untuk semua klik; override dengan data-sfx="nav|pick|back|none"
  const onClick = (e) => {
    const el = e.target.closest?.('[data-sfx],button,.clickable,.drop,label');
    if (!el) return;
    const t = el.getAttribute('data-sfx') || 'click';
    if (t !== 'none' && sfx[t]) sfx[t]();
  };

  const toggleSfx = () => { audio.setSfx(!aud.sfx); setAud(audio.get()); };
  const toggleBgm = () => { audio.setBgm(!aud.bgm); setAud(audio.get()); };

  // ---- alur masuk ----
  const pickUser = (u) => { setUser(u); setPhase('pass'); };
  const passOk = (pw) => { setAuth({ user, pass: pw }); setPhase('view'); };
  async function pickView(v) {
    setAuth({ view: v });
    setView(v);
    setTeamSel(OWNER[user]);
    setSal('ALL');
    setPage('home');
    setPhase('loading');
    try {
      const r = await loadTeams(storeMode, v);
      setSets({ arjuna: r.arjuna || null, bima: r.bima || null });
      setPhase('ready');
    } catch (e) {
      setBootErr(e?.message || 'Gagal memuat data');
      setPhase('error');
    }
  }
  const logout = () => { clearAuth(); setUser(null); setView(null); setSets({ arjuna: null, bima: null }); setPhase('who'); };
  const switchTeam = (t) => { setTeamSel(t); setSal('ALL'); setSubs({ focus: 'principal', pareto: 'pj', chart: 'perf' }); setDapDay(null); };

  async function saveFocus(cats) {
    const d = { ...data, settings: { ...(data.settings || {}), focusCats: cats } };
    setSets({ ...sets, [team]: d });
    try { await saveTeam(storeMode, team, d); sfx.ok(); say('Kategori fokus disimpan'); } catch (e) { sfx.err(); say('Gagal simpan: ' + (e?.message || e)); }
  }

  // lompat dari pencarian / tombol cepat
  const go = (g) => {
    if (g.store) { setStore(g.store); return; }
    if (g.page === 'dap' && time) {
      const base = defaultDapDate(time);
      const last = new Date(time.y, time.m, 0).getDate();
      let d = base;
      if (g.wd) {
        d = 0;
        for (let x = base; x <= last; x++) if (new Date(time.y, time.m - 1, x).getDay() === g.wd) { d = x; break; }
        if (!d) for (let x = 1; x <= last; x++) if (new Date(time.y, time.m - 1, x).getDay() === g.wd) { d = x; break; }
      }
      setDapDay(d || base);
    }
    if (g.sal) setSal(g.sal);
    if (g.sub) setSubs((o) => ({ ...o, [g.page]: g.sub }));
    if (g.dim) setCmpDim(g.dim);
    setPage(g.page);
  };

  const canSnap = page === 'perf' || page === 'chart';
  async function snap() {
    if (!canSnap) return;
    if (snapWy) setSnapBg(scene.current?.snapshot(team) || null);
    setSnapping(true);
    sfx.snap();
    try {
      await new Promise((r) => setTimeout(r, 550));
      const { toPng } = await import('html-to-image');
      const el = document.getElementById('snap-out');
      const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, filter: (n) => !(n.dataset && 'nosnap' in n.dataset) });
      const blob = await (await fetch(dataUrl)).blob();
      const name = `${page === 'chart' ? 'grafik' : 'performance'}-${team}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Performance' }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = dataUrl; a.download = name; a.click();
      }
      sfx.ok();
      say('Screenshot tersimpan');
    } catch (e) {
      sfx.err();
      say('Gagal bikin gambar: ' + (e?.message || e));
    }
    setSnapping(false);
    setSnapBg(null);
  }

  const idx = PAGES.findIndex((p) => p.id === page);
  const pidx = PAGES.findIndex((p) => p.id === prev.current.page);
  const pageChanged = pidx !== idx;
  const key = `${team}|${page}|${subs[page] || ''}|${sal}|${mode}`;
  const setSub = (v) => setSubs({ ...subs, [page]: v });

  let body = null;
  if (D) {
    const common = { D, data, time };
    body = {
      home: <Home {...common} user={NAMES[user]} team={team} sal={sal} setSal={setSal} onGo={go} mode={mode} />,
      perf: <Performance {...common} mode={mode} setMode={setMode} snapping={snapping} snapBg={snapBg} both={both} />,
      focus: <Focus {...common} mode={mode} sub={subs.focus} setSub={setSub} sal={sal} setSal={setSal} onSaveFocus={saveFocus} holidays={holidays} />,
      stores: <Stores data={data} time={time} sal={sal} setSal={setSal} onStore={setStore} />,
      pareto: <Pareto {...common} sub={subs.pareto} setSub={setSub} sal={sal} setSal={setSal} onStore={setStore} />,
      sales: <Salesman {...common} sal={sal} setSal={setSal} onStore={setStore} />,
      chart: <Charts {...common} mode={mode} setMode={setMode} sub={subs.chart} setSub={setSub} sal={sal} setSal={setSal} snapping={snapping} snapBg={snapBg} cmpDim={cmpDim} setCmpDim={setCmpDim} />,
      dap: <Dap data={data} time={time} day={dapDay ?? defaultDapDate(time)} setDay={setDapDay} holidays={holidays} setHolidays={setHolidays} />,
    }[page];
  }

  // fokus kamera 3D
  const gate = phase === 'probe' || phase === 'who';
  const sceneChar = gate ? 'both' : ready ? team : OWNER[user] || 'both';
  const sceneShot = gate ? 'wide' : ready ? SHOT[page] || page : 'med';

  const canTeams = view === 'both' ? ['arjuna', 'bima'] : [OWNER[user]];

  const shell = (inner) => (
    <>
      <Scene3D ref={scene} char={sceneChar} shot={sceneShot} />
      <div className="app" onClickCapture={onClick} onPointerDownCapture={audio.unlock}>{inner}</div>
    </>
  );

  if (phase === 'probe') return shell(<div className="gate"><Panel title="LOADING..."><div className="empty"><h2>MEMUAT</h2></div></Panel></div>);
  if (phase === 'who') return shell(<Who onPick={pickUser} info={storeMode === 'cloud' ? info : null} />);
  if (phase === 'pass') return shell(<Pass user={user} mode={storeMode} onOk={passOk} onBack={() => setPhase('who')} />);
  if (phase === 'view') return shell(<ViewPick user={user} onPick={pickView} onBack={logout} />);
  if (phase === 'loading') return shell(<div className="gate"><Panel title="LOADING..."><div className="empty"><h2>MEMUAT DATA</h2></div></Panel></div>);
  if (phase === 'error') return shell(<div className="gate"><Panel title="ERROR"><div className="empty"><h2>GAGAL MEMUAT</h2><p>{bootErr}</p><div className="row" style={{ justifyContent: 'center' }}><button className="btn coin" onClick={() => pickView(view)}>Coba lagi</button><button className="btn" onClick={logout}>Keluar</button></div></div></Panel></div>);

  return shell(
    <>
      <header className="top">
        <div className="logo">
          <Logo />
          <div>
            <b>TARGET QUEST</b>
            <small>{NAMES[user]} · {view === 'both' ? 'Arjuna + Bima' : 'Tim ' + TEAM_LABEL[team]}{data?.meta.region ? ' · ' + data.meta.region : ''}</small>
          </div>
        </div>
        {view === 'both' && (
          <Seg value={team} onChange={switchTeam} options={[{ v: 'arjuna', label: 'Arjuna' }, { v: 'bima', label: 'Bima' }]} />
        )}
        {data && <span className="chip dim" title="Waktu upload terakhir">update {fmtUp(data.meta.uploadedAt)}</span>}
        <button className="btn sm" data-sfx="none" onClick={toggleSfx}><span className={'dot' + (aud.sfx ? ' on' : '')} />SFX {aud.sfx ? 'ON' : 'OFF'}</button>
        <button className="btn sm" data-sfx="none" onClick={toggleBgm}><span className={'dot' + (aud.bgm ? ' on' : '')} />BGM {aud.bgm ? 'ON' : 'OFF'}</button>
        {data && canSnap && <button className={'btn sm tog' + (snapWy ? ' on' : '')} title="Sertakan latar tokoh 3D di hasil screenshot" onClick={() => setSnapWy(!snapWy)}>+ TOKOH</button>}
        {data && canSnap && <button className="btn sm" data-sfx="none" onClick={snap}>SNAP PNG</button>}
        <button className="btn coin sm" onClick={() => setUp(true)}>UPLOAD</button>
        <button className="btn sm" data-sfx="back" onClick={logout}>KELUAR</button>
      </header>

      <nav className="nav n8" aria-label="Halaman">
        {PAGES.map((p) => (
          <button key={p.id} data-sfx="nav" className={'btn' + (p.id === page ? ' on' : '')} aria-current={p.id === page ? 'page' : undefined} onClick={() => setPage(p.id)}>
            {p.label}
            <small>{p.part}</small>
          </button>
        ))}
      </nav>

      {!data ? (
        <Panel title="INSERT COIN">
          <div className="empty">
            <h2>BELUM ADA DATA TIM {TEAM_LABEL[team].toUpperCase()}</h2>
            <p className="mut">Upload file Excel monitoring untuk mulai.</p>
            <button className="btn coin" onClick={() => setUp(true)}>UPLOAD EXCEL</button>
          </div>
        </Panel>
      ) : (
        <div className="screen">
          <Stage k={key} kind={pageChanged ? 'swing' : 'flip'} dir={idx - pidx}>
            {body}
          </Stage>
        </div>
      )}

      <div className="foot">{data ? `${data.meta.fileName || 'data'} · hari kerja ${time.hk}/${time.total}${time.overridden ? ' (manual)' : ''} · angka dalam jutaan rupiah` : ''}</div>

      {up && (
        <UploadModal
          sets={sets} storeMode={storeMode} canTeams={canTeams} timeOv={timeOv} setTimeOv={setTimeOv} auto={autoTime} roster={roster} setRoster={setRoster}
          onClose={() => setUp(false)}
          onDone={(out) => { setSets(out); setUp(false); say('Data berhasil disimpan'); }}
        />
      )}
      {store && data && <StoreModal s={store} data={data} time={time} onClose={() => setStore(null)} />}
      {snapping && <div className="veil"><div className="modal"><Panel title="SNAP"><div className="empty"><h2>MEREKAM LAYAR...</h2></div></Panel></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
