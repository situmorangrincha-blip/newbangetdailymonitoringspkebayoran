import { useState } from 'react';
import { NAMES, OWNER, TEAM_LABEL, login, probe } from '../lib/store.js';
import { Panel } from './ui.jsx';
import { sfx } from '../lib/audio.js';

// Layar masuk: siapa (Rincha / Bu Eci) -> password -> data yang mau dilihat.
export function Who({ onPick, info }) {
  return (
    <div className="gate">
      <Panel title="SIAPA YANG MASUK?">
        <div className="gate-body">
          <div className="gate-btns">
            {['rincha', 'eci'].map((u) => (
              <button key={u} className="btn coin big" data-sfx="pick" onClick={() => onPick(u)}>
                {NAMES[u]}
                <small>Tim {TEAM_LABEL[OWNER[u]]}</small>
              </button>
            ))}
          </div>
          {info && (!info.configured.rincha || !info.configured.eci) && (
            <div className="warn">Password {[!info.configured.rincha && 'Rincha (PASS_RINCHA)', !info.configured.eci && 'Bu Eci (PASS_ECI)'].filter(Boolean).join(' dan ')} belum di-set di Vercel.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}

export function Pass({ user, mode, onOk, onBack }) {
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await login(mode, user, p);
      sfx.ok();
      onOk(p);
    } catch (x) {
      sfx.err();
      setErr(x.message || 'Gagal masuk');
      setBusy(false);
    }
  };
  return (
    <form className="gate" onSubmit={go}>
      <Panel title={`HALO, ${NAMES[user].toUpperCase()}`}>
        <div className="gate-body">
          {mode === 'cloud' ? (
            <input className="input" type="password" autoFocus placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} />
          ) : (
            <div className="mut">Mode lokal (tanpa backend): password dilewati.</div>
          )}
          {err && <div className="warn err">{err}</div>}
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button type="button" className="btn" data-sfx="back" onClick={onBack}>Kembali</button>
            <button className="btn coin" type="submit" disabled={busy || (mode === 'cloud' && !p)} data-sfx="none">{busy ? '...' : 'MASUK'}</button>
          </div>
        </div>
      </Panel>
    </form>
  );
}

export function ViewPick({ user, onPick, onBack }) {
  const own = OWNER[user];
  return (
    <div className="gate">
      <Panel title="DATA YANG MAU DILIHAT?">
        <div className="gate-body">
          <div className="gate-btns">
            <button className="btn coin big" data-sfx="pick" onClick={() => onPick(own)}>
              Tim {TEAM_LABEL[own]}
              <small>data tim sendiri</small>
            </button>
            <button className="btn big" data-sfx="pick" onClick={() => onPick('both')}>
              Keduanya
              <small>Arjuna + Bima</small>
            </button>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn sm" data-sfx="back" onClick={onBack}>Ganti pengguna</button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export { probe };
