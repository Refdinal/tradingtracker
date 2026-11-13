# Stack — BTC Trading Journal

Aplikasi pribadi untuk mencatat setup BTC/IDR, menghitung ukuran posisi berdasarkan risk budget, dan memantau hasil trading.

## Menjalankan secara lokal

1. Gunakan Node.js 20 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD`, `JWT_ACCESS_SECRET`, dan `JWT_REFRESH_SECRET`.
4. Jalankan backend dengan `npm run server`.
5. Di terminal lain, jalankan frontend dengan `npm run dev`.
6. Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

Tabel PostgreSQL dibuat otomatis saat endpoint aplikasi pertama kali digunakan.

## Deploy frontend + API di satu proyek Vercel

Impor repository ini sebagai satu proyek Vercel. `vercel.json` mengarahkan `/api/*` ke Express serverless function dan path lainnya ke frontend React yang dibangun oleh Vite. Tambahkan environment variables dari `.env.example` pada Project Settings Vercel. Gunakan koneksi Neon pooled atau direct SSL URL sebagai `DATABASE_URL`.

Variabel autentikasi utama:

- `APP_USERNAME` dan `APP_PASSWORD` menentukan satu akun login.
- `APP_PASSWORD_HASH` dapat digunakan sebagai pengganti `APP_PASSWORD`, dengan hash bcrypt.
- `JWT_ACCESS_SECRET` untuk access token 15 menit.
- `JWT_REFRESH_SECRET` untuk refresh token 7 hari di cookie HttpOnly.

## PWA

Aplikasi menyediakan web app manifest, ikon 192/512, dan service worker untuk app shell. Pada browser yang mendukung, pilih **Install app** atau **Add to Home Screen** dari menu browser. Service worker meng-cache tampilan aplikasi dan aset statis; request API tetap memerlukan koneksi internet.

## Kalkulasi setup

- Unit BTC = `risk budget / (entry - stop loss)`, dibulatkan ke 8 angka desimal.
- Modal entry = `entry × unit`; setup tidak dapat disimpan bila melebihi modal trading.
- TP1/TP2/TP3 = `(modal entry + risk budget × 1/2/3) / unit`.
- Profit atau loss saat jurnal ditutup diinput manual dalam rupiah.
