# Handoff Proyek SEGENERATOR

Dokumen ini adalah jejak ringkas agar pengembangan dapat dilanjutkan tanpa mengulang audit yang sudah selesai. Aturan bisnis tetap mengacu pada `AGENTS.md`, kemudian `VELUE.md`. Jika ada konflik, ikuti urutan prioritas yang ditetapkan di `AGENTS.md`.

## Status terbaru — 19 Juli 2026

- Docker Compose sudah diperkuat untuk pemindahan komputer: project name stabil, restart policy, healthcheck tiga layanan, port configurable, credential host path configurable, template read-only, API hanya bind ke localhost, dan PostgreSQL dikonfigurasi melalui `.env`.
- Panduan instalasi, startup, backup, restore, akses LAN, dan troubleshooting tersedia di `docs/DOCKER_SETUP.md`.
- Dashboard React sudah didesain ulang menjadi alur ringkas import → tinjau kualitas → generate Excel, responsif, dan hanya menampilkan kontrol yang berfungsi.
- Kartu sumber data menampilkan sheet aktif `DATA_MENTAH2` dan tombol langsung ke Google Spreadsheet.
- Riwayat laporan ditempatkan pada panel samping berukuran tetap dengan scroll dan tombol unduh per file.
- Import riil `DATA_MENTAH2` memproses 2.190 baris menjadi 2.185 SubSLS unik, 57 PML, 393 `pplKey`, target unik 198.770, dan capaian 109.884.
- Lima SubSLS memiliki multi-assignment; empat baris assignment mempunyai ID PPL tetapi nama/email berisi `-`; identitas tersebut tidak boleh ditebak.
- Ekspor strict saat ini diblokir oleh tepat 28 anomali `UJI_PETIK_TARGET_MISMATCH`: target SubSLS pada workbook progres berbeda dengan `DATA_MENTAH2`. Permissive tetap dapat membuat workbook dengan catatan verifikasi.
- Kolom UMKM ditemukan/tak ditemukan, Keluarga ditemukan/tak ditemukan, nama pelaksana Uji Petik, dan tanggal pelaksanaan belum memiliki sumber resmi sehingga tetap manual dan dipertahankan saat regenerate.
- Verifikasi terakhir: 40 test lulus, type-check lulus, lint lulus, build production lulus, Docker Compose aktif, dan QA visual dashboard lulus.

Bagian audit bertanggal 18 Juli di bawah merupakan jejak data sebelum `DATA_MENTAH2` menjadi sumber aktif. Jika angkanya berbeda, status 19 Juli ini yang berlaku untuk runtime terbaru.

## Pembaruan sumber assignment — 18 Juli 2026

- Sumber aktif dialihkan ke `DATA_MENTAH2` pada spreadsheet yang sama.
- `DATA_MENTAH` tetap menjadi alternatif rollback melalui `GOOGLE_SHEET_NAME`.
- Header `Capaian PPL` dipetakan ke `capaian` canonical.
- `ID PPL` dan `Capaian PML` dipertahankan dalam raw snapshot untuk audit; email tetap identitas utama dan `Capaian PML` tidak dijumlahkan ke capaian laporan.
- Audit sebelum integrasi: 2.190 baris, 2.185 SubSLS unik, total Capaian PPL 109.884, target unik 198.770, lima SubSLS multi-assignment, dan satu SubSLS tanpa target.
- Perubahan target besar `1110080054000202` dari 583 menjadi 26 harus tetap ditinjau sebagai perubahan antar-snapshot.

## Status per 18 Juli 2026

Implementasi saat ini sudah mencakup:

- monorepo npm dengan API Fastify/TypeScript dan dashboard React/Vite/Tailwind;
- PostgreSQL dan Prisma untuk metadata import, snapshot, anomali, laporan, data manual, dan audit;
- Docker Compose untuk PostgreSQL, API, dan web;
- pembacaan Google Sheets `DATA_MENTAH2` memakai service account file atau environment variable; `DATA_MENTAH` dipertahankan sebagai alternatif rollback;
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
| PPL unik (`pplKey`) | 390 |
| SubSLS unik | 2.185 |
| Target unik | 199.309 |
| Capaian | 109.536 |
| Anomali warning | 1.339 |
| Anomali error pada laporan permissive | 36 |

Referensi audit lokal terakhir:

- import ID: `cmrqj9npt00azny01lu3iljmj`;
- snapshot ID: `21cd3a96-fb5a-4506-a53e-f0a52dd1aeb9`;
- report ID: `cmrqjczu004qnny01tuzizprz`;
- output lokal: `storage/reports/LK_PPK_BIREUEN_2026_TERMIN_1_202607182242.xlsx`;
- SHA-256 output: `2239c8fe38e6b59299103705ee9136db3c11373d7e1a3b7073fe3fd0cd2d4b78`.

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

### Pembaruan 18 Juli 2026 — workbook progres lokal

Sumber tambahan sudah dipilih: `data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx`. Workbook tidak diunggah ke Google Sheets; API membacanya read-only dan menggabungkannya dengan sheet assignment aktif melalui Kode SubSLS.

Mapping yang sudah diimplementasikan:

- Target Usaha dari `USAHA PERUSAHAAN`;
- Target Keluarga dari Target U&K dikurangi Target Usaha per SubSLS;
- Usaha Keluarga ditemukan/tak ditemukan dari `USAHA KELUARGA`;
- hash sumber dan jumlah SubSLS yang cocok disimpan pada kolom audit tersembunyi workbook hasil;
- manual override lama tetap dipertahankan;
- SubSLS multi-PPL tidak dialokasikan agar tidak menggandakan angka.

Verifikasi sumber dan output riil:

- hash workbook progres: `338d8353692cc3bed326b9640e863e4fa7b4222fb0e03ce4f22b0c2c31434fc8`;
- label pembaruan sumber: `17 Jul 2026, 08.09`;
- 2.185/2.185 SubSLS cocok tanpa anomali join;
- 390 stable key PPL unik tanpa duplikasi;
- total Target Usaha 64.600;
- total Target Keluarga 134.709;
- total Usaha Keluarga ditemukan 10.909;
- total Usaha Keluarga tak ditemukan 10.877;
- workbook final berhasil dibuka Microsoft Excel tanpa repair;
- visual QA Uji Petik lulus dan seluruh field source-backed berwarna hijau.

Angka PPL lama 393 berasal dari penjumlahan PPL di dalam setiap kelompok PML dan menggandakan tiga PPL multi-PML. Dashboard dan Uji Petik sekarang memakai 390 `pplKey` unik. LK Termin 1 tetap mempertahankan struktur PML → PPL → SubSLS.

Yang tetap membutuhkan sumber/keputusan resmi: UMKM ditemukan/tak ditemukan dan Keluarga ditemukan/tak ditemukan. Jangan memetakan `USAHA PERUSAHAAN` sebagai UMKM tanpa konfirmasi definisi resmi.

Untuk field Uji Petik yang masih kosong, pastikan pemilik menentukan sumber resmi atau definisi mapping sebelum mengubah model bisnis. Setelah sumber dipastikan, kerjakan berurutan:

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
- Sheet sumber utama: `DATA_MENTAH2`; alternatif rollback: `DATA_MENTAH`.
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

## Audit final container — 19 Juli 2026

- `docker compose config --quiet`: lulus;
- `docker compose build --no-cache`: lulus untuk PostgreSQL, API, dan web;
- `docker compose up -d`: lulus, ketiga service berstatus healthy;
- API health: sukses dengan status `ok`;
- dashboard web: HTTP 200;
- sumber runtime terkonfirmasi `DATA_MENTAH2` dengan 57 PML, 393 PPL pada agregasi PML, dan 2.185 SubSLS;
- import langsung Google Sheets dari container: lulus, 2.190 baris, target 198.770, capaian 109.884;
- generate permissive dari container: lulus dengan hash file `7503db74dd53ab0ea65345abaaf2f7f896651d6be2f5ee6d53cdb146ad1e7419`;
- workbook audit dapat dibaca ulang ExcelJS tanpa error: sheet `LK Termin 1` dan `Uji Petik`, masing-masing 3.164 dan 1.966 cell formula, serta print area aktif;
- prosedur backup PostgreSQL berhasil menghasilkan dump custom-format sebesar 14.908.723 byte dan menyalinnya keluar container;
- TypeScript, lint, 40 unit/integration test, dan production build: lulus;
- `npm audit --audit-level=high`: tidak ada high/critical; dua temuan moderate transitif tetap dicatat di atas.

Panduan pemasangan, pemindahan data, backup/restore, operasi, dan troubleshooting tersedia di `docs/DOCKER_SETUP.md`.
