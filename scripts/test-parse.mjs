import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { parseAll } from '../src/lib/parse.js';
const f = process.argv[2];
if (!f) { console.log('Pemakaian: npm run test:parse -- path/ke/file.xlsx'); process.exit(0); }
const t0 = Date.now();
const wb = XLSX.read(fs.readFileSync(f), { type: 'buffer', cellFormula: false, cellStyles: false, sheetRows: 8000 });
const r = parseAll(wb, { fileName: f });
console.log('parse ms', Date.now() - t0, '| top warnings', r.warnings);
const fmt = (n) => Math.round(n).toLocaleString('id-ID');
for (const team of ['arjuna', 'bima']) {
  const d = r[team];
  if (!d) { console.log(team, 'KOSONG'); continue; }
  console.log('\n=====', team, d.meta.period?.label, d.meta.region, '| stores', d.stores.length, '| subs', d.subs.length, '| principals', d.principals.join(','), '| storeTgt', d.meta.storeTgt);
  console.log('cat cur/lm/l3m stores', Object.keys(d.cat.cur).length, Object.keys(d.cat.lm).length, Object.keys(d.cat.l3m).length);
  d.warnings.forEach((w) => console.log('  warn:', w));
  for (const s of d.salesmen) {
    const st = d.stores.filter((x) => x.sales === s);
    console.log(' ', s.padEnd(26), 'n', String(st.length).padStart(3), 'pivot', fmt(d.pAct[s]?.total || 0).padStart(11), 'stores', fmt(st.reduce((a, x) => a + x.act, 0)).padStart(11),
      'tgtM', fmt(d.targets.milestone[s].total).padStart(13), 'tgtB', fmt(d.targets.bti?.[s]?.total || 0).padStart(13),
      'CA', st.filter((x) => x.act >= 1).length, 'prod', st.filter((x) => x.act >= x.min).length, 'pj', st.filter((x) => x.pj).length, 'ps', st.filter((x) => x.ps).length);
  }
  const sizes = {}; d.stores.forEach((s) => (sizes[s.size] = (sizes[s.size] || 0) + 1));
  console.log('  sizes', sizes, '| LM', fmt(d.stores.reduce((a, x) => a + x.lm, 0)), '| L3M/mo', fmt(d.stores.reduce((a, x) => a + x.l3m, 0)), '| json KB', Math.round(JSON.stringify(d).length / 1024));
  console.log('  subs sample', d.subs.slice(0, 4), '...');
  fs.writeFileSync(`/tmp/data-${team}.json`, JSON.stringify(d));
}
