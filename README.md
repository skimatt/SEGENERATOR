# Sistem Generator Laporan LK PPK BPS Bireuen

Aplikasi lokal tanpa login untuk mengimpor `DATA_MENTAH2` dari Google Sheets, menjalankan pipeline data yang dapat diaudit, menampilkan dashboard, dan menghasilkan workbook Excel `LK Termin 1` serta `Uji Petik`.

Status implementasi, keputusan teknis, hasil verifikasi terakhir, dan target lanjutan untuk melengkapi data Uji Petik dicatat di [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md). Agent berikutnya wajib membaca `AGENTS.md`, `VELUE.md`, dan dokumen handoff tersebut sebelum mengubah kode.

## Menjalankan dengan Docker Compose

Panduan lengkap dari instalasi Docker, persiapan credential, startup, backup, restore, pemindahan komputer, dan troubleshooting tersedia di [Panduan Docker](docs/DOCKER_SETUP.md).

1. Salin `.env.example` menjadi `.env`.
2. Simpan file service account di luar Git dan isi `GOOGLE_SERVICE_ACCOUNT_FILE`, atau gunakan `GOOGLE_SERVICE_ACCOUNT_EMAIL` serta `GOOGLE_PRIVATE_KEY`. Docker Compose proyek ini memasang `umkm-479223-fddd8281bf40.json` sebagai secret file read-only.
3. Bagikan spreadsheet `1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg` kepada email service account sebagai Viewer.
4. Pastikan sheet sumber aktif bernama `DATA_MENTAH2`. Untuk rollback, ubah `GOOGLE_SHEET_NAME` menjadi `DATA_MENTAH` tanpa mengubah kode.
5. Jalankan:

```powershell
docker compose up --build
```

Dashboard tersedia di `http://localhost:5173` dan API di `http://localhost:3000/api`.

Migration PostgreSQL dijalankan otomatis saat container API mulai. Folder `storage/reports` dan `storage/snapshots` dipasang sebagai volume lokal agar hasil tetap tersedia setelah container dibuat ulang.

## Menjalankan tanpa Docker

Prasyarat: Node.js LTS dan PostgreSQL.

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run template:create
npm run dev
```

## Alur sistem

```text
Google Sheets API
→ raw snapshot
→ header resolver
→ normalizer
→ identity resolver
→ assignment/deduplication
→ aggregation
→ anomaly detection
→ ExcelJS renderer
→ XLSX + audit log
```

Mode produksi default adalah `strict`. Kode SubSLS kosong, angka invalid, konflik target, dan identitas yang tidak dapat ditentukan memblokir ekspor. Mode `permissive` tetap membuat laporan dengan label `PERLU VERIFIKASI` dan rincian anomali di `Uji Petik`.

Target wilayah dihitung sekali per `periode::kodeSubSls`. Exact duplicate tidak masuk agregasi, sementara multi-PPL dan multi-PML tetap terlacak. Data mentah disimpan pada snapshot JSON dan PostgreSQL.

## Template Excel

Generator menggunakan template resmi [templates/LK PPK  TEMPLATES.xlsx](templates/LK%20PPK%20%20TEMPLATES.xlsx). Renderer mempertahankan struktur dua sheet, style, merge, ukuran, area cetak, serta kolom manual Uji Petik melalui stable key.

Kolom manual `Uji Petik` dibaca dari laporan terakhir dan dipetakan kembali dengan stable key `periode::pplKey`. File lama tidak dihapus atau ditimpa.

## Sumber progres Uji Petik

Simpan export FASIH berikut pada lokasi tetap:

```text
data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS-terbaru.xlsx
```

Tidak perlu mengunggah delapan sheet ke Google Spreadsheet. Saat dashboard atau generator laporan dijalankan, API membaca workbook tersebut secara read-only, mencocokkan `Kode SubSLS` dengan assignment pada sheet aktif (`DATA_MENTAH2` secara default), lalu mengagregasikan metrik per email PPL.

Untuk memperbarui data, unduh export FASIH terbaru dan ganti file pada lokasi yang sama. Cache pembacaan otomatis dibatalkan jika waktu modifikasi atau ukuran file berubah.

Field otomatis dari workbook progres:

- Target U&K;
- Target Usaha;
- Target Keluarga (`Target U&K - Target Usaha` per SubSLS);
- Usaha Keluarga ditemukan;
- Usaha Keluarga tak ditemukan.

Jika target workbook progres berbeda dari `DATA_MENTAH2`, sistem tetap mencatat `UJI_PETIK_TARGET_MISMATCH` sebagai warning yang dapat diaudit. Baris Uji Petik memakai target workbook progres agar ketiga kolom target tetap konsisten; target LK Termin 1 tetap mengikuti aturan agregasi assignment.

Field UMKM dan Keluarga tetap manual karena workbook belum menyediakan pasangan ditemukan/tak ditemukan dengan definisi yang cukup eksplisit. Nilai manual lama selalu dipertahankan dan memiliki prioritas saat generate ulang.

Pada tampilan standar sheet `Uji Petik`, kelompok tanpa sumber terverifikasi disembunyikan agar laporan ringkas dan tidak menampilkan kolom kosong: UMKM, Keluarga, pemeriksa/tanggal uji petik, realisasi manual, dan dokumentasi. Kolom `Keterangan Hasil Uji Petik` tetap ditampilkan sebagai teks bebas dan dipertahankan saat generate ulang melalui stable key. Kolom tersembunyi tidak dihapus dari struktur internal sehingga data manual lama tetap aman. Kedua sheet menggunakan range biasa, bukan objek Excel Table/format `Ctrl+T`.

## Pemeriksaan kualitas

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Unit test mencakup normalisasi, identitas, parsing angka, deduplikasi, target unik, multi-PPL, konflik target, persentase, dan anomali. Integration test memverifikasi nama sheet, formula, tipe kode SubSLS, freeze pane, print area, serta stable key workbook.

## Endpoint utama

- `GET /api/health`
- `GET /api/dashboard`
- `POST /api/imports/google-sheets`
- `GET /api/imports/:id`
- `POST /api/imports/:id/validate`
- `GET /api/imports/:id/anomalies`
- `POST /api/reports/generate`
- `GET /api/reports`
- `GET /api/reports/:id/download`
- `GET /api/snapshots`
- `GET /api/snapshots/:id/diff`
- `GET /api/audit-log`
