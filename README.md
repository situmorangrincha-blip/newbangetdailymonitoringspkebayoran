# TARGET QUEST — Sales Monitoring (Arjuna & Bima · malam sakura)

Upload Excel monitoring harian → dashboard dua tim. Tema retro/game dengan dua tokoh 3D low-poly (Arjuna & Bima) di malam sakura,
SFX + backsound chiptune (bisa on/off), transisi 3D, SNAP PNG, Grafik, Bandingkan, **DAP + PDF per salesman**, dan Beranda dengan pencarian.

## Deploy (GitHub → Vercel)
1. Push **semua isi folder** ke GitHub (folder `src`, `api`, `scripts` ikut sebagai folder utuh).
2. Vercel → Add New Project → import repo (Vite terdeteksi otomatis).
3. Project Vercel: **Storage → Create → Blob**, lalu **Connect** ke project (otomatis menambah `BLOB_READ_WRITE_TOKEN`).
4. **Settings → Environment Variables**: `PASS_RINCHA` (password Rincha; kalau kosong dipakai `DASH_PASSWORD` lama) dan `PASS_ECI` (password Bu Eci).
5. Redeploy.

Build menjalankan `check-files.mjs` dulu: kalau ada file yang tidak ikut ke GitHub, log Vercel menampilkan daftarnya.

## Login & akses
Pilih **Rincha / Bu Eci** → password → pilih data (**tim sendiri** atau **Keduanya**). Tim tunggal hanya bisa dibuka pemiliknya;
"Keduanya" bisa dibuka dengan password siapa saja. Setelah masuk, halaman pertama adalah **Beranda**.

## File Excel
Satu file untuk dua tim. Sheet yang dibaca (dikenali dari namanya): `TGT`, `JKS SALESMAN`, `OLAP SALES 1`, `OLAP FOCUS CATEGORY`, `LAB` (Arjuna),
`BIMA`, `KHUSUS IKTIAR`, `DAP ARJUNA`, `DAP BIMA`, `OLAP DAP`. Sheet (LOOK)RECAPT tidak lagi dipakai.

- **Tim dikenali dari NAMA salesman** (di sheet JKS): Arjuna = Hendra, Steven, Rossi, Mikael, Rahmat; Bima = Iktiar, Prayogo, Maesyaroh, Asep, Kurniawan.
  Nama baru/beda ejaan: Upload → "Atur nama tim" → "Terapkan & baca ulang file".
- **ACT & CA dihitung per tim.** Toko yang dicover dua tim: CA tim Bima hanya dari penjualan salesman Bima (dan sebaliknya).
- **Iktiar:** seluruh omsetnya (pivot, per toko, Sep, L3M, kategori) hanya dari sheet `KHUSUS IKTIAR`; barisnya di sheet lain diabaikan.
  Tokonya ditambahkan ke sheet `DAP BIMA`, Actual DAP-nya otomatis dari sheet khusus itu.
- **File harus ringan (±3–5 MB).** Kalau file >80 MB web menolak. Penyebab biasa: sel kosong ke-format sampai baris 1.048.576.
  Perbaiki di Excel: pilih baris di bawah data terakhir → Ctrl+Shift+↓ → klik kanan nomor baris → Delete; lakukan juga untuk kolom di kanan data; Save.

## Aturan hitung
- Timegone = hari kerja berjalan ÷ total hari kerja (Senin–Sabtu), data H-1 (WIB). Bisa diatur manual di modal Upload.
- **% SEP / % L3M = ACT ÷ (pembanding × timegone)**; L3M selalu rata-rata per bulan (total 3 bulan ÷ 3).
- Target total = jumlah semua kolom principal di TGT (Milestone termasuk FLORA; BTI tidak punya target FLORA karena kolomnya "OTHERS" = 0).
- CA = ACT toko ≥ Rp1. CA Produktif = ACT ≥ Minimum CA Prod (LAB; default retail 200rb, grosir 1jt).
- Tim tanpa LAB (Bima): Pareto JKS = 30 toko terbesar per salesman (rata-rata L3M), SAK = 30 terbesar se-tim; target per toko tidak ada.

## DAP (Daily Account Plan)
Pilih tanggal → web menampilkan toko yang dijadwalkan hari itu (dari kolom JKS di sheet DAP), per salesman.
**PLAN = (Target DAP − Actual MTD) ÷ sisa kunjungan toko itu (termasuk hari itu)**, dibulatkan ke atas per ribuan; 0 kalau sudah tercapai.
- Toko "tiap minggu" ([2]SELASA): sisa = jumlah hari itu yang tersisa. Toko "Minggu 1&3 / 2&4": minggu 1 = tgl 1–7, minggu 2 = 8–14, dst.
- Tanggal libur (opsional) mengurangi sisa kunjungan. Actual dari sheet OLAP DAP (Iktiar: dari sheet khususnya).
- **Unduh PDF**: satu salesman mulai di halaman baru (A4 landscape), tombol untuk semua salesman atau satu salesman.

## Fokus per hari
Fokus → Per Hari: kontribusi tiap hari kunjungan per salesman, growth vs Sep/L3M dan vs Target DAP, dengan timegone per toko (kunjungan yang sudah lewat ÷ total kunjungan).

## Beranda
Kolom pencarian dengan saran (klik/Enter langsung ke halamannya), tombol cepat, dan **Eksplorasi**: pilih pengelompokan, indikator, dan filter toko;
susunan bisa disimpan sebagai preset (tersimpan di browser).

## Lokal
```
npm install
npm run dev                              # tanpa backend: data di browser, tanpa password
npm run test:parse -- path/ke/file.xlsx  # tes parser ke Excel asli
```
