# Stack — BTC Trading Journal

Aplikasi web pribadi untuk merencanakan setup dan mencatat performa trading BTC/IDR. Stack membantu menghitung ukuran posisi berdasarkan batas risiko, menentukan level take-profit, serta merangkum hasil jurnal trading dalam satu dashboard.

> Aplikasi ini adalah alat pencatatan dan kalkulasi. Bukan platform exchange, tidak mengambil harga pasar secara otomatis, dan bukan nasihat investasi.

## Fitur

- Dashboard ringkasan jumlah trade, posisi berjalan, win/loss, win rate, dan realized P/L.
- Kalkulator ukuran posisi BTC berdasarkan entry, stop loss, dan risk budget.
- Perhitungan modal entry dan tiga level take-profit.
- Jurnal untuk menambah, mencari, memfilter, memperbarui status, dan menghapus trade.
- Ekspor jurnal ke file JSON.
- Login akun privat dengan access token dan refresh cookie HttpOnly.
- Progressive Web App (PWA), dapat ditambahkan ke layar utama pada browser yang mendukung.
- Data tersimpan di PostgreSQL.

## Teknologi

- React, Vite, dan Tailwind CSS
- Node.js dan Express
- PostgreSQL
- Vercel Functions dan Static Build

## Menjalankan secara lokal

### Persyaratan

- Node.js 20 atau lebih baru
- PostgreSQL yang dapat diakses dari komputer lokal

### Langkah

1. Clone repository dan masuk ke folder proyek:

   ```bash
   git clone <URL-REPOSITORY>
   cd <NAMA-FOLDER>
   ```

2. Pasang dependency:

   ```bash
   npm install
   ```

3. Salin `.env.example` menjadi `.env`, lalu isi konfigurasi database dan autentikasi:

   ```env
   PORT=3001
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   JWT_ACCESS_SECRET=ganti-dengan-secret-acak-yang-panjang
   JWT_REFRESH_SECRET=ganti-dengan-secret-acak-lainnya
   APP_USERNAME=nama-pengguna
   APP_PASSWORD=password-yang-kuat
   CLIENT_URL=http://localhost:5173
   ```

   `APP_PASSWORD_HASH` dapat digunakan sebagai pengganti `APP_PASSWORD` dengan nilai hash bcrypt. Jangan unggah `.env` atau rahasia autentikasi ke repository.

4. Jalankan API di terminal pertama:

   ```bash
   npm run server
   ```

5. Jalankan frontend di terminal kedua:

   ```bash
   npm run dev
   ```

6. Buka URL yang ditampilkan Vite, biasanya `http://localhost:5173`.

Tabel PostgreSQL dibuat otomatis ketika endpoint aplikasi pertama kali digunakan. Untuk melihat status API, buka `/api/health` pada host aplikasi.

## Deploy ke Vercel

Frontend dan API dapat berjalan dalam satu proyek Vercel. Repository ini sudah menyertakan `vercel.json` untuk mengarahkan request `/api/*` ke Express serverless function dan menyajikan hasil build Vite untuk halaman lainnya.

### 1. Siapkan PostgreSQL

Buat database PostgreSQL yang dapat diakses dari internet, misalnya di Neon. Siapkan connection string/URL database dan gunakan opsi SSL yang disediakan penyedia database.

### 2. Impor repository ke Vercel

1. Push proyek ke GitHub.
2. Di Vercel, pilih **Add New → Project**, lalu impor repository tersebut.
3. Biarkan Vercel mendeteksi konfigurasi proyek. Build frontend dijalankan dengan `npm run build` dan output-nya berada di `dist`.

### 3. Tambahkan environment variables

Tambahkan variabel berikut di **Project Settings → Environment Variables** untuk environment yang akan digunakan:

| Variable | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL dengan akses SSL sesuai penyedia database |
| `APP_USERNAME` | Username untuk login ke aplikasi |
| `APP_PASSWORD` | Password login, atau gunakan `APP_PASSWORD_HASH` |
| `APP_PASSWORD_HASH` | Opsional; hash bcrypt sebagai pengganti `APP_PASSWORD` |
| `JWT_ACCESS_SECRET` | Secret acak yang panjang untuk access token |
| `JWT_REFRESH_SECRET` | Secret acak yang berbeda untuk refresh token |

Atur **salah satu** dari `APP_PASSWORD` atau `APP_PASSWORD_HASH`. Untuk produksi, gunakan password kuat dan dua JWT secret berbeda yang acak. `CLIENT_URL` hanya diperlukan bila mengatur origin CORS secara eksplisit; nilainya harus sesuai origin aplikasi, tanpa slash di akhir. Untuk satu deployment frontend/API di domain Vercel yang sama, konfigurasi CORS default mengizinkan origin request.

Jangan menggunakan nilai contoh pada `.env.example` di deployment produksi.

### 4. Deploy dan verifikasi

Klik **Deploy**. Setelah deployment selesai:

1. Buka URL deployment dan login menggunakan `APP_USERNAME` serta password yang telah dikonfigurasi.
2. Buka `https://<domain-deployment>/api/health`; respons sehat seharusnya menunjukkan `ok: true` dan `database: true`.
3. Tambahkan satu setup percobaan untuk memastikan aplikasi dapat menyimpan data ke database.

Setelah mengubah environment variables, lakukan redeploy agar konfigurasi baru diterapkan.

## Cara menggunakan aplikasi

1. **Login** — Masukkan username dan password yang dikonfigurasi di environment variables.
2. **Atur modal dan risiko** — Pilih **Settings** atau **Edit risk settings**, lalu isi trading capital dan risk budget per trade dalam rupiah.
3. **Buat setup** — Pilih **New trade**, isi tanggal, harga entry, dan stop loss.
4. **Tinjau hasil kalkulasi** — Aplikasi menghitung ukuran posisi dalam BTC, modal entry, serta TP1, TP2, dan TP3. Setup hanya dapat disimpan jika entry lebih tinggi dari stop loss dan modal entry tidak melebihi trading capital.
5. **Simpan ke jurnal** — Pilih **Add to journal**. Trade baru akan masuk dengan status **Running**.
6. **Perbarui hasil** — Pilih baris trade untuk mengubah status menjadi **Win** atau **Lose**, lalu masukkan profit/loss dalam rupiah sebagai angka positif. Untuk status Lose, aplikasi mencatatnya sebagai nilai negatif.
7. **Kelola jurnal** — Gunakan tab status atau kotak pencarian untuk menyaring trade. Pilih **Export** untuk mengunduh jurnal dalam format JSON.
8. **Logout** — Pilih profil di bagian bawah sidebar.

### Rumus kalkulasi

- Ukuran posisi (BTC) = `risk budget / (entry - stop loss)`, dibulatkan hingga 8 angka desimal.
- Modal entry = `entry × ukuran posisi`.
- TP1, TP2, TP3 = `(modal entry + risk budget × 1/2/3) / ukuran posisi`.
- Win rate = jumlah trade Win dibagi jumlah seluruh trade yang sudah ditutup.
- Realized P/L = jumlah hasil trade yang sudah dicatat; loss disimpan sebagai angka negatif.

## Pemeriksaan proyek

```bash
npm run build
npm run check:pwa
```

## Lisensi
