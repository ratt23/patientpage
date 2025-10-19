// patient-app/netlify/functions/get-patient-details.js
const { Pool } = require('pg');

// --- Koneksi Pool (Sudah Termasuk Error Handling) ---
let pool;
let initializationError = null;
try {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    initializationError = 'FATAL ERROR: DATABASE_URL environment variable is not set.';
    console.error(initializationError);
  } else {
    const cleanDbUrl = dbUrl.split('?')[0]; 
    const poolConfig = {
      connectionString: cleanDbUrl,
      ssl: { rejectUnauthorized: false }
    };
    pool = new Pool(poolConfig);
  }
} catch (error) {
  console.error("Error during pool initialization:", error);
  initializationError = "Error during pool initialization: " + error.message;
}
// --- Akhir Koneksi Pool ---

exports.handler = async function (event, context) {
  console.log('=== get-patient-details called ===');
  if (initializationError || !pool) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Gagal menginisialisasi koneksi database', details: initializationError || 'Pool is not available.'}), };
  }
  
  // --- PERUBAHAN: Cari 'token', bukan 'NomorMR' ---
  const { token } = event.queryStringParameters;

  if (!token) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Token is required' }),
    };
  }

  console.log('Fetching details for Token:', token);
  // --- AKHIR PERUBAHAN ---

  let client;
  try {
    client = await pool.connect();
    console.log('Database connected, querying patient details...');
    
    // --- PERUBAHAN: SELECT ... WHERE "TokenAkses" = $1 ---
    const result = await client.query(
      `SELECT "NomorMR", "NamaPasien", "JadwalOperasi", "Dokter", 
              "StatusPersetujuan", "TimestampPersetujuan"
       FROM patients 
       WHERE "TokenAkses" = $1`, // <-- INI ADALAH KUNCI KEAMANAN
      [token] // <-- Gunakan token
    );
    
    if (result.rows.length === 0) {
      console.log('Patient not found for token:', token);
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Pasien tidak ditemukan' }),
      };
    }

    // Kita tetap mengirim NomorMR ke frontend, karena dibutuhkan
    // untuk fungsi 'submit-approval'
    console.log('Patient found:', result.rows[0].NamaPasien);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    console.error('Error fetching patient details:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Gagal mengambil data pasien', details: error.message }),
    };
  } finally {
    if (client) { client.release(); console.log('Client released'); }
  }
};