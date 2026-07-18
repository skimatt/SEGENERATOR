# AGENTS.md

## 1. Identitas Proyek

**Nama proyek:** Sistem Generator Laporan LK PPK BPS Bireuen
**Pemilik sistem:** Rahmat Mulia
**Tujuan utama:** Mengolah data penugasan PML, PPL, SubSLS, target, capaian, dan assignment dari Google Sheets menjadi laporan Excel `.xlsx` yang akurat, konsisten, dapat diaudit, dan mengikuti format template resmi.

Dokumen ini adalah sumber aturan utama bagi seluruh AI coding agent yang mengembangkan, meninjau, menguji, atau memperbaiki proyek.

---

## 2. Prinsip Utama Pengembangan

Semua agent wajib mengikuti prinsip berikut:

1. **Akurasi data lebih penting daripada kecepatan implementasi.**
2. **Jangan mengubah logika bisnis tanpa bukti dan persetujuan.**
3. **Jangan menghapus data mentah.**
4. **Setiap transformasi harus dapat ditelusuri.**
5. **Tidak boleh ada target yang terhitung ganda.**
6. **Tidak boleh ada petugas yang digabung hanya berdasarkan nama.**
7. **Email adalah identitas utama petugas.**
8. **Kode SubSLS wajib diperlakukan sebagai teks.**
9. **Setiap hasil agregasi wajib memiliki pengujian otomatis.**
10. **Output Excel harus tetap dapat diedit, dihitung ulang, dicetak, dan diaudit.**
11. **Jangan menulis kode spekulatif. Baca struktur proyek sebelum mengubah file.**
12. **Perubahan kecil lebih diutamakan daripada refactor besar yang tidak diperlukan.**
13. **Semua error harus menghasilkan pesan yang jelas dan dapat ditindaklanjuti.**
14. **Tidak boleh menutupi anomali data dengan nilai default yang menyesatkan.**
15. **Semua hasil harus deterministik: input yang sama menghasilkan output yang sama.**

---

## 3. Ruang Lingkup Sistem

Sistem harus mampu:

- membaca data dari Google Sheets;
- membaca template Excel resmi;
- menormalisasi data mentah;
- memvalidasi identitas dan struktur data;
- mengelompokkan data berdasarkan PML, PPL, dan SubSLS;
- mendeteksi duplikasi, reassignment, multi-PPL, dan multi-PML;
- menghitung target, capaian, persentase, dan status;
- menghasilkan Template 1;
- menghasilkan Template 2;
- mempertahankan formula Excel;
- mempertahankan style, border, merge, ukuran kolom, tinggi baris, dan area cetak;
- menyimpan snapshot hasil proses;
- menghasilkan log audit;
- menyediakan laporan anomali;
- mendukung proses generate ulang tanpa merusak data lama.

---

## 4. Teknologi yang Dikunci

Gunakan stack berikut kecuali ada instruksi perubahan tertulis:

### Backend

- Node.js versi LTS
- TypeScript
- Express atau Fastify
- Zod untuk validasi schema
- ExcelJS untuk manipulasi file Excel
- Google Sheets API untuk membaca data
- Prisma ORM
- PostgreSQL untuk metadata, audit, snapshot, dan konfigurasi

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- komponen UI yang clean dan sederhana
- TanStack Query untuk komunikasi API
- React Hook Form
- Zod untuk validasi form

### Pengujian

- Vitest
- Supertest
- Playwright
- test fixture khusus data Google Sheets
- golden-file testing untuk hasil Excel

### Infrastruktur

- Docker
- Docker Compose
- GitHub Actions
- file `.env`
- penyimpanan output lokal atau object storage
- deployment dapat dilakukan ke server pribadi, VPS, atau platform container

Jangan mengganti teknologi inti tanpa alasan teknis yang terukur.

---

## 5. Arsitektur Sistem

Gunakan pendekatan modular.

```text
Google Sheets
    ↓
Sheets Reader
    ↓
Raw Data Snapshot
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
Report Model Builder
    ↓
Excel Template Renderer
    ↓
XLSX Output + Audit Log
```

Struktur modul minimum:

```text
src/
├── app/
├── config/
├── modules/
│   ├── auth/
│   ├── sheets/
│   ├── imports/
│   ├── normalization/
│   ├── validation/
│   ├── identities/
│   ├── assignments/
│   ├── aggregation/
│   ├── anomalies/
│   ├── reports/
│   ├── excel/
│   ├── snapshots/
│   └── audit/
├── shared/
│   ├── errors/
│   ├── logger/
│   ├── types/
│   ├── utils/
│   └── constants/
├── tests/
└── main.ts
```

Setiap modul harus memiliki tanggung jawab tunggal.

---

## 6. Sumber Data Utama

Spreadsheet sumber memiliki kolom:

```text
No
Kode SubSLS
Nama SLS
Nama PPL
Email PPL
Nama PML
Email PML
Status PPL Sobat
Jenis Mitra
Capaian
Target Prelist Awal
Link Assignment PPL
```

Agent tidak boleh mengandalkan posisi kolom secara permanen.

Kolom harus dicocokkan berdasarkan nama header yang sudah dinormalisasi.

Contoh alias header yang dapat diterima:

```text
Kode SubSLS
Kode Subsls
kode_subsls
kode subsls
```

Namun nama header canonical harus tetap:

```text
kode_subsls
```

---

## 7. Model Data Canonical

Gunakan tipe data internal berikut:

```ts
type CanonicalRow = {
  sourceRowNumber: number;
  no: string | null;
  kodeSubSls: string;
  namaSls: string | null;
  namaPpl: string | null;
  emailPpl: string | null;
  namaPml: string | null;
  emailPml: string | null;
  statusPplSobat: string | null;
  jenisMitra: string | null;
  capaian: number;
  targetPrelistAwal: number | null;
  linkAssignmentPpl: string | null;

  pplKey: string;
  pmlKey: string;
  assignmentKey: string;
  subslsKey: string;

  raw: Record<string, unknown>;
  warnings: DataWarning[];
};
```

Data mentah harus tetap tersedia pada properti `raw`.

---

## 8. Aturan Normalisasi

### 8.1 String

Semua string:

- trim spasi awal dan akhir;
- ubah spasi berulang menjadi satu spasi;
- pertahankan karakter penting;
- jangan otomatis mengubah nama menjadi huruf kapital semua;
- gunakan canonical comparison secara case-insensitive.

### 8.2 Email

Normalisasi email:

```text
trim
lowercase
hapus spasi tersembunyi
validasi format
```

Jangan:

- menghapus titik dari alamat Gmail;
- mengubah domain;
- menebak email yang salah;
- menggabungkan dua orang hanya karena nama mirip.

### 8.3 Kode SubSLS

Kode SubSLS:

- wajib string;
- wajib mempertahankan nol di depan;
- hapus spasi;
- hapus akhiran `.0` hanya jika berasal dari konversi numerik;
- jangan menggunakan tipe JavaScript `number`;
- jangan melakukan pembulatan;
- validasi panjang berdasarkan konfigurasi, bukan hard-code tanpa bukti.

### 8.4 Angka

Untuk `capaian`:

- tanda `-` menjadi `0`;
- string kosong menjadi `0`;
- angka negatif ditolak;
- angka desimal ditolak kecuali aturan resmi mengizinkan;
- nilai gagal parsing masuk anomali.

Untuk `targetPrelistAwal`:

- tanda `-` menjadi `null`;
- string kosong menjadi `null`;
- angka negatif ditolak;
- nilai gagal parsing masuk anomali;
- jangan otomatis mengganti target kosong menjadi nol tanpa penanda.

### 8.5 Link

Nilai berikut menjadi `null`:

```text
-
kosong
null
undefined
```

Link nonkosong harus divalidasi sebagai URL.

---

## 9. Aturan Identitas

### 9.1 Identitas PML

Prioritas:

```text
PML_KEY = normalized(emailPml)
```

Jika email PML kosong:

```text
PML_KEY = fallback hash dari normalized(namaPml)
```

Fallback wajib diberi peringatan:

```text
PML_EMAIL_MISSING
```

### 9.2 Identitas PPL

Prioritas:

```text
PPL_KEY = normalized(emailPpl)
```

Jika email PPL kosong:

```text
PPL_KEY = normalized(namaPpl) + "::" + pmlKey
```

Fallback wajib diberi peringatan:

```text
PPL_EMAIL_MISSING
```

### 9.3 Larangan Penggabungan

Jangan menggabungkan petugas hanya berdasarkan:

- nama depan;
- kemiripan nama;
- nama yang sama tetapi email berbeda;
- email yang sama tetapi terdapat konflik identitas tanpa audit.

Konflik identitas wajib masuk daftar anomali.

---

## 10. Aturan Assignment

Gunakan:

```text
ASSIGNMENT_KEY = periode + "::" + kodeSubSls + "::" + pplKey
```

Gunakan:

```text
SUBSLS_KEY = periode + "::" + kodeSubSls
```

Satu SubSLS dapat memiliki:

- satu PPL;
- beberapa PPL;
- riwayat pergantian PPL;
- pergantian PML;
- assignment aktif dan tidak aktif.

Jangan menghapus baris multi-PPL secara otomatis.

---

## 11. Aturan Perhitungan

### 11.1 Target Unik SubSLS

Untuk total wilayah atau total PML:

```text
Target dihitung satu kali per SUBSLS_KEY.
```

Jika target berbeda pada SubSLS yang sama:

- jangan pilih nilai secara diam-diam;
- tandai `TARGET_CONFLICT`;
- masukkan ke laporan anomali;
- gunakan resolver yang dikonfigurasi.

Default resolver:

```text
gunakan nilai target valid terbaru berdasarkan urutan snapshot
```

Jika tidak ada metadata waktu:

```text
jangan finalisasi laporan sebelum konflik ditinjau,
atau gunakan nilai maksimum dengan warning eksplisit jika mode permissive aktif.
```

### 11.2 Capaian Multi-PPL

Default:

```text
capaian SubSLS = jumlah capaian seluruh assignment unik pada SubSLS
```

Namun:

- assignment duplikat persis tidak boleh dijumlahkan dua kali;
- duplikasi harus dideteksi berdasarkan fingerprint;
- hasil agregasi harus menyimpan rincian contributor.

### 11.3 Persentase

Gunakan:

```text
persentase = capaian / target
```

Aturan:

- target `null`: persentase `null`;
- target `0` dan capaian `0`: status `TARGET_ZERO`;
- target `0` dan capaian > 0: status `CAPAIAN_WITHOUT_TARGET`;
- jangan menghasilkan `Infinity`;
- tampilan Excel menggunakan `IFERROR`.

### 11.4 Total PPL

Total PPL:

```text
totalCapaianPpl = jumlah capaian assignment unik milik PPL
totalTargetPpl = jumlah target assignment yang secara resmi menjadi tanggung jawab PPL
```

Karena target multi-PPL berpotensi ganda, hasil PPL harus dibedakan dari total wilayah.

Simpan dua metrik:

```text
assignedTarget
uniqueRegionalTarget
```

### 11.5 Total PML

Total PML:

```text
totalTargetPml = jumlah target unik berdasarkan SUBSLS_KEY
totalCapaianPml = jumlah capaian seluruh assignment unik di bawah PML
```

Jika satu SubSLS berpindah antar-PML, wajib ditandai.

---

## 12. Deduplication

Buat fingerprint baris:

```text
hash(
  periode,
  kodeSubSls,
  pplKey,
  pmlKey,
  capaian,
  target,
  linkAssignment
)
```

Jenis duplikasi:

```text
EXACT_DUPLICATE
POSSIBLE_DUPLICATE
REASSIGNMENT
MULTI_PPL
MULTI_PML
IDENTITY_CONFLICT
TARGET_CONFLICT
```

Hanya `EXACT_DUPLICATE` yang boleh dikeluarkan otomatis dari agregasi.

Baris asli tetap disimpan dalam snapshot.

---

## 13. Deteksi Anomali

Sistem minimum harus mendeteksi:

- email PPL kosong;
- email PML kosong;
- email tidak valid;
- nama kosong;
- kode SubSLS kosong;
- kode SubSLS tidak valid;
- target kosong;
- target nol;
- capaian melebihi target;
- capaian tanpa target;
- target berbeda untuk SubSLS sama;
- satu PPL berada di beberapa PML;
- satu SubSLS memiliki beberapa PPL;
- satu SubSLS berpindah PML;
- link assignment kosong;
- link tidak valid;
- duplikasi persis;
- identitas nama sama dengan email berbeda;
- identitas email sama dengan nama berbeda;
- status petugas tidak diketahui;
- nilai angka gagal parsing;
- perubahan target antar-snapshot;
- perubahan petugas antar-snapshot.

Setiap anomali memiliki:

```ts
type Anomaly = {
  code: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  sourceRows: number[];
  entityType: "row" | "ppl" | "pml" | "subsls" | "assignment";
  entityKey: string;
  metadata: Record<string, unknown>;
};
```

---

## 14. Mode Proses

Sediakan dua mode:

### Strict Mode

Laporan gagal dibuat jika terdapat:

- kode SubSLS kosong;
- target conflict;
- angka tidak valid;
- struktur header tidak lengkap;
- template Excel rusak;
- formula reference tidak valid;
- identitas utama tidak dapat ditentukan.

### Permissive Mode

Laporan tetap dibuat dengan:

- warning eksplisit;
- sheet khusus anomali;
- log keputusan resolver;
- watermark atau label `PERLU VERIFIKASI`.

Default produksi: **Strict Mode**.

---

## 15. Output Template 1

Template 1 harus dikelompokkan:

```text
PML
  └── PPL
       └── SubSLS
```

Ketentuan:

- PML hanya ditampilkan sekali per kelompok;
- PPL hanya ditampilkan sekali per kelompok;
- semua SubSLS milik PPL berada di bawahnya;
- subtotal PPL menggunakan formula;
- subtotal PML menggunakan formula;
- persentase menggunakan formula;
- merge cell tidak boleh memutus border;
- tinggi baris menyesuaikan teks;
- freeze pane sesuai template;
- area cetak ditetapkan;
- orientasi halaman sesuai template;
- repeat header row aktif jika diperlukan;
- footer dan nomor halaman dipertahankan jika ada;
- file tetap dapat dibuka tanpa repair warning.

---

## 16. Output Template 2

Template 2 memuat ringkasan dan uji petik.

Terisi otomatis:

- nama PPL;
- email PPL;
- nama PML;
- email PML;
- jumlah SubSLS;
- total target;
- total capaian;
- persentase;
- jumlah target kosong;
- jumlah target nol;
- jumlah belum ada capaian;
- jumlah di bawah target;
- jumlah sesuai target;
- jumlah melebihi target;
- jumlah assignment tanpa link;
- jumlah reassignment;
- jumlah multi-PML;
- hasil deteksi sistem.

Disediakan untuk input manual:

- hasil uji petik;
- penyebab;
- data pindah;
- data ganda;
- pemeriksa;
- tanggal pemeriksaan;
- tindak lanjut;
- dokumentasi;
- keterangan lapangan.

Kolom manual:

- tidak boleh ditimpa saat regenerate;
- harus dapat dipertahankan melalui stable row key;
- harus memiliki validasi data jika diperlukan.

---

## 17. Preservasi Data Manual

Saat laporan dibuat ulang, sistem harus:

1. membaca file output lama jika tersedia;
2. mencari baris menggunakan stable key;
3. mengambil nilai manual;
4. memasukkan kembali nilai manual ke output baru;
5. mencatat baris yang gagal dipetakan.

Stable key minimum:

```text
periode + pplKey
```

Untuk data yang lebih spesifik:

```text
periode + pplKey + subslsKey
```

Jangan menggunakan nomor urut baris sebagai identitas permanen.

---

## 18. Snapshot dan Audit

Setiap proses import wajib menyimpan:

```text
snapshotId
spreadsheetId
sheetName
importedAt
rowCount
sourceHash
templateHash
generatedBy
applicationVersion
processingMode
```

Setiap output wajib menyimpan:

```text
reportId
snapshotId
filename
fileHash
generatedAt
warningCount
errorCount
status
```

Audit log harus mencatat:

- siapa menjalankan proses;
- kapan dijalankan;
- konfigurasi yang digunakan;
- resolver yang digunakan;
- jumlah data;
- jumlah duplikasi;
- jumlah anomali;
- file hasil;
- kegagalan proses.

---

## 19. Keamanan

- jangan menyimpan credential di source code;
- gunakan `.env`;
- jangan commit service account JSON;
- validasi semua input;
- batasi ukuran file;
- sanitasi nama file;
- gunakan authentication;
- gunakan role tunggal `owner` pada versi awal;
- semua endpoint generate memerlukan autentikasi;
- log tidak boleh membocorkan token;
- link Google Sheets harus divalidasi;
- spreadsheet ID diekstrak dengan aman;
- file output tidak boleh dapat diakses melalui path traversal;
- gunakan rate limiting;
- gunakan secure headers;
- lakukan dependency audit.

---

## 20. Konfigurasi Environment

Contoh:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SPREADSHEET_ID=
GOOGLE_SHEET_NAME=DATA_MENTAH
REPORT_TEMPLATE_PATH=./templates/LK_PPK.xlsx
REPORT_OUTPUT_DIR=./storage/reports
SNAPSHOT_DIR=./storage/snapshots
DEFAULT_PROCESSING_MODE=strict
APP_TIMEZONE=Asia/Jakarta
```

Jangan menaruh nilai rahasia pada dokumentasi publik.

---

## 21. API Minimum

```text
POST   /api/imports/google-sheets
GET    /api/imports/:id
POST   /api/imports/:id/validate
GET    /api/imports/:id/anomalies
POST   /api/reports/generate
GET    /api/reports
GET    /api/reports/:id
GET    /api/reports/:id/download
GET    /api/snapshots
GET    /api/snapshots/:id/diff
GET    /api/health
```

Semua response menggunakan format konsisten:

```ts
type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta?: Record<string, unknown>;
};
```

---

## 22. UI Minimum

Halaman:

```text
/login
/dashboard
/data-source
/imports
/imports/:id
/anomalies
/reports
/reports/:id
/settings
/audit-log
```

Dashboard minimum:

- status koneksi Google Sheets;
- snapshot terakhir;
- jumlah PML;
- jumlah PPL;
- jumlah SubSLS unik;
- total target unik;
- total capaian;
- jumlah anomali;
- tombol generate;
- riwayat laporan.

UI harus:

- clean;
- responsif;
- tidak penuh dekorasi;
- memberi konfirmasi untuk proses penting;
- menampilkan progress;
- membedakan error, warning, dan info;
- memudahkan download laporan.

---

## 23. Logging dan Error Handling

Gunakan structured logging.

Setiap log minimal:

```text
timestamp
level
requestId
module
action
message
metadata
```

Jangan gunakan `console.log` pada kode produksi.

Gunakan error class:

```ts
AppError
ValidationError
DataConflictError
TemplateError
GoogleSheetsError
ReportGenerationError
```

Jangan menelan error dengan `catch` kosong.

---

## 24. Standar Kode

- TypeScript strict mode aktif;
- hindari `any`;
- gunakan nama variabel deskriptif;
- fungsi maksimal fokus pada satu tugas;
- tidak boleh ada fungsi bisnis raksasa;
- gunakan pure function untuk normalisasi dan agregasi;
- pisahkan I/O dari logika bisnis;
- gunakan dependency injection bila masuk akal;
- tidak melakukan query database di controller;
- jangan menulis formula Excel tersebar di banyak file;
- formula dan posisi template harus melalui configuration mapping;
- jangan hard-code nomor baris template tanpa adapter.

---

## 25. Template Mapping

Semua koordinat Excel disimpan dalam konfigurasi.

Contoh:

```ts
type TemplateMapping = {
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columns: {
    no: string;
    namaPml: string;
    namaPpl: string;
    kodeSubSls: string;
    namaSls: string;
    target: string;
    capaian: string;
    persentase: string;
  };
};
```

Jangan menulis koordinat seperti `J8` langsung di banyak fungsi.

Gunakan helper:

```ts
buildCellRef(column, row)
buildRange(startColumn, startRow, endColumn, endRow)
```

---

## 26. Pengujian Wajib

### Unit Test

Wajib menguji:

- normalisasi email;
- normalisasi kode SubSLS;
- parsing capaian;
- parsing target;
- pembentukan PPL key;
- pembentukan PML key;
- assignment key;
- deduplication;
- target unik;
- capaian multi-PPL;
- target conflict;
- persentase;
- anomaly detection.

### Integration Test

Wajib menguji:

- pembacaan Google Sheets;
- penyimpanan snapshot;
- validasi import;
- generate report;
- penyimpanan metadata;
- download output.

### Golden File Test

Bandingkan hasil Excel dengan expected workbook:

- nama sheet;
- jumlah baris;
- merge cells;
- formula;
- style penting;
- lebar kolom;
- tinggi baris;
- print area;
- freeze panes;
- nilai subtotal;
- nilai total.

### End-to-End Test

Skenario:

```text
login
→ import data
→ review anomaly
→ generate report
→ download
→ buka file tanpa error
```

---

## 27. Dataset Pengujian Minimum

Fixture harus mencakup:

1. satu PML, satu PPL, satu SubSLS;
2. satu PML, satu PPL, banyak SubSLS;
3. satu PML, banyak PPL;
4. satu SubSLS dengan dua PPL;
5. satu PPL dengan dua PML;
6. target sama pada duplikasi;
7. target konflik;
8. email kosong;
9. nama sama, email berbeda;
10. email sama, nama berbeda;
11. capaian `-`;
12. target `-`;
13. kode SubSLS dengan nol di depan;
14. kode SubSLS berubah menjadi `.0`;
15. exact duplicate;
16. reassignment;
17. capaian melebihi target;
18. target nol;
19. link assignment kosong;
20. data manual yang harus dipertahankan saat regenerate.

---

## 28. Acceptance Criteria

Fitur dianggap selesai hanya jika:

- seluruh test lulus;
- output Excel dapat dibuka tanpa repair;
- total target unik benar;
- total capaian benar;
- duplikasi tidak menggandakan hasil;
- multi-PPL tetap terlacak;
- target konflik terdeteksi;
- kode SubSLS tidak rusak;
- formula Excel aktif;
- style utama template terjaga;
- data manual tidak hilang;
- audit log tersimpan;
- tidak ada secret di repository;
- tidak ada error TypeScript;
- lint lulus;
- build production berhasil.

---

## 29. Workflow Agent

Sebelum mengubah kode, agent wajib:

1. membaca `AGENTS.md`;
2. membaca struktur repository;
3. membaca `README.md`;
4. membaca schema database;
5. membaca test yang sudah ada;
6. membaca template mapping;
7. memahami modul yang akan diubah;
8. membuat rencana perubahan singkat;
9. mengubah bagian minimum yang diperlukan;
10. menjalankan test terkait;
11. menjalankan lint dan type-check;
12. melaporkan hasil secara jujur.

Jangan langsung menulis ulang proyek.

---

## 30. Format Laporan Agent

Setelah menyelesaikan pekerjaan, agent harus melaporkan:

```text
Ringkasan:
- ...

File yang diubah:
- ...

Logika bisnis yang terdampak:
- ...

Pengujian:
- unit:
- integration:
- e2e:
- build:

Risiko atau catatan:
- ...

Status:
- selesai / sebagian / gagal
```

Jangan mengklaim test berhasil jika tidak dijalankan.

---

## 31. Larangan Keras

Agent dilarang:

- menghapus data mentah;
- mengubah email menjadi identitas berbasis nama tanpa alasan;
- mengubah Kode SubSLS menjadi number;
- menghitung target berdasarkan jumlah baris;
- menghapus multi-PPL sebagai duplikasi;
- menutup anomali dengan nilai nol;
- menulis credential ke repository;
- mengubah template tanpa backup;
- menimpa data manual;
- menggunakan nomor baris sebagai primary key;
- menghasilkan file tanpa audit;
- melakukan refactor besar tanpa kebutuhan;
- menonaktifkan test agar build lulus;
- menghapus warning penting;
- mengklaim akurasi tanpa test;
- mengubah aturan bisnis berdasarkan asumsi.

---

## 32. Prioritas Implementasi

Urutan pengerjaan:

### Fase 1 — Fondasi

- setup monorepo atau backend/frontend terpisah;
- konfigurasi TypeScript;
- database;
- authentication;
- logger;
- error handling;
- Docker;
- CI.

### Fase 2 — Import dan Validasi

- koneksi Google Sheets;
- header resolver;
- raw snapshot;
- normalizer;
- validator;
- anomaly detector.

### Fase 3 — Identity dan Aggregation

- PML resolver;
- PPL resolver;
- assignment resolver;
- deduplication;
- target unik;
- capaian;
- status.

### Fase 4 — Excel Engine

- template loader;
- template mapping;
- style cloning;
- merge builder;
- formula builder;
- Template 1;
- Template 2;
- print setup.

### Fase 5 — Dashboard

- data source;
- imports;
- anomalies;
- report generation;
- history;
- download.

### Fase 6 — Hardening

- regression test;
- golden file;
- performance test;
- security review;
- backup;
- documentation.

---

## 33. Definisi Akurasi Sistem

Akurasi sistem bukan sekadar file berhasil dibuat.

Sistem dinilai akurat jika:

```text
input mentah dapat ditelusuri
+ identitas petugas konsisten
+ target tidak ganda
+ capaian tidak ganda
+ konflik terdeteksi
+ formula benar
+ output sesuai template
+ hasil dapat diaudit
```

Setiap angka pada laporan harus dapat dijelaskan sumbernya.

---

## 34. Aturan Final

Jika terdapat konflik antara:

1. implementasi lama;
2. asumsi agent;
3. isi komentar kode;
4. aturan pada dokumen ini;

maka gunakan prioritas:

```text
aturan bisnis resmi terbaru
→ AGENTS.md
→ test yang tervalidasi
→ implementasi saat ini
→ asumsi agent
```

Jika masih ambigu, jangan menebak. Buat catatan keputusan dan minta klarifikasi sebelum mengubah logika inti.
