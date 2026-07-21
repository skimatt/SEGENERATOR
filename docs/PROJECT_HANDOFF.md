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
- Terdapat 28 anomali `UJI_PETIK_TARGET_MISMATCH` antara target workbook progres dan `DATA_MENTAH2`. Mulai pembaruan 21 Juli 2026, perbedaan ini tetap dicatat sebagai warning audit, tetapi Uji Petik memakai target workbook progres agar kolom Target U&K, Target Usaha, dan Target Keluarga konsisten.
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

Sumber tambahan aktif: `data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS-terbaru.xlsx`. Workbook tidak diunggah ke Google Sheets; API membacanya read-only dan menggabungkannya dengan sheet assignment aktif melalui Kode SubSLS.

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

## Audit akurasi LK Termin 1 — 20 Juli 2026

- layout resmi dipertahankan pada rentang `B2:O`: judul baris 2–3, header baris 5–7, dan data mulai `B8`;
- nomor kelompok PPL pada kolom B berurutan `1–396`; jumlah ini lebih besar dari 394 PPL unik karena petugas yang tercatat pada lebih dari satu PML tetap dipisahkan agar riwayat assignment tidak hilang;
- flag audit tersembunyi membedakan target unik regional (`Q`), baris detail capaian (`R`), target unik dalam masing-masing PML (`S`), PPL unik (`T`), kelompok PPL-PML (`U`), dan PML (`V`);
- subtotal PML menghitung target unik di dalam PML, sedangkan total wilayah tetap menghitung satu target per `SUBSLS_KEY`;
- formula target/capaian menggunakan `SUMIF` berbasis flag audit agar subtotal tidak ikut terhitung dan target kosong tidak menghasilkan `#VALUE!`;
- persentase mengembalikan sel kosong bila target kosong atau nol, bukan menampilkan `0%` yang menyesatkan;
- rekonsiliasi data aktif: 57 PML, 394 PPL unik, 396 kelompok PPL-PML, 2.185 SubSLS unik, 2.188 baris detail, target 198.770, dan capaian 119.099;
- tiga baris formula di bagian paling bawah menampilkan Total PML `57`, Total PPL Unik `394`, dan Total Kelompok PPL-PML `396`; nilai terakhir wajib sama dengan nomor urut terakhir;
- blok ringkasan memakai manual page break agar ketiga total selalu tercetak bersama dan tidak terpotong antarhalaman;
- workbook QA: `LK_PPK_BIREUEN_2026_TERMIN_1_202607201455.xlsx`, report ID `cmrsxkads0001o807fpkmuqlu`, hash `ac23e86a88b4ef872c9335c993eeda539c937ffa2a584d3ad252d2d1c33340e3`;
- Microsoft Excel berhasil membuka dan menghitung workbook tanpa repair; pemindaian 23 halaman `LK Termin 1` menemukan nol `#VALUE!`, `#REF!`, `#DIV/0!`, `#NAME?`, dan `#N/A`;
- konfigurasi Vitest mengecualikan `dist/**` agar salinan test hasil build tidak dihitung ulang; 6 file sumber/22 test, TypeScript, lint, production build, dan rebuild container API: lulus.

## Penyempurnaan Uji Petik — 21 Juli 2026

- sumber progres aktif diganti ke `data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS-terbaru.xlsx`;
- workbook berisi 2.185 kode SubSLS 16 digit yang unik dan konsisten pada delapan sheet; seluruh kode cocok dengan snapshot `DATA_MENTAH2` terbaru;
- Target U&K, Target Usaha, dan Target Keluarga pada Uji Petik memakai satu basis workbook progres sehingga `Target U&K = Target Usaha + Target Keluarga` untuk seluruh 393 PPL yang dapat dialokasikan;
- 28 `UJI_PETIK_TARGET_MISMATCH` tetap dicatat sebagai warning audit, tetapi tidak lagi membuang metrik progres atau memblokir strict mode karena target LK Termin 1 dan Uji Petik berasal dari konteks sumber berbeda;
- tiga SubSLS multi-PPL tetap tidak dialokasikan dan menghasilkan `UJI_PETIK_MULTI_PPL_UNALLOCATED`; satu PPL yang hanya mempunyai assignment ambigu menampilkan target kosong, bukan fallback yang menyesatkan;
- total metrik Uji Petik yang aman dialokasikan: Target U&K 198.870, Target Usaha 64.378, Target Keluarga 134.492, Usaha Keluarga Ditemukan 12.101, dan Usaha Keluarga Tak Ditemukan 11.938;
- field UMKM, keluarga ditemukan/tak ditemukan, hasil lapangan, pemeriksa, tanggal, realisasi manual, dan dokumentasi tetap manual karena tidak mempunyai pasangan sumber yang definisinya cukup tepat;
- layout Uji Petik memakai gaya netral mendekati template resmi: latar putih, header abu-abu ringan, border tipis, freeze tiga baris, footer halaman, dan total formula tanpa banyak warna;
- tampilan standar hanya memperlihatkan identitas PPL/PML, tiga target, Usaha Keluarga, `Keterangan Hasil Uji Petik`, serta realisasi otomatis; kelompok UMKM, Keluarga, pemeriksa/tanggal uji petik, realisasi manual, dan dokumentasi disembunyikan karena tidak mempunyai sumber terverifikasi. Kolom fisik tetap dipertahankan untuk kompatibilitas dan preservasi data manual;
- `Keterangan Hasil Uji Petik` adalah input teks bebas di kolom P, memiliki lebar 38, wrap text, dan dipertahankan menggunakan stable key; tidak memakai dropdown kategori;
- sheet `LK Termin 1` dan `Uji Petik` tidak memakai objek Excel Table/format `Ctrl+T`, hanya range biasa dengan border dan formula;
- stable key tetap `periode::pplKey`; QA berhasil memetakan 394 stable key unik dan mempertahankan seluruh entry dari laporan sebelumnya;
- workbook QA: `storage/reports/LK_PPK_BIREUEN_2026_TERMIN_1_FINAL_UJI_PETIK_QA.xlsx`.
