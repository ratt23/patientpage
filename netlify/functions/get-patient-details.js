// D:\patient-app\netlify\functions\get-patient-details.js

const { Pool } = require('pg');

// --- PERBAIKAN SSL ---

// 1. Ambil URL database dari environment
const dbUrl = process.env.DATABASE_URL;

// 2. Bersihkan query params (?sslmode=... dll.) dari URL
//    Ini untuk menghindari konflik dengan pengaturan SSL di bawah
const cleanDbUrl = dbUrl.split('?')[0]; 

// 3. Konfigurasi Pool secara eksplisit
const poolConfig = {
  connectionString: cleanDbUrl, // Gunakan URL yang sudah bersih
  ssl: {
    rejectUnauthorized: false // Tentukan SSL secara eksplisit di sini
  }
};

// 4. Buat Pool dengan konfigurasi baru
const pool = new Pool(poolConfig);

// --- AKHIR PERBAIKAN SSL ---

exports.handler = async function (event, context) {
  console.log('=== get-patient-details called ===');
  
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
    
    const result = await client.query(
      `SELECT "NomorMR", "NamaPasien", "JadwalOperasi", "StatusPersetujuan", 
              "TimestampPersetujuan", "LinkBuktiPDF", "TimestampDibuat"
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