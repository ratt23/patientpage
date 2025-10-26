const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function ensureValidJSON(data) {
  if (typeof data === 'string') {
    try { 
      return JSON.parse(data); 
    } catch (e) { 
      return { rawData: data }; 
    }
  }
  if (typeof data === 'object' && data !== null) { 
    return data; 
  }
  return { value: String(data) };
}

exports.handler = async function (event, context) {
  console.log('=== submit-approval dipanggil ===');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log('Body berhasil di-parse:', body);
  } catch (e) {
    console.error('Error parse JSON:', e.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON format' })
    };
  }

  const { 
    token,
    NomorMR,
    persetujuanData, 
    signature_data,  
    namaPetugas,       
    petugasParafData, 
    catatanDokter
  } = body;

  const identifier = token || NomorMR;
  const safeApprovalData = ensureValidJSON(persetujuanData || {});
  const safePetugasParafData = ensureValidJSON(petugasParafData || {});
  
  if (!identifier) {
    console.warn('Request ditolak: Missing token atau NomorMR');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing token or NomorMR' })
    };
  }

  let client;
  try {
    console.log('Mencoba terhubung ke database...');
    client = await pool.connect();
    console.log('Berhasil terhubung ke database.');
    
    // ==========================================================
    // PERBAIKAN 1: Query pencarian pasien
    // Menggunakan "TokenAkses" dan "NomorMR" sesuai skema
    // ==========================================================
    const findQuery = token 
      ? `SELECT * FROM patients WHERE "TokenAkses" = $1`
      : `SELECT * FROM patients WHERE "NomorMR" = $1`;
    
    console.log('Mencari pasien dengan identifier:', identifier);
    const findResult = await client.query(findQuery, [identifier]);
    
    if (findResult.rows.length === 0) {
      console.warn('Pasien tidak ditemukan dengan identifier:', identifier);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Patient not found' })
      };
    }

    const patient = findResult.rows[0];
    console.log('Pasien ditemukan:', patient.NomorMR, patient.NamaPasien);
    let safeSignatureData = signature_data || null;

    // ==========================================================
    // PERBAIKAN 2: Query update
    // Menggunakan nama kolom MixedCase dengan tanda kutip (")
    // ==========================================================
    const updateQuery = `
      UPDATE patients 
      SET 
        "StatusPersetujuan" = 'Disetujui', 
        "TimestampPersetujuan" = CURRENT_TIMESTAMP,
        "PersetujuanData" = $1,
        "SignatureData" = $2,
        "NamaPetugas" = $3,
        "PetugasParafData" = $4,
        "CatatanDokter" = $5
      WHERE "NomorMR" = $6
      RETURNING *`;

    const queryParams = [
      safeApprovalData,      // $1
      safeSignatureData,     // $2
      namaPetugas || null,   // $3
      safePetugasParafData,  // $4
      catatanDokter || null, // $5
      patient.NomorMR        // $6 (Gunakan .NomorMR sesuai data 'patient' yg didapat)
    ];
    // ==========================================================
    
    console.log('Menjalankan query UPDATE untuk NomorMR:', patient.NomorMR);
    const result = await client.query(updateQuery, queryParams);
    const updatedPatient = result.rows[0];
    
    console.log('Persetujuan berhasil diperbarui untuk:', updatedPatient.NamaPasien);
    console.log('Nama Petugas tersimpan:', updatedPatient.NamaPetugas);
    console.log('Catatan Dokter tersimpan:', updatedPatient.CatatanDokter);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Persetujuan berhasil disimpan',
        patient: {
          NomorMR: updatedPatient.NomorMR,
          NamaPasien: updatedPatient.NamaPasien,
          StatusPersetujuan: updatedPatient.StatusPersetujuan,
          CatatanDokter: updatedPatient.CatatanDokter
        }
      }),
    };
  } catch (error) {
    console.error('=== TERJADI ERROR DI DATABASE/HANDLER ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database operation failed',
        details: error.message 
      })
    };
  } finally {
    if (client) {
      client.release();
      console.log('Koneksi database dilepaskan.');
    }
  }
};