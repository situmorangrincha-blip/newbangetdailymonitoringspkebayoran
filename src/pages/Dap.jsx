import { useMemo, useState } from 'react';
import { dapForDate, fmt, weekdayName } from '../lib/calc.js';
import { Panel } from '../components/ui.jsx';
import { sfx } from '../lib/audio.js';

const rupiah = (n) => Math.round(n || 0).toLocaleString('id-ID');
const pad = (n) => String(n).padStart(2, '0');
const MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// tanggal default: hari ini kalau masih di bulan data, selain itu tanggal 1 bulan data
export function defaultDapDate(time, now = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = f.format(now).split('-').map(Number);
  if (y === time.y && m === time.m) return d;
  return 1;
}

export default function Dap({ data, time, day, setDay, holidays, setHolidays }) {
  const [busy, setBusy] = useState('');
  const [holTxt, setHolTxt] = useState(holidays.join(', '));
  const last = new Date(time.y, time.m, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  const wd = new Date(time.y, time.m - 1, d).getDay();
  const res = useMemo(() => dapForDate(data, time.y, time.m, d, holidays), [data, time.y, time.m, d, holidays]);
  const iso = `${time.y}-${pad(time.m)}-${pad(d)}`;
  const dataDayN = time.dataDay || 0;
  const stale = d > dataDayN + 1;
  const tot = res.groups.reduce((a, g) => ({ t: a.t + g.target, a: a.a + g.actual, p: a.p + g.plan }), { t: 0, a: 0, p: 0 });

  if (!data.dap?.length) {
    return (
      <Panel title="DAP (DAILY ACCOUNT PLAN)">
        <div className="empty">
          <h2>BELUM ADA DATA DAP</h2>
          <p className="mut">Sheet DAP tim ini belum ada di file Excel. Tambahkan sheet <b>DAP {data.meta.teamLabel?.toUpperCase()}</b> lalu upload lagi.</p>
        </div>
      </Panel>
    );
  }

  const move = (delta) => {
    let n = d;
    for (let i = 0; i < 40; i++) {
      n += delta;
      if (n < 1 || n > last) return;
      if (new Date(time.y, time.m - 1, n).getDay() !== 0) { setDay(n); sfx.click(); return; }
    }
  };

  const saveHol = () => {
    const arr = [...new Set(holTxt.split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((x) => x >= 1 && x <= last))].sort((a, b) => a - b);
    setHolidays(arr);
    setHolTxt(arr.join(', '));
  };

  async function pdf(only) {
    setBusy('Menyusun PDF...');
    try {
      const { makeDapPdf } = await import('../lib/dapPdf.js');
      await makeDapPdf({ data, res, only, y: time.y, m: time.m, d, wd, asOf: time.asOf });
      sfx.ok();
    } catch (e) {
      sfx.err();
      alert('Gagal membuat PDF: ' + (e?.message || e));
    }
    setBusy('');
  }

  return (
    <div className="grid">
      <Panel title={`DAP ${data.meta.teamLabel?.toUpperCase() || ''} · ${weekdayName(wd).toUpperCase()} ${d} ${MON[time.m - 1].toUpperCase()} ${time.y}`} right={`${res.total} toko · ${res.groups.length} salesman`}>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" onClick={() => move(-1)} aria-label="Hari sebelumnya">◀</button>
          <input
            className="input"
            style={{ minWidth: 0, width: 170 }}
            type="date"
            value={iso}
            min={`${time.y}-${pad(time.m)}-01`}
            max={`${time.y}-${pad(time.m)}-${pad(last)}`}
            onChange={(e) => { const v = e.target.value; if (v) setDay(parseInt(v.slice(8, 10), 10)); }}
          />
          <button className="btn sm" onClick={() => move(1)} aria-label="Hari berikutnya">▶</button>
          <span className="mut">{weekdayName(wd)}</span>
          <span style={{ flex: 1 }} />
          <button className="btn coin" data-sfx="none" disabled={!res.total || !!busy} onClick={() => pdf(null)}>{busy || 'UNDUH PDF (SEMUA SALESMAN)'}</button>
        </div>
        {wd === 0 && <div className="warn">Hari Minggu tidak ada kunjungan.</div>}
        {stale && <div className="warn">Actual di bawah ini s/d {time.asOf} (data H-1). Kunjungan antara tanggal itu dan {d} belum terhitung.</div>}
        <div className="kpis k4" style={{ marginTop: 10 }}>
          <div className="kpi"><div className="l">Toko dikunjungi</div><div className="v">{res.total}</div><div className="s">{res.groups.length} salesman</div></div>
          <div className="kpi"><div className="l">Target DAP</div><div className="v">{fmt.jt(tot.t)}<small>jt</small></div><div className="s">jumlah toko hari ini</div></div>
          <div className="kpi"><div className="l">Actual MTD</div><div className="v">{fmt.jt(tot.a)}<small>jt</small></div><div className="s">gap {fmt.jt(tot.a - tot.t)} jt</div></div>
          <div className="kpi hero"><div className="l">PLAN hari ini</div><div className="v">{fmt.jt(tot.p)}<small>jt</small></div><div className="s">minimal target kunjungan</div></div>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer' }}>Tanggal libur (opsional, mengurangi sisa kunjungan)</summary>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input" style={{ minWidth: 0, width: 220 }} placeholder="mis. 17, 20" value={holTxt} onChange={(e) => setHolTxt(e.target.value)} />
            <button className="btn sm" onClick={saveHol}>Simpan</button>
            <span className="mut">Tanggal (angka) di bulan ini yang tidak ada kunjungan.</span>
          </div>
        </details>
        <div className="note" style={{ margin: '8px -10px -10px' }}>
          PLAN = (Target DAP − Actual) ÷ sisa kunjungan toko itu (termasuk hari ini), dibulatkan ke atas per ribuan; 0 kalau target sudah tercapai. Toko tiap minggu dihitung semua {weekdayName(wd)}, toko "Minggu 1&amp;3" / "2&amp;4" dihitung minggu 1 = tgl 1–7, dst.
          {res.unparsed > 0 && ` ${res.unparsed} toko dilewati karena rute kunjungannya tidak terbaca.`}
        </div>
      </Panel>

      {res.groups.map((g) => (
        <Panel
          key={g.name}
          title={g.name.toUpperCase()}
          right={<><span>{g.n} toko · PLAN {fmt.jt(g.plan, 2)} jt </span><button className="btn sm" style={{ marginLeft: 6 }} data-sfx="none" onClick={() => pdf(g.name)}>PDF</button></>}
          flush
        >
          <div className="scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>#</th><th className="l">Toko</th><th className="l">Channel</th><th>Target DAP</th><th>Actual</th><th>Gap</th><th>Sisa</th><th>PLAN</th><th>Estimasi</th><th>Actual SO</th>
                </tr>
              </thead>
              <tbody>
                {g.list.map((r, i) => (
                  <tr key={r.id + r.s}>
                    <td>{i + 1}</td>
                    <td className="l nm" title={r.id}>{r.n} {r.par === 'P' && <span className="tag b">P</span>}{r.hp && <span className={'tag ' + (r.hp.toUpperCase() === 'GOOD' ? 'g' : 'r')}>{r.hp.toUpperCase()}</span>}</td>
                    <td className="l nm mut">{r.ch}</td>
                    <td>{rupiah(r.t)}</td>
                    <td>{rupiah(r.a)}</td>
                    <td className={r.gap < 0 ? 'neg' : 'ok'}>{rupiah(r.gap)}</td>
                    <td>{r.sisa}<span className="mut"> ({r.freq === 'Tiap minggu' ? 'mgg' : r.freq.replace('Minggu ', 'M')})</span></td>
                    <td><b>{r.done ? <span className="ok">tercapai</span> : rupiah(r.plan)}</b></td>
                    <td>{r.e ? rupiah(r.e) : ''}</td>
                    <td>{r.so ? rupiah(r.so) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
      {!res.groups.length && <Panel title="TIDAK ADA KUNJUNGAN"><div className="empty"><p className="mut">Tidak ada toko yang dijadwalkan di tanggal ini.</p></div></Panel>}
    </div>
  );
}
