import { useRef, useState } from 'react';
import { fmt, makeSnapshot, mergeKeepHistory, periodKey, timeInfo, upsertHistory } from '../lib/calc.js';
import { TEAM_LABEL, saveTeam } from '../lib/store.js';
import { sfx } from '../lib/audio.js';
import { Panel } from './ui.jsx';

// Satu file Excel -> dataset Arjuna dan/atau Bima. Tiap tim disimpan terpisah.
export default function UploadModal({ sets, storeMode, canTeams, timeOv, setTimeOv, auto, roster, setRoster, onClose, onDone }) {
  const input = useRef(null);
  const lastFile = useRef(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [parsed, setParsed] = useState(null); // { arjuna, bima, warnings, fileName }
  const [pick, setPick] = useState({});
  const [keep, setKeep] = useState({});
  const [ov, setOv] = useState({ hk: timeOv?.hk ?? '', total: timeOv?.total ?? '' });
  const [rt, setRt] = useState({ arjuna: (roster?.arjuna || []).join(', '), bima: (roster?.bima || []).join(', ') });

  const readRoster = () => {
    const f = (t) => t.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    return { arjuna: f(rt.arjuna), bima: f(rt.bima) };
  };

  async function onFile(file) {
    if (!file) return;
    lastFile.current = file;
    setErr(''); setParsed(null);
    if (file.size > 80 * 1024 * 1024) {
      setErr(
        `File terlalu besar (${Math.round(file.size / 1048576)} MB), browser tidak sanggup membukanya. Biasanya ada sheet dengan sel kosong yang ke-format sampai ujung bawah (baris 1.048.576). ` +
        'Di Excel: buka sheet itu, klik baris tepat di bawah data terakhir, Ctrl+Shift+Panah Bawah, klik kanan nomor baris > Delete. Lakukan juga untuk kolom di kanan data, lalu Save. Ukuran file normal 3-5 MB.'
      );
      sfx.err();
      return;
    }
    setBusy('Membaca file Excel...');
    try {
      await new Promise((r) => setTimeout(r, 60));
      const [{ parseAll }, XLSX] = await Promise.all([import('../lib/parse.js'), import('xlsx')]);
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: false, cellStyles: false, sheetRows: 8000 });
      const ro = readRoster();
      setRoster?.(ro);
      const r = parseAll(wb, { fileName: file.name, roster: ro });
      setParsed({ ...r, fileName: file.name });
      const p = {}, k = {};
      for (const t of ['arjuna', 'bima']) {
        if (r[t]) {
          p[t] = canTeams.includes(t);
          k[t] = !sets[t] || periodKey(sets[t]) === periodKey(r[t]);
        }
      }
      setPick(p); setKeep(k);
      sfx.pick();
    } catch (e) {
      setErr(e.message || String(e));
      sfx.err();
    }
    setBusy('');
  }

  async function save() {
    setBusy('Menyimpan...'); setErr('');
    try {
      const hk = ov.hk === '' ? null : Number(ov.hk);
      const total = ov.total === '' ? null : Number(ov.total);
      const newOv = hk == null && total == null ? null : { hk: hk ?? undefined, total: total ?? undefined };
      const out = { ...sets };
      for (const t of ['arjuna', 'bima']) {
        if (!parsed[t] || !pick[t]) continue;
        const old = sets[t];
        const d0 = { ...parsed[t], meta: { ...parsed[t].meta, uploadedAt: new Date().toISOString() } };
        const sameMonth = !old || periodKey(old) === periodKey(d0);
        let d = old && keep[t] ? mergeKeepHistory(old, d0) : d0;
        const tm = timeInfo(d.meta.period, newOv);
        d = { ...d, settings: old?.settings || d.settings || {}, history: upsertHistory(sameMonth ? old?.history || [] : [], makeSnapshot(d, tm)) };
        await saveTeam(storeMode, t, d);
        out[t] = d;
      }
      setTimeOv(newOv);
      sfx.ok();
      onDone(out);
    } catch (e) {
      setErr(e.message || String(e));
      sfx.err();
      setBusy('');
    }
  }

  const teams = parsed ? ['arjuna', 'bima'].filter((t) => parsed[t]) : [];
  const anyPick = teams.some((t) => pick[t]);

  return (
    <div className="veil" onClick={onClose} data-sfx="back">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <Panel title="UPLOAD DATA EXCEL" right={<button className="btn sm" data-sfx="back" onClick={onClose}>Tutup</button>}>
          <div
            className={'drop' + (over ? ' over' : '')}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
          >
            <b>{busy || (parsed ? 'Ganti file' : 'Tarik file .xlsx ke sini, atau klik untuk pilih')}</b>
            <div className="mut" style={{ marginTop: 4 }}>Satu file untuk dua tim (sheet BIMA, KHUSUS IKTIAR, dan DAP ikut dibaca). Bulan berjalan diganti dari file ini.</div>
            <input ref={input} type="file" accept=".xlsx,.xlsm,.xls" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>

          {err && <div className="warn err">{err}</div>}
          {parsed?.warnings.map((w, i) => <div className="warn" key={i}>{w}</div>)}

          {teams.map((t) => {
            const d = parsed[t];
            const sumAct = Object.values(d.pAct).reduce((a, o) => a + (o.total || 0), 0);
            const ca = d.stores.filter((s) => s.act >= 1).length;
            const allowed = canTeams.includes(t);
            return (
              <div key={t} style={{ marginTop: 12 }}>
                <label className="row" style={{ cursor: allowed ? 'pointer' : 'not-allowed', opacity: allowed ? 1 : 0.5 }}>
                  <input type="checkbox" disabled={!allowed} checked={!!pick[t]} onChange={(e) => setPick({ ...pick, [t]: e.target.checked })} />
                  <b className="hero-title" style={{ fontSize: 18 }}>Tim {TEAM_LABEL[t]}</b>
                  {!allowed && <span className="mut">(tidak boleh disimpan dari akses ini)</span>}
                </label>
                <div className="mini" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', marginTop: 6 }}>
                  <div className="it"><div className="h">Periode</div><b>{d.meta.period?.label || '-'}</b></div>
                  <div className="it"><div className="h">Salesman</div><b>{d.salesmen.length}</b></div>
                  <div className="it"><div className="h">Toko (JKS)</div><b>{fmt.int(d.stores.length)}</b></div>
                  <div className="it"><div className="h">ACT total</div><b>{fmt.jt(sumAct)} jt</b></div>
                  <div className="it"><div className="h">Toko CA</div><b>{ca}</b></div>
                  <div className="it"><div className="h">Sub brand</div><b>{d.subs.length}</b></div>
                </div>
                {d.warnings.map((w, i) => <div className="warn" key={i}>{w}</div>)}
                {sets[t] && pick[t] && (
                  <label className="row" style={{ marginTop: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!keep[t]} onChange={(e) => setKeep({ ...keep, [t]: e.target.checked })} />
                    <span>Pertahankan data Sep &amp; L3M yang sudah tersimpan (hanya bulan ini yang diganti)</span>
                  </label>
                )}
              </div>
            );
          })}

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Atur nama tim (siapa masuk Arjuna / Bima)</summary>
            <div className="mut" style={{ margin: '8px 0 6px' }}>Tulis nama salesman (cukup satu kata dari namanya), pisahkan dengan koma. Tim dikenali dari nama di sheet JKS. Berlaku untuk upload berikutnya.</div>
            <label style={{ display: 'block', marginBottom: 6 }}>Tim Arjuna <input className="input" style={{ width: '100%' }} value={rt.arjuna} onChange={(e) => setRt({ ...rt, arjuna: e.target.value })} /></label>
            <label style={{ display: 'block' }}>Tim Bima <input className="input" style={{ width: '100%' }} value={rt.bima} onChange={(e) => setRt({ ...rt, bima: e.target.value })} /></label>
            {lastFile.current && <button type="button" className="btn sm" style={{ marginTop: 8 }} disabled={!!busy} onClick={() => onFile(lastFile.current)}>Terapkan &amp; baca ulang file</button>}
          </details>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Atur hari kerja manual (libur nasional, dll)</summary>
            <div className="row" style={{ marginTop: 8 }}>
              <label>Berjalan <input className="input" style={{ minWidth: 0, width: 80 }} type="number" min="0" placeholder={String(auto.auto)} value={ov.hk} onChange={(e) => setOv({ ...ov, hk: e.target.value })} /></label>
              <label>Total <input className="input" style={{ minWidth: 0, width: 80 }} type="number" min="1" placeholder={String(auto.total)} value={ov.total} onChange={(e) => setOv({ ...ov, total: e.target.value })} /></label>
              <span className="mut">Kosongkan = otomatis (Senin–Sabtu, sampai kemarin).</span>
            </div>
          </details>

          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn" data-sfx="back" onClick={onClose}>Batal</button>
            <button className="btn hp" data-sfx="none" disabled={!anyPick || !!busy} onClick={save}>{busy && parsed ? busy : 'Simpan & tampilkan'}</button>
          </div>
          <div className="mut" style={{ fontSize: 13, marginTop: 8 }}>
            Penyimpanan: {storeMode === 'cloud' ? 'cloud (Vercel Blob), bisa dibuka dari HP/laptop mana pun dengan password' : 'lokal di browser ini (mode dev, belum ada backend)'}.
          </div>
        </Panel>
      </div>
    </div>
  );
}
