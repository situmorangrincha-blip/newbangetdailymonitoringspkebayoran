// PDF DAP: satu salesman mulai di halaman baru (kalau tokonya banyak, lanjut ke halaman berikutnya), A4 landscape.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { weekdayName } from './calc.js';

const MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const rp = (n) => Math.round(n || 0).toLocaleString('id-ID');
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');

export async function makeDapPdf({ data, res, only, y, m, d, wd, asOf }) {
  const groups = only ? res.groups.filter((g) => g.name === only) : res.groups;
  if (!groups.length) throw new Error('Tidak ada toko untuk dicetak');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const tgl = `${weekdayName(wd)}, ${d} ${MON[m - 1]} ${y}`;
  const team = data.meta.teamLabel || '';

  groups.forEach((g, gi) => {
    if (gi > 0) doc.addPage();
    // kepala halaman
    doc.setFillColor(32, 33, 74);
    doc.rect(0, 0, W, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(clean(`DAP ${team.toUpperCase()} - ${g.name}`), 10, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(clean(`${tgl}  |  ${g.n} toko  |  Actual s/d ${asOf}`), 10, 15.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total PLAN: Rp ${rp(g.plan)}`, W - 10, 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Target DAP: Rp ${rp(g.target)}  |  Actual: Rp ${rp(g.actual)}`, W - 10, 15.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 24,
      margin: { left: 8, right: 8, top: 24, bottom: 12 },
      styles: { fontSize: 7.5, cellPadding: 1.4, lineColor: [190, 190, 215], lineWidth: 0.15, valign: 'middle', overflow: 'ellipsize' },
      headStyles: { fillColor: [32, 33, 74], textColor: 255, fontSize: 7.5, halign: 'center' },
      alternateRowStyles: { fillColor: [246, 245, 252] },
      head: [['No', 'Nama Toko', 'ID Pelanggan', 'Channel', 'Target DAP', 'Actual', 'Gap', 'Sisa', 'PLAN', 'Estimasi', 'Actual SO', 'Catatan']],
      body: g.list.map((r, i) => [
        i + 1,
        clean(r.n),
        r.id,
        clean(r.ch),
        rp(r.t),
        rp(r.a),
        rp(r.gap),
        `${r.sisa}x`,
        r.done ? 'tercapai' : rp(r.plan),
        r.e ? rp(r.e) : '',
        r.so ? rp(r.so) : '',
        '',
      ]),
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { cellWidth: 52 },
        2: { cellWidth: 29 },
        3: { cellWidth: 34 },
        4: { halign: 'right', cellWidth: 23 },
        5: { halign: 'right', cellWidth: 21 },
        6: { halign: 'right', cellWidth: 23 },
        7: { halign: 'center', cellWidth: 10 },
        8: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
        9: { halign: 'right', cellWidth: 20 },
        10: { halign: 'right', cellWidth: 18 },
        11: { cellWidth: 'auto' },
      },
      didParseCell: (h) => {
        if (h.section === 'body' && h.column.index === 6 && String(h.cell.raw).startsWith('-')) h.cell.styles.textColor = [200, 40, 60];
        if (h.section === 'body' && h.column.index === 8 && h.cell.raw === 'tercapai') h.cell.styles.textColor = [30, 140, 80];
      },
      didDrawPage: (h) => {
        // salesman yang tokonya melebar ke halaman lain: ulangi nama di footer
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 150);
        doc.text(clean(`${g.name} - ${tgl}`), 8, doc.internal.pageSize.getHeight() - 5);
        doc.text(`Halaman ${doc.getNumberOfPages()}`, W - 8, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      },
    });
  });

  const tag = only ? only.split(' ')[0] : 'semua-salesman';
  doc.save(`DAP-${team}-${tag}-${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}.pdf`);
}
