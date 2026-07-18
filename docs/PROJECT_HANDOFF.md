# Handoff Proyek SEGENERATOR

Dokumen ini adalah jejak ringkas agar pengembangan dapat dilanjutkan tanpa mengulang audit yang sudah selesai. Aturan bisnis tetap mengacu pada `AGENTS.md`, kemudian `VELUE.md`. Jika ada konflik, ikuti urutan prioritas yang ditetapkan di `AGENTS.md`.

## Status per 18 Juli 2026

Implementasi saat ini sudah mencakup:

- monorepo npm dengan API Fastify/TypeScript dan dashboard React/Vite/Tailwind;
- PostgreSQL dan Prisma untuk metadata import, snapshot, anomali, laporan, data manual, dan audit;
- Docker Compose untuk PostgreSQL, API, dan web;
- pembacaan Google Sheets `DATA_MENTAH` memakai service account file atau environment variable;
- pipeline Import → Normalisasi → Validasi/Identity → Assignment/Deduplication → Aggregation → Anomaly Detection → Report Model → ExcelJS;
- dashboard tanpa login sesuai keputusan eksplisit pemilik untuk versi lokal saat ini;
- preview data mentah, statistik utama, anomali, riwayat laporan, dan unduhan;
- ekspor dua sheet dari template resmi: `LK Termin 1` dan `Uji Petik`;
- preservasi nilai manual Uji Petik menggunakan stable key `periode::pplKey`;
- snapshot sumber dan audit metadata laporan.

Fase yang secara praktis sudah dicapai: Fondasi, Import/Validasi, Identity/Aggregation, Excel Engine, dan Dashboard dasar. Fase berikutnya adalah melengkapi sumber Uji Petik dan hardening.

## Verifikasi data riil terakhir

Import riil terakhir yang sudah diproses:

| Metrik | Nilai |
|---|---:|
| Baris sumber/detail | 2.185 |
| PML | 58 |
| PPL | 393 |
| SubSLS unik | 2.185 |
| Target unik | 199.309 |
| Capaian | 109.536 |
| Anomali warning | 1.339 |
| Anomali error pada laporan permissive | 36 |

Referensi audit lokal terakhir:

- import ID: `cmrphtvcc0002n001pl3lncb6`;
- snapshot ID: `8f4c9435-7e82-4157-a295-425dbc64ab0b`;
- report ID: `cmrplguzt0001mg01ilrhbw3o`;
- output lokal: `storage/reports/LK_PPK_BIREUEN_2026_TERMIN_1_202607180654.xlsx`;
- SHA-256 output: `47e5002d13d010601a0cf5b2e1f0767e6cd52f6317e030ecae4e2d00dc9f6562`.

File laporan dan snapshot sengaja tidak masuk Git. Angka di atas adalah jejak audit, bukan fixture yang boleh dianggap selalu sama untuk import berikutnya.

## Kondisi LK Termin 1

Sheet ini sudah dinilai lengkap untuk kolom yang tersedia di `DATA_MENTAH` dan sudah diverifikasi sebagai berikut:

- hierarki PML → PPL → SubSLS terbentuk;
- Kode SubSLS tetap string dan nol di depan dipertahankan;
- kode 16 digit dipisah sesuai struktur template menjadi kecamatan, desa, dan SLS;
- target wilayah hanya dihitung sekali per SubSLS unik;
- capaian berasal dari assignment unik dan exact duplicate tidak menggandakan total;
- subtotal PPL, subtotal PML, persentase, serta grand total menggunakan formula aktif;
- workbook berisi 6.734 formula dan tidak memiliki formula `#REF!` pada verifikasi terakhir;
- merge, border, ukuran, print area, dan tampilan template resmi dipertahankan;
- workbook berhasil dibuka memakai Microsoft Excel tanpa repair warning.

Catatan teknis penting: ExcelJS pernah menulis urutan XML `outlinePr`/`pageSetUpPr` yang membuat Excel memperbaiki sheet pertama. Renderer sekarang menghapus `outlineProperties` yang tidak digunakan dan mempertahankan fit-to-page. Jangan mengembalikan properti tersebut tanpa regression test dengan Microsoft Excel.

## Kondisi Uji Petik

Sheet `Uji Petik` saat ini mengisi otomatis data yang benar-benar tersedia:

- nama PPL dan PML;
- email PPL dan PML pada kolom audit tersembunyi;
- jumlah SubSLS;
- total target;
- total capaian;
- persentase;
- hitungan target kosong/nol, belum ada capaian, di bawah/sesuai/melebihi target;
- assignment tanpa link, reassignment, multi-PPL, multi-PML, dan hasil deteksi sistem.

Sel otomatis/formula diberi warna hijau. Sel kuning adalah input manual dan nilainya dipertahankan saat generate ulang. Kolom audit/helper X:AQ disembunyikan tetapi tidak dihapus.

`DATA_MENTAH` belum memiliki sumber resmi untuk:

- pembagian target Usaha dan Keluarga;
- UMKM ditemukan/tidak ditemukan;
- Usaha Keluarga ditemukan/tidak ditemukan;
- Keluarga ditemukan/tidak ditemukan;
- hasil uji petik dan penyebab;
- data pindah dan data ganda;
- pemeriksa dan tanggal pemeriksaan;
- tindak lanjut, dokumentasi, dan keterangan lapangan.

Nilai tersebut tidak boleh ditebak atau diturunkan dengan pembagian asumtif.

## Target implementasi berikutnya: sumber Uji Petik lengkap

Sebelum mengubah model bisnis, pastikan pemilik menentukan lokasi sumber resmi data Uji Petik: tab Google Sheets baru, kolom tambahan, atau file referensi lain. Setelah sumber dipastikan, kerjakan berurutan:

1. Catat nama sheet dan header aktual; jangan mengunci posisi kolom.
2. Tambahkan canonical schema dan alias header untuk field Uji Petik berdasarkan bukti sumber.
3. Tentukan granularitas stable key. Minimum `periode::pplKey`; gunakan `periode::pplKey::subslsKey` bila datanya per SubSLS.
4. Tambahkan reader/import snapshot tanpa menghapus data mentah lama.
5. Validasi angka, tanggal, URL dokumentasi, identitas pemeriksa, dan konflik antarbaris.
6. Gabungkan data ke report model secara deterministik; jangan menimpa input manual bila sumber resmi kosong.
7. Tambahkan anomali untuk row yang tidak dapat dipetakan, duplikat stable key, dan konflik nilai.
8. Tambahkan unit, integration, golden-file, serta regression test preservasi manual.
9. Verifikasi output dengan Excel asli agar tidak ada repair warning dan semua formula tetap aktif.
10. Perbarui dokumen ini dengan ID import, hash, angka audit, dan keputusan resolver terbaru.

## Keputusan dan batasan yang harus dipertahankan

- Spreadsheet utama: `1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg`.
- Sheet sumber utama: `DATA_MENTAH`.
- Template resmi yang digunakan runtime: `templates/LK PPK  TEMPLATES.xlsx`.
- Email adalah identitas utama PPL/PML; nama tidak boleh menjadi dasar penggabungan tanpa warning fallback.
- Kode SubSLS selalu string.
- Default produksi tetap strict; data riil dengan error hanya boleh diekspor permissive dengan penanda/audit yang jelas.
- Tidak ada autentikasi pada versi lokal karena instruksi eksplisit pemilik. Sebelum deployment publik, konflik ini dengan persyaratan keamanan `AGENTS.md` wajib ditinjau dan autentikasi/rate limiting harus diselesaikan.
- Credential `umkm-479223-fddd8281bf40.json`, `.env`, output Excel, dan snapshot tidak boleh di-commit.
- Salinan template di root hanya file kerja lokal. Sumber runtime berada di folder `templates/`.

## Cara melanjutkan

```powershell
Copy-Item .env.example .env
npm install
docker compose up --build
```

Pemeriksaan wajib sebelum commit:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

- Dashboard: `http://localhost:5173`
- API: `http://localhost:3000/api`

Jangan memasukkan service account JSON ke Git. Docker Compose mengharapkan credential tersebut tersedia hanya di mesin lokal dan memasangnya read-only ke container API.

## Catatan dependency audit

`npm audit --audit-level=high` pada 18 Juli 2026 melaporkan dua vulnerability **moderate** pada dependency transitif `uuid` yang dibawa ExcelJS. Tidak ada temuan high atau critical. Saran otomatis `npm audit fix --force` akan menurunkan ExcelJS ke versi mayor lama, sehingga tidak diterapkan karena berisiko merusak kompatibilitas template. Tinjau kembali saat ExcelJS/dependency transitif menyediakan upgrade kompatibel dan jalankan seluruh regression test workbook setelah perubahan.
