# VELUE.md

## 1. Tujuan Dokumen

Dokumen ini menyimpan nilai konfigurasi utama proyek yang aman untuk diketahui oleh AI agent selama proses pengembangan.

Dokumen ini bukan tempat menyimpan rahasia seperti password, private key, service account JSON, access token, atau credential produksi.

---

## 2. Identitas Proyek

```text
PROJECT_NAME=Sistem Generator Laporan LK PPK BPS Bireuen
PROJECT_OWNER=Rahmat Mulia
PROJECT_SCOPE=Pengolahan data PML, PPL, SubSLS, target, capaian, anomali, dan ekspor laporan Excel
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LOCALE=id-ID
DEFAULT_PROCESSING_MODE=strict
```

---

## 3. Sumber Data Google Spreadsheet

### Spreadsheet utama

```text
SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg/edit?usp=sharing
SPREADSHEET_ID=1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg
```

### Sheet sumber

Gunakan nama sheet berikut sebagai sumber data utama:

```text
SOURCE_SHEET_NAME=DATA_MENTAH2
ALTERNATIVE_SOURCE_SHEET_NAME=DATA_MENTAH
```

Jika nama sheet aktual masih berbeda, agent wajib membuat konfigurasi yang dapat diubah tanpa mengubah kode inti.

Agent tidak boleh mengunci `gid` sebagai identitas utama sheet. Gunakan nama sheet atau sheet ID hasil pembacaan Google Sheets API.

---

## 4. Struktur Kolom Sumber

Kolom canonical yang wajib dikenali:

```text
No
Kode SubSLS
Nama SLS
Nama PPL
Email PPL
ID PPL
Nama PML
Email PML
Status PPL Sobat
Jenis Mitra
Capaian PPL
Capaian PML
Target Prelist Awal
Link Assignment PPL
```

Mapping internal:

```text
No                  -> no
Kode SubSLS         -> kodeSubSls
Nama SLS            -> namaSls
Nama PPL            -> namaPpl
Email PPL           -> emailPpl
ID PPL              -> idPpl (raw/audit, identitas sekunder)
Nama PML            -> namaPml
Email PML           -> emailPml
Status PPL Sobat    -> statusPplSobat
Jenis Mitra         -> jenisMitra
Capaian PPL          -> capaian
Capaian PML          -> capaianPml (raw/audit, tidak dijumlahkan ke capaian PPL)
Target Prelist Awal -> targetPrelistAwal
Link Assignment PPL -> linkAssignmentPpl
```

`Email PPL` tetap menjadi identitas utama. `ID PPL` tidak boleh menggantikan email tanpa perubahan aturan bisnis tertulis. `Capaian PML` dipertahankan pada raw snapshot untuk audit dan tidak masuk agregasi laporan sampai definisi bisnis resminya disetujui.

---

## 5. Teknologi Utama

### Backend

```text
RUNTIME=Node.js LTS
LANGUAGE=TypeScript
BACKEND_FRAMEWORK=Fastify
VALIDATION=Zod
ORM=Prisma
DATABASE=PostgreSQL
EXCEL_ENGINE=ExcelJS
GOOGLE_DATA_SOURCE=Google Sheets API
LOGGER=Pino
```

Fastify dipilih karena ringan, cepat, mudah diuji, dan sesuai untuk service generator laporan.

### Frontend

```text
FRONTEND_FRAMEWORK=React
BUILD_TOOL=Vite
LANGUAGE=TypeScript
UI_STYLE=Tailwind CSS
SERVER_STATE=TanStack Query
FORM=React Hook Form
FORM_VALIDATION=Zod
```

### Pengujian

```text
UNIT_TEST=Vitest
API_TEST=Supertest
E2E_TEST=Playwright
EXCEL_TEST=Golden File Testing
```

### Infrastruktur

```text
CONTAINER=Docker
LOCAL_ORCHESTRATION=Docker Compose
CI_CD=GitHub Actions
PRODUCTION_DEPLOYMENT=Google Cloud Run
FILE_STORAGE=Google Drive atau Object Storage
```

---

## 6. Teknologi yang Tidak Digunakan sebagai Mesin Utama

```text
Google Apps Script
```

Apps Script boleh digunakan hanya sebagai:

- tombol dari Google Sheets;
- menu Generate Laporan;
- trigger;
- pemanggil endpoint backend;
- penulis link file hasil.

Apps Script tidak digunakan sebagai mesin utama pembentuk file Excel karena output harus mempertahankan format `.xlsx` secara presisi.

---

## 7. Arsitektur yang Dikunci

```text
Google Sheets
    ↓
Google Sheets API
    ↓
Backend Fastify + TypeScript
    ↓
Normalizer
    ↓
Validator
    ↓
Identity Resolver
    ↓
Assignment Resolver
    ↓
Aggregation Engine
    ↓
Anomaly Detector
    ↓
ExcelJS Template Renderer
    ↓
Template 1 + Template 2
    ↓
XLSX Final
```

---

## 8. Template Excel

```text
TEMPLATE_FILE_NAME=LK_PPK.xlsx
TEMPLATE_SHEET_1=LK Termin 1
TEMPLATE_SHEET_2=Uji Petik
```

Ketentuan:

- jangan membuat desain Excel dari nol jika file template resmi tersedia;
- buka template asli menggunakan ExcelJS;
- pertahankan style, merge, border, formula, ukuran kolom, tinggi baris, area cetak, dan konfigurasi halaman;
- file output harus dapat dibuka tanpa pesan repair;
- formula harus aktif dan dapat dihitung ulang di Excel.

---

## 9. Output Laporan

Format nama file:

```text
LK_PPK_BIREUEN_{PERIODE}_{TIMESTAMP}.xlsx
```

Contoh:

```text
LK_PPK_BIREUEN_2026_TERMIN_1_20260717_2015.xlsx
```

Folder output:

```text
storage/reports/
```

Folder template:

```text
templates/
```

Folder snapshot:

```text
storage/snapshots/
```

---

## 10. Identitas Petugas

### PPL

```text
PRIMARY_PPL_IDENTIFIER=emailPpl
```

Fallback:

```text
namaPpl + pmlKey
```

### PML

```text
PRIMARY_PML_IDENTIFIER=emailPml
```

Fallback:

```text
namaPml
```

Aturan:

- email dinormalisasi menjadi lowercase;
- spasi awal dan akhir dihapus;
- nama hanya sebagai tampilan;
- nama sama dengan email berbeda tidak boleh otomatis digabung;
- email sama dengan nama berbeda harus ditandai sebagai konflik identitas;
- semua fallback harus menghasilkan warning.

---

## 11. Identitas Penugasan

```text
ASSIGNMENT_KEY=periode::kodeSubSls::pplKey
SUBSLS_KEY=periode::kodeSubSls
```

Baris tidak boleh dihapus hanya karena kode SubSLS sama.

Satu SubSLS dapat memiliki:

- satu PPL;
- beberapa PPL;
- reassignment;
- pergantian PML;
- riwayat petugas.

---

## 12. Aturan Nilai

### Capaian

```text
"-"      -> 0
kosong   -> 0
null     -> 0
negatif  -> error
```

### Target

```text
"-"      -> null
kosong   -> null
null     -> null
negatif  -> error
```

### Link

```text
"-"      -> null
kosong   -> null
```

### Kode SubSLS

```text
TYPE=string
```

Jangan pernah menyimpan Kode SubSLS sebagai number.

---

## 13. Rumus Utama

### Persentase per SubSLS

```excel
=IFERROR(Capaian/Target,0)
```

### Capaian efektif

```excel
=MIN(Capaian,Target)
```

### Sisa target

```excel
=MAX(Target-Capaian,0)
```

### Kelebihan capaian

```excel
=MAX(Capaian-Target,0)
```

### Status

```excel
=IF(Target=0,
"Perlu Verifikasi",
IF(Capaian=0,
"Belum Ada Capaian",
IF(Capaian<Target,
"Dalam Proses",
IF(Capaian=Target,
"Selesai",
"Melebihi Target"))))
```

---

## 14. Aturan Target

Target wilayah dan target PML harus dihitung berdasarkan:

```text
Kode SubSLS unik
```

Bukan berdasarkan jumlah baris.

Jika satu SubSLS muncul beberapa kali karena reassignment:

```text
target tetap dihitung satu kali
```

Jika target berbeda pada SubSLS yang sama:

```text
status=TARGET_CONFLICT
```

Dalam strict mode, laporan tidak boleh difinalisasi sebelum konflik ditangani.

---

## 15. Aturan Capaian

Capaian per PPL:

```text
jumlah capaian assignment unik milik PPL
```

Capaian per SubSLS:

```text
jumlah kontribusi assignment unik
```

Exact duplicate tidak boleh dihitung dua kali.

Multi-PPL harus tetap dicatat dan tidak boleh otomatis dihapus.

---

## 16. Template 1

Nama:

```text
LK Termin 1
```

Struktur:

```text
PML
  └── PPL
       └── SubSLS
```

Data otomatis:

- nomor;
- nama PML;
- email PML;
- nama PPL;
- email PPL;
- kode wilayah;
- kode SubSLS;
- nama SLS;
- target;
- capaian;
- persentase;
- subtotal PPL;
- subtotal PML;
- status;
- keterangan.

---

## 17. Template 2

Nama:

```text
Uji Petik
```

Data otomatis:

- nama PPL;
- nama PML;
- email PPL;
- email PML;
- jumlah SubSLS;
- total target;
- total capaian;
- persentase;
- jumlah belum ada capaian;
- jumlah di bawah target;
- jumlah sesuai target;
- jumlah melebihi target;
- target kosong;
- target nol;
- assignment tanpa link;
- multi-PPL;
- multi-PML;
- reassignment;
- hasil deteksi sistem.

Data manual:

- hasil uji petik;
- penyebab;
- data pindah;
- data ganda;
- nama pemeriksa;
- tanggal pemeriksaan;
- tindak lanjut;
- dokumentasi;
- keterangan lapangan.

Kolom manual tidak boleh hilang saat laporan dibuat ulang.

---

## 18. Database

Gunakan PostgreSQL.

Tabel minimum:

```text
users
data_sources
imports
raw_rows
normalized_rows
master_petugas
assignments
anomalies
snapshots
reports
report_manual_entries
audit_logs
```

Gunakan Prisma migration.

---

## 19. Environment Variables

Gunakan `.env`.

```env
NODE_ENV=development
PORT=3000
APP_TIMEZONE=Asia/Jakarta

DATABASE_URL=

GOOGLE_SPREADSHEET_ID=1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg
# Sumber aktif. Alternatif rollback: DATA_MENTAH
GOOGLE_SHEET_NAME=DATA_MENTAH2
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

REPORT_TEMPLATE_PATH=./templates/LK_PPK.xlsx
REPORT_OUTPUT_DIR=./storage/reports
SNAPSHOT_DIR=./storage/snapshots

DEFAULT_PROCESSING_MODE=strict
```

Jangan menyimpan nilai credential asli di `VELUE.md`.

---

## 20. Nilai Default Sistem

```text
DEFAULT_ROLE=owner
DEFAULT_PROCESSING_MODE=strict
DEFAULT_EXPORT_FORMAT=xlsx
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LOCALE=id-ID
DEFAULT_REPORT_REGION=Kabupaten Bireuen
DEFAULT_REPORT_PROVINCE=Aceh
DEFAULT_REPORT_TITLE=Beban Kerja Petugas Lapangan SE2026
```

---

## 21. Deployment

Deployment backend utama:

```text
Google Cloud Run
```

Database:

```text
PostgreSQL managed atau Docker PostgreSQL
```

Frontend:

```text
Vercel atau Cloud Run
```

Untuk tahap lokal:

```text
Docker Compose
```

---

## 22. Aturan Agent

Agent wajib membaca:

```text
AGENTS.md
VELUE.md
README.md
.env.example
prisma/schema.prisma
template mapping
test suite
```

Sebelum menulis kode.

Jika nilai pada `VELUE.md` berbeda dengan nilai runtime:

```text
environment variable memiliki prioritas
```

Urutan prioritas konfigurasi:

```text
environment variable
→ database settings
→ VELUE.md
→ default dalam kode
```

Jangan membuat nilai konfigurasi baru secara tersembunyi.

---

## 23. Hal yang Dilarang

Agent dilarang:

- mengganti spreadsheet tanpa persetujuan;
- mengubah nama sheet sumber secara diam-diam;
- menaruh credential asli di file ini;
- menggunakan Apps Script sebagai generator Excel utama;
- mengubah ExcelJS tanpa alasan teknis;
- mengganti PostgreSQL dengan penyimpanan tidak terstruktur;
- menghapus snapshot lama;
- menyatukan petugas hanya berdasarkan nama;
- menghitung target dari jumlah baris;
- menyimpan kode SubSLS sebagai number;
- menimpa kolom manual Template 2;
- menghapus anomali agar laporan terlihat bersih.

---

## 24. Status Konfigurasi

```text
SPREADSHEET_CONFIGURED=true
TECH_STACK_LOCKED=true
EXCEL_TEMPLATE_REQUIRED=true
STRICT_MODE_DEFAULT=true
AUDIT_REQUIRED=true
MANUAL_DATA_PRESERVATION_REQUIRED=true
```

---

## 25. Sumber Progres Uji Petik Lokal

Workbook progres FASIH disimpan lokal dan dipasang read-only ke container API:

```text
PROGRESS_WORKBOOK_PATH=./data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS-terbaru.xlsx
```

Tidak perlu menyalin seluruh workbook ke Google Spreadsheet. `DATA_MENTAH2` menjadi sumber aktif identitas dan assignment PPL; `DATA_MENTAH` tetap tersedia sebagai alternatif rollback, sedangkan workbook progres menjadi sumber metrik berdasarkan `Kode SubSLS`.

Sheet yang dibaca:

```text
PROGRES PENDATAAN
USAHA PERUSAHAAN
USAHA KELUARGA
```

Mapping yang disetujui:

```text
Target U&K                  <- PROGRES PENDATAAN / Jumlah Prelist Usaha & Keluarga
Target Usaha                <- USAHA PERUSAHAAN / Jumlah Prelist Usaha
Target Keluarga             <- Target U&K - Target Usaha per SubSLS
Usaha Keluarga Ditemukan    <- USAHA KELUARGA / Ditemukan
Usaha Keluarga Tak Ditemukan<- USAHA KELUARGA / Tidak Ditemukan
```

Kolom berikut belum memiliki definisi sumber yang cukup eksplisit dan tetap manual:

```text
UMKM Ditemukan
UMKM Tak Ditemukan
Keluarga Ditemukan
Keluarga Tak Ditemukan
Hasil Uji Petik
Pemeriksa
Tanggal
Dokumentasi
```

Aturan join:

```text
workbook progres.Kode SubSLS
→ sheet assignment aktif.kodeSubSls
→ sheet assignment aktif.emailPpl
→ agregasi per pplKey
```

Jika satu SubSLS memiliki beberapa PPL, metrik progres tidak boleh diberikan penuh kepada semua PPL karena akan menggandakan angka. Baris tersebut harus dikeluarkan dari agregasi Uji Petik dan dicatat sebagai `UJI_PETIK_MULTI_PPL_UNALLOCATED` sampai assignment resmi ditentukan.
