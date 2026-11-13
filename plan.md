aplikasi BTC trading tracker
teknologi PERN stack
react js murni dengan tailwind
express js murni menggunakan raw query
database postgre menggunakan neon
terpisah backend dan frontend dan siap dideploy di vercel

- aplikasi login menggunakan jwt acces 15 menit dan refresh 1 minggu

pada dashboard
setting awal

- modal trading - bisa diedit oleh user
- risk budget bisa diedit oleh user default 10000

daily trade awal

- harga entry dapat diedit (dalam rupiah diinput manual dan dapat diedit)
- harga stop loss (dalam rupiah diinput manual dan dapat diedit)
- jumlah unit (risk budget / (harga entry - harga stop loss)) => otomatis dikalkulasikan saat variabel sudah diinput
- modal entry ( harga entry x jumlah unit) => otomatis dikalkulasikan saat variabel sudah diinput => jika lebih besar dari modal trading maka setup tidak valid dan ini berwarna merah
- harga take profit 1 (dalam rupiah ) => (modal entry + (risk budget x 1)) / jumlah unit
- harga take profit 2 (dalam rupiah ) => (modal entry + (risk budget x 2)) / jumlah unit
- harga take profit 3 (dalam rupiah ) => (modal entry + (risk budget x 3)) / jumlah unit

setelah diinput maka akan masuk ke jurnal trading

- status jurnal ada 3 yaitu running, win, lose

untuk merubah ke status win diinputkan manual berapa keuntungan dan lose juga diinputkan manual berapa kerugian
