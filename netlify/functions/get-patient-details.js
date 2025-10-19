const { Pool } = require('pg');

// --- PERBAIKAN SSL DAN ERROR HANDLING ---
let pool;
let initializationError = null;

try {
  // 1. Ambil URL database dari environment
  const dbUrl = process.env.DATABASE_URL;

  // 2. Cek apakah DATABASE_URL ada
  if (!dbUrl) {
    initializationError = 'FATAL ERROR: DATABASE_URL environment variable is not set.';
    console.error(initializationError);
  } else {
    // 3. Bersihkan query params (?sslmode=... dll.) dari URL
    const cleanDbUrl = dbUrl.split('?')[0]; 

    // 4. Konfigurasi Pool secara eksplisit
    const poolConfig = {
      connectionString: cleanDbUrl, // Gunakan URL yang sudah bersih
      ssl: {
        rejectUnauthorized: false // Tentukan SSL secara eksplisit di sini
      }
    };
    
    // 5. Buat Pool dengan konfigurasi baru
    pool = new Pool(poolConfig);
  }
} catch (error) {
  console.error("Error during pool initialization:", error);
  initializationError = "Error during pool initialization: " + error.message;
}
// --- AKHIR PERBAIKAN ---

exports.handler = async function (event, context) {
  console.log('=== get-patient-details called ===');

  // Cek apakah ada error saat inisialisasi pool
  if (initializationError || !pool) {
    console.error("Returning 500 due to initialization error.");
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Gagal menginisialisasi koneksi database',
        details: initializationError || 'Pool is not available.'
      }),
    };
  }
  
  const { NomorMR } = event.queryStringParameters;

  if (!NomorMR) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'NomorMR is required' }),
    };
  }

  console.log('Fetching details for NomorMR:', NomorMR);

  let client;

  try {
    client = await pool.connect();
    console.log('Database connected, querying patient details...');
    
    // Query ini mengambil "Dokter" yang baru Anda tambahkan
    const result = await client.query(
      `SELECT "NomorMR", "NamaPasien", "JadwalOperasi", "Dokter", 
              "StatusPersetujuan", "TimestampPersetujuan", "LinkBuktiPDF", "TimestampDibuat"
       FROM patients 
       WHERE "NomorMR" = $1`,
      [NomorMR]
    );
    
    if (result.rows.length === 0) {
      console.log('Patient not found:', NomorMR);
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Pasien tidak ditemukan' }),
      };
    }

    console.log('Patient found:', result.rows[0].NamaPasien);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    console.error('Error fetching patient details:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Gagal mengambil data pasien',
        details: error.message 
      }),
    };
  } finally {
    if (client) {
      client.release();
      console.log('Client released');
    }
  }
};