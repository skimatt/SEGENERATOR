# Panduan Menjalankan SEGENERATOR dengan Docker

Panduan ini ditujukan untuk instalasi lokal atau pemindahan SEGENERATOR ke komputer lain. Docker menjalankan tiga container: dashboard React/Nginx, API Fastify/ExcelJS, dan PostgreSQL.

```text
Browser :5173
    ↓
Nginx + React
    ↓ /api
Fastify + Google Sheets API + ExcelJS
    ↓
PostgreSQL + storage lokal
```

## 1. Persyaratan komputer

Rekomendasi minimum:

- Windows 10/11 64-bit yang masih didukung;
- RAM 8 GB;
- ruang kosong minimal 10 GB;
- virtualisasi CPU aktif di BIOS/UEFI;
- koneksi internet saat instalasi dan build pertama;
- akses Viewer ke Google Spreadsheet sumber.

Docker Desktop adalah cara resmi yang direkomendasikan untuk mendapatkan Docker Engine, Docker CLI, dan Docker Compose sekaligus:

- Windows: <https://docs.docker.com/desktop/setup/install/windows-install/>
- Docker Compose: <https://docs.docker.com/compose/install/>
- Ubuntu/Linux: <https://docs.docker.com/engine/install/ubuntu/>

## 2. Instalasi Docker Desktop pada Windows

1. Pastikan virtualisasi aktif melalui Task Manager → Performance → CPU → `Virtualization: Enabled`.
2. Buka PowerShell sebagai Administrator dan pasang/perbarui WSL:

   ```powershell
   wsl --install
   wsl --update
   ```

3. Restart Windows jika diminta.
4. Unduh dan instal Docker Desktop dari dokumentasi resmi di atas.
5. Gunakan backend WSL 2 ketika installer menampilkan pilihan.
6. Jalankan Docker Desktop dan tunggu hingga status engine menyatakan berjalan.
7. Verifikasi melalui PowerShell:

   ```powershell
   docker --version
   docker compose version
   docker run --rm hello-world
   ```

Jangan melanjutkan sebelum ketiga perintah tersebut berhasil. Docker Desktop sudah menyertakan Compose; jangan memasang `docker-compose` standalone lama.

## 3. Mengambil proyek

Pilihan Git:

```powershell
git clone https://github.com/skimatt/SEGENERATOR.git
Set-Location SEGENERATOR
```

Jika Git tidak tersedia, unduh ZIP repository dari GitHub, ekstrak, lalu buka PowerShell pada folder hasil ekstrak. Hindari menjalankan proyek langsung dari ZIP.

## 4. Menyiapkan file runtime lokal

File rahasia dan data operasional tidak disimpan di Git. Salin dua file berikut dari komputer lama menggunakan media yang aman:

```text
SEGENERATOR/
├── umkm-479223-fddd8281bf40.json
└── data/
    └── Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx
```

Ketentuan:

- credential JSON berada di root proyek dan tidak boleh dikirim ke GitHub atau grup publik;
- workbook progres harus menggunakan nama file tepat seperti di atas;
- template resmi `templates/LK PPK  TEMPLATES.xlsx` sudah disertakan dalam repository;
- bagikan Google Spreadsheet kepada `client_email` dalam credential sebagai Viewer;
- pastikan tab sumber bernama `DATA_MENTAH2`.

Jika nama/path credential berbeda, isi `GOOGLE_SERVICE_ACCOUNT_HOST_FILE` pada `.env` dengan path relatif yang benar.

## 5. Membuat konfigurasi `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Minimal periksa nilai berikut:

```env
POSTGRES_USER=segenerator
POSTGRES_PASSWORD=ganti_password_lokal_ini
POSTGRES_DB=segenerator
GOOGLE_SPREADSHEET_ID=1zpMTFkKYVDdo8dyFy_ZJRGXFXFuVvMZSsPCzhD_0jfg
GOOGLE_SHEET_NAME=DATA_MENTAH2
GOOGLE_SERVICE_ACCOUNT_HOST_FILE=./umkm-479223-fddd8281bf40.json
```

Ganti password PostgreSQL sebelum instalasi baru. Untuk menghindari masalah pada URL koneksi, gunakan kombinasi huruf, angka, garis bawah, atau tanda hubung. Jangan memasukkan spasi, `@`, `:`, `/`, `?`, atau `#` kecuali sudah melakukan URL encoding.

`.env` hanya untuk mesin lokal dan sudah diabaikan Git.

## 6. Pemeriksaan sebelum startup

Pastikan Docker Desktop aktif, lalu dari root proyek jalankan:

```powershell
Test-Path .env
Test-Path .\umkm-479223-fddd8281bf40.json
Test-Path '.\templates\LK PPK  TEMPLATES.xlsx'
Test-Path '.\data\Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx'
docker compose config --quiet
```

Semua `Test-Path` harus menghasilkan `True` dan validasi Compose tidak boleh menampilkan error.

## 7. Menjalankan aplikasi

Build pertama membutuhkan internet untuk mengunduh image dan dependency:

```powershell
docker compose up -d --build
```

Periksa status:

```powershell
docker compose ps
```

Container `postgres`, `api`, dan `web` harus berstatus `Up` atau `healthy`. Buka:

```text
Dashboard: http://localhost:5173
API health: http://localhost:3000/api/health
```

Pengujian health melalui PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Setelah dashboard terbuka:

1. pastikan sumber menampilkan `DATA_MENTAH2`;
2. klik **Buka Google Spreadsheet** untuk memeriksa sumber;
3. klik **Import data terbaru**;
4. tinjau statistik dan anomali;
5. gunakan Strict jika pemblokir berjumlah nol;
6. gunakan Permissive hanya untuk preview yang masih memerlukan verifikasi;
7. klik **Generate Excel** lalu unduh melalui Riwayat Laporan.

## 8. Operasi harian

Menyalakan kembali:

```powershell
docker compose up -d
```

Melihat log:

```powershell
docker compose logs --tail=200 api
docker compose logs --tail=200 web
docker compose logs --tail=200 postgres
```

Restart API:

```powershell
docker compose restart api
```

Menghentikan container tanpa menghapus database:

```powershell
docker compose stop
```

Menghapus container tanpa menghapus database:

```powershell
docker compose down
```

Jangan menggunakan `docker compose down -v` karena opsi `-v` menghapus volume PostgreSQL dan seluruh metadata/audit database.

## 9. Memperbarui aplikasi dari GitHub

Backup terlebih dahulu, kemudian:

```powershell
git pull origin main
docker compose up -d --build
docker compose ps
```

Migration database dijalankan otomatis oleh container API saat startup.

## 10. Backup sebelum pindah komputer

Buat folder backup:

```powershell
New-Item -ItemType Directory -Force .\backup
```

### Backup PostgreSQL

```powershell
docker compose exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/segenerator.dump'
docker compose cp postgres:/tmp/segenerator.dump .\backup\segenerator.dump
```

### File yang harus disalin

Salin ke media backup yang aman:

```text
backup/segenerator.dump
.env
umkm-479223-fddd8281bf40.json
data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx
storage/reports/
storage/snapshots/
```

Credential dan `.env` harus disimpan terenkripsi atau pada media privat.

## 11. Restore pada komputer baru

1. Instal Docker Desktop.
2. Clone/ekstrak proyek.
3. Salin `.env`, credential, workbook progres, folder `storage`, dan `backup/segenerator.dump` ke lokasi yang sesuai.
4. Pada instalasi yang benar-benar baru, jalankan PostgreSQL saja:

   ```powershell
   docker compose up -d postgres
   docker compose cp .\backup\segenerator.dump postgres:/tmp/segenerator.dump
   docker compose exec postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges /tmp/segenerator.dump'
   ```

5. Jalankan seluruh layanan:

   ```powershell
   docker compose up -d --build
   docker compose ps
   ```

Restore di atas hanya untuk database baru/kosong. Jangan menjalankannya pada database yang sudah berisi data tanpa backup dan prosedur rekonsiliasi karena dapat menghasilkan konflik objek atau data ganda.

## 12. Instalasi baru tanpa membawa riwayat lama

Jika hanya ingin menggunakan sumber terbaru dan tidak membutuhkan riwayat:

1. siapkan `.env`, credential, dan workbook progres;
2. jalankan `docker compose up -d --build`;
3. migration membuat struktur database baru;
4. klik **Import data terbaru**;
5. generate laporan baru.

## 13. Akses dari komputer lain pada jaringan lokal

Dashboard dipublikasikan ke seluruh interface melalui `WEB_BIND_ADDRESS=0.0.0.0`. Cari alamat IP komputer server dengan:

```powershell
ipconfig
```

Dari komputer lain pada jaringan yang sama, buka:

```text
http://ALAMAT_IP_SERVER:5173
```

Jika tidak dapat dibuka, periksa Windows Firewall dan pastikan jaringan dipercaya. API port 3000 sengaja hanya diikat ke `127.0.0.1`; pengguna jaringan mengakses API melalui proxy dashboard pada port 5173.

Versi saat ini tidak memiliki autentikasi. Jangan membuka port 5173 langsung ke internet. Untuk akses internet, tambahkan autentikasi, HTTPS, reverse proxy, pembatasan jaringan, dan backup terjadwal terlebih dahulu.

## 14. Troubleshooting

### Credential tidak terbaca

Periksa:

```powershell
Test-Path .\umkm-479223-fddd8281bf40.json
docker compose logs --tail=100 api
```

Pastikan spreadsheet telah dibagikan kepada email service account.

### `DATA_MENTAH2` tidak terbaca

Pastikan ID spreadsheet dan nama sheet pada `.env` benar, tanpa spasi tambahan.

### Workbook progres tidak ditemukan

Pastikan file tersedia tepat pada:

```text
data/Export_Progres_Pendataan_Sub_Satuan_Lingkungan_Setempat_Sub-SLS.xlsx
```

### Port sudah digunakan

Ubah `.env`, misalnya:

```env
WEB_PORT=8080
API_PORT=3001
```

Kemudian jalankan kembali `docker compose up -d` dan buka `http://localhost:8080`.

### Container tidak healthy

```powershell
docker compose ps
docker compose logs --tail=200 api
docker compose logs --tail=200 postgres
```

### Reset total untuk instalasi uji coba

Perintah berikut menghapus database Docker secara permanen. Gunakan hanya jika seluruh data sudah dibackup dan reset memang disengaja:

```powershell
docker compose down -v
```

Setelah itu jalankan `docker compose up -d --build`.

## 15. Checklist serah terima

- [ ] Docker dan Compose terpasang.
- [ ] `.env` sudah dibuat dan tidak masuk Git.
- [ ] Password PostgreSQL sudah diganti.
- [ ] Credential JSON tersedia dan tidak masuk Git.
- [ ] Spreadsheet dibagikan ke service account.
- [ ] Workbook progres tersedia di folder `data`.
- [ ] Template resmi tersedia.
- [ ] Semua container healthy.
- [ ] Import Google Sheets berhasil.
- [ ] Statistik dashboard masuk akal.
- [ ] Anomali ditinjau.
- [ ] Excel dapat diunduh dan dibuka tanpa repair warning.
- [ ] Backup database dan storage berhasil dibuat.
