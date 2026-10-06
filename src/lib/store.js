// Penyimpanan data per tim + login.
// Cloud (Vercel Function + Blob) kalau backend ada; kalau tidak (dev lokal) pakai IndexedDB browser tanpa password.
export const OWNER = { rincha: 'arjuna', eci: 'bima' };
export const NAMES = { rincha: 'Rincha', eci: 'Bu Eci' };
export const TEAM_LABEL = { arjuna: 'Arjuna', bima: 'Bima' };

const DB = 'target-quest';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function localGet(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction('kv').objectStore('kv').get(key);
    q.onsuccess = () => res(q.result || null);
    q.onerror = () => rej(q.error);
  });
}
async function localSet(key, v) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(v, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// kredensial hanya di memori: tiap buka web ditanya lagi
const auth = { user: '', pass: '', view: '' };
export const setAuth = (a) => Object.assign(auth, a);
export const clearAuth = () => Object.assign(auth, { user: '', pass: '', view: '' });

// 'cloud' | 'local'
export async function probe() {
  try {
    const r = await fetch('/api/data?action=ping');
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('json')) return { mode: 'cloud', info: await r.json() };
  } catch { /* backend tidak ada */ }
  return { mode: 'local', info: null };
}

export async function login(mode, user, pass) {
  if (mode === 'local') return { ok: true };
  const r = await fetch('/api/data?action=login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user, pass }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Gagal login (${r.status})`);
  return j;
}

export async function loadTeams(mode, view) {
  if (mode === 'local') {
    const arjuna = (await localGet('arjuna')) || (await localGet('data'));
    const bima = await localGet('bima');
    return { arjuna: view === 'bima' ? null : arjuna, bima: view === 'arjuna' ? null : bima };
  }
  const r = await fetch(`/api/data?view=${view}`, { headers: { 'x-user': auth.user, 'x-pass': auth.pass, 'x-view': view } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Gagal memuat data (${r.status})`);
  return j;
}

export async function saveTeam(mode, team, data) {
  if (mode === 'local') return localSet(team, data);
  const body = JSON.stringify(data);
  if (body.length > 4.3e6) throw new Error('Data terlalu besar (>4,3 MB) untuk disimpan');
  const r = await fetch(`/api/data?team=${team}`, { method: 'PUT', headers: { 'x-user': auth.user, 'x-pass': auth.pass, 'x-view': auth.view, 'content-type': 'application/json' }, body });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Gagal simpan (${r.status})`);
}
