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
  console.log('=== submit-approval called ===');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
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
    console.log('Parsed body:', body);
  } catch (e) {
    console.error('JSON parse error:', e);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON format' })
    };
  }

  // Extract data including catatanDokter
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
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing token or NomorMR' })
    };
  }

  let client;
  try {
    client = await pool.connect();
    
    // Cari pasien berdasarkan token atau NomorMR
    const findQuery = token 
      ? `SELECT * FROM patients WHERE token = $1`
      : `SELECT * FROM patients WHERE "NomorMR" = $1`;
    
    const findResult = await client.query(findQuery, [identifier]);
    
    if (findResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Patient not found' })
      };
    }

    const patient = findResult.rows[0];
    let safeSignatureData = signature_data || null;

    // Query UPDATE dengan kolom CatatanDokter
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

    console.log('Executing update with catatan data...');
    const result = await client.query(updateQuery, [
      safeApprovalData,      // $1
      safeSignatureData,     // $2
      namaPetugas || null,   // $3
      safePetugasParafData,  // $4
      catatanDokter || null, // $5 - CatatanDokter
      patient.NomorMR        // $6
    ]);

    const updatedPatient = result.rows[0];
    console.log('Approval updated for:', updatedPatient.NamaPasien);
    
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
    console.error('Database error:', error);
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
    }
  }
};