const { Pool } = require('pg');

// Ambil URL database dari environment variables
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // Error ini akan menghentikan build jika DATABASE_URL lupa diatur
  throw new Error("FATAL ERROR: DATABASE_URL environment variable is not set.");
}

// Konfigurasi Pool secara eksplisit untuk NeonDB
const poolConfig = {
  connectionString: dbUrl,
  ssl: {
    // Diperlukan untuk NeonDB dan platform cloud lainnya
    // yang menggunakan koneksi SSL
    rejectUnauthorized: false 
  }
};

// Buat Pool (kumpulan koneksi)
// 'pool' akan mengelola koneksi-koneksi ke database Anda
const pool = new Pool(poolConfig);

// Ekspor objek 'db' yang memiliki satu method: 'query'
// Ini adalah pola yang baik agar fungsi-fungsi kita (seperti submit-approval)
// tidak perlu mengelola koneksi (connect/release) secara manual.
module.exports = {
  db: {
    query: (text, params) => pool.query(text, params),
  },
  // Ekspor 'pool' juga jika Anda suatu saat perlu
  // fungsionalitas transaksi yang lebih kompleks
  pool, 
};

