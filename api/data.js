// Vercel Function: login 2 pengguna (Rincha / Bu Eci) + simpan & ambil data per tim di Vercel Blob.
// Env: PASS_RINCHA (atau DASH_PASSWORD lama), PASS_ECI, BLOB_READ_WRITE_TOKEN.
import { put, list, del } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const PREFIX = 'sales-data/';
const OWNER = { rincha: 'arjuna', eci: 'bima' };
const TEAMS = ['arjuna', 'bima'];

const passFor = (u) => (u === 'rincha' ? process.env.PASS_RINCHA || process.env.DASH_PASSWORD || '' : u === 'eci' ? process.env.PASS_ECI || '' : '');

function authOk(user, pass) {
  const want = passFor(user);
  if (!want) return false;
  const a = Buffer.from(String(pass || ''));
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

// tim tunggal hanya untuk pemiliknya; "keduanya" boleh dibuka dengan password siapa saja
const allowed = (user, view, team) => view === 'both' || OWNER[user] === team;

export const config = { api: { bodyParser: { sizeLimit: '4.4mb' } } };

const belongs = (pathname, team) => {
  const p = pathname.replace(PREFIX, '');
  if (p.startsWith(team)) return true;
  return team === 'arjuna' && p.startsWith('data'); // data lama (sebelum ada tim Bima) = Arjuna
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.query || {};
  try {
    if (q.action === 'ping') {
      return res.status(200).json({ ok: true, configured: { rincha: !!passFor('rincha'), eci: !!passFor('eci') } });
    }
    if (q.action === 'login') {
      const { user, pass } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      if (!OWNER[user]) return res.status(400).json({ error: 'Pengguna tidak dikenal' });
      if (!passFor(user)) return res.status(500).json({ error: user === 'eci' ? 'Env PASS_ECI belum di-set di Vercel' : 'Env PASS_RINCHA (atau DASH_PASSWORD) belum di-set di Vercel' });
      if (!authOk(user, pass)) return res.status(401).json({ error: 'Password salah' });
      return res.status(200).json({ ok: true, user, team: OWNER[user] });
    }

    const user = String(req.headers['x-user'] || '');
    const pass = String(req.headers['x-pass'] || '');
    const view = String(req.headers['x-view'] || q.view || '');
    if (!OWNER[user]) return res.status(401).json({ error: 'Belum login' });
    if (!passFor(user)) return res.status(500).json({ error: 'Password pengguna ini belum di-set di Vercel' });
    if (!authOk(user, pass)) return res.status(401).json({ error: 'Password salah' });
    if (!['arjuna', 'bima', 'both'].includes(view)) return res.status(400).json({ error: 'View tidak valid' });

    if (req.method === 'GET') {
      if (!allowed(user, view, view === 'both' ? OWNER[user] : view)) return res.status(403).json({ error: 'Tidak boleh membuka tim ini' });
      const { blobs } = await list({ prefix: PREFIX });
      const out = { arjuna: null, bima: null };
      for (const team of TEAMS) {
        if (view !== 'both' && view !== team) continue;
        const mine = blobs.filter((b) => belongs(b.pathname, team));
        if (!mine.length) continue;
        const latest = [...mine].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        const r = await fetch(latest.url, { cache: 'no-store' });
        out[team] = await r.json();
      }
      return res.status(200).json(out);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const team = String(q.team || '');
      if (!TEAMS.includes(team)) return res.status(400).json({ error: 'Tim tidak valid' });
      if (!allowed(user, view, team)) return res.status(403).json({ error: 'Tidak boleh menyimpan data tim ini' });
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!body || body.length < 50) return res.status(400).json({ error: 'Data kosong' });
      const saved = await put(`${PREFIX}${team}.json`, body, { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
      const { blobs } = await list({ prefix: PREFIX });
      const old = blobs.filter((b) => belongs(b.pathname, team) && b.url !== saved.url).map((b) => b.url);
      if (old.length) await del(old);
      return res.status(200).json({ ok: true, bytes: body.length });
    }
    return res.status(405).json({ error: 'Method tidak didukung' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
