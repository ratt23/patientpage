// D:\patient-app\netlify\functions\submit-approval.js

const { Pool } = require('pg');
// const { PDFDocument, rgb } = require('pdf-lib'); <-- DIHAPUS

// Konfigurasi database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function untuk memastikan data JSON valid
function ensureValidJSON(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      // Jika tidak bisa di-parse, kembalikan sebagai object dengan properti value
      return { rawData: data };
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  
  // Untuk tipe data lain, konversi ke string dan simpan dalam object
  return { value: String(data) };
}

exports.handler = async function (event, context) {
  console.log('=== submit-approval called ===');
  console.log('Method:', event.httpMethod);
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    console.log('Received body keys:', Object.keys(body));
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return {
      statusCode: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Invalid JSON body',
        details: e.message 
      })
    };
  }

  // FLEXIBLE DATA HANDLING - terima berbagai format
  const { 
    token,           // Format baru (dari patient app)
    persetujuanData, // Format baru (Data checkbox dari PatientPage.js)
    NomorMR,         // Format lama
    signature_data,  // Format lama (Gambar TTD dari PatientPage.js)
    patientData,
    formData
  } = body;

  // Tentukan identifier yang akan digunakan
  const identifier = token || NomorMR;
  
  // Pastikan data persetujuan valid untuk JSON
  // --- PERUBAHAN DI SINI ---
  // Kita utamakan 'persetujuanData' yang dikirim dari PatientPage.js
  const rawApprovalData = persetujuanData || patientData || formData || body;
  // --- AKHIR PERUBAHAN ---
  const safeApprovalData = ensureValidJSON(rawApprovalData);

  console.log('Using identifier:', identifier);
  console.log('Safe approval data type:', typeof safeApprovalData);

  if (!identifier) {
    return {
      statusCode: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Token/NomorMR wajib diisi',
        receivedFields: Object.keys(body)
      })
    };
  }

  console.log('Processing approval for:', identifier);

  let client;

  try {
    client = await pool.connect();
    console.log('Database connected successfully');
    
    // CEK PASIEN DENGAN FLEKSIBEL - coba kedua identifier
    let currentStatus;
    
    // Coba dengan TokenAkses dulu (untuk patient app)
    currentStatus = await client.query(
      'SELECT "StatusPersetujuan", "NamaPasien", "NomorMR", "JadwalOperasi" FROM patients WHERE "TokenAkses" = $1',
      [identifier]
    );

    // Jika tidak ketemu, coba dengan NomorMR
    if (currentStatus.rows.length === 0) {
      currentStatus = await client.query(
        'SELECT "StatusPersetujuan", "NamaPasien", "NomorMR", "JadwalOperasi" FROM patients WHERE "NomorMR" = $1',
        [identifier]
      );
    }

    if (currentStatus.rows.length === 0) {
      console.log('Patient not found for identifier:', identifier);
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Pasien tidak ditemukan',
          identifier: identifier
        }),
      };
    }

    const patient = currentStatus.rows[0];
    
    if (patient.StatusPersetujuan === 'Disetujui') {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Persetujuan sudah disetujui sebelumnya',
          patient: patient.NamaPasien
        }),
      };
    }

    // UPDATE DATA
    // --- PERUBAHAN DI SINI ---
    // 'safeSignatureData' sekarang mengambil langsung dari 'signature_data' (base64)
    let safeSignatureData = signature_data || null;

    const updateQuery = `
      UPDATE patients 
      SET 
        "StatusPersetujuan" = 'Disetujui', 
        "TimestampPersetujuan" = CURRENT_TIMESTAMP,
        "PersetujuanData" = $1,
        "SignatureData" = $2
      WHERE "NomorMR" = $3
      RETURNING *`;

    console.log('Executing update with safe JSON data and signature');
    const result = await client.query(updateQuery, [
      safeApprovalData,   // Data checkbox (JSON)
      safeSignatureData,  // Data TTD (base64 string)
      patient.NomorMR
    ]);
    // --- AKHIR PERUBAHAN ---

    const updatedPatient = result.rows[0];
    console.log('Approval updated for:', updatedPatient.NamaPasien);
    
    // --- SEMUA KODE GENERATE PDF DI BAWAH INI TELAH DIHAPUS ---

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: 'Persetujuan berhasil disimpan',
        // pdf_data: pdfBytes, <-- DIHAPUS
        patient: {
          NomorMR: updatedPatient.NomorMR,
          NamaPasien: updatedPatient.NamaPasien,
          StatusPersetujuan: updatedPatient.StatusPersetujuan,
          TimestampPersetujuan: updatedPatient.TimestampPersetujuan
        }
      }),
    };
  } catch (error) {
    console.error('Error submitting approval:', error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Gagal menyimpan persetujuan',
        details: error.message,
        hint: 'Pastikan data yang dikirim berupa JSON valid'
      }),
    };
  } finally {
    if (client) {
      client.release();
      console.log('Database client released');
    }
  }
};